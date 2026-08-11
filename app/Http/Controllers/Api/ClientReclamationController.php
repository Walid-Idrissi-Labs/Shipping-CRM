<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PresentsReclamations;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Facture;
use App\Models\Reclamation;
use App\Models\Shipment;
use App\Services\ClientActivityLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClientReclamationController extends Controller
{
    use PresentsReclamations;

    public function index(Request $request)
    {
        $client = $request->user()->client;

        $query = Reclamation::query()
            // The list renders an unread marker and a preview of the latest
            // message, both of which need the messages anyway. 25 threads of a
            // handful of messages each is cheaper than the alternative of two
            // extra aggregate subqueries per row.
            ->with('messages')
            ->where('client_id', $client->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->input('search')) {
            $needle = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($needle) {
                $qb->whereRaw('LOWER(sujet) like ?', [$needle])
                    ->orWhereRaw('LOWER(reference) like ?', [$needle]);
            });
        }

        $paginated = $query->orderByDesc('last_message_at')->paginate(25);

        return response()->json(
            $paginated->through(fn (Reclamation $r) => $this->presentThread($r, 'client'))
        );
    }

    /**
     * How many threads have a reply the client has not seen. Drives the badge
     * in the client sidebar, so it is deliberately the cheapest endpoint here.
     */
    public function unreadCount(Request $request)
    {
        $client = $request->user()->client;

        $count = Reclamation::where('client_id', $client->id)
            ->whereHas('messages', function ($q) {
                $q->where('author_role', 'prestataire')
                    ->whereRaw('reclamation_messages.id > coalesce(reclamations.client_read_message_id, 0)');
            })
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * The expeditions and factures a client may attach a thread to. Capped and
     * unpaginated: this fills a <select>, and a client with hundreds of records
     * is better served by describing the problem in the message body.
     */
    public function subjects(Request $request)
    {
        $client = $request->user()->client;

        $shipments = Shipment::where('client_id', $client->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'shipping_number', 'recipient_name'])
            ->map(fn (Shipment $s) => [
                'id' => $s->id,
                'label' => trim("{$s->shipping_number} — {$s->recipient_name}"),
            ]);

        $invoices = Facture::where('client_id', $client->id)
            ->orderByDesc('date_facture')
            ->limit(50)
            ->get()
            ->map(fn (Facture $f) => [
                'id' => $f->id,
                'label' => $f->numero,
            ]);

        return response()->json([
            'shipments' => $shipments,
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(Reclamation::TYPES)],
            'sujet' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:4000'],
            'subject_type' => ['nullable', Rule::in(Reclamation::SUBJECT_TYPES)],
            'subject_id' => ['nullable', 'integer', 'required_with:subject_type'],
        ], [], [
            'sujet' => 'sujet',
            'message' => 'message',
        ]);

        $client = $request->user()->client;

        // A subject_id is a raw integer from the browser. Without this a client
        // could attach their reclamation to another client's expedition and
        // read its number back off the thread header.
        if (! empty($validated['subject_type'])) {
            $this->assertSubjectBelongsToClient($validated['subject_type'], (int) $validated['subject_id'], $client);
        } else {
            $validated['subject_id'] = null;
        }

        $reclamation = $this->createWithReference($client, $validated);

        $opening = $reclamation->messages()->create([
            'user_id' => $request->user()->id,
            'author_role' => 'client',
            'corps' => $validated['message'],
            'created_at' => now(),
        ]);

        $reclamation->update([
            'last_message_at' => now(),
            // The client has read their own opening message by definition.
            'client_read_message_id' => $opening->id,
        ]);

        ClientActivityLogger::log(
            $client,
            'reclamation_created',
            ($validated['type'] === 'reclamation' ? 'Réclamation ouverte : ' : 'Remarque envoyée : ') . $validated['sujet'],
            'reclamation',
            $reclamation->id,
        );

        return response()->json(
            $this->presentThread($reclamation->load('messages'), 'client', withMessages: true),
            201
        );
    }

    public function show(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);

        $reclamation->load('messages', 'client');

        // Present the thread before stamping the read mark, so the badge the
        // client just clicked still reflects what was new when they opened it.
        $payload = $this->presentThread($reclamation, 'client', withMessages: true);

        $reclamation->update(['client_read_message_id' => $reclamation->latestMessageId()]);

        return response()->json($payload);
    }

    public function storeMessage(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);

        $validated = $request->validate([
            'corps' => ['required', 'string', 'max:4000'],
        ]);

        $message = $reclamation->messages()->create([
            'user_id' => $request->user()->id,
            'author_role' => 'client',
            'corps' => $validated['corps'],
            'created_at' => now(),
        ]);

        $reclamation->update([
            'last_message_at' => now(),
            'client_read_message_id' => $message->id,
            // Replying to a thread the team had closed reopens it. Silently
            // leaving it "resolue" would drop the message out of the inbox's
            // default view -- the client would be talking to nobody.
            'statut' => $reclamation->statut === 'resolue' ? 'en_traitement' : $reclamation->statut,
        ]);

        return response()->json(
            $this->presentMessage($message, $reclamation->load('client')),
            201
        );
    }

    private function authorizeAccess(Request $request, Reclamation $reclamation): void
    {
        if ((int) $reclamation->client_id !== (int) $request->user()->client->id) {
            abort(403, 'Accès refusé.');
        }
    }

    private function assertSubjectBelongsToClient(string $type, int $id, Client $client): void
    {
        $exists = $type === 'shipment'
            ? Shipment::where('id', $id)->where('client_id', $client->id)->exists()
            : Facture::where('id', $id)->where('client_id', $client->id)->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'subject_id' => ['Ce document est introuvable dans votre espace.'],
            ]);
        }
    }

    /**
     * References are a per-year counter, so two threads opened in the same
     * second can compute the same one. The unique index makes that a failed
     * insert rather than a duplicate; recomputing and retrying resolves it.
     */
    private function createWithReference(Client $client, array $validated): Reclamation
    {
        $attributes = [
            'provider_id' => $client->provider_id,
            'client_id' => $client->id,
            'type' => $validated['type'],
            'sujet' => $validated['sujet'],
            'statut' => 'ouverte',
            'subject_type' => $validated['subject_type'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
        ];

        for ($attempt = 0; ; $attempt++) {
            try {
                return Reclamation::create($attributes + ['reference' => Reclamation::nextReference($attempt)]);
            } catch (QueryException $e) {
                if ($attempt >= 2) {
                    throw $e;
                }
            }
        }
    }
}
