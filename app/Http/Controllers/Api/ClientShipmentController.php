<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
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
            ->with('client')
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

        $client = $request->user()->client;
        $provider = $client->provider;

        $data = array_merge($validated, [
            'provider_id' => $provider->id,
            'client_id' => $client->id,
            'created_by' => $request->user()->id,
            'shipping_number' => $this->generateShippingNumber(),
            'statut_actuel' => 'information_recue',
        ]);

        $shipment = Shipment::create($data);

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
            'shipment' => $shipment->fresh()->load('client'),
            'label_url' => $labelUrl,
        ], 201);
    }

    public function show(Request $request, Shipment $shipment)
    {
        $this->authorizeAccess($request, $shipment);

        $shipment->load('client', 'quote', 'suiviStatuts.changedBy');

        return response()->json([
            'shipment' => $shipment,
            'suivi_statuts' => $shipment->suiviStatuts,
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
}
