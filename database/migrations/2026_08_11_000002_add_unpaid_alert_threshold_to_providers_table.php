<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            // Same decimal(10,2) shape as factures.ttc / avoirs.ttc, so the
            // threshold is comparable to the amounts it is compared against.
            $table->decimal('unpaid_alert_threshold', 10, 2)->default(5000);
        });
    }

    public function down(): void
    {
        Schema::table('providers', function (Blueprint $table) {
            $table->dropColumn('unpaid_alert_threshold');
        });
    }
};
