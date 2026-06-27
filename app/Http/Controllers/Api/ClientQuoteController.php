<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;

class ClientQuoteController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $client = $request->user()->client;

        $query = Quote::query()
            ->with('request')
            ->where('client_id', $client->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(quote_number) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_name) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['quote_number', 'created_at', 'montant_ttc', 'statut'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function show(Request $request, Quote $quote)
    {
        $this->authorizeAccess($request, $quote);

        return response()->json($quote->load('client', 'shipment', 'request'));
    }

    public function updateStatus(Request $request, Quote $quote)
    {
        $this->authorizeAccess($request, $quote);

        if ($quote->statut !== 'envoye') {
            return response()->json(['message' => 'Ce devis ne peut plus etre accepte ou refuse.'], 422);
        }

        $validated = $request->validate([
            'statut' => ['required', 'in:accepte,refuse'],
        ]);

        $quote->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Statut mis a jour.', 'quote' => $quote->fresh()]);
    }

    private function authorizeAccess(Request $request, Quote $quote): void
    {
        if ((int) $quote->client_id !== (int) $request->user()->client->id) {
            abort(403, 'Acces refuse.');
        }
    }
}
