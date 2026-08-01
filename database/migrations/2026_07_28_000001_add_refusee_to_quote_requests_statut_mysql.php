<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL stores statut as a native ENUM (SQLite/pgsql just use a string
        // check, unaffected). Adding a real "refusee" decline path for demandes
        // de devis (see QuoteRequestController::reject) needs its own ALTER,
        // same as 2026_07_26_000000_add_employe_to_users_role_mysql.php did for
        // users.role.
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE quote_requests MODIFY statut ENUM('en_attente', 'traitee', 'refusee') NOT NULL DEFAULT 'en_attente'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE quote_requests MODIFY statut ENUM('en_attente', 'traitee') NOT NULL DEFAULT 'en_attente'");
    }
};
