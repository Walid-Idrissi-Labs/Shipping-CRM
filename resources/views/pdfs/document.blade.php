@php
    use App\Services\NumberToFrenchWords;

    $isAvoir = ($type ?? 'facture') === 'avoir';
    $doc = $document;
    $provider = $doc->provider;

    if ($isAvoir) {
        $refFacture = $refFacture ?? $doc->facture;
        $expeditions = $refFacture?->expeditions ?? collect();
    } else {
        $refFacture = null;
        $expeditions = $doc->expeditions ?? collect();
    }

    // $logoPath = public_path('logos/logo_noir.jpg');
    $logoPath = public_path('logos/dpex-logo-gif_final.png');
    $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
    $logoSrc = $logoData ? 'data:image/png;base64,' . $logoData : '';

$cachePath = public_path('logos/cache3.png');
    $cacheData = file_exists($cachePath) ? base64_encode(file_get_contents($cachePath)) : null;
    $cacheSrc = $cacheData ? 'data:image/png;base64,' . $cacheData : '';
    $totalExpeditions = $expeditions->count();
    $cacheOnLeft = $totalExpeditions > 3;

    $fmt = fn ($v) => number_format((float) $v, 2, ',', ' ');

    $docNumber = $doc->numero;
    $emission = ($doc->date_facture ?? $doc->created_at)?->format('d/m/Y') ?? '-';
    $echeance = $isAvoir ? null : ($doc->date_echeance?->format('d/m/Y') ?? '-');
    $destination = ucfirst($doc->type_destination ?? '');

    if ($doc->client) {
        $clientName = strtoupper($doc->client->company_name ?: $doc->client->full_name ?: '-');
        $clientAddressParts = [];
        if (!empty($doc->client->address)) {
            $clientAddressParts[] = $doc->client->address;
        }
        $cityLine = trim(($doc->client->postal_code ?? '') . ' ' . ($doc->client->city ?? ''));
        $country = $doc->client->country ?: 'Maroc';
        if ($cityLine !== '' || $country !== '') {
            $clientAddressParts[] = trim($cityLine . ($cityLine !== '' ? ', ' : '') . $country);
        }
        $clientIce = $doc->client->ice ?: '';
        $clientPhone = $doc->client->phone ?: '';
        $clientEmail = $doc->client->email ?: '';
    } else {
        $diversNom = $isAvoir ? ($refFacture->client_divers_nom ?? '') : ($doc->client_divers_nom ?? '');
        $diversAddr = $isAvoir ? ($refFacture->client_divers_adresse ?? '') : ($doc->client_divers_adresse ?? '');
        $diversTel = $isAvoir ? ($refFacture->client_divers_tel ?? '') : ($doc->client_divers_tel ?? '');
        $diversEmail = $isAvoir ? ($refFacture->client_divers_email ?? '') : ($doc->client_divers_email ?? '');

        $clientName = strtoupper($diversNom ?: '-');
        $clientAddressParts = [];
        if (!empty($diversAddr)) {
            $clientAddressParts[] = $diversAddr;
        }
        $clientIce = '';
        $clientPhone = $diversTel;
        $clientEmail = $diversEmail;
    }

    $nonTaxable = (float) $doc->non_taxable;
    $taxable = (float) $doc->taxable;
    $tvaRate = (float) $doc->taux_tva;
    $tva = (float) $doc->tva;
    $ttc = (float) $doc->ttc;

    if ($isAvoir) {
        $nonTaxable = abs($nonTaxable);
        $taxable = abs($taxable);
        $tvaRate = abs($tvaRate);
        $tva = abs($tva);
        $ttc = abs($ttc);
    }

    $society = $provider->company_name ?? '-';
    $provAddress = $provider->address ?? '-';
    $provCityLine = trim(($provider->postal_code ?? '') . ' ' . ($provider->city ?? ''));
    $provCountry = $provider->country ?? '';
    $provAddressFull = trim($provCityLine . ($provCityLine && $provCountry ? ', ' : '') . $provCountry);
    $provRc = $provider->rc ?? '-';
    $provIce = $provider->ice ?? '-';
    $provIf = $provider->if_ ?? '-';
    $provCnss = trim((string) ($provider->cnss ?? ''));
    $provPatente = trim((string) ($provider->patente ?? ''));
    $provTel = $provider->phone ?? '-';
    $provEmail = $provider->email ?? '-';
    $provWeb = preg_replace('#^https?://#i', '', rtrim($provider->website ?? '', '/'));

    $bankName = trim((string) ($provider->bank_name ?? ''));
    $bankRib = trim((string) ($provider->bank_rib ?? ''));
    $bankSwift = trim((string) ($provider->bank_swift ?? ''));
    $bankAccountName = trim((string) ($provider->bank_account_name ?? ''));
    $bankAgence = trim((string) ($provider->bank_agence ?? ''));
    // Bloc « modalités de règlement » sur la facture uniquement (pas d'avoir).
    $hasPayment = !$isAvoir
        && ($bankName !== '' || $bankRib !== '' || $bankSwift !== '' || $bankAccountName !== '' || $bankAgence !== '');

    $fontDir = storage_path('fonts');

    $negFor = function ($value) use ($isAvoir) {
        if (!$isAvoir) return '';
        return ((float) $value) > 0 ? '-' : '';
    };
    $watermarkText = $isAvoir ? 'AVOIR' : null;

    // Mention légale « arrêté » : montant TTC en toutes lettres.
    $ttcEnLettres = ucfirst(NumberToFrenchWords::amount($ttc));
    $arreteIntro = $isAvoir
        ? 'Arrêté le présent avoir à la somme de :'
        : 'Arrêté la présente facture à la somme de :';

    $serviceLabels = [
        'national' => 'National',
        'international_express_dap' => 'International Express (DAP)',
        'fret_aerien' => 'Fret aérien',
        'routier_groupage' => 'Routier groupage',
        'maritime_groupage' => 'Maritime groupage',
    ];
    $serviceLabel = fn ($type) => $serviceLabels[$type] ?? (ucfirst(str_replace('_', ' ', (string) $type)) ?: '-');

    // Pages pleines à 10 lignes ; la dernière page est plafonnée à 5 lignes
    // pour laisser la place au bloc fiscal, à l'arrêté et au bloc de règlement.
    $fullPageSize = 10;
    $lastPageMax = 5;
    $expeditionPages = collect();
    $rest = $expeditions->values();
    do {
        $left = $rest->count();
        if ($left <= $lastPageMax) {
            $expeditionPages->push($rest);
            $rest = collect();
        } else {
            $take = $left <= $fullPageSize ? (int) ceil($left / 2) : $fullPageSize;
            $expeditionPages->push($rest->slice(0, $take)->values());
            $rest = $rest->slice($take)->values();
        }
    } while ($rest->isNotEmpty());
    $totalPages = $expeditionPages->count();
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>{{ $isAvoir ? 'Avoir' : 'Facture' }} {{ $docNumber }}</title>
<style>
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        src: url('{{ $fontDir }}/Inter-Regular.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 500;
        src: url('{{ $fontDir }}/Inter-Medium.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 600;
        src: url('{{ $fontDir }}/Inter-SemiBold.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        src: url('{{ $fontDir }}/Inter-Bold.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Fraunces';
        font-style: normal;
        font-weight: 400;
        src: url('{{ $fontDir }}/Fraunces-Regular.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Fraunces';
        font-style: normal;
        font-weight: 600;
        src: url('{{ $fontDir }}/Fraunces-SemiBold.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Fraunces';
        font-style: italic;
        font-weight: 400;
        src: url('{{ $fontDir }}/Fraunces-Italic.ttf') format('truetype');
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        font-family: Inter, Helvetica, 'DejaVu Sans', sans-serif;
        font-size: 11px;
        line-height: 1.5;
        color: #555555;
        background: #ffffff;
        margin: 15pt 40pt 60pt 40pt;
        -webkit-font-smoothing: antialiased;
    }

    /* ===== HEADER ===== */
    .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e0e0e0;
        table-layout: fixed;
    }
    .header-table > tbody > tr > td { vertical-align: top; padding: 0; }
    .header-table .left-cell { width: 50%; }
    .header-table .right-cell { width: 50%; text-align: right; }

    .logo-img {
        max-width: 210px;
        max-height: 80px;
    }
    .logo-placeholder {
        width: 195px;
        height: 75px;
        border: 1.5px dashed #c0c0c0;
        border-radius: 6px;
        text-align: center;
        line-height: 75px;
        color: #888888;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        background: #f7f7f7;
    }
    .brand-name {
        font-size: 16px;
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: -0.3px;
        margin-top: 2px;
        margin-left: 24px;
    }

    .doc-type {
        font-family: Fraunces, Georgia, serif;
        font-size: 27px;
        font-weight: 600;
        /* color: #0a0a0a; */
        color: #2544b0;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
    }
    .doc-type.avoir { color: #1a1a1a; }

    .doc-number {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        color: #2544b0;
        background: #eef1fb;
        padding: 3px 10px;
        border-radius: 4px;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
    }
    .doc-number.avoir-badge { background: #f2f2f2; color: #555555; }

    .meta-row {
        margin-top: 3px;
        font-size: 10.5px;
        color: #888888;
        text-align: right;
    }
    .meta-row .meta-value {
        color: #1a1a1a;
        font-weight: 500;
        margin-left: 6px;
    }

    /* ===== AVOIR REF (plain black, sits under badge) ===== */
    .avoir-ref-inline {
        font-size: 10.5px;
        color: #1a1a1a;
        font-weight: 400;
        margin-bottom: 6px;
        text-align: right;
    }
    .avoir-ref-inline .ref-numero {
        font-weight: 700;
    }
    .avoir-ref-inline .ref-date {
        color: #555555;
        margin-left: 4px;
    }

    /* ===== PARTIES (left-side, mirror of fiscal summary) ===== */
    .client-outer {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
    }
    .client-outer > tbody > tr > td.client-cell {
        width: 50%;
        vertical-align: top;
    }
    .client-outer > tbody > tr > td.client-spacer {
        width: 50%;
    }
    .party-block {
        padding: 10px 18px;
        border-radius: 5px;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        width: 100%;
        border-spacing: 0;
    }
    .party-name {
        font-family: Fraunces, Georgia, serif;
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 5px;
        letter-spacing: 0;
    }
    .party-detail {
        font-size: 11px;
        color: #555555;
        line-height: 1.4;
    }
    .party-line { display: block; }
    .party-detail .detail-label {
        font-size: 9.5px;
        color: #666666;
        font-weight: 300;
    }
    .party-ids {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid #e0e0e0;
    }
    .id-item {
        font-size: 10px;
        display: inline-block;
        margin-right: 16px;
    }
    .id-label {
        font-weight: 600;
        color: #555555;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: 0.5px;
    }
    .id-value {
        color: #1a1a1a;
        font-weight: 500;
    }

    /* ===== TABLE ===== */
    .table-section { margin-bottom: 24px; }
    .section-title {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #888888;
        margin-bottom: 8px;
    }
    .expedition-table {
        width: 100%;
        border-collapse: collapse;
        border: none;
    }
    .expedition-table thead th {
        background: transparent;
        color: #888888;
        font-size: 9.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 8px 14px;
        text-align: left;
        border-bottom: 1px solid #1a1a1a;
    }
    .expedition-table tbody td {
        padding: 9px 14px;
        font-size: 11px;
        color: #1a1a1a;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
    }
    .expedition-table tbody tr:last-child td { border-bottom: 1px solid #e0e0e0; }

    /* ===== FISCAL SUMMARY ===== */
    .summary-wrapper {
        margin-bottom: 14px;
        width: 100%;
    }
    .summary-outer {
        width: 100%;
        border-collapse: collapse;
    }
    .summary-outer > tbody > tr > td.spacer { width: 55%; }
    .summary-outer > tbody > tr > td.summary-cell { width: 320px; vertical-align: top; }

    .summary-block {
        width: 320px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        border-spacing: 0;
    }
    .summary-block td {
        padding: 7px 16px;
        font-size: 11px;
        vertical-align: middle;
        border-bottom: 1px solid #f0f0f0;
    }
    .summary-block td.summary-label { text-align: left; color: #555555; font-weight: 400; }
    .summary-block td.summary-value {
        text-align: right;
        font-weight: 500;
        color: #1a1a1a;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .summary-block tr.tva-row td { background: transparent; }
    .tva-rate {
        display: inline-block;
        font-size: 9px;
        font-weight: 600;
        color: #888888;
        background: #f2f2f2;
        padding: 1px 6px;
        border-radius: 3px;
        margin-left: 6px;
    }
    .summary-block .summary-total-row td {
        /* background: #0a0a0a; */
        background: #2544b0;
        padding: 10px 16px;
        border-bottom: none;
    }
    .summary-block .summary-total-row td.summary-label {
        color: #cdd7f5;
        font-weight: 600;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }
    .summary-block .summary-total-row td.summary-value {
        color: #ffffff;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.3px;
    }
    .summary-block .summary-total-row .currency {
        font-size: 11px;
        font-weight: 500;
        color: #cdd7f5;
        margin-left: 4px;
    }

    /* ===== ARRETE (montant en lettres, bas de derniere page) ===== */
    .arrete-final {
        position: absolute;
        bottom: 142pt;
        left: 80pt;
        right: 0;
        font-family: Fraunces, Georgia, serif;
        font-size: 13.5px;
        font-style: italic;
        color: #0a0a0a;
        line-height: 1.5;
    }
    .arrete-final.no-payment { bottom: 106pt; }
    .arrete-final .arrete-amount { font-weight: 600; font-style: normal; }

    /* ===== MODALITES DE REGLEMENT (sous l'arrete, facture uniquement) ===== */
    .payment-block {
        position: absolute;
        bottom: 66pt;
        left: 80pt;
        right: 40pt;
        font-size: 10px;
        color: #555555;
        line-height: 1.45;
    }
    .payment-title {
        font-size: 8.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #888888;
        margin-bottom: 3px;
    }
    .payment-line .payment-value { color: #1a1a1a; font-weight: 600; }

    /* ===== CACHE IMAGE ===== */
    .cache-cell {
        width: 203px;
        vertical-align: middle;
        text-align: center;
        padding-left: 20px;
    }
    .cache-cell .cache-img {
        display: inline-block;
        max-width: 203px;
        height: auto;
    }
    .cache-below-block {
        margin-top: 18px;
        margin-bottom: 18px;
    }
    .cache-below-block.cache-right { text-align: right; }
    .cache-below-block.cache-left  { text-align: left; }
    .cache-below-block .cache-img {
        display: inline-block;
        max-width: 163px;
        height: auto;
    }

    /* ===== WATERMARK (AVOIR rotates -45deg, shifted left) ===== */
    .watermark {
        position: fixed;
        top: 70%;
        left: 40%;
        transform: rotate(-45deg);
        transform-origin: center center;
        font-size: 96px;
        font-weight: 800;
        color: rgba(0,0,0,0.05);
        text-transform: uppercase;
        letter-spacing: 12px;
    }

    .watermark.avoir-watermark {
        left: 30%;
    }

    /* ===== FOOTER (fixed at bottom of every page) ===== */
    .page-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 10pt 50pt 12pt 50pt;
        border-top: 1px solid #e0e0e0;
        background: #ffffff;
        font-size: 8.5px;
        color: #888888;
        -webkit-print-color-adjust: exact;
    }
    .footer-line {
        line-height: 1.55;
        width: 100%;
        text-align: center;
    }
    .footer-line .fl-val {
        color: #1a1a1a;
        font-weight: 500;
    }
    .footer-company {
        font-size: 9px;
    }
    .footer-company .fl-strong {
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #1a1a1a;
    }
    .page-number {
        text-align: right;
        font-size: 9px;
        color: #888888;
        margin-top: 8px;
        font-weight: 500;
    }
    .page-number .page-current { color: #1a1a1a; font-weight: 700; }

    /* ===== PAGE BREAK ===== */
    .page-block {
        page-break-after: always;
    }
    .page-block.last-page-block {
        page-break-after: auto;
    }
    .expedition-table tbody tr {
        page-break-inside: avoid;
    }
</style>
</head>
<body>

@if($watermarkText)
    <div class="watermark {{ $isAvoir ? 'avoir-watermark' : '' }}">{{ $watermarkText }}</div>
@endif

<!-- FOOTER (fixed at bottom, registered before paginated content for DomPDF) -->
<div class="page-footer">
    <div class="footer-line footer-company">
        <span class="fl-strong">{{ $society }}</span> — {{ $provAddress }}{{ $provAddressFull ? ', ' . $provAddressFull : '' }}
    </div>
    <div class="footer-line">
        RC : <span class="fl-val">{{ $provRc }}</span> &middot;
        ICE : <span class="fl-val">{{ $provIce }}</span> &middot;
        IF : <span class="fl-val">{{ $provIf }}</span>
        @if($provCnss !== '') &middot; CNSS : <span class="fl-val">{{ $provCnss }}</span>@endif
        @if($provPatente !== '') &middot; Patente : <span class="fl-val">{{ $provPatente }}</span>@endif
    </div>
    <div class="footer-line">
        Tél : <span class="fl-val">{{ $provTel }}</span> &middot;
        Email : <span class="fl-val">{{ $provEmail }}</span>@if($provWeb) &middot; Site web : <span class="fl-val">{{ $provWeb }}</span>@endif
    </div>
</div>

@foreach($expeditionPages as $pageIdx => $pageExpeditions)
    @php
        $pageNum = $pageIdx + 1;
        $isLastPage = $loop->last;
        $isFirstPage = $loop->first;
        $sectionTitle = $isFirstPage ? 'Détail des expéditions' : 'Détail (suite) des expéditions';
    @endphp

    <div class="page-block {{ $loop->last ? 'last-page-block' : '' }}">

    <!-- HEADER TABLE (repeated on every page) -->
    <table class="header-table">
        <tr>
            <td class="left-cell">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" class="logo-img" alt="Logo"><br>
                @else
                    <div class="logo-placeholder">LOGO</div><br>
                @endif
                <span class="brand-name">{{ $society }}</span>
            </td>
            <td class="right-cell">
                @if($isAvoir)
                    <div class="doc-type avoir">AVOIR</div>
                    <div class="doc-number avoir-badge">{{ $docNumber }}</div>
                    @if($refFacture)
                        <div class="avoir-ref-inline">
                            Avoir lié à la facture : <span class="ref-numero">{{ $refFacture->numero }}</span>
                            @if($refFacture->date_facture)
                                <span class="ref-date">({{ $refFacture->date_facture->format('d/m/Y') }})</span>
                            @endif
                        </div>
                    @endif
                @else
                    <div class="doc-type">FACTURE</div>
                    <div class="doc-number">{{ $docNumber }}</div>
                @endif

                <div class="meta-row">
                    <span>Date d'émission</span>
                    <span class="meta-value">{{ $emission }}</span>
                </div>
                @if(!$isAvoir && $echeance)
                    <div class="meta-row">
                        <span>Date d'échéance</span>
                        <span class="meta-value">{{ $echeance }}</span>
                    </div>
                @endif
                <div class="meta-row">
                    <span>Destination</span>
                    <span class="meta-value">{{ $destination ?: '-' }}</span>
                </div>
            </td>
        </tr>
    </table>

    <!-- CLIENT INFO (repeated on every page) -->
    <table class="client-outer">
        <tr>
            <td class="client-cell">
                <table class="party-block">
                    <tr><td>
                        <div class="party-name">{{ $clientName }}</div>
                        <div class="party-detail">
                            @foreach($clientAddressParts as $part)
                                <span class="party-line">{{ $part }}</span>
                            @endforeach
                            @if($clientPhone)<span class="party-line"><span class="detail-label">Tél :</span> {{ $clientPhone }}</span>@endif
                            @if($clientEmail)<span class="party-line"><span class="detail-label">Email :</span> {{ $clientEmail }}</span>@endif
                        </div>
                        @if($clientIce)
                            <div class="party-ids">
                                <div class="id-item">
                                    <div class="id-label">ICE</div>
                                    <div class="id-value">{{ $clientIce }}</div>
                                </div>
                            </div>
                        @endif
                    </td></tr>
                </table>
            </td>
            <td class="client-spacer">&nbsp;</td>
        </tr>
    </table>

    <!-- EXPEDITION TABLE (page-specific) -->
    <div class="table-section">
        <div class="section-title">{{ $sectionTitle }} ({{ $pageExpeditions->count() }})</div>
        @if($pageExpeditions->count() > 0)
            <table class="expedition-table">
                <thead>
                    <tr>
                        <th style="width:78px;">N° Expéd.</th>
                        <th style="width:70px;">Date</th>
                        <th>Destinataire</th>
                        <th style="width:150px;">Service</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($pageExpeditions as $exp)
                        <tr style="page-break-inside: avoid;">
                            <td>{{ $exp->shipping_number }}</td>
                            <td>{{ $exp->created_at?->format('d/m/Y') }}</td>
                            <td>{{ $exp->recipient_name }}</td>
                            <td>{{ $serviceLabel($exp->type_service) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="empty-expeditions">Aucune expédition associée.</div>
        @endif
    </div>

    <!-- SUMMARY + CACHE (last page only — one fiscal block per document) -->
    @if($isLastPage)
    <div class="summary-wrapper">
        <table class="summary-outer">
            <tr>
                @if($cacheSrc && $cacheOnLeft)
                    <td class="cache-cell">
                        <img src="{{ $cacheSrc }}" class="cache-img" alt="Cache">
                    </td>
                @endif
                <td class="spacer">&nbsp;</td>
                <td class="summary-cell">
                    <table class="summary-block">
                        <tr>
                            <td class="summary-label">Montant non taxable</td>
                            <td class="summary-value" style="width:120px;">{{ $negFor($nonTaxable) }}{{ $fmt($nonTaxable) }} MAD</td>
                        </tr>
                        <tr>
                            <td class="summary-label">Montant taxable</td>
                            <td class="summary-value" style="width:120px;">{{ $negFor($taxable) }}{{ $fmt($taxable) }} MAD</td>
                        </tr>
                        <tr class="tva-row">
                            <td class="summary-label">TVA <span class="tva-rate">{{ $fmt($tvaRate) }}%</span></td>
                            <td class="summary-value" style="width:120px;">{{ $negFor($tva) }}{{ $fmt($tva) }} MAD</td>
                        </tr>
                        <tr class="summary-total-row">
                            <td class="summary-label">Total TTC</td>
                            <td class="summary-value" style="width:120px;">{{ $negFor($ttc) }}{{ $fmt($ttc) }} <span class="currency">MAD</span></td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        @if($cacheSrc && !$cacheOnLeft)
            <div class="cache-below-block cache-right">
                <img src="{{ $cacheSrc }}" class="cache-img" alt="Cache">
            </div>
        @endif
    </div>

    <!-- Mention légale, en texte simple au bas de la dernière page -->
    <div class="arrete-final {{ $hasPayment ? '' : 'no-payment' }}">
        {{ $arreteIntro }} <span class="arrete-amount">{{ $ttcEnLettres }}.</span>
    </div>

    @if($hasPayment)
    <!-- Modalités de règlement (coordonnées bancaires du prestataire) -->
    <div class="payment-block">
        <div class="payment-title">Modalités de règlement</div>
        @if($bankAccountName !== '')
            <div class="payment-line">Merci de libeller vos chèques à l'ordre de : <span class="payment-value">{{ $bankAccountName }}</span></div>
        @endif
        @if($bankName !== '' || $bankAgence !== '')
            <div class="payment-line">{{ $bankAccountName !== '' ? 'Ou paiement' : 'Paiement' }} par virement : <span class="payment-value">{{ $bankName }}{{ $bankName !== '' && $bankAgence !== '' ? ' — ' : '' }}{{ $bankAgence }}</span></div>
        @endif
        @if($bankRib !== '')
            <div class="payment-line">Compte N° : <span class="payment-value">{{ $bankRib }}</span></div>
        @endif
        @if($bankSwift !== '')
            <div class="payment-line">Code Swift : <span class="payment-value">{{ $bankSwift }}</span></div>
        @endif
    </div>
    @endif
    @endif

    </div>
@endforeach

<script type="text/php">
    if (isset($pdf)) {
        $font = $fontMetrics->get_font("inter", "normal") ?: $fontMetrics->get_font("Helvetica", "normal");
        $pdf->page_text(542, 758, "Page {PAGE_NUM} / {PAGE_COUNT}", $font, 9, array(0, 0, 0));
    }
</script>
</body>
</html>
