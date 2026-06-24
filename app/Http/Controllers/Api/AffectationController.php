<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\AffectationExpedition;
use App\Models\Chauffeur;
use App\Models\Client;
use App\Models\Shipment;
use App\Models\Vehicule;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AffectationController extends Controller
{
    use AppliesSorting;
    public function index(Request $request)
    {
        $query = Affectation::query()
            ->with(['chauffeur', 'vehicule', 'client', 'expeditions'])
            ->where('provider_id', $request->user()->provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('date_heure_depart', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('date_heure_depart', '<=', $to);
        }

        if ($chauffeurId = $request->input('chauffeur_id')) {
            $query->where('chauffeur_id', $chauffeurId);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where(function ($q) use ($clientId) {
                $q->where('client_id', $clientId)
                    ->orWhereHas('expeditions', fn ($qq) => $qq->where('client_id', $clientId));
            });
        }

        $this->applySort(
            $query,
            $request,
            ['date_heure_depart', 'date_heure_arrivee', 'statut', 'created_at'],
            'date_heure_depart',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $chauffeur = Chauffeur::find($validated['chauffeur_id'] ?? null);
        $vehicule = Vehicule::find($validated['vehicule_id'] ?? null);

        if ($chauffeur && $chauffeur->provider_id !== $request->user()->provider->id) {
            return response()->json(['message' => 'Chauffeur invalide.'], 422);
        }
        if ($vehicule && $vehicule->provider_id !== $request->user()->provider->id) {
            return response()->json(['message' => 'Vehicule invalide.'], 422);
        }

        if ($vehicule && $vehicule->statut !== 'disponible') {
            return response()->json(['message' => 'Le vehicule selectionne n\'est pas disponible.'], 409);
        }

        if ($chauffeur && $chauffeur->statut !== 'actif') {
            return response()->json(['message' => 'Le chauffeur selectionne n\'est pas actif.'], 409);
        }

        if ($vehicule && $chauffeur) {
            $qualifiedTypes = $chauffeur->qualifiedTypes();
            if (! in_array($vehicule->type_vehicule, $qualifiedTypes, true)) {
                return response()->json([
                    'message' => 'Le vehicule selectionne n\'est pas compatible avec les habilitations du chauffeur.',
                ], 422);
            }
        }

        $expeditionIds = $validated['expedition_ids'] ?? [];
        if (! empty($expeditionIds)) {
            $count = Shipment::whereIn('id', $expeditionIds)
                ->where('provider_id', $request->user()->provider->id)
                ->count();
            if ($count !== count($expeditionIds)) {
                return response()->json(['message' => 'Une ou plusieurs expeditions sont invalides.'], 422);
            }
        }

        $clientId = null;
        if (! empty($expeditionIds)) {
            $firstShipment = Shipment::whereIn('id', $expeditionIds)->first();
            $clientId = $firstShipment?->client_id;
        }

        $affectation = DB::transaction(function () use ($validated, $expeditionIds, $clientId, $request) {
            $affectation = Affectation::create([
                'provider_id' => $request->user()->provider->id,
                'chauffeur_id' => $validated['chauffeur_id'] ?? null,
                'vehicule_id' => $validated['vehicule_id'] ?? null,
                'client_id' => $clientId,
                'ville_depart' => $validated['ville_depart'],
                'pays_depart' => $validated['pays_depart'],
                'date_heure_depart' => $validated['date_heure_depart'],
                'ville_arrivee' => $validated['ville_arrivee'] ?? null,
                'pays_arrivee' => $validated['pays_arrivee'] ?? null,
                'date_heure_arrivee' => $validated['date_heure_arrivee'] ?? null,
                'statut' => 'planifiee',
            ]);

            foreach ($expeditionIds as $expeditionId) {
                AffectationExpedition::create([
                    'affectation_id' => $affectation->id,
                    'expedition_id' => $expeditionId,
                ]);
            }

            return $affectation;
        });

        return response()->json([
            'message' => 'Affectation cree.',
            'affectation' => $affectation->load(['chauffeur', 'vehicule', 'client', 'expeditions']),
        ], 201);
    }

    public function show(Request $request, Affectation $assignment)
    {
        $this->authorizeAccess($request, $assignment);

        return response()->json([
            'affectation' => $assignment->load(['chauffeur', 'vehicule', 'client', 'expeditions']),
        ]);
    }

    public function update(Request $request, Affectation $assignment)
    {
        $this->authorizeAccess($request, $assignment);

        $validated = $request->validate([
            'ville_depart' => ['sometimes', 'string', 'max:100'],
            'pays_depart' => ['sometimes', 'string', 'max:100'],
            'date_heure_depart' => ['sometimes', 'date'],
            'ville_arrivee' => ['nullable', 'string', 'max:100'],
            'pays_arrivee' => ['nullable', 'string', 'max:100'],
            'date_heure_arrivee' => ['nullable', 'date'],
            'chauffeur_id' => ['nullable', 'integer', 'exists:chauffeurs,id'],
            'vehicule_id' => ['nullable', 'integer', 'exists:vehicules,id'],
        ]);

        $assignment->update($validated);

        return response()->json([
            'message' => 'Affectation mise a jour.',
            'affectation' => $assignment->fresh()->load(['chauffeur', 'vehicule', 'expeditions']),
        ]);
    }

    public function updateStatus(Request $request, Affectation $assignment)
    {
        $this->authorizeAccess($request, $assignment);

        $validated = $request->validate([
            'statut' => ['required', Rule::in(['planifiee', 'en_cours', 'terminee', 'annulee'])],
        ]);

        $oldStatut = $assignment->statut;
        $assignment->update(['statut' => $validated['statut']]);

        if (in_array($validated['statut'], ['terminee', 'annulee'], true) && $oldStatut !== $validated['statut']) {
            if ($assignment->vehicule_id && in_array($oldStatut, ['planifiee', 'en_cours'], true)) {
                Vehicule::where('id', $assignment->vehicule_id)->update(['statut' => 'disponible']);
            }
            if ($assignment->chauffeur_id && in_array($oldStatut, ['planifiee', 'en_cours'], true)) {
                Chauffeur::where('id', $assignment->chauffeur_id)->update(['statut' => 'actif']);
            }
        }

        return response()->json([
            'message' => 'Statut mis a jour.',
            'affectation' => $assignment->fresh()->load(['chauffeur', 'vehicule', 'expeditions']),
        ]);
    }

    public function today(Request $request)
    {
        $affectations = Affectation::query()
            ->with(['chauffeur', 'vehicule', 'client', 'expeditions'])
            ->where('provider_id', $request->user()->provider->id)
            ->whereDate('date_heure_depart', today())
            ->whereIn('statut', ['planifiee', 'en_cours'])
            ->orderBy('date_heure_depart')
            ->get();

        return response()->json(['data' => $affectations]);
    }

    public function unassignedShipments(Request $request)
    {
        $assignedIds = DB::table('affectation_expeditions')
            ->join('affectations', 'affectations.id', '=', 'affectation_expeditions.affectation_id')
            ->whereIn('affectations.statut', ['planifiee', 'en_cours'])
            ->pluck('affectation_expeditions.expedition_id')
            ->toArray();

        $shipments = Shipment::query()
            ->where('provider_id', $request->user()->provider->id)
            ->whereNotIn('id', $assignedIds ?: [0])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $shipments]);
    }

    public function byClient(Request $request, Client $client)
    {
        if ($client->provider_id !== $request->user()->provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $affectations = Affectation::query()
            ->with(['chauffeur', 'vehicule', 'expeditions'])
            ->where('provider_id', $request->user()->provider->id)
            ->where(function ($q) use ($client) {
                $q->where('client_id', $client->id)
                    ->orWhereHas('expeditions', fn ($qq) => $qq->where('client_id', $client->id));
            })
            ->orderByDesc('date_heure_depart')
            ->get();

        return response()->json(['data' => $affectations]);
    }

    private function rules(): array
    {
        return [
            'chauffeur_id' => ['nullable', 'integer', 'exists:chauffeurs,id'],
            'vehicule_id' => ['nullable', 'integer', 'exists:vehicules,id'],
            'ville_depart' => ['required', 'string', 'max:100'],
            'pays_depart' => ['required', 'string', 'max:100'],
            'date_heure_depart' => ['required', 'date'],
            'ville_arrivee' => ['nullable', 'string', 'max:100'],
            'pays_arrivee' => ['nullable', 'string', 'max:100'],
            'date_heure_arrivee' => ['nullable', 'date'],
            'expedition_ids' => ['array'],
            'expedition_ids.*' => ['integer', 'exists:shipments,id'],
        ];
    }

    private function authorizeAccess(Request $request, Affectation $assignment): void
    {
        if ($assignment->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }
    }
}
