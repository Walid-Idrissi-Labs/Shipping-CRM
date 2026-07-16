<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpeditionRequest;
use App\Models\Quote;
use App\Models\Shipment;
use App\Models\Colis;
use App\Services\LabelPdfService;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Illuminate\Http\Request;

class ExpeditionRequestController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function showPublic(Request $request, string $token)
    {
        $quote = Quote::where('public_link_token', $token)
            ->where('public_link_expires_at', '>', now())
            ->with(['colis', 'expeditionRequest'])
            ->first();

        if (! $quote) {
            abort(404, 'Ce lien est invalide ou a expire.');
        }

        if ($quote->expeditionRequest) {
            abort(404, 'Ce lien a deja ete utilise.');
        }

        return response()->json([
            'quote' => $quote,
        ]);
    }

    public function storePublic(Request $request, string $token)
    {
        $quote = Quote::where('public_link_token', $token)
            ->where('public_link_expires_at', '>', now())
            ->with('colis')
            ->first();

        if (! $quote) {
            abort(404, 'Ce lien est invalide ou a expire.');
        }

        if ($quote->expeditionRequest) {
            abort(404, 'Ce lien a deja ete utilise.');
        }

        $validated = $request->validate([
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
            'valeur_declaree' => ['nullable', 'numeric', 'min:0'],
            'devise_valeur' => ['nullable', 'in:MAD,USD,EUR'],
            'type_service' => ['required', 'in:national,international_express_dap,fret_aerien,routier_groupage,maritime_groupage'],
        ]);

        $expeditionRequest = ExpeditionRequest::create([
            'quote_id' => $quote->id,
            'provider_id' => $quote->provider_id,
            'token' => $token,
            'sender_name' => $validated['sender_name'],
            'sender_company' => $validated['sender_company'] ?? null,
            'sender_address' => $validated['sender_address'] ?? null,
            'sender_city' => $validated['sender_city'] ?? null,
            'sender_postal_code' => $validated['sender_postal_code'] ?? null,
            'sender_country' => $validated['sender_country'] ?? null,
            'sender_email' => $validated['sender_email'] ?? null,
            'sender_phone' => $validated['sender_phone'] ?? null,
            'recipient_name' => $validated['recipient_name'],
            'recipient_company' => $validated['recipient_company'] ?? null,
            'recipient_address' => $validated['recipient_address'] ?? null,
            'recipient_city' => $validated['recipient_city'] ?? null,
            'recipient_postal_code' => $validated['recipient_postal_code'] ?? null,
            'recipient_country' => $validated['recipient_country'] ?? null,
            'recipient_phone' => $validated['recipient_phone'] ?? null,
            'recipient_email' => $validated['recipient_email'] ?? null,
            'colis' => $validated['colis'] ?? null,
            'valeur_declaree' => $validated['valeur_declaree'] ?? null,
            'devise_valeur' => $validated['devise_valeur'] ?? null,
            'type_service' => $validated['type_service'],
            'statut' => 'en_attente',
        ]);

        // Invalidate the token by setting expiration to past
        $quote->update(['public_link_expires_at' => now()->subDay()]);

        return response()->json([
            'message' => 'Votre demande a ete enregistree avec succes.',
            'expedition_request' => $expeditionRequest,
        ], 201);
    }

    public function index(Request $request)
    {
        $provider = $request->user()->provider;
        $query = ExpeditionRequest::query()
            ->with('quote')
            ->where('provider_id', $provider->id);

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(sender_name) like ?', [$q])
                    ->orWhereRaw('LOWER(recipient_name) like ?', [$q])
                    ->orWhereHas('quote', fn ($q2) => $q2->whereRaw('LOWER(quote_number) like ?', [$q]));
            });
        }

        $this->applySort(
            $query,
            $request,
            ['created_at', 'sender_name', 'recipient_name', 'statut'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function show(Request $request, ExpeditionRequest $expeditionRequest)
    {
        if ($expeditionRequest->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        $expeditionRequest->load('quote');

        return response()->json($expeditionRequest);
    }

    public function accept(Request $request, ExpeditionRequest $expeditionRequest)
    {
        if ($expeditionRequest->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        if ($expeditionRequest->statut !== 'en_attente') {
            return response()->json(['message' => 'Cette demande a deja ete traitee.'], 422);
        }

        $quote = $expeditionRequest->quote;

        // Create the shipment
        $data = [
            'provider_id' => $quote->provider_id,
            'client_id' => null, // client divers
            'quote_id' => $quote->id,
            'created_by' => $request->user()->id,
            'shipping_number' => $this->generateShippingNumber(),
            'statut_actuel' => 'information_recue',
            'sender_name' => $expeditionRequest->sender_name,
            'sender_company' => $expeditionRequest->sender_company,
            'sender_address' => $expeditionRequest->sender_address,
            'sender_city' => $expeditionRequest->sender_city,
            'sender_postal_code' => $expeditionRequest->sender_postal_code,
            'sender_country' => $expeditionRequest->sender_country,
            'sender_email' => $expeditionRequest->sender_email,
            'sender_phone' => $expeditionRequest->sender_phone,
            'recipient_name' => $expeditionRequest->recipient_name,
            'recipient_company' => $expeditionRequest->recipient_company,
            'recipient_address' => $expeditionRequest->recipient_address,
            'recipient_city' => $expeditionRequest->recipient_city,
            'recipient_postal_code' => $expeditionRequest->recipient_postal_code,
            'recipient_country' => $expeditionRequest->recipient_country,
            'recipient_phone' => $expeditionRequest->recipient_phone,
            'recipient_email' => $expeditionRequest->recipient_email,
            'valeur_declaree' => $expeditionRequest->valeur_declaree,
            'devise_valeur' => $expeditionRequest->devise_valeur,
            'type_service' => $expeditionRequest->type_service,
        ];

        $shipment = Shipment::create($data);

        // Create colis from the expedition request
        if (! empty($expeditionRequest->colis)) {
            foreach ($expeditionRequest->colis as $index => $c) {
                $shipment->colis()->create([
                    'position' => $index,
                    'nb_pieces' => $c['nb_pieces'] ?? 1,
                    'poids' => $c['poids'] ?? 0,
                    'longueur' => $c['longueur'] ?? null,
                    'largeur' => $c['largeur'] ?? null,
                    'hauteur' => $c['hauteur'] ?? null,
                    'type_colis' => $c['type_colis'] ?? 'paquet',
                    'description_colis' => $c['description_colis'] ?? null,
                ]);
            }
        }
        // Fallback to quote's colis if expedition request doesn't have colis
        elseif ($quote->colis->isNotEmpty()) {
            foreach ($quote->colis as $index => $c) {
                $shipment->colis()->create([
                    'position' => $index,
                    'nb_pieces' => $c->nb_pieces ?? 1,
                    'poids' => $c->poids ?? 0,
                    'longueur' => $c->longueur,
                    'largeur' => $c->largeur,
                    'hauteur' => $c->hauteur,
                    'type_colis' => $c->type_colis ?? 'paquet',
                    'description_colis' => $c->description_colis,
                ]);
            }
        }

        $shipment->suiviStatuts()->create([
            'statut' => 'information_recue',
            'date_statut' => now(),
            'description' => 'Information recue',
            'changed_by' => $request->user()->id,
        ]);

        // Generate label
        try {
            $labelUrl = (new LabelPdfService)->generate($shipment);
            $shipment->update(['label_url' => $labelUrl]);
        } catch (\Throwable $e) {
            report($e);
        }

        $expeditionRequest->update(['statut' => 'acceptee']);

        return response()->json([
            'message' => 'Expedition creee avec succes.',
            'shipment' => $shipment->fresh()->load('colis'),
        ]);
    }

    public function reject(Request $request, ExpeditionRequest $expeditionRequest)
    {
        if ($expeditionRequest->provider_id !== $request->user()->provider->id) {
            abort(403, 'Acces refuse.');
        }

        if ($expeditionRequest->statut !== 'en_attente') {
            return response()->json(['message' => 'Cette demande a deja ete traitee.'], 422);
        }

        $expeditionRequest->update(['statut' => 'refusee']);

        return response()->json(['message' => 'Demande refusee.']);
    }
}