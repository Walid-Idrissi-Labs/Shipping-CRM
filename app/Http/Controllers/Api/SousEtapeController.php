<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\SousEtape;
use Illuminate\Http\Request;

class SousEtapeController extends Controller
{
    public function store(Request $request, Shipment $shipment)
    {
        if ($shipment->provider_id !== $request->user()->provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $validated = $request->validate([
            'statut' => ['required', 'in:information_recue,ramasse,en_transit,en_cours,livre'],
            'description' => ['required', 'string', 'max:60'],
        ]);

        if (in_array($validated['statut'], ['information_recue', 'livre'], true)) {
            return response()->json([
                'message' => 'Les sous-etapes ne sont pas autorisees pour ce statut.',
                'errors' => ['statut' => ['Ce statut ne peut pas avoir de sous-etapes.']],
            ], 422);
        }

        $sousEtape = $shipment->sousEtapes()->create([
            'statut' => $validated['statut'],
            'description' => $validated['description'],
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Sous-etape creee.', 'sous_etape' => $sousEtape], 201);
    }

    public function destroy(SousEtape $sousEtape)
    {
        $shipment = $sousEtape->shipment;

        if ($shipment->provider_id !== request()->user()->provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $sousEtape->delete();

        return response()->json(['message' => 'Sous-etape supprimee.']);
    }
}
