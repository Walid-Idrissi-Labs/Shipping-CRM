<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chauffeurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->string('nom_complet');
            $table->string('telephone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->enum('statut', ['actif', 'en_mission', 'en_conge'])->default('actif');
            $table->timestamps();

            $table->index('provider_id');
            $table->index('statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chauffeurs');
    }
};
