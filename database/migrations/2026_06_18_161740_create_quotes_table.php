<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('quote_number', 50)->unique();
            $table->smallInteger('quote_year');
            $table->integer('quote_sequence');
            $table->string('client_name');
            $table->text('client_address')->nullable();
            $table->string('client_city', 100)->nullable();
            $table->string('client_postal_code', 20)->nullable();
            $table->string('client_country', 100)->nullable();
            $table->string('client_email');
            $table->string('client_phone');
            $table->string('recipient_name');
            $table->text('recipient_address')->nullable();
            $table->string('recipient_city', 100)->nullable();
            $table->string('recipient_postal_code', 20)->nullable();
            $table->string('recipient_country', 100)->nullable();
            $table->string('recipient_phone')->nullable();
            $table->decimal('poids', 8, 3)->nullable();
            $table->decimal('longueur', 8, 2)->nullable();
            $table->decimal('largeur', 8, 2)->nullable();
            $table->decimal('hauteur', 8, 2)->nullable();
            $table->integer('nb_pieces')->nullable();
            $table->enum('type_colis', ['document', 'paquet', 'palette'])->nullable();
            $table->enum('type_service', ['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage']);
            $table->string('description_colis', 60)->nullable();
            $table->decimal('montant_ht', 10, 2)->nullable();
            $table->decimal('montant_ttc', 10, 2)->nullable();
            $table->enum('statut', ['envoye', 'accepte', 'refuse'])->default('envoye');
            $table->timestamps();

            $table->unique(['quote_year', 'quote_sequence']);
            $table->index('provider_id');
            $table->index('client_id');
            $table->index('statut');
            $table->index('quote_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
