<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('public_link_token', 64)->nullable()->unique()->after('statut');
            $table->timestamp('public_link_expires_at')->nullable()->after('public_link_token');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['public_link_token', 'public_link_expires_at']);
        });
    }
};
