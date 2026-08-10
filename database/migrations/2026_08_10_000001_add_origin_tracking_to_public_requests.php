<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Records where a public submission came from, so the provider can tell a real
// prospect apart from the spam.
//
// Two IP columns on purpose. `ip_address` is what Laravel resolved and is the
// value everything else keys on; `ip_forwarded_for` is the raw X-Forwarded-For
// header, kept unparsed. Until trusted proxies are configured (see
// config/security.php) Laravel deliberately ignores that header, so storing it
// raw is how we find out from real traffic whether the host proxies us at all.
// If ip_address turns out to be a private address while this column holds a
// public one, the hosting sits behind a proxy and needs configuring.
return new class extends Migration
{
    private const TABLES = ['quote_requests', 'account_requests'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                // 45 characters is the longest possible IPv6 text form
                // (an IPv4-mapped address such as ::ffff:192.168.100.228).
                $t->string('ip_address', 45)->nullable()->after('statut');
                $t->string('ip_forwarded_for', 255)->nullable()->after('ip_address');

                // Set when the submission tripped a bot trap that is suggestive
                // but not conclusive. Conclusive trips are rejected outright and
                // never reach the database, so this column only ever carries
                // "worth a second look", never "definitely a bot".
                $t->string('bot_signal', 40)->nullable()->after('ip_forwarded_for');

                $t->index('ip_address');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropIndex(['ip_address']);
                $t->dropColumn(['ip_address', 'ip_forwarded_for', 'bot_signal']);
            });
        }
    }
};
