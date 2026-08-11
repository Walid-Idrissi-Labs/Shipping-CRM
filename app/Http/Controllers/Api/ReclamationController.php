<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\PresentsReclamations;
use App\Http\Controllers\Controller;
use App\Models\Reclamation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReclamationController extends Controller
{
    use PresentsReclamations;

    public function index(Request $request)
    {
        $providerId = $request->user()->provider->id;

        $query = Reclamation::query()
            // Same reasoning as the client list: the inbox shows an unread
            // marker and a preview, both of which read the messages.
            ->with(['messages', 'client'])
            ->where('provider_id', $providerId);

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
                    ->orWhereRaw('LOWER(reference) like ?', [$needle])
                    ->orWhereHas('client', function ($c) use ($needle) {
                        $c->whereRaw('LOWER(full_name) like ?', [$needle])
                            ->orWhereRaw('LOWER(company_name) like ?', [$needle]);
                    });
            });
        }

        $paginated = $query->orderByDesc('last_message_at')->paginate(25);

        return response()->json(
            $paginated->through(fn (Reclamation $r) => $this->presentThread($r, 'prestataire'))
        );
    }

    public function show(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);

        $reclamation->load('messages', 'client');

        // Read mark stamped after presenting, so the unread count the inbox
        // showed a moment ago is what the detail page reports.
        $payload = $this->presentThread($reclamation, 'prestataire', withMessages: true);

        $reclamation->update(['provider_read_message_id' => $reclamation->latestMessageId()]);

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
            'author_role' => 'prestataire',
            'corps' => $validated['corps'],
            'created_at' => now(),
        ]);

        $reclamation->update([
            'last_message_at' => now(),
            'provider_read_message_id' => $message->id,
            // Answering is engagement: a thread nobody had touched moves out of
            // "ouverte" on its own, so the inbox does not depend on someone
            // remembering to set a status by hand.
            'statut' => $reclamation->statut === 'ouverte' ? 'en_traitement' : $reclamation->statut,
        ]);

        return response()->json(
            $this->presentMessage($message, $reclamation->load('client')),
            201
        );
    }

    public function updateStatus(Request $request, Reclamation $reclamation)
    {
        $this->authorizeAccess($request, $reclamation);

        $validated = $request->validate([
            'statut' => ['required', Rule::in(Reclamation::STATUTS)],
        ]);

        $reclamation->update(['statut' => $validated['statut']]);

        return response()->json(
            $this->presentThread($reclamation->load('messages', 'client'), 'prestataire')
        );
    }

    // Route model binding resolves any id, so every provider-scoped endpoint
    // re-checks ownership here rather than trusting the role middleware.
    private function authorizeAccess(Request $request, Reclamation $reclamation): void
    {
        if ((int) $reclamation->provider_id !== (int) $request->user()->provider->id) {
            abort(403, 'Accès refusé.');
        }
    }
}
