<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avoirs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('facture_id')->unique()->constrained('factures')->cascadeOnDelete();
            $table->integer('numero_n');
            $table->smallInteger('annee');
            $table->enum('type_destination', ['national', 'international']);
            $table->decimal('taux_tva', 5, 2);
            $table->decimal('non_taxable', 10, 2)->default(0);
            $table->decimal('taxable', 10, 2)->default(0);
            $table->decimal('tva', 10, 2)->default(0);
            $table->decimal('ttc', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['annee', 'numero_n']);
            $table->index('provider_id');
            $table->index('facture_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avoirs');
    }
};
