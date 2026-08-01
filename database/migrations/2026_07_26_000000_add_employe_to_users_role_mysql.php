<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Companion to 2026_07_14_000003_add_employe_to_users_role_check.php,
        // which only patches PostgreSQL's CHECK constraint. MySQL stores the
        // role list as a native ENUM, so it needs its own ALTER.
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY role ENUM('client', 'prestataire', 'employe') NOT NULL DEFAULT 'client'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY role ENUM('client', 'prestataire') NOT NULL DEFAULT 'client'");
    }
};
