<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->unsignedSmallInteger('per_page_expeditions')->default(25);
            $table->unsignedSmallInteger('per_page_factures')->default(25);
        });
    }

    public function down(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->dropColumn(['per_page_expeditions', 'per_page_factures']);
        });
    }
};
