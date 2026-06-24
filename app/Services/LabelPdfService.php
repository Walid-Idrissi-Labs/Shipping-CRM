<?php

namespace App\Services;

use App\Models\Shipment;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Picqer\Barcode\BarcodeGeneratorPNG;

class LabelPdfService
{
    private const LOGO_RELATIVE_PATH = 'logos/logo_noir.jpg';

    private static ?string $cachedLogoDataUri = null;

    public function generate(Shipment $shipment): string
    {
        $shipment->load(['client', 'provider']);

        $barcodeDataUri = $this->barcodeDataUri($shipment->shipping_number);
        $qrCodeDataUri = $this->qrCodeDataUri($shipment);
        $logoDataUri = self::staticLogoDataUri();

        $pdf = Pdf::loadView('pdfs.label-print', [
            'shipment' => $shipment,
            'barcodeDataUri' => $barcodeDataUri,
            'qrCodeDataUri' => $qrCodeDataUri,
            'logoDataUri' => $logoDataUri,
        ])->setPaper('a4', 'landscape');

        $filename = "label-{$shipment->shipping_number}.pdf";
        $path = "labels/{$filename}";
        $fullPath = storage_path("app/public/{$path}");

        if (! is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }

        $pdf->save($fullPath);

        return "/storage/{$path}";
    }

    private function barcodeDataUri(string $value): string
    {
        $generator = new BarcodeGeneratorPNG;
        $barcodePng = $generator->getBarcode($value, BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60);

        return 'data:image/png;base64,' . base64_encode($barcodePng);
    }

    private function qrCodeDataUri(Shipment $shipment): string
    {
        if (! $shipment->relationLoaded('client')) {
            $shipment->load('client');
        }
        if (! $shipment->relationLoaded('provider')) {
            $shipment->load('provider');
        }

        $originCity = $shipment->sender_city ?: '';
        $originCode = $originCity ? strtoupper(substr(trim($originCity), 0, 3)) : '';
        $reference = $shipment->client->account_number ?? ($shipment->quote_id ? 'DEV-' . $shipment->quote_id : $shipment->shipping_number);
        $siteWeb = $shipment->provider->website ?: 'dpex-maroc.com';
        $serviceLabel = match ($shipment->type_service) {
            'national' => 'EXPRESS',
            'international_express_dap' => 'INTERNATIONAL',
            'fret_aerien' => 'FRET AERIEN',
            'routier_groupage' => 'ROUTIER',
            'maritime_groupage' => 'MARITIME',
            default => strtoupper(str_replace('_', ' ', (string) $shipment->type_service)),
        };

        $senderCompany = $shipment->sender_company ?: ($shipment->client->company_name ?? null);

        $payload = [
            'shipping_number' => $shipment->shipping_number,
            'service' => $serviceLabel,
            'service_type' => $shipment->type_service,
            'origin' => [
                'code' => $originCode,
                'country' => strtoupper((string) $shipment->sender_country),
            ],
            'reference' => $reference,
            'date' => optional($shipment->created_at)->format('Y-m-d'),
            'sender' => [
                'name' => $shipment->sender_name,
                'company' => $senderCompany,
                'account_number' => $shipment->client->account_number ?? null,
                'address' => $shipment->sender_address,
                'city' => $shipment->sender_city,
                'postal_code' => $shipment->sender_postal_code,
                'country' => $shipment->sender_country,
                'phone' => $shipment->sender_phone,
                'email' => $shipment->sender_email,
            ],
            'recipient' => [
                'name' => $shipment->recipient_name,
                'company' => $shipment->recipient_company,
                'address' => $shipment->recipient_address,
                'city' => $shipment->recipient_city,
                'postal_code' => $shipment->recipient_postal_code,
                'country' => $shipment->recipient_country,
                'phone' => $shipment->recipient_phone,
                'email' => $shipment->recipient_email,
            ],
            'package' => [
                'description' => $shipment->description_colis,
                'type' => $shipment->type_colis,
                'weight_kg' => $shipment->poids,
                'dimensions_cm' => [
                    'length' => $shipment->longueur,
                    'width' => $shipment->largeur,
                    'height' => $shipment->hauteur,
                ],
                'pieces' => $shipment->nb_pieces,
                'declared_value' => [
                    'amount' => $shipment->valeur_declaree,
                    'currency' => $shipment->devise_valeur ?: 'MAD',
                ],
            ],
            'status' => [
                'current' => $shipment->statut_actuel,
                'sub_status' => $shipment->sous_statut_actuel,
            ],
            'provider' => [
                'name' => $shipment->provider->company_name,
                'website' => $siteWeb,
            ],
            'tracking_url' => rtrim((string) config('app.url'), '/') . '/track/' . $shipment->shipping_number,
        ];

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $qr = new QrCode($json, encoding: new Encoding('UTF-8'), size: 250, margin: 0);
        $writer = new PngWriter;
        $result = $writer->write($qr);

        return $result->getDataUri();
    }

    public static function staticLogoDataUri(): ?string
    {
        if (self::$cachedLogoDataUri !== null) {
            return self::$cachedLogoDataUri;
        }

        $fullPath = public_path(self::LOGO_RELATIVE_PATH);
        if (!file_exists($fullPath)) {
            return self::$cachedLogoDataUri = null;
        }

        $data = file_get_contents($fullPath);
        if (empty($data)) {
            return self::$cachedLogoDataUri = null;
        }

        $mime = mime_content_type($fullPath) ?: 'image/jpeg';

        return self::$cachedLogoDataUri = 'data:' . $mime . ';base64,' . base64_encode($data);
    }

    public static function staticLogoPath(): string
    {
        return self::LOGO_RELATIVE_PATH;
    }
}
