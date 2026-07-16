<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sous_etapes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->enum('statut', ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre']);
            $table->string('description', 60);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['shipment_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sous_etapes');
    }
};
