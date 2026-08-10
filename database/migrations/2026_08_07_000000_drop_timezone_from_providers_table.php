<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The per-provider timezone existed only to validate status dates against
     * "now" in the provider's own zone. Status dates are no longer bounded at
     * all, so nothing reads this column any more.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('providers', 'timezone')) {
            return;
        }

        Schema::table('providers', function (Blueprint $table) {
            $table->dropColumn('timezone');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('providers', 'timezone')) {
            return;
        }

        Schema::table('providers', function (Blueprint $table) {
            $table->string('timezone', 60)->default('Africa/Casablanca');
        });
    }
};
