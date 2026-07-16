<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\EmployeeShipment;
use Illuminate\Http\Request;

class EmployeController extends Controller
{
    public function findByNumber(Request $request)
    {
        $validated = $request->validate([
            'shipping_number' => ['required', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $shipment = Shipment::where('shipping_number', $validated['shipping_number'])
            ->where('provider_id', $user->provider->id)
            ->with(['client', 'suiviStatuts.changedBy', 'sousEtapes'])
            ->firstOrFail();

        $sousEtapesByStatut = $shipment->sousEtapes
            ->sortByDesc('created_at')
            ->groupBy('statut');

        return response()->json([
            'shipment' => $shipment,
            'suivi_statuts' => $shipment->suiviStatuts,
            'sous_etapes' => $sousEtapesByStatut,
        ]);
    }

    public function show(Request $request, Shipment $shipment)
    {
        if ($shipment->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $shipment->load(['client', 'suiviStatuts.changedBy', 'sousEtapes']);

        $sousEtapesByStatut = $shipment->sousEtapes
            ->sortByDesc('created_at')
            ->groupBy('statut');

        return response()->json([
            'shipment' => $shipment,
            'suivi_statuts' => $shipment->suiviStatuts,
            'sous_etapes' => $sousEtapesByStatut,
        ]);
    }

    public function storeTracking(Request $request, Shipment $shipment)
    {
        if ($shipment->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $validated = $request->validate([
            'statut' => ['required', 'in:information_recue,ramasse,en_transit,en_cours,livre'],
            'sous_statut' => ['nullable', 'in:en_cours_de_livraison,tentative_de_livraison,on_hold,retour'],
            'date_statut' => ['required', 'date', 'before_or_equal:now'],
            'description' => ['nullable', 'string', 'max:60'],
        ]);

        if ($validated['statut'] === 'livre') {
            $validated['sous_statut'] = null;
        }

        $repeatable = ['en_cours', 'en_transit'];
        $alreadyUsedStatuses = $shipment->suiviStatuts()->pluck('statut')->all();

        if (!in_array($validated['statut'], $repeatable, true)) {
            if (in_array($validated['statut'], $alreadyUsedStatuses, true)) {
                return response()->json([
                    'message' => 'Ce statut a deja ete enregistre et ne peut plus etre ajoute.',
                    'errors' => ['statut' => ['Ce statut a deja ete enregistre.']],
                ], 422);
            }
        }

        $oldStatus = $shipment->statut_actuel;
        $oldSubStatus = $shipment->sous_statut_actuel;

        $event = $shipment->suiviStatuts()->create([
            'statut' => $validated['statut'],
            'sous_statut' => $validated['sous_statut'] ?? null,
            'date_statut' => $validated['date_statut'],
            'description' => $validated['description'] ?? null,
            'changed_by' => $request->user()->id,
        ]);

        EmployeeShipment::create([
            'employee_id' => $request->user()->id,
            'shipment_id' => $shipment->id,
            'old_status' => $oldStatus,
            'new_status' => $validated['statut'],
            'old_sub_status' => $oldSubStatus,
            'new_sub_status' => $validated['sous_statut'] ?? null,
            'description' => $validated['description'] ?? null,
            'changed_at' => $validated['date_statut'],
        ]);

        return response()->json(['message' => 'Statut ajoute.', 'event' => $event], 201);
    }

    public function history(Request $request)
    {
        $user = $request->user();

        $query = EmployeeShipment::where('employee_id', $user->id)
            ->with(['shipment.client'])
            ->orderByDesc('changed_at');

        $limit = $request->input('limit', 25);

        return response()->json($query->paginate($limit));
    }
}