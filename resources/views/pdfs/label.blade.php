<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Etiquette {{ $shipment->shipping_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            background: #ffffff;
            color: #000;
        }

        .shipping-label {
            width: 148mm;
            height: 210mm;
            background: #ffffff;
            border: 2px solid #000;
            font-family: 'DejaVu Sans', sans-serif;
            position: relative;
            overflow: hidden;
        }

        .label-header {
            background: #221eb0;
            color: #ffffff;
            padding: 6px 14px;
            height: 28mm;
            box-sizing: border-box;
        }
        .label-header-row {
            display: table;
            width: 100%;
            table-layout: fixed;
        }
        .label-header-left {
            display: table-cell;
            vertical-align: middle;
            text-align: left;
            width: 60%;
        }
        .label-header-right {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            width: 40%;
        }
        .logo-area {
            display: inline-block;
            vertical-align: middle;
        }
        .logo-img {
            height: 16mm;
            width: auto;
            max-width: 60mm;
            background: #ffffff;
            padding: 2px 4px;
            border-radius: 3px;
            vertical-align: middle;
            object-fit: contain;
        }
        .logo-fallback {
            display: inline-block;
            height: 18mm;
            line-height: 18mm;
            background: #ffffff;
            color: #221eb0;
            font-weight: bold;
            font-size: 14pt;
            padding: 0 8px;
            border-radius: 3px;
            vertical-align: middle;
        }
        .bordereau-title {
            display: inline-block;
            margin-left: 8px;
            vertical-align: middle;
            font-size: 9pt;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .service-type {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #ffffff;
        }
        .service-date {
            font-size: 8pt;
            margin-top: 2px;
            opacity: 0.9;
            color: #ffffff;
        }

        .label-body {
            padding: 6px 12px 4px 12px;
            height: 144mm;
            box-sizing: border-box;
            position: relative;
        }

        .label-block { margin-bottom: 4px; }
        .label-block-title {
            background: #221eb0;
            color: #ffffff;
            display: inline-block;
            padding: 2px 8px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .label-block-content {
            font-size: 9pt;
            line-height: 1.25;
            padding-left: 2px;
        }
        .label-block-content .name { font-weight: bold; font-size: 10pt; }
        .label-block-content .company { font-size: 8pt; color: #333; }
        .label-block-content .address { font-size: 8pt; color: #555; }
        .label-block-content .city { font-size: 8pt; font-weight: bold; margin-top: 1px; }

        .section-separator {
            border-bottom: 1.5px dashed #999;
            margin: 4px 0;
            height: 0;
        }

        .label-row-flex { display: table; width: 100%; table-layout: fixed; }
        .label-row-flex .label-block { display: table-cell; vertical-align: top; }
        .label-row-flex .col-wide { width: 65%; padding-right: 8px; }
        .label-row-flex .col-narrow { width: 35%; text-align: right; }
        .origin-code {
            font-size: 22pt;
            font-weight: 900;
            line-height: 1;
        }
        .origin-country {
            font-size: 7pt;
            color: #666;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .barcode-area {
            text-align: center;
            padding: 4px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            margin: 4px 0;
            background: #fafafa;
        }
        .barcode-area img { display: block; margin: 0 auto; max-width: 100%; height: 12mm; }
        .barcode-number {
            font-size: 9pt;
            font-weight: bold;
            letter-spacing: 2px;
            margin-top: 2px;
            font-family: 'Courier New', monospace;
        }

        .package-info {
            display: table;
            width: 100%;
            table-layout: fixed;
            padding: 3px 0;
            border-bottom: 1px solid #ddd;
        }
        .package-info-item {
            text-align: center;
            display: table-cell;
            vertical-align: middle;
        }
        .package-info-item .label-title {
            font-size: 6pt;
            text-transform: uppercase;
            color: #666;
            font-weight: bold;
        }
        .package-info-item .label-value { font-size: 10pt; font-weight: bold; }
        .package-info-item .label-value-large { font-size: 14pt; font-weight: 900; }

        .contents {
            font-size: 8pt;
            color: #444;
            margin-top: 4px;
        }
        .contents strong { color: #221eb0; }

        .label-footer {
            height: 38mm;
            background: #f5f5f5;
            border-top: 2px solid #000;
            display: table;
            width: 100%;
            table-layout: fixed;
        }
        .qr-cell {
            display: table-cell;
            vertical-align: middle;
            width: 38mm;
            padding: 3px 6px;
        }
        .qr-area {
            width: 32mm;
            height: 32mm;
            background: #ffffff;
            display: inline-block;
            text-align: center;
            vertical-align: middle;
            border: 1px solid #ccc;
        }
        .qr-area img { width: 32mm !important; height: 32mm !important; }
        .tracking-cell {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            padding: 4px 14px;
        }
        .tracking-title {
            font-size: 7pt;
            text-transform: uppercase;
            color: #666;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .tracking-number {
            font-size: 11pt;
            font-weight: 900;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
        }
        .tracking-ref { font-size: 7pt; color: #666; margin-top: 2px; }
        .site-web {
            font-size: 8pt;
            font-weight: 700;
            color: #221eb0;
            margin-top: 3px;
            letter-spacing: 1px;
        }

        .label-conditions {
            border-top: 1px dashed #999;
            margin-top: 3px;
            padding-top: 2px;
            font-size: 5pt;
            line-height: 1.2;
            color: #333;
        }
        .label-conditions .cond-title {
            font-weight: 700;
            color: #221eb0;
            margin-top: 3px;
            margin-bottom: 1px;
            font-size: 6pt;
            text-transform: uppercase;
        }
        .label-conditions .cond-text { text-align: justify; }
    </style>
</head>
<body>
    @php
        $originCity = $shipment->sender_city ?: '';
        $originCode = $originCity ? strtoupper(substr(trim($originCity), 0, 3)) : '---';
        $destVilleCp = trim(($shipment->recipient_postal_code ?? '') . ' ' . ($shipment->recipient_city ?? ''));
        $reference = $shipment->client->account_number ?? ($shipment->quote_id ? 'DEV-' . $shipment->quote_id : $shipment->shipping_number);
        $siteWeb = $shipment->provider->website ?: 'dpex-maroc.com';
        $serviceLabel = match($shipment->type_service) {
            'national' => 'EXPRESS',
            'international_express_dap' => 'INTERNATIONAL',
            'fret_aerien' => 'FRET AERIEN',
            'routier_groupage' => 'ROUTIER',
            'maritime_groupage' => 'MARITIME',
            default => strtoupper(str_replace('_', ' ', $shipment->type_service)),
        };
        $dateLabel = $shipment->created_at ? $shipment->created_at->format('Y-m-d') : date('Y-m-d');
    @endphp

    <div class="shipping-label">
        <div class="label-header">
            <div class="label-header-row">
                <div class="label-header-left">
                    <div class="logo-area">
                        @if(!empty($logoDataUri))
                            <img src="{{ $logoDataUri }}" class="logo-img" alt="Logo">
                        @else
                            <img src="{{ asset('logos/logo_noir.jpg') }}" class="logo-img" alt="Logo" onerror="this.style.display='none'">
                        @endif
                        <span class="bordereau-title">Bordereau d'Enlevement</span>
                    </div>
                </div>
                <div class="label-header-right">
                    <div class="service-type">{{ $serviceLabel }}</div>
                    <div class="service-date">{{ $dateLabel }}</div>
                </div>
            </div>
        </div>

        <div class="label-body">
            <div class="label-row-flex">
                <div class="label-block col-wide">
                    <div class="label-block-title">From / Expediteur</div>
                    <div class="label-block-content">
                        <div class="name">{{ $shipment->sender_name ?: '-' }}</div>
                        @if($shipment->sender_company)<div class="company">{{ $shipment->sender_company }}</div>@elseif($shipment->client && $shipment->client->company_name)<div class="company">{{ $shipment->client->company_name }}</div>@endif
                        @if($shipment->client)<div style="font-size:7pt; color:#666;">{{ $shipment->client->account_number }}</div>@endif
                        <div class="address">{{ $shipment->sender_address ?: '' }}</div>
                        <div class="city">{{ $originCity }}{{ $shipment->sender_country ? ', ' . $shipment->sender_country : '' }}</div>
                    </div>
                </div>
                <div class="label-block col-narrow">
                    <div class="label-block-title">Origin</div>
                    <div class="label-block-content">
                        <div class="origin-code">{{ $originCode }}</div>
                        <div class="origin-country">{{ strtoupper($shipment->sender_country ?: '') }}</div>
                    </div>
                </div>
            </div>

            <div class="section-separator"></div>

            <div class="label-row-flex">
                <div class="label-block col-wide">
                    <div class="label-block-title">To / Destinataire</div>
                    <div class="label-block-content">
                        <div class="name">{{ $shipment->recipient_name ?: '-' }}</div>
                        @if($shipment->recipient_company)<div class="company">{{ $shipment->recipient_company }}</div>@endif
                        <div class="address">{{ $shipment->recipient_address ?: '' }}</div>
                        <div class="city">{{ $destVilleCp }}</div>
                        <div class="city">{{ $shipment->recipient_country ?: '' }}</div>
                    </div>
                </div>
                <div class="label-block col-narrow">
                    <div class="label-block-title">Contact</div>
                    <div class="label-block-content">
                        <div style="font-size:8pt; font-weight:bold;">{{ $shipment->recipient_phone ?: 'N/A' }}</div>
                    </div>
                </div>
            </div>

            <div class="section-separator"></div>

            <div class="barcode-area">
                <img src="{{ $barcodeDataUri }}" alt="barcode">
                <div class="barcode-number">{{ $shipment->shipping_number }}</div>
            </div>

            <div class="package-info">
                <div class="package-info-item">
                    <div class="label-title">Reference</div>
                    <div class="label-value">{{ $reference }}</div>
                </div>
                <div class="package-info-item">
                    <div class="label-title">Poids</div>
                    <div class="label-value">{{ $shipment->poids ?? '0' }} kg</div>
                </div>
                <div class="package-info-item">
                    <div class="label-title">Dimensions (cm)</div>
                    <div class="label-value" style="font-size:8pt;">{{ $shipment->longueur && $shipment->largeur && $shipment->hauteur ? $shipment->largeur . ' x ' . $shipment->longueur . ' x ' . $shipment->hauteur : 'N/A' }}</div>
                </div>
                <div class="package-info-item">
                    <div class="label-title">Pieces</div>
                    <div class="label-value-large">{{ $shipment->nb_pieces ?? 1 }}</div>
                </div>
                <div class="package-info-item">
                    <div class="label-title">Valeur declaree</div>
                    <div class="label-value" style="font-size:8pt;">{{ $shipment->valeur_declaree && $shipment->valeur_declaree > 0 ? $shipment->valeur_declaree . ' ' . ($shipment->devise_valeur ?: 'MAD') : 'N/A' }}</div>
                </div>
            </div>

            <div class="contents">
                <strong>Contents:</strong> {{ $shipment->description_colis ?: 'Documents - general business' }}
            </div>

            <div class="label-conditions">
                <div class="cond-title">COPIE CLIENT - A PLACER DANS LA POCHETTE D'EXPEDITION</div>
                <div class="cond-text">Verifiez les informations inscrites sur le bordereau. Pliez la feuille suivant la ligne prevue a cet effet. Placez le document dans la pochette transparente du colis.</div>
                <div class="cond-title">CONDITIONS DE PRESTATION ET DE SOUS-TRAITANCE</div>
                <div class="cond-text">Les prestations de collecte, manutention et livraison sont realisees dans le cadre d'un service de sous-traitance logistique. Le donneur d'ordre certifie que les informations communiquees sur ce bordereau sont exactes et completes. Il reste responsable du contenu des colis remis ainsi que de leur conformite avec les reglementations applicables. Les colis doivent etre correctement emballes et etiquetes afin de permettre une manipulation et une livraison dans des conditions normales de securite. Aucune responsabilite ne pourra etre engagee en cas de dommage lie a un emballage insuffisant, inadapte ou defectueux. Les delais d'enlevement et de livraison sont donnes a titre indicatif et peuvent etre affectes par des contraintes operationnelles, conditions meteorologiques, incidents routiers, controles administratifs ou tout autre evenement independant de notre volonte. Les marchandises interdites, dangereuses ou non declarees ne sont pas acceptees. Le donneur d'ordre demeure seul responsable des consequences liees a la presence de produits non autorises dans les expeditions confiees. Toute reclamation concernant une prestation devra etre adressee par ecrit dans un delai maximum de 48 heures apres la livraison ou la tentative de livraison. En remettant les colis pour traitement, le donneur d'ordre accepte l'ensemble des presentes conditions de prestation et autorise l'utilisation des informations necessaires au suivi operationnel des expeditions.</div>
            </div>
        </div>

        <div class="label-footer">
            <div class="qr-cell">
                <div class="qr-area">
                    <img src="{{ $qrCodeDataUri }}" alt="QR Code">
                </div>
            </div>
            <div class="tracking-cell">
                <div class="tracking-title">Tracking Number</div>
                <div class="tracking-number">{{ $shipment->shipping_number }}</div>
                <div class="tracking-ref">Ref: {{ $reference }}</div>
                <div class="site-web">{{ $siteWeb }}</div>
            </div>
        </div>
    </div>
</body>
</html>
