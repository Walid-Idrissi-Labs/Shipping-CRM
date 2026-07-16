<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->decimal('valeur_declaree', 15, 2)->nullable()->after('description_colis');
            $table->string('devise_valeur', 3)->nullable()->after('valeur_declaree');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['valeur_declaree', 'devise_valeur']);
        });
    }
};
