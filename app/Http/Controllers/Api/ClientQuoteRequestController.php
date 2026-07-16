<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\QuoteRequest;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientQuoteRequestController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $client = $request->user()->client;

        $query = QuoteRequest::query()
            ->with(['quote', 'colis'])
            ->where('client_id', $client->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(recipient_name) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_city) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['created_at', 'statut', 'recipient_name'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $this->validateColis($request);

        $client = $request->user()->client;

        $data = $validated;

        $data['provider_id'] = $client->provider_id;
        $data['client_id'] = $client->id;
        $data['client_name'] = $validated['client_name'] ?? $client->full_name;
        $data['client_email'] = $validated['client_email'] ?? $client->email;
        $data['client_phone'] = $validated['client_phone'] ?? $client->phone;
        $data['client_address'] = $validated['client_address'] ?? $client->address;
        $data['client_city'] = $validated['client_city'] ?? $client->city;
        $data['client_postal_code'] = $validated['client_postal_code'] ?? $client->postal_code;
        $data['client_country'] = $validated['client_country'] ?? $client->country;
        $data['statut'] = 'en_attente';

        // Remove colis from data to handle separately
        $colisData = $validated['colis'] ?? [];

        $quoteRequest = QuoteRequest::create($data);

        // Create colis from new array format
        if (! empty($colisData)) {
            foreach ($colisData as $index => $c) {
                $quoteRequest->colis()->create(array_merge($c, [
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
            $quoteRequest->colis()->create([
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

        return response()->json([
            'message' => 'Demande de devis envoyee.',
            'quote_request' => $quoteRequest->load('quote', 'colis'),
        ], 201);
    }

    public function show(Request $request, QuoteRequest $quoteRequest)
    {
        $this->authorizeAccess($request, $quoteRequest);

        return response()->json($quoteRequest->load('quote', 'client', 'colis'));
    }

    private function authorizeAccess(Request $request, QuoteRequest $quoteRequest): void
    {
        if ((int) $quoteRequest->client_id !== (int) $request->user()->client->id) {
            abort(403, 'Acces refuse.');
        }
    }

    private function rules(): array
    {
        return [
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'client_address' => ['nullable', 'string'],
            'client_city' => ['nullable', 'string', 'max:100'],
            'client_postal_code' => ['nullable', 'string', 'max:20'],
            'client_country' => ['nullable', 'string', 'max:100'],
            'origin_city' => ['nullable', 'string', 'max:100'],
            'origin_country' => ['nullable', 'string', 'max:100'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string'],
            'recipient_city' => ['nullable', 'string', 'max:100'],
            'recipient_postal_code' => ['nullable', 'string', 'max:20'],
            'recipient_country' => ['nullable', 'string', 'max:100'],
            'recipient_phone' => ['nullable', 'string', 'max:50'],
            'recipient_email' => ['nullable', 'email', 'max:255'],
            'colis' => ['nullable', 'array', 'max:32'],
            'colis.*.nb_pieces' => ['nullable', 'integer', 'min:1'],
            'colis.*.poids' => ['nullable', 'numeric', 'min:0'],
            'colis.*.longueur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.largeur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.hauteur' => ['nullable', 'numeric', 'min:0'],
            'colis.*.type_colis' => ['nullable', Rule::in(['document', 'paquet', 'palette'])],
            'colis.*.description_colis' => ['nullable', 'string', 'max:60'],
            // Backward compat - old flat fields (optional if colis array provided)
            'poids' => ['nullable', 'numeric', 'min:0'],
            'longueur' => ['nullable', 'numeric', 'min:0'],
            'largeur' => ['nullable', 'numeric', 'min:0'],
            'hauteur' => ['nullable', 'numeric', 'min:0'],
            'nb_pieces' => ['nullable', 'integer', 'min:1'],
            'type_colis' => ['nullable', Rule::in(['document', 'paquet', 'palette'])],
            'type_service' => ['required', Rule::in(['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage'])],
            'description_colis' => ['nullable', 'string', 'max:60'],
            'valeur_declaree' => ['nullable', 'numeric', 'min:0'],
            'devise_valeur' => ['nullable', 'string', Rule::in(['MAD', 'USD', 'EUR'])],
        ];
    }

    private function validateColis(Request $request): void
    {
        $hasColisArray = ! empty($request->input('colis'));
        // For backward compat: accept if at least poids + type_colis are provided
        $hasBasicFlatFields = $request->filled(['poids', 'type_colis']);
        
        if (! $hasColisArray && ! $hasBasicFlatFields) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'colis' => ['Veuillez fournir au moins un colis (via la liste colis ou les champs poids/longueur/largeur/hauteur).'],
                'poids' => ['Le champ poids est requis quand aucun colis n\'est fourni.'],
                'type_colis' => ['Le champ type_colis est requis quand aucun colis n\'est fourni.'],
            ]);
        }
    }
}
