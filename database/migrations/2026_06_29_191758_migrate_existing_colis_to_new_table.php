<?php

use App\Models\Colis;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Shipment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Migrate Shipment colis
        Shipment::chunkById(100, function ($shipments) {
            foreach ($shipments as $shipment) {
                $hasColisData = $shipment->poids || $shipment->longueur || $shipment->largeur || 
                               $shipment->hauteur || $shipment->nb_pieces || $shipment->type_colis || 
                               $shipment->description_colis;
                
                if ($hasColisData) {
                    Colis::create([
                        'colisable_type' => Shipment::class,
                        'colisable_id' => $shipment->id,
                        'position' => 0,
                        'nb_pieces' => $shipment->nb_pieces ?? 1,
                        'poids' => $shipment->poids ?? 0,
                        'longueur' => $shipment->longueur,
                        'largeur' => $shipment->largeur,
                        'hauteur' => $shipment->hauteur,
                        'type_colis' => $shipment->type_colis ?? 'paquet',
                        'description_colis' => $shipment->description_colis,
                    ]);
                }
            }
        });

        // Migrate Quote colis
        Quote::chunkById(100, function ($quotes) {
            foreach ($quotes as $quote) {
                $hasColisData = $quote->poids || $quote->longueur || $quote->largeur || 
                               $quote->hauteur || $quote->nb_pieces || $quote->type_colis || 
                               $quote->description_colis;
                
                if ($hasColisData) {
                    Colis::create([
                        'colisable_type' => Quote::class,
                        'colisable_id' => $quote->id,
                        'position' => 0,
                        'nb_pieces' => $quote->nb_pieces ?? 1,
                        'poids' => $quote->poids ?? 0,
                        'longueur' => $quote->longueur,
                        'largeur' => $quote->largeur,
                        'hauteur' => $quote->hauteur,
                        'type_colis' => $quote->type_colis ?? 'paquet',
                        'description_colis' => $quote->description_colis,
                    ]);
                }
            }
        });

        // Migrate QuoteRequest colis
        QuoteRequest::chunkById(100, function ($quoteRequests) {
            foreach ($quoteRequests as $quoteRequest) {
                $hasColisData = $quoteRequest->poids || $quoteRequest->longueur || $quoteRequest->largeur || 
                               $quoteRequest->hauteur || $quoteRequest->nb_pieces || $quoteRequest->type_colis || 
                               $quoteRequest->description_colis;
                
                if ($hasColisData) {
                    Colis::create([
                        'colisable_type' => QuoteRequest::class,
                        'colisable_id' => $quoteRequest->id,
                        'position' => 0,
                        'nb_pieces' => $quoteRequest->nb_pieces ?? 1,
                        'poids' => $quoteRequest->poids ?? 0,
                        'longueur' => $quoteRequest->longueur,
                        'largeur' => $quoteRequest->largeur,
                        'hauteur' => $quoteRequest->hauteur,
                        'type_colis' => $quoteRequest->type_colis ?? 'paquet',
                        'description_colis' => $quoteRequest->description_colis,
                    ]);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Colis::whereIn('colisable_type', [Shipment::class, Quote::class, QuoteRequest::class])->delete();
    }
};
