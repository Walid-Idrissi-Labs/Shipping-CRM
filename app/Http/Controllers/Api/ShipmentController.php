<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Quote;
use App\Models\Shipment;
use App\Services\LabelPdfService;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $query = Shipment::query()->with(['client', 'creator']);

        if ($request->user()->role === 'client') {
            $query->where('client_id', $request->user()->client->id);
        } else {
            $query->where('provider_id', $request->user()->provider->id);
            if ($createdByRole = $request->input('created_by_role')) {
                if ($createdByRole === 'client') {
                    $query->whereHas('creator', fn ($q) => $q->where('role', 'client'));
                } elseif ($createdByRole === 'prestataire') {
                    $query->where(function ($q) use ($request) {
                        $q->whereHas('creator', fn ($sub) => $sub->where('role', 'prestataire'))
                            ->orWhere('created_by', $request->user()->id);
                    });
                }
            }
        }

        if ($statut = $request->input('statut')) {
            $query->where('statut_actuel', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(shipping_number) like ?', [$q])
                    ->orWhereRaw('LOWER(sender_name) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_name) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['shipping_number', 'created_at', 'sender_name', 'recipient_name', 'type_service', 'statut_actuel'],
            'created_at',
            'desc'
        );

        $limit = $request->input('limit', 25);

        $page = $query->paginate($limit);
        $page->getCollection()->each(function (Shipment $shipment) {
            $shipment->setAttribute('creator_role', $shipment->creator?->role);
        });

        return response()->json($page);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $provider = $request->user()->provider;
        $clientId = null;

        if (! empty($validated['client_id'])) {
            $client = Client::findOrFail($validated['client_id']);
            $clientId = $client->id;
        }

        $data = array_merge($validated, [
            'provider_id' => $provider->id,
            'client_id' => $clientId,
            'created_by' => $request->user()->id,
            'shipping_number' => $this->generateShippingNumber(),
            'statut_actuel' => 'information_recue',
        ]);

        if (! empty($validated['quote_id'])) {
            $quote = Quote::findOrFail($validated['quote_id']);
            $data['quote_id'] = $quote->id;
            if ($quote->client_id && ! $clientId) {
                $data['client_id'] = $quote->client_id;
            }
        }

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
            // Label generation failure should not block shipment creation; the user can still generate later.
            report($e);
        }

        return response()->json([
            'message' => 'Expedition cree.',
            'shipment' => $shipment->fresh()->load('client'),
            'label_url' => $labelUrl,
        ], 201);
    }

    public function show(Shipment $shipment)
    {
        $shipment->load('client', 'quote', 'suiviStatuts.changedBy');

        return response()->json([
            'shipment' => $shipment,
            'affectations' => $shipment->affectations()->with(['chauffeur', 'vehicule'])->get()->map(fn ($a) => [
                'id' => $a->id,
                'statut' => $a->statut,
                'date_heure_depart' => $a->date_heure_depart,
                'date_heure_arrivee' => $a->date_heure_arrivee,
                'ville_depart' => $a->ville_depart,
                'pays_depart' => $a->pays_depart,
                'ville_arrivee' => $a->ville_arrivee,
                'pays_arrivee' => $a->pays_arrivee,
                'chauffeur' => $a->chauffeur ? [
                    'id' => $a->chauffeur->id,
                    'nom_complet' => $a->chauffeur->nom_complet,
                    'telephone' => $a->chauffeur->telephone,
                ] : null,
                'vehicule' => $a->vehicule ? [
                    'id' => $a->vehicule->id,
                    'immatriculation' => $a->vehicule->immatriculation,
                    'marque_modele' => $a->vehicule->marque_modele,
                ] : null,
            ]),
            'suivi_statuts' => $shipment->suiviStatuts,
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $validated = $request->validate($this->rules());
        $shipment->update($validated);

        return response()->json(['message' => 'Expedition mise a jour.', 'shipment' => $shipment->fresh()]);
    }

    public function destroy(Shipment $shipment)
    {
        $shipment->delete();

        return response()->json(['message' => 'Expedition supprimee.']);
    }

    public function byClient(Request $request, Client $client)
    {
        $provider = $request->user()->provider;
        if ($client->provider_id !== $provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $query = Shipment::query()
            ->where('client_id', $client->id)
            ->where('provider_id', $provider->id)
            ->with('client')
            ->orderByDesc('created_at');

        return response()->json($query->paginate(25));
    }

    public function label(Request $request, Shipment $shipment)
    {
        $user = $request->user();
        if ($user->role === 'client' && (int) $shipment->client_id !== (int) $user->client->id) {
            abort(403, 'Acces refuse.');
        }
        if ($user->role === 'prestataire' && $shipment->provider_id !== $user->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $shipment->load('client', 'provider');

        $barcode = new \Picqer\Barcode\BarcodeGeneratorPNG;
        $barcodePng = $barcode->getBarcode($shipment->shipping_number, \Picqer\Barcode\BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60);
        $barcodeDataUri = 'data:image/png;base64,' . base64_encode($barcodePng);

        $qrPayload = json_encode([
            'shipping_number' => $shipment->shipping_number,
            'sender_name' => $shipment->sender_name,
            'recipient_name' => $shipment->recipient_name,
            'destination' => trim(($shipment->recipient_city ?? '') . ', ' . ($shipment->recipient_country ?? ''), ', '),
            'service' => $shipment->type_service,
            'weight' => $shipment->poids,
        ]);

        try {
            $labelService = new LabelPdfService;
            $reflection = new \ReflectionClass($labelService);
            $qrMethod = $reflection->getMethod('qrCodeDataUri');
            $qrMethod->setAccessible(true);
            $qrCodeDataUri = $qrMethod->invoke($labelService, $shipment);
            $logoDataUri = LabelPdfService::staticLogoDataUri();
        } catch (\Throwable $e) {
            $qr = new \Endroid\QrCode\QrCode($qrPayload, encoding: new \Endroid\QrCode\Encoding\Encoding('UTF-8'), size: 150, margin: 0);
            $qrCodeDataUri = (new \Endroid\QrCode\Writer\PngWriter)->write($qr)->getDataUri();
        }

        $cachedPath = $shipment->label_url ? public_path('storage/' . str_replace('/storage/', '', $shipment->label_url)) : null;
        if (! $shipment->label_url || ! $cachedPath || ! file_exists($cachedPath)) {
            try {
                $newPath = (new LabelPdfService)->generate($shipment);
                $shipment->update(['label_url' => $newPath]);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.label-print', [
            'shipment' => $shipment,
            'barcodeDataUri' => $barcodeDataUri,
            'qrCodeDataUri' => $qrCodeDataUri,
            'logoDataUri' => $logoDataUri ?? LabelPdfService::staticLogoDataUri(),
        ])->setPaper('a4', 'landscape');

        return $pdf->download("etiquette-{$shipment->shipping_number}.pdf");
    }

    public function labelPreview(Request $request, Shipment $shipment)
    {
        $user = $request->user();
        if ($user->role === 'client' && (int) $shipment->client_id !== (int) $user->client->id) {
            abort(403, 'Acces refuse.');
        }
        if ($user->role === 'prestataire' && $shipment->provider_id !== $user->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $shipment->load('client', 'provider');

        $barcode = new \Picqer\Barcode\BarcodeGeneratorPNG;
        $barcodePng = $barcode->getBarcode($shipment->shipping_number, \Picqer\Barcode\BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60);
        $barcodeDataUri = 'data:image/png;base64,' . base64_encode($barcodePng);

        $qrPayload = json_encode([
            'shipping_number' => $shipment->shipping_number,
            'sender_name' => $shipment->sender_name,
            'recipient_name' => $shipment->recipient_name,
            'destination' => trim(($shipment->recipient_city ?? '') . ', ' . ($shipment->recipient_country ?? ''), ', '),
            'service' => $shipment->type_service,
            'weight' => $shipment->poids,
        ]);

        try {
            $labelService = new LabelPdfService;
            $reflection = new \ReflectionClass($labelService);
            $qrMethod = $reflection->getMethod('qrCodeDataUri');
            $qrMethod->setAccessible(true);
            $qrCodeDataUri = $qrMethod->invoke($labelService, $shipment);
            $logoDataUri = LabelPdfService::staticLogoDataUri();
        } catch (\Throwable $e) {
            $qr = new \Endroid\QrCode\QrCode($qrPayload, encoding: new \Endroid\QrCode\Encoding\Encoding('UTF-8'), size: 150, margin: 0);
            $qrCodeDataUri = (new \Endroid\QrCode\Writer\PngWriter)->write($qr)->getDataUri();
        }

        return response()->view('pdfs.label', [
            'shipment' => $shipment,
            'barcodeDataUri' => $barcodeDataUri,
            'qrCodeDataUri' => $qrCodeDataUri,
            'logoDataUri' => $logoDataUri ?? LabelPdfService::staticLogoDataUri(),
        ])->header('Content-Type', 'text/html');
    }

    public function labelInline(Request $request, Shipment $shipment)
    {
        $user = $request->user();
        if ($user->role === 'client' && (int) $shipment->client_id !== (int) $user->client->id) {
            abort(403, 'Acces refuse.');
        }
        if ($user->role === 'prestataire' && $shipment->provider_id !== $user->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $shipment->load('client', 'provider');

        $barcode = new \Picqer\Barcode\BarcodeGeneratorPNG;
        $barcodePng = $barcode->getBarcode($shipment->shipping_number, \Picqer\Barcode\BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60);
        $barcodeDataUri = 'data:image/png;base64,' . base64_encode($barcodePng);

        $qrPayload = json_encode([
            'shipping_number' => $shipment->shipping_number,
            'sender_name' => $shipment->sender_name,
            'recipient_name' => $shipment->recipient_name,
            'destination' => trim(($shipment->recipient_city ?? '') . ', ' . ($shipment->recipient_country ?? ''), ', '),
            'service' => $shipment->type_service,
            'weight' => $shipment->poids,
        ]);

        try {
            $labelService = new LabelPdfService;
            $reflection = new \ReflectionClass($labelService);
            $qrMethod = $reflection->getMethod('qrCodeDataUri');
            $qrMethod->setAccessible(true);
            $qrCodeDataUri = $qrMethod->invoke($labelService, $shipment);
            $logoDataUri = LabelPdfService::staticLogoDataUri();
        } catch (\Throwable $e) {
            $qr = new \Endroid\QrCode\QrCode($qrPayload, encoding: new \Endroid\QrCode\Encoding\Encoding('UTF-8'), size: 150, margin: 0);
            $qrCodeDataUri = (new \Endroid\QrCode\Writer\PngWriter)->write($qr)->getDataUri();
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.label-print', [
            'shipment' => $shipment,
            'barcodeDataUri' => $barcodeDataUri,
            'qrCodeDataUri' => $qrCodeDataUri,
            'logoDataUri' => $logoDataUri ?? LabelPdfService::staticLogoDataUri(),
        ])->setPaper('a4', 'landscape');

        return $pdf->stream("etiquette-{$shipment->shipping_number}.pdf");
    }

    private function rules(): array
    {
        return [
            'client_id' => ['nullable', 'exists:clients,id'],
            'quote_id' => ['nullable', 'exists:quotes,id'],
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
