<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facture_expeditions', function (Blueprint $table) {
            $table->foreignId('facture_id')->constrained('factures')->cascadeOnDelete();
            $table->foreignId('expedition_id')->unique()->constrained('shipments')->cascadeOnDelete();
            $table->primary(['facture_id', 'expedition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facture_expeditions');
    }
};
