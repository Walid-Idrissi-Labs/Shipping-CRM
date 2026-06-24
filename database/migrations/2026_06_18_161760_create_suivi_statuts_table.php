<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suivi_statuts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expedition_id')->constrained('shipments')->cascadeOnDelete();
            $table->enum('statut', ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre']);
            $table->enum('sous_statut', ['en_cours_de_livraison', 'tentative_de_livraison', 'on_hold', 'retour'])->nullable();
            $table->timestamp('date_statut');
            $table->string('description', 60)->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('expedition_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suivi_statuts');
    }
};
