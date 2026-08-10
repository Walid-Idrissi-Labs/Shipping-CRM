<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The blocklist is deliberately global rather than scoped per provider.
//
// It has to be: public account requests carry no provider_id at all (see
// create_account_requests_table), so at the moment an anonymous visitor posts
// a form there is no provider whose list we could consult. A per-provider
// column would look like multi-tenancy while silently doing nothing. What we
// keep instead is `blocked_by_user_id` -- who made the call -- which is the
// part that actually matters for an audit.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->unique();
            $table->foreignId('blocked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 255)->nullable();

            // Where the address was at the moment it was blocked. Denormalised
            // on purpose: addresses get reassigned, and a year from now the
            // provider wants to know what they were looking at when they
            // decided, not where the address happens to resolve today.
            $table->string('country_code', 2)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('city', 100)->nullable();

            // How many submissions this block has turned away since. This is
            // the column that makes the list worth reading: a high count says
            // the block is doing real work, and a count still at zero weeks
            // later says the spammer moved on and the entry can be retired.
            $table->unsignedInteger('hits')->default(0);
            $table->timestamp('last_hit_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_ips');
    }
};
