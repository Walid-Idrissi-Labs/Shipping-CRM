<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('client_divers_nom', 255)->nullable();
            $table->text('client_divers_adresse')->nullable();
            $table->string('client_divers_tel', 50)->nullable();
            $table->string('client_divers_email', 255)->nullable();
            $table->integer('numero_n');
            $table->smallInteger('annee');
            $table->date('date_facture')->default(now()->toDateString());
            $table->date('date_echeance');
            $table->enum('type_destination', ['national', 'international']);
            $table->decimal('taux_tva', 5, 2);
            $table->decimal('non_taxable', 10, 2)->default(0);
            $table->decimal('taxable', 10, 2)->default(0);
            $table->decimal('tva', 10, 2)->default(0);
            $table->decimal('ttc', 10, 2)->default(0);
            $table->enum('statut', ['impayee', 'payee'])->default('impayee');
            $table->timestamps();

            $table->unique(['annee', 'numero_n']);
            $table->index('provider_id');
            $table->index('client_id');
            $table->index('statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factures');
    }
};
