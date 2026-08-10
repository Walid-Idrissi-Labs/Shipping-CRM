<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A permanent per-IP cache of what ipinfo.io told us.
//
// The point is that we look an address up once, ever. Spam arrives from the
// same handful of addresses over and over, so without this table a provider
// paging through a spam wave would burn one API call per demande viewed.
//
// `status` is a plain string rather than an enum: this project already had to
// ship a MySQL-specific migration just to add one value to an existing enum
// (see 2026_07_28_000001), and a status column is exactly the kind of thing
// that grows a new value later.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ip_geolocations', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->unique();

            // resolved   - ipinfo answered, the fields below are populated
            // private    - a LAN/loopback/reserved address, never worth asking about
            // failed     - the lookup errored or timed out; retried after a cooldown
            // unconfigured - no API token set, so we never called out at all
            $table->string('status', 20)->default('resolved');

            $table->string('country_code', 2)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('region', 100)->nullable();
            $table->string('city', 100)->nullable();
            // ipinfo's "org" field, e.g. "AS36903 Maroc Telecom". Often the most
            // telling field of the lot: a hosting provider or VPN here, on a form
            // meant for Moroccan shippers, is a strong spam signal on its own.
            $table->string('org', 150)->nullable();

            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ip_geolocations');
    }
};
