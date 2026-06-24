<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('providers')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('quote_id')->nullable()->unique()->constrained('quotes')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->char('shipping_number', 9)->unique();
            $table->string('label_url', 500)->nullable();
            $table->string('sender_name');
            $table->text('sender_address')->nullable();
            $table->string('sender_city', 100)->nullable();
            $table->string('sender_postal_code', 20)->nullable();
            $table->string('sender_country', 100)->nullable();
            $table->string('sender_email')->nullable();
            $table->string('sender_phone')->nullable();
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
            $table->decimal('valeur_declaree', 10, 2)->nullable();
            $table->enum('devise_valeur', ['MAD', 'USD', 'EUR'])->nullable();
            $table->enum('type_colis', ['document', 'paquet', 'palette'])->nullable();
            $table->string('description_colis', 60)->nullable();
            $table->enum('type_service', ['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage']);
            $table->enum('statut_actuel', ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre'])->default('information_recue');
            $table->enum('sous_statut_actuel', ['en_cours_de_livraison', 'tentative_de_livraison', 'on_hold', 'retour'])->nullable();
            $table->timestamps();

            $table->index('provider_id');
            $table->index('client_id');
            $table->index('shipping_number');
            $table->index('statut_actuel');
            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
