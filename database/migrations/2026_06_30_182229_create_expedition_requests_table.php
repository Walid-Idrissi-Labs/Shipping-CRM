<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expedition_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            // Expediteur (sender) fields
            $table->string('sender_name');
            $table->string('sender_company')->nullable();
            $table->string('sender_address')->nullable();
            $table->string('sender_city')->nullable();
            $table->string('sender_postal_code')->nullable();
            $table->string('sender_country')->nullable();
            $table->string('sender_email')->nullable();
            $table->string('sender_phone')->nullable();
            // Destinataire (recipient) fields
            $table->string('recipient_name');
            $table->string('recipient_company')->nullable();
            $table->string('recipient_address')->nullable();
            $table->string('recipient_city')->nullable();
            $table->string('recipient_postal_code')->nullable();
            $table->string('recipient_country')->nullable();
            $table->string('recipient_phone')->nullable();
            $table->string('recipient_email')->nullable();
            // Colis (packages) - JSON array
            $table->json('colis')->nullable();
            // Valeur declaree
            $table->decimal('valeur_declaree', 15, 2)->nullable();
            $table->string('devise_valeur', 3)->nullable();
            // Type de service
            $table->string('type_service');
            // Status
            $table->enum('statut', ['en_attente', 'acceptee', 'refusee'])->default('en_attente');
            $table->timestamps();

            $table->index(['provider_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expedition_requests');
    }
};
