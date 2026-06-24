<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affectations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('chauffeur_id')->nullable()->constrained('chauffeurs')->nullOnDelete();
            $table->foreignId('vehicule_id')->nullable()->constrained('vehicules')->nullOnDelete();
            $table->string('ville_depart', 100);
            $table->string('pays_depart', 100);
            $table->timestamp('date_heure_depart');
            $table->string('ville_arrivee', 100)->nullable();
            $table->string('pays_arrivee', 100)->nullable();
            $table->timestamp('date_heure_arrivee')->nullable();
            $table->enum('statut', ['planifiee', 'en_cours', 'terminee', 'annulee'])->default('planifiee');
            $table->timestamps();

            $table->index('provider_id');
            $table->index('statut');
            $table->index('chauffeur_id');
            $table->index('vehicule_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affectations');
    }
};
