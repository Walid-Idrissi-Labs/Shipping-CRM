<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chauffeur;
use App\Models\ChauffeurTypeVehicule;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ChauffeurController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $query = Chauffeur::query()
            ->with('typesVehicules')
            ->where('provider_id', $request->user()->provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(nom_complet) like ?', [$q])
                    ->orWhereRaw('LOWER(telephone) like ?', [$q])
                    ->orWhereRaw('LOWER(email) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['nom_complet', 'telephone', 'email', 'statut', 'created_at'],
            'nom_complet',
            'asc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());
        $typesVehicules = $validated['types_vehicules'] ?? [];
        unset($validated['types_vehicules']);

        $chauffeur = DB::transaction(function () use ($validated, $typesVehicules, $request) {
            $chauffeur = Chauffeur::create(array_merge($validated, [
                'provider_id' => $request->user()->provider->id,
                'statut' => $validated['statut'] ?? 'actif',
            ]));

            foreach ($typesVehicules as $type) {
                ChauffeurTypeVehicule::create([
                    'chauffeur_id' => $chauffeur->id,
                    'type_vehicule' => $type,
                ]);
            }

            return $chauffeur;
        });

        return response()->json([
            'message' => 'Chauffeur cree.',
            'chauffeur' => $chauffeur->load('typesVehicules'),
        ], 201);
    }

    public function show(Request $request, Chauffeur $driver)
    {
        $this->authorizeAccess($request, $driver);

        $driver->load('typesVehicules', 'affectations.expeditions');

        return response()->json([
            'chauffeur' => $driver,
            'qualified_types' => $driver->qualifiedTypes(),
        ]);
    }

    public function update(Request $request, Chauffeur $driver)
    {
        $this->authorizeAccess($request, $driver);

        $validated = $request->validate($this->rules(true));
        $typesVehicules = $validated['types_vehicules'] ?? null;
        unset($validated['types_vehicules']);

        DB::transaction(function () use ($driver, $validated, $typesVehicules) {
            $driver->update($validated);

            if (is_array($typesVehicules)) {
                $driver->typesVehicules()->delete();
                foreach ($typesVehicules as $type) {
                    ChauffeurTypeVehicule::create([
                        'chauffeur_id' => $driver->id,
                        'type_vehicule' => $type,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Chauffeur mis a jour.',
            'chauffeur' => $driver->fresh()->load('typesVehicules'),
        ]);
    }

    public function destroy(Request $request, Chauffeur $driver)
    {
        $this->authorizeAccess($request, $driver);

        if ($driver->statut === 'en_mission') {
            return response()->json(['message' => 'Impossible de supprimer un chauffeur en mission.'], 409);
        }

        $driver->delete();

        return response()->json(['message' => 'Chauffeur supprime.']);
    }

    public function active(Request $request)
    {
        $chauffeurs = Chauffeur::query()
            ->with('typesVehicules')
            ->where('provider_id', $request->user()->provider->id)
            ->where('statut', 'actif')
            ->orderBy('nom_complet')
            ->get();

        return response()->json(['data' => $chauffeurs]);
    }

    private function rules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        return [
            'nom_complet' => [$required, 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'photo_url' => ['nullable', 'string', 'max:500'],
            'statut' => ['nullable', Rule::in(['actif', 'en_mission', 'en_conge'])],
            'types_vehicules' => ['array'],
            'types_vehicules.*' => [Rule::in([
                'camionnette_fourgon_leger',
                'fourgon_grand_volume',
                'camion_porteur',
                'semi_remorque_tracteur',
                'vehicule_frigorifique',
                'moto_scooter',
                'utilitaire_bache_plateau',
            ])],
        ];
    }

    private function authorizeAccess(Request $request, Chauffeur $driver): void
    {
        if ($driver->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }
    }
}
