<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $provider = $request->user()->provider;
        $query = Quote::query()->with(['client', 'request'])->where('provider_id', $provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(quote_number) like ?', [$q])
                    ->orWhereRaw('LOWER(client_name) like ?', [$q])
                    ->orWhereRaw('LOWER(client_email) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['quote_number', 'created_at', 'client_name', 'type_service', 'montant_ttc', 'statut'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $provider = $request->user()->provider;

        return $this->createQuote($validated, $provider->id);
    }

    public function createFromRequest(Request $request, QuoteRequest $quoteRequest)
    {
        $validated = $request->validate([
            'montant_ht' => ['required', 'numeric', 'min:0'],
            'montant_ttc' => ['required', 'numeric', 'min:0'],
        ]);

        $provider = $request->user()->provider;

        $seq = $this->nextQuoteSequence();

        $data = [
            'provider_id' => $provider->id,
            'client_id' => $quoteRequest->client_id,
            'quote_year' => $seq['year'],
            'quote_sequence' => $seq['sequence'],
            'quote_number' => "DE {$seq['sequence']}/{$seq['year']}",
            'statut' => 'envoye',
            'client_name' => $quoteRequest->client_name,
            'client_address' => $quoteRequest->client_address,
            'client_city' => $quoteRequest->client_city,
            'client_postal_code' => $quoteRequest->client_postal_code,
            'client_country' => $quoteRequest->client_country,
            'client_email' => $quoteRequest->client_email,
            'client_phone' => $quoteRequest->client_phone,
            'recipient_name' => $quoteRequest->recipient_name,
            'recipient_company' => $quoteRequest->recipient_company,
            'recipient_address' => $quoteRequest->recipient_address,
            'recipient_city' => $quoteRequest->recipient_city,
            'recipient_postal_code' => $quoteRequest->recipient_postal_code,
            'recipient_country' => $quoteRequest->recipient_country,
            'recipient_phone' => $quoteRequest->recipient_phone,
            'poids' => $quoteRequest->poids,
            'longueur' => $quoteRequest->longueur,
            'largeur' => $quoteRequest->largeur,
            'hauteur' => $quoteRequest->hauteur,
            'nb_pieces' => $quoteRequest->nb_pieces,
            'type_colis' => $quoteRequest->type_colis,
            'type_service' => $quoteRequest->type_service,
            'description_colis' => $quoteRequest->description_colis,
            'montant_ht' => $validated['montant_ht'],
            'montant_ttc' => $validated['montant_ttc'],
        ];

        $quote = Quote::create($data);

        $quoteRequest->update(['quote_id' => $quote->id, 'statut' => 'traitee']);

        return response()->json(['message' => 'Devis cree a partir de la demande.', 'quote' => $quote->load('client')], 201);
    }

    private function createQuote(array $validated, int $providerId)
    {
        $seq = $this->nextQuoteSequence();

        $data = array_merge($validated, [
            'provider_id' => $providerId,
            'quote_year' => $seq['year'],
            'quote_sequence' => $seq['sequence'],
            'quote_number' => "DE {$seq['sequence']}/{$seq['year']}",
            'statut' => 'envoye',
        ]);

        if (! empty($validated['client_id'])) {
            $client = Client::findOrFail($validated['client_id']);
            $data['client_name'] = $client->full_name;
            $data['client_address'] = $client->address;
            $data['client_city'] = $client->city;
            $data['client_postal_code'] = $client->postal_code;
            $data['client_country'] = $client->country;
            $data['client_email'] = $client->email;
            $data['client_phone'] = $client->phone;
        }

        $quote = Quote::create($data);

        if (! empty($validated['quote_request_id'])) {
            $quoteRequest = QuoteRequest::find($validated['quote_request_id']);
            if ($quoteRequest) {
                $quoteRequest->update(['quote_id' => $quote->id, 'statut' => 'traitee']);
            }
        }

        return response()->json(['message' => 'Devis cree.', 'quote' => $quote->load('client')], 201);
    }

    public function show(Quote $quote)
    {
        return response()->json($quote->load('client', 'shipment', 'request'));
    }

    public function update(Request $request, Quote $quote)
    {
        if ($quote->statut !== 'envoye') {
            return response()->json(['message' => 'Seuls les devis en statut envoye peuvent etre modifies.'], 422);
        }

        $validated = $request->validate($this->rules());
        $quote->update($validated);

        return response()->json(['message' => 'Devis mis a jour.', 'quote' => $quote->fresh()]);
    }

    public function updateStatus(Request $request, Quote $quote)
    {
        $validated = $request->validate([
            'statut' => ['required', 'in:envoye,accepte,refuse'],
        ]);

        $quote->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Statut mis a jour.', 'quote' => $quote->fresh()]);
    }

    public function destroy(Quote $quote)
    {
        $quote->delete();

        return response()->json(['message' => 'Devis supprime.']);
    }

    private function rules(): array
    {
        return [
            'client_id' => ['nullable', 'exists:clients,id'],
            'quote_request_id' => ['nullable', 'exists:quote_requests,id'],
            'client_name' => ['required_without:client_id', 'string', 'max:255'],
            'client_address' => ['nullable', 'string'],
            'client_city' => ['nullable', 'string', 'max:100'],
            'client_postal_code' => ['nullable', 'string', 'max:20'],
            'client_country' => ['nullable', 'string', 'max:100'],
            'client_email' => ['required_without:client_id', 'email', 'max:255'],
            'client_phone' => ['required_without:client_id', 'string', 'max:50'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string'],
            'recipient_city' => ['nullable', 'string', 'max:100'],
            'recipient_postal_code' => ['nullable', 'string', 'max:20'],
            'recipient_country' => ['nullable', 'string', 'max:100'],
            'recipient_phone' => ['nullable', 'string', 'max:50'],
            'poids' => ['nullable', 'numeric', 'min:0'],
            'longueur' => ['nullable', 'numeric', 'min:0'],
            'largeur' => ['nullable', 'numeric', 'min:0'],
            'hauteur' => ['nullable', 'numeric', 'min:0'],
            'nb_pieces' => ['nullable', 'integer', 'min:1'],
            'type_colis' => ['nullable', 'in:document,paquet,palette'],
            'type_service' => ['required', 'in:national,international_express_dap,fret_aerien,routier_groupage,maritime_groupage'],
            'description_colis' => ['nullable', 'string', 'max:60'],
            'montant_ht' => ['nullable', 'numeric', 'min:0'],
            'montant_ttc' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
