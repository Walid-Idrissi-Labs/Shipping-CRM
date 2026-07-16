<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Only run on PostgreSQL (SQLite doesn't support ALTER TABLE DROP CONSTRAINT)
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Check if constraint exists before dropping
        $constraintExists = DB::selectOne("
            SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
        ");

        if ($constraintExists) {
            DB::statement("ALTER TABLE users DROP CONSTRAINT users_role_check");
        }

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'prestataire', 'employe'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $constraintExists = DB::selectOne("
            SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
        ");

        if ($constraintExists) {
            DB::statement("ALTER TABLE users DROP CONSTRAINT users_role_check");
        }

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'prestataire'))");
    }
};