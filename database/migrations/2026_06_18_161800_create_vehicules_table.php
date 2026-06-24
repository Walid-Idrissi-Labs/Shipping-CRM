<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->string('immatriculation', 50)->unique();
            $table->string('marque_modele', 255)->nullable();
            $table->integer('annee_circulation')->nullable();
            $table->string('couleur', 50)->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->enum('type_vehicule', ['camionnette_fourgon_leger', 'fourgon_grand_volume', 'camion_porteur', 'semi_remorque_tracteur', 'vehicule_frigorifique', 'moto_scooter', 'utilitaire_bache_plateau']);
            $table->enum('statut', ['disponible', 'en_mission', 'en_maintenance', 'hors_service'])->default('disponible');
            $table->date('exp_controle_technique')->nullable();
            $table->date('exp_assurance')->nullable();
            $table->date('exp_carte_grise')->nullable();
            $table->timestamps();

            $table->index('provider_id');
            $table->index('statut');
            $table->index('immatriculation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicules');
    }
};
