<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Provider;
use App\Models\QuoteRequest;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;

class QuoteRequestController extends Controller
{
    use AppliesSorting;    public function index(Request $request)
    {
        $provider = $request->user()->provider;
        $query = QuoteRequest::query()->with('quote')->where('provider_id', $provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(client_name) like ?', [$q])
                    ->orWhereRaw('LOWER(client_email) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_name) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['client_name', 'created_at', 'statut'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $provider = Provider::first();
        if (! $provider) {
            return response()->json(['message' => 'Aucun prestataire configure.'], 503);
        }

        $data = array_merge($validated, [
            'provider_id' => $provider->id,
            'statut' => 'en_attente',
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

        $quoteRequest = QuoteRequest::create($data);

        return response()->json(['message' => 'Demande de devis envoyee.', 'quote_request' => $quoteRequest], 201);
    }

    public function show(QuoteRequest $quoteRequest)
    {
        return response()->json($quoteRequest->load('quote', 'client'));
    }

    public function markAsTreated(QuoteRequest $quoteRequest)
    {
        $quoteRequest->update(['statut' => 'traitee']);

        return response()->json(['message' => 'Demande marquee comme traitee.', 'quote_request' => $quoteRequest->fresh()]);
    }

    public function destroy(QuoteRequest $quoteRequest)
    {
        $quoteRequest->delete();

        return response()->json(['message' => 'Demande supprimee.']);
    }

    private function rules(): array
    {
        return [
            'client_id' => ['nullable', 'exists:clients,id'],
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
        ];
    }
}
