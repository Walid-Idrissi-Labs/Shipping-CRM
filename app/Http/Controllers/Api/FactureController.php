<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Facture;
use App\Models\FactureExpedition;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use App\Services\FiscalCalculator;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FactureController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $query = Facture::query()->with(['client', 'expeditions']);

        $user = $request->user();
        if ($user->role === 'client') {
            $query->where('client_id', $user->client->id);
        } else {
            $query->where('provider_id', $user->provider->id);
        }

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($typeDest = $request->input('type_destination')) {
            $query->where('type_destination', $typeDest);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('date_facture', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('date_facture', '<=', $to);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $numeroStr = mb_strtolower(trim($search, " \t\n\r\0\x0B/"));
            $query->where(function ($qb) use ($q, $numeroStr) {
                $qb->whereHas('client', fn ($qq) => $qq->whereRaw('LOWER(full_name) like ?', [$q]))
                    ->orWhereRaw('LOWER(client_divers_nom) like ?', [$q])
                    ->orWhereRaw("LOWER('FA ' || numero_n || '/' || annee) like ?", [$q]);
                if ($numeroStr !== '' && ctype_digit($numeroStr)) {
                    $qb->orWhere('numero_n', (int) $numeroStr);
                }
            });
        }

        $this->applySort(
            $query,
            $request,
            ['numero_n', 'created_at', 'date_echeance', 'taxable', 'ttc', 'statut', 'type_destination'],
            'created_at',
            'desc'
        );

        return response()->json(
            $query->paginate(25)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $user = $request->user();
        $provider = $user->provider;
        $year = now()->year;

        $isClientDivers = empty($validated['client_id']);

        $expeditionIds = $validated['expedition_ids'] ?? [];
        if (! $isClientDivers && count($expeditionIds) < 1) {
            return response()->json(['message' => 'Une facture client en compte doit contenir au moins une expedition.'], 422);
        }
        if ($isClientDivers && count($expeditionIds) !== 1) {
            return response()->json(['message' => 'Une facture client divers doit contenir exactement une expedition.'], 422);
        }

        $shipments = Shipment::whereIn('id', $expeditionIds)
            ->where('provider_id', $provider->id)
            ->get();

        if ($shipments->count() !== count($expeditionIds)) {
            return response()->json(['message' => 'Une ou plusieurs expeditions selectionnees sont invalides.'], 422);
        }

        $alreadyInvoiced = $shipments->filter(fn ($s) => $s->factureExpedition()->exists());
        if ($alreadyInvoiced->isNotEmpty()) {
            return response()->json([
                'message' => 'Une ou plusieurs expeditions sont deja facturees.',
                'invoiced_expedition_ids' => $alreadyInvoiced->pluck('id')->toArray(),
            ], 409);
        }

        if (! $isClientDivers) {
            $client = Client::findOrFail($validated['client_id']);
            foreach ($shipments as $s) {
                if ((int) $s->client_id !== (int) $client->id) {
                    return response()->json(['message' => "L'expedition #{$s->shipping_number} n'appartient pas au client selectionne."], 422);
                }
            }
        }

        [$tauxTva, $nonTaxable, $taxable, $tva, $ttc] = FiscalCalculator::compute(
            $validated['type_destination'],
            (float) $validated['taxable'],
            (float) ($validated['non_taxable'] ?? 0)
        );

        $seq = $this->nextInvoiceSequence();
        $numeroN = (int) ($validated['numero_n'] ?? $seq['sequence']);

        if (Facture::where('annee', $year)->where('numero_n', $numeroN)->exists()) {
            return response()->json([
                'message' => 'Ce numero de facture existe deja pour cette annee.',
            ], 422);
        }

        $facture = DB::transaction(function () use ($validated, $provider, $shipments, $seq, $numeroN, $year, $tauxTva, $nonTaxable, $taxable, $tva, $ttc) {
            $facture = Facture::create([
                'provider_id' => $provider->id,
                'client_id' => $validated['client_id'] ?? null,
                'client_divers_nom' => $validated['client_divers_nom'] ?? null,
                'client_divers_adresse' => $validated['client_divers_adresse'] ?? null,
                'client_divers_tel' => $validated['client_divers_tel'] ?? null,
                'client_divers_email' => $validated['client_divers_email'] ?? null,
                'numero_n' => $numeroN,
                'annee' => $year,
                'date_facture' => $validated['date_facture'] ?? now()->toDateString(),
                'date_echeance' => $validated['date_echeance'],
                'type_destination' => $validated['type_destination'],
                'taux_tva' => $tauxTva,
                'non_taxable' => $nonTaxable,
                'taxable' => $taxable,
                'tva' => $tva,
                'ttc' => $ttc,
                'statut' => 'impayee',
            ]);

            foreach ($shipments as $s) {
                FactureExpedition::create([
                    'facture_id' => $facture->id,
                    'expedition_id' => $s->id,
                ]);
            }

            return $facture;
        });

        return response()->json([
            'message' => 'Facture cree.',
            'facture' => $facture->load(['client', 'expeditions']),
        ], 201);
    }

    public function show(Request $request, Facture $facture)
    {
        $this->authorizeAccess($request, $facture);

        return response()->json($facture->load(['client', 'expeditions', 'avoir']));
    }

    public function updateStatus(Request $request, Facture $facture)
    {
        if (! $request->user()->provider || $request->user()->provider->id !== $facture->provider_id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $validated = $request->validate([
            'statut' => ['required', 'in:impayee,payee'],
        ]);

        $facture->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Statut mis a jour.', 'facture' => $facture->fresh()]);
    }

    public function destroy(Request $request, Facture $facture)
    {
        $user = User::with('provider')->find(Auth::id());
        if (! $user?->provider || $facture->provider_id !== $user->provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        if ($facture->avoir()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une facture qui possede un avoir.'], 409);
        }

        DB::transaction(function () use ($facture) {
            $facture->expeditions()->detach();
            $facture->delete();
        });

        return response()->json(['message' => 'Facture supprimee.']);
    }

    public function pdf(Request $request, Facture $facture)
    {
        $this->authorizeAccess($request, $facture);
        $facture->load(['client', 'expeditions', 'provider']);

        $pdf = Pdf::loadView('pdfs.invoice', ['facture' => $facture])
            ->setPaper('a4', 'portrait');

        $safeNumero = str_replace(['/', '\\'], '-', $facture->numero);
        $filename = "facture-{$safeNumero}.pdf";

        return $pdf->download($filename);
    }

    public function byClient(Request $request, Client $client)
    {
        $provider = $request->user()->provider;
        if ($client->provider_id !== $provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        return response()->json(
            $client->factures()
                ->with('expeditions')
                ->orderBy('date_echeance')
                ->orderBy('date_facture')
                ->paginate(25)
        );
    }

    public function unbilledShipments(Request $request)
    {
        $operator = $request->user();
        $provider = $operator->provider;
        $clientId = $request->input('client_id');

        $query = Shipment::query()
            ->where('provider_id', $provider->id)
            ->whereDoesntHave('factureExpedition')
            ->with('client');

        if ($clientId === '' || $clientId === null) {
            $query->whereNull('client_id');
        } else {
            $query->where('client_id', $clientId);
        }

        $shipments = $query->orderByDesc('created_at')->get();

        return response()->json(['data' => $shipments]);
    }

    public function nextNumber(Request $request)
    {
        $seq = $this->nextInvoiceSequence();

        return response()->json([
            'sequence' => $seq['sequence'],
            'year' => $seq['year'],
            'numero' => "FA {$seq['sequence']}/{$seq['year']}",
        ]);
    }

    public function preview(Request $request)
    {
        $validated = $request->validate($this->rules());

        $user = $request->user();
        $provider = $user->provider;
        $year = now()->year;

        $isClientDivers = empty($validated['client_id']);

        $expeditionIds = $validated['expedition_ids'] ?? [];
        $shipments = Shipment::whereIn('id', $expeditionIds)
            ->where('provider_id', $provider->id)
            ->with('client')
            ->get();

        if ($isClientDivers && count($expeditionIds) !== 1) {
            return response()->json(['message' => 'Une facture client divers doit contenir exactement une expedition.'], 422);
        }
        if (! $isClientDivers && count($expeditionIds) < 1) {
            return response()->json(['message' => 'Une facture client en compte doit contenir au moins une expedition.'], 422);
        }

        if ($shipments->count() !== count($expeditionIds)) {
            return response()->json(['message' => 'Une ou plusieurs expeditions selectionnees sont invalides.'], 422);
        }

        [$tauxTva, $nonTaxable, $taxable, $tva, $ttc] = FiscalCalculator::compute(
            $validated['type_destination'],
            (float) $validated['taxable'],
            (float) ($validated['non_taxable'] ?? 0)
        );

        $seq = $this->nextInvoiceSequence();
        $numeroN = (int) ($validated['numero_n'] ?? $seq['sequence']);

        if (Facture::where('annee', $year)->where('numero_n', $numeroN)->exists()) {
            return response()->json([
                'message' => 'Ce numero de facture existe deja pour cette annee.',
            ], 422);
        }

        // Build an unsaved Facture instance with all the relations the Blade view expects.
        $facture = new Facture([
            'provider_id' => $provider->id,
            'client_id' => $validated['client_id'] ?? null,
            'client_divers_nom' => $validated['client_divers_nom'] ?? null,
            'client_divers_adresse' => $validated['client_divers_adresse'] ?? null,
            'client_divers_tel' => $validated['client_divers_tel'] ?? null,
            'client_divers_email' => $validated['client_divers_email'] ?? null,
            'numero_n' => $numeroN,
            'annee' => $year,
            'date_facture' => $validated['date_facture'] ?? now()->toDateString(),
            'date_echeance' => $validated['date_echeance'],
            'type_destination' => $validated['type_destination'],
            'taux_tva' => $tauxTva,
            'non_taxable' => $nonTaxable,
            'taxable' => $taxable,
            'tva' => $tva,
            'ttc' => $ttc,
            'statut' => 'impayee',
        ]);
        $facture->setRelation('provider', $provider);
        $facture->setRelation('client', ! empty($validated['client_id']) ? Client::find($validated['client_id']) : null);
        $facture->setRelation('expeditions', $shipments);

        $pdf = Pdf::loadView('pdfs.invoice', ['facture' => $facture])
            ->setPaper('a4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function authorizeAccess(Request $request, Facture $facture): void
    {
        $user = $request->user();
        if ($user->role === 'prestataire') {
            if ($facture->provider_id !== $user->provider->id) {
                abort(403, 'Acces refuse.');
            }
        } elseif ($user->role === 'client') {
            if ((int) $facture->client_id !== (int) $user->client->id) {
                abort(403, 'Acces refuse.');
            }
        } else {
            abort(403, 'Acces refuse.');
        }
    }

    private function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'client_divers_nom' => ['nullable', 'required_without:client_id', 'string', 'max:255'],
            'client_divers_adresse' => ['nullable', 'string'],
            'client_divers_tel' => ['nullable', 'string', 'max:50'],
            'client_divers_email' => ['nullable', 'email', 'max:255'],
            'expedition_ids' => ['required', 'array', 'min:1'],
            'expedition_ids.*' => ['integer', 'exists:shipments,id'],
            'numero_n' => [
                'nullable',
                'integer',
                'min:1',
            ],
            'date_facture' => ['nullable', 'date'],
            'date_echeance' => ['required', 'date', 'after_or_equal:today'],
            'type_destination' => ['required', 'in:national,international'],
            'non_taxable' => ['nullable', 'numeric', 'min:0'],
            'taxable' => ['required', 'numeric', 'min:0'],
        ];
    }
}
