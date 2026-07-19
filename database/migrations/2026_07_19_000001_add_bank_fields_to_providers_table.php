<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_rib', 50)->nullable();
            $table->string('bank_swift', 20)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_rib', 'bank_swift']);
        });
    }
};
