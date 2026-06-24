<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('company_name');
            $table->text('address')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 100)->default('Maroc');
            $table->string('phone', 50)->nullable();
            $table->string('website', 255)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('ice', 50)->nullable();
            $table->string('rc', 50)->nullable();
            $table->string('if_', 50)->nullable();
            $table->string('cnss', 50)->nullable();
            $table->string('patente', 50)->nullable();
            $table->string('logo_invoice_url', 500)->nullable();
            $table->string('logo_label_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('providers');
    }
};
