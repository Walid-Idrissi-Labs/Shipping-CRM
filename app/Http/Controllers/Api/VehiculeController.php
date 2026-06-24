<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehiculeController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $query = Vehicule::query()
            ->where('provider_id', $request->user()->provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($type = $request->input('type_vehicule')) {
            $query->where('type_vehicule', $type);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(immatriculation) like ?', [$q])
                    ->orWhereRaw('LOWER(marque_modele) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['immatriculation', 'marque_modele', 'annee_fabrication', 'type_vehicule', 'statut', 'created_at'],
            'immatriculation',
            'asc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $vehicule = Vehicule::create(array_merge($validated, [
            'provider_id' => $request->user()->provider->id,
            'statut' => $validated['statut'] ?? 'disponible',
        ]));

        return response()->json([
            'message' => 'Vehicule cree.',
            'vehicule' => $vehicule,
            'alerts' => $vehicule->documentAlerts(),
        ], 201);
    }

    public function show(Request $request, Vehicule $vehicle)
    {
        $this->authorizeAccess($request, $vehicle);

        return response()->json([
            'vehicule' => $vehicle,
            'alerts' => $vehicle->documentAlerts(),
            'affectations' => $vehicle->affectations()->with('chauffeur', 'expeditions')->latest()->limit(10)->get(),
        ]);
    }

    public function update(Request $request, Vehicule $vehicle)
    {
        $this->authorizeAccess($request, $vehicle);

        $validated = $request->validate($this->rules(updating: true));

        $vehicle->update($validated);

        return response()->json([
            'message' => 'Vehicule mis a jour.',
            'vehicule' => $vehicle,
            'alerts' => $vehicle->documentAlerts(),
        ]);
    }

    public function destroy(Request $request, Vehicule $vehicle)
    {
        $this->authorizeAccess($request, $vehicle);

        if ($vehicle->statut === 'en_mission') {
            return response()->json(['message' => 'Impossible de supprimer un vehicule en mission.'], 409);
        }

        $vehicle->delete();

        return response()->json(['message' => 'Vehicule supprime.']);
    }

    public function available(Request $request)
    {
        $vehicules = Vehicule::query()
            ->where('provider_id', $request->user()->provider->id)
            ->where('statut', 'disponible')
            ->orderBy('immatriculation')
            ->get();

        return response()->json(['data' => $vehicules]);
    }

    private function rules(bool $updating = false): array
    {
        $immatRule = Rule::unique('vehicules', 'immatriculation');
        if ($updating) {
            $immatRule = $immatRule->ignore(request()->route('vehicle')?->id);
        }
        $required = $updating ? 'sometimes' : 'required';

        return [
            'immatriculation' => [$required, 'string', 'max:50', $immatRule],
            'marque_modele' => ['nullable', 'string', 'max:255'],
            'annee_circulation' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'couleur' => ['nullable', 'string', 'max:50'],
            'photo_url' => ['nullable', 'string', 'max:500'],
            'type_vehicule' => [$required, Rule::in([
                'camionnette_fourgon_leger',
                'fourgon_grand_volume',
                'camion_porteur',
                'semi_remorque_tracteur',
                'vehicule_frigorifique',
                'moto_scooter',
                'utilitaire_bache_plateau',
            ])],
            'statut' => ['nullable', Rule::in(['disponible', 'en_mission', 'en_maintenance', 'hors_service'])],
            'exp_controle_technique' => ['nullable', 'date'],
            'exp_assurance' => ['nullable', 'date'],
            'exp_carte_grise' => ['nullable', 'date'],
        ];
    }

    private function authorizeAccess(Request $request, Vehicule $vehicle): void
    {
        if ($vehicle->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }
    }
}
