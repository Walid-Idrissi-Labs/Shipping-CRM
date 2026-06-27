<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\SuiviStatut;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    public function publicTrack($number)
    {
        $shipment = Shipment::where('shipping_number', $number)->with('suiviStatuts')->firstOrFail();

        return response()->json([
            'shipping_number' => $shipment->shipping_number,
            'current_status' => $shipment->statut_actuel,
            'current_sub_status' => $shipment->sous_statut_actuel,
            'sender_name' => $shipment->sender_name,
            'sender_city' => $shipment->sender_city,
            'recipient_name' => $shipment->recipient_name,
            'recipient_city' => $shipment->recipient_city,
            'created_at' => $shipment->created_at,
            'events' => $shipment->suiviStatuts,
        ]);
    }

    public function store(Request $request, Shipment $shipment)
    {
        $validated = $request->validate([
            'statut' => ['required', 'in:information_recue,ramasse,en_transit,en_cours,livre'],
            'sous_statut' => ['nullable', 'in:en_cours_de_livraison,tentative_de_livraison,on_hold,retour'],
            'date_statut' => ['required', 'date', 'before_or_equal:now'],
            'description' => ['nullable', 'string', 'max:60'],
        ]);

        if ($validated['statut'] === 'livre') {
            $validated['sous_statut'] = null;
        }

        if (!in_array($validated['statut'], ['en_cours', 'en_transit'], true)) {
            $alreadyUsedStatuses = $shipment->suiviStatuts()->pluck('statut')->all();
            if (in_array($validated['statut'], $alreadyUsedStatuses, true)) {
                return response()->json([
                    'message' => 'Ce statut a deja ete enregistre et ne peut plus etre ajoute.',
                    'errors' => ['statut' => ['Ce statut a deja ete enregistre.']],
                ], 422);
            }
        }

        $event = $shipment->suiviStatuts()->create([
            'statut' => $validated['statut'],
            'sous_statut' => $validated['sous_statut'] ?? null,
            'date_statut' => $validated['date_statut'],
            'description' => $validated['description'] ?? null,
            'changed_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Statut ajoute.', 'event' => $event], 201);
    }

    public function destroy(SuiviStatut $suiviStatut)
    {
        $shipment = $suiviStatut->shipment;
        $suiviStatut->delete();

        $latest = $shipment->suiviStatuts()->orderByDesc('date_statut')->first();
        $shipment->update([
            'statut_actuel' => $latest?->statut ?? 'information_recue',
            'sous_statut_actuel' => $latest?->sous_statut ?? null,
        ]);

        return response()->json(['message' => 'Evenement supprime.']);
    }

    public function timeline(Request $request, Shipment $shipment)
    {
        $user = $request->user();
        if ($user->role === 'client' && (int) $shipment->client_id !== (int) $user->client->id) {
            abort(403, 'Acces refuse.');
        }
        if ($user->role === 'prestataire' && $shipment->provider_id !== $user->provider->id) {
            abort(403, 'Acces refuse.');
        }

        return response()->json([
            'shipment' => $shipment,
            'events' => $shipment->suiviStatuts()->with('changedBy')->orderBy('date_statut')->get(),
        ]);
    }
}
