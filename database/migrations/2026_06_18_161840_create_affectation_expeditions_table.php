<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affectation_expeditions', function (Blueprint $table) {
            $table->foreignId('affectation_id')->constrained('affectations')->cascadeOnDelete();
            $table->foreignId('expedition_id')->constrained('shipments')->cascadeOnDelete();
            $table->primary(['affectation_id', 'expedition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affectation_expeditions');
    }
};
