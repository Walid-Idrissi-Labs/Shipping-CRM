<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Colis;
use App\Models\Provider;
use App\Models\QuoteRequest;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;

class QuoteRequestController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $provider = $request->user()->provider;
        $query = QuoteRequest::query()->with(['quote', 'colis'])->where('provider_id', $provider->id);

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

    private function rules(): array
    {
        return [
            'client_id' => ['nullable', 'exists:clients,id'],
            'client_name' => ['required_without:client_id', 'string', 'max:255'],
            'client_address' => ['nullable', 'string'],
            'client_city' => ['nullable', 'string', 'max:100'],
            'client_postal_code' => ['nullable', 'string', 'max:20'],
            'client_country' => ['nullable', 'string', 'max:100'],
            'origin_city' => ['nullable', 'string', 'max:100'],
            'origin_country' => ['nullable', 'string', 'max:100'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'recipient_name' => ['nullable', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['required_without:client_id', 'nullable', 'string'],
            'recipient_city' => ['required_without:client_id', 'nullable', 'string', 'max:100'],
            'recipient_postal_code' => ['required_without:client_id', 'nullable', 'string', 'max:20'],
            'recipient_country' => ['required_without:client_id', 'nullable', 'string', 'max:100'],
            'recipient_phone' => ['nullable', 'string', 'max:50'],
            'recipient_email' => ['nullable', 'email', 'max:255'],
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

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $this->validateColis($request);

        if (empty($validated['client_id'])) {
            $hasEmail = ! empty($validated['client_email']);
            $hasPhone = ! empty($validated['client_phone']);
            if (! $hasEmail && ! $hasPhone) {
                return response()->json([
                    'message' => 'Veuillez renseigner au moins un email ou numero de telephone.',
                    'errors' => [
                        'client_email' => ['Veuillez renseigner au moins un email ou numero de telephone.'],
                        'client_phone' => ['Veuillez renseigner au moins un email ou numero de telephone.'],
                    ],
                ], 422);
            }
        }

        $provider = Provider::first();
        if (! $provider) {
            return response()->json(['message' => 'Configuration incomplete. Veuillez nous contacter.'], 503);
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

        return response()->json(['message' => 'Demande de devis envoyee.', 'quote_request' => $quoteRequest->load('colis')], 201);
    }

    public function show(Request $request, QuoteRequest $quoteRequest)
    {
        $this->authorizeAccess($request, $quoteRequest);

        return response()->json($quoteRequest->load(['quote', 'client', 'colis']));
    }

    public function markAsTreated(Request $request, QuoteRequest $quoteRequest)
    {
        $this->authorizeAccess($request, $quoteRequest);

        $quoteRequest->update(['statut' => 'traitee']);

        return response()->json(['message' => 'Demande marquee comme traitee.', 'quote_request' => $quoteRequest->fresh()->load('colis')]);
    }

    public function destroy(Request $request, QuoteRequest $quoteRequest)
    {
        $this->authorizeAccess($request, $quoteRequest);

        $quoteRequest->delete();

        return response()->json(['message' => 'Demande supprimee.']);
    }

    private function authorizeAccess(Request $request, QuoteRequest $quoteRequest): void
    {
        if ($quoteRequest->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }
    }
}