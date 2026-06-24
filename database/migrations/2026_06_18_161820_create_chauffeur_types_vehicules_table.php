<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chauffeur_types_vehicules', function (Blueprint $table) {
            $table->foreignId('chauffeur_id')->constrained('chauffeurs')->cascadeOnDelete();
            $table->enum('type_vehicule', ['camionnette_fourgon_leger', 'fourgon_grand_volume', 'camion_porteur', 'semi_remorque_tracteur', 'vehicule_frigorifique', 'moto_scooter', 'utilitaire_bache_plateau']);
            $table->primary(['chauffeur_id', 'type_vehicule']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chauffeur_types_vehicules');
    }
};
