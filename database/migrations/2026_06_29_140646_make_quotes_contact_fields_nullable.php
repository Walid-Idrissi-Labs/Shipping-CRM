<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('client_email')->nullable()->change();
            $table->string('client_phone')->nullable()->change();
            $table->string('recipient_name')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('client_email')->nullable(false)->change();
            $table->string('client_phone')->nullable(false)->change();
            $table->string('recipient_name')->nullable(false)->change();
        });
    }
};
