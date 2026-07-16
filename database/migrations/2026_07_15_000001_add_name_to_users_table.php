<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employee accounts are identified by a person's name, but the column was never
     * created: the name was silently dropped on save, listings rendered blank, and
     * searching or sorting by name failed on the missing column. Nullable because
     * client and prestataire accounts carry their label on the related record
     * (clients.full_name / providers.company_name).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }
};
