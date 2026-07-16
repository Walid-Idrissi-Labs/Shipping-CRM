<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Colis;
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
        $query = Quote::query()->with(['client', 'request', 'colis'])->where('provider_id', $provider->id);

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

        $this->validateColis($request);

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
            'origin_city' => $quoteRequest->origin_city,
            'origin_country' => $quoteRequest->origin_country,
            'client_email' => $quoteRequest->client_email,
            'client_phone' => $quoteRequest->client_phone,
            'recipient_name' => $quoteRequest->recipient_name,
            'recipient_company' => $quoteRequest->recipient_company,
            'recipient_address' => $quoteRequest->recipient_address,
            'recipient_city' => $quoteRequest->recipient_city,
            'recipient_postal_code' => $quoteRequest->recipient_postal_code,
            'recipient_country' => $quoteRequest->recipient_country,
            'recipient_phone' => $quoteRequest->recipient_phone,
            'type_service' => $quoteRequest->type_service,
            'valeur_declaree' => $quoteRequest->valeur_declaree,
            'devise_valeur' => $quoteRequest->devise_valeur,
            'montant_ht' => $validated['montant_ht'],
            'montant_ttc' => $validated['montant_ttc'],
        ];

        $quote = Quote::create($data);

        // Copy colis from QuoteRequest to Quote
        foreach ($quoteRequest->colis as $index => $colis) {
            $quote->colis()->create([
                'position' => $index,
                'nb_pieces' => $colis->nb_pieces,
                'poids' => $colis->poids,
                'longueur' => $colis->longueur,
                'largeur' => $colis->largeur,
                'hauteur' => $colis->hauteur,
                'type_colis' => $colis->type_colis,
                'description_colis' => $colis->description_colis,
            ]);
        }
        // Backward compat: if QuoteRequest has old flat fields but no colis, create one colis
        if ($quoteRequest->colis->isEmpty() && (
            $quoteRequest->poids || $quoteRequest->longueur || $quoteRequest->largeur || 
            $quoteRequest->hauteur || $quoteRequest->nb_pieces || $quoteRequest->type_colis || $quoteRequest->description_colis
        )) {
            $quote->colis()->create([
                'position' => 0,
                'nb_pieces' => $quoteRequest->nb_pieces ?? 1,
                'poids' => $quoteRequest->poids ?? 0,
                'longueur' => $quoteRequest->longueur,
                'largeur' => $quoteRequest->largeur,
                'hauteur' => $quoteRequest->hauteur,
                'type_colis' => $quoteRequest->type_colis ?? 'paquet',
                'description_colis' => $quoteRequest->description_colis,
            ]);
        }

        $quoteRequest->update(['quote_id' => $quote->id, 'statut' => 'traitee']);

        return response()->json(['message' => 'Devis cree a partir de la demande.', 'quote' => $quote->load('client', 'colis')], 201);
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
        
        // Include origin fields if provided
        if (isset($validated['origin_city'])) {
            $data['origin_city'] = $validated['origin_city'];
        }
        if (isset($validated['origin_country'])) {
            $data['origin_country'] = $validated['origin_country'];
        }

        // Remove colis from data to handle separately
        $colisData = $validated['colis'] ?? [];

        $quote = Quote::create($data);

        if (! empty($validated['quote_request_id'])) {
            $quoteRequest = QuoteRequest::find($validated['quote_request_id']);
            if ($quoteRequest) {
                $quoteRequest->update(['quote_id' => $quote->id, 'statut' => 'traitee']);
            }
        }

        // Create colis from new array format
        if (! empty($colisData)) {
            foreach ($colisData as $index => $c) {
                $quote->colis()->create(array_merge($c, [
                    'position' => $index,
                    'nb_pieces' => $c['nb_pieces'] ?? 1,
                    'poids' => $c['poids'] ?? 0,
                    'type_colis' => $c['type_colis'] ?? 'paquet',
                ]));
            }
        }
        // Backward compat: if old flat fields provided, create single colis
        elseif (
            isset($validated['poids']) || isset($validated['longueur']) || isset($validated['largeur']) ||
            isset($validated['hauteur']) || isset($validated['nb_pieces']) || isset($validated['type_colis']) || isset($validated['description_colis'])
        ) {
            $quote->colis()->create([
                'position' => 0,
                'nb_pieces' => $validated['nb_pieces'] ?? 1,
                'poids' => $validated['poids'] ?? 0,
                'longueur' => $validated['longueur'] ?? null,
                'largeur' => $validated['largeur'] ?? null,
                'hauteur' => $validated['hauteur'] ?? null,
                'type_colis' => $validated['type_colis'] ?? 'paquet',
                'description_colis' => $validated['description_colis'] ?? null,
            ]);
        }

        return response()->json(['message' => 'Devis cree.', 'quote' => $quote->load('client', 'colis')], 201);
    }

    public function show(Quote $quote)
    {
        return response()->json($quote->load('client', 'shipment', 'request', 'colis'));
    }

    public function update(Request $request, Quote $quote)
    {
        if ($quote->statut !== 'envoye') {
            return response()->json(['message' => 'Seuls les devis en statut envoye peuvent etre modifies.'], 422);
        }

        $validated = $request->validate($this->rules());

        $this->validateColis($request);

        // Sync colis
        $colisData = $validated['colis'] ?? [];
        
        if (! empty($colisData)) {
            // Delete existing colis and recreate
            $quote->colis()->delete();
            foreach ($colisData as $index => $c) {
                $quote->colis()->create(array_merge($c, [
                    'position' => $index,
                    'nb_pieces' => $c['nb_pieces'] ?? 1,
                    'poids' => $c['poids'] ?? 0,
                    'type_colis' => $c['type_colis'] ?? 'paquet',
                ]));
            }
        }
        // Backward compat: if flat fields provided (and no colis array), update/create single colis
        elseif (
            isset($validated['poids']) || isset($validated['longueur']) || isset($validated['largeur']) ||
            isset($validated['hauteur']) || isset($validated['nb_pieces']) || isset($validated['type_colis']) || isset($validated['description_colis'])
        ) {
            $quote->colis()->delete();
            $quote->colis()->create([
                'position' => 0,
                'nb_pieces' => $validated['nb_pieces'] ?? 1,
                'poids' => $validated['poids'] ?? 0,
                'longueur' => $validated['longueur'] ?? null,
                'largeur' => $validated['largeur'] ?? null,
                'hauteur' => $validated['hauteur'] ?? null,
                'type_colis' => $validated['type_colis'] ?? 'paquet',
                'description_colis' => $validated['description_colis'] ?? null,
            ]);
        }

        $quote->update($validated);

        return response()->json(['message' => 'Devis mis a jour.', 'quote' => $quote->fresh()->load('colis')]);
    }

    public function updateStatus(Request $request, Quote $quote)
    {
        $validated = $request->validate([
            'statut' => ['required', 'in:envoye,accepte,refuse'],
        ]);

        $quote->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Statut mis a jour.', 'quote' => $quote->fresh()->load('colis')]);
    }

    public function destroy(Quote $quote)
    {
        $quote->delete();

        return response()->json(['message' => 'Devis supprime.']);
    }

    public function generateLink(Request $request, Quote $quote)
    {
        if ($quote->statut !== 'accepte') {
            return response()->json(['message' => 'Seuls les devis acceptes peuvent generer un lien.'], 422);
        }

        if ($quote->client_id) {
            return response()->json(['message' => 'Ce devis appartient a un client connecte.'], 422);
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = now()->addDays(60);

        $quote->update([
            'public_link_token' => $token,
            'public_link_expires_at' => $expiresAt,
        ]);

        $url = url('/completer-expedition/' . $token);

        return response()->json([
            'message' => 'Lien genere avec succes.',
            'token' => $token,
            'url' => $url,
            'expires_at' => $expiresAt,
        ]);
    }

    public function cancelLink(Request $request, Quote $quote)
    {
        if ($quote->client_id) {
            return response()->json(['message' => 'Ce devis appartient a un client connecte.'], 422);
        }

        $quote->update([
            'public_link_token' => null,
            'public_link_expires_at' => null,
        ]);

        return response()->json(['message' => 'Lien annule.']);
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
            'origin_city' => ['nullable', 'string', 'max:100'],
            'origin_country' => ['nullable', 'string', 'max:100'],
            'client_email' => ['required_without:client_id', 'email', 'max:255'],
            'client_phone' => ['required_without:client_id', 'string', 'max:50'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string'],
            'recipient_city' => ['nullable', 'string', 'max:100'],
            'recipient_postal_code' => ['nullable', 'string', 'max:20'],
            'recipient_country' => ['nullable', 'string', 'max:100'],
            'recipient_phone' => ['nullable', 'string', 'max:50'],
            'colis' => ['nullable', 'array', 'max:32'],
            'colis.*.nb_pieces' => ['nullable', 'integer', 'min:1'],
            'colis.*.poids' => ['nullable', 'numeric', 'min:0'],
            'colis.*.longueur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.largeur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.hauteur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.type_colis' => ['nullable', 'in:document,paquet,palette'],
            'colis.*.description_colis' => ['nullable', 'string', 'max:60'],
            // Backward compat - old flat fields (optional if colis array provided)
            'poids' => ['nullable', 'numeric', 'min:0'],
            'longueur' => ['nullable', 'numeric', 'min:0'],
            'largeur' => ['nullable', 'numeric', 'min:0'],
            'hauteur' => ['nullable', 'numeric', 'min:0'],
            'nb_pieces' => ['nullable', 'integer', 'min:1'],
            'type_colis' => ['nullable', 'in:document,paquet,palette'],
            'description_colis' => ['nullable', 'string', 'max:60'],
            'type_service' => ['required', 'in:national,international_express_dap,fret_aerien,routier_groupage,maritime_groupage'],
            'valeur_declaree' => ['nullable', 'numeric', 'min:0'],
            'devise_valeur' => ['nullable', 'string', 'in:MAD,USD,EUR'],
            'montant_ht' => ['nullable', 'numeric', 'min:0'],
            'montant_ttc' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function validateColis(Request $request): void
    {
        $hasColisArray = ! empty($request->input('colis'));
        $hasFlatFields = $request->filled(['poids', 'longueur', 'largeur', 'hauteur']);
        
        if (! $hasColisArray && ! $hasFlatFields) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'colis' => ['Veuillez fournir au moins un colis (via la liste colis ou les champs poids/longueur/largeur/hauteur).'],
                'poids' => ['Le champ poids est requis quand aucun colis n\'est fourni.'],
                'longueur' => ['Le champ longueur est requis quand aucun colis n\'est fourni.'],
                'largeur' => ['Le champ largeur est requis quand aucun colis n\'est fourni.'],
                'hauteur' => ['Le champ hauteur est requis quand aucun colis n\'est fourni.'],
            ]);
        }
    }
}
