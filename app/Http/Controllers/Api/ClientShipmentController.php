<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\Shipment;
use App\Services\ClientActivityLogger;
use App\Services\LabelPdfService;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Illuminate\Http\Request;

class ClientShipmentController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $client = $request->user()->client;

        $query = Shipment::query()
            ->with('client', 'colis')
            ->where('client_id', $client->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut_actuel', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(shipping_number) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_name) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_city) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['shipping_number', 'created_at', 'recipient_name', 'type_service', 'statut_actuel'],
            'created_at',
            'desc'
        );

        $limit = $request->input('limit', 25);

        return response()->json($query->paginate($limit));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $this->validateColis($request);

        $client = $request->user()->client;
        $provider = $client->provider;

        $data = array_merge($validated, [
            'provider_id' => $provider->id,
            'client_id' => $client->id,
            'created_by' => $request->user()->id,
            'shipping_number' => $this->generateShippingNumber(),
            'statut_actuel' => 'information_recue',
        ]);

        // Remove colis from data to handle separately
        $colisData = $validated['colis'] ?? [];

        $shipment = Shipment::create($data);

        ClientActivityLogger::log($client, 'shipment_created', "Expedition {$shipment->shipping_number} creee", 'shipment', $shipment->id);

        // Create colis from new array format
        if (! empty($colisData)) {
            foreach ($colisData as $index => $c) {
                $shipment->colis()->create(array_merge($c, [
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
            $shipment->colis()->create([
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

        $shipment->suiviStatuts()->create([
            'statut' => 'information_recue',
            'date_statut' => now(),
            'description' => 'Information recue',
            'changed_by' => $request->user()->id,
        ]);

        $labelUrl = null;
        try {
            $labelUrl = (new LabelPdfService)->generate($shipment);
            $shipment->update(['label_url' => $labelUrl]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'Expedition creee.',
            'shipment' => $shipment->fresh()->load('client', 'colis'),
            'label_url' => $labelUrl,
        ], 201);
    }

    public function show(Request $request, Shipment $shipment)
    {
        $this->authorizeAccess($request, $shipment);

        $shipment->load('client', 'quote', 'suiviStatuts.changedBy', 'colis', 'sousEtapes');

        $sousEtapesByStatut = $shipment->sousEtapes
            ->sortByDesc('created_at')
            ->groupBy('statut');

        return response()->json([
            'shipment' => $shipment,
            'suivi_statuts' => $shipment->suiviStatuts,
            'sous_etapes' => $sousEtapesByStatut,
        ]);
    }

    private function authorizeAccess(Request $request, Shipment $shipment): void
    {
        if ((int) $shipment->client_id !== (int) $request->user()->client->id) {
            abort(403, 'Acces refuse.');
        }
    }

    private function rules(): array
    {
        return [
            'sender_name' => ['required', 'string', 'max:255'],
            'sender_company' => ['nullable', 'string', 'max:255'],
            'sender_address' => ['nullable', 'string'],
            'sender_city' => ['nullable', 'string', 'max:100'],
            'sender_postal_code' => ['nullable', 'string', 'max:20'],
            'sender_country' => ['nullable', 'string', 'max:100'],
            'sender_email' => ['nullable', 'email', 'max:255'],
            'sender_phone' => ['nullable', 'string', 'max:50'],
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
            'colis.*.type_colis' => ['nullable', 'in:document,paquet,palette'],
            'colis.*.description_colis' => ['nullable', 'string', 'max:60'],
            // Backward compat - old flat fields (optional if colis array provided)
            'poids' => ['nullable', 'numeric', 'min:0'],
            'longueur' => ['nullable', 'numeric', 'min:0'],
            'largeur' => ['nullable', 'numeric', 'min:0'],
            'hauteur' => ['nullable', 'numeric', 'min:0'],
            'nb_pieces' => ['nullable', 'integer', 'min:1'],
            'valeur_declaree' => ['nullable', 'numeric', 'min:0'],
            'devise_valeur' => ['nullable', 'in:MAD,USD,EUR'],
            'type_colis' => ['nullable', 'in:document,paquet,palette'],
            'description_colis' => ['nullable', 'string', 'max:60'],
            'type_service' => ['required', 'in:national,international_express_dap,fret_aerien,routier_groupage,maritime_groupage'],
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
