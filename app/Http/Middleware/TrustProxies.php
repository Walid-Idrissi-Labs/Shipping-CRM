<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;

// Laravel's own TrustProxies takes its proxy list from a static set once at
// boot, which would mean reading env() from bootstrap/app.php -- and env() there
// returns null as soon as someone runs `php artisan config:cache`, silently
// undoing the setting. Reading config() from a resolved middleware instead
// means the value survives a cached config, which is how this will be deployed.
class TrustProxies extends Middleware
{
    protected function proxies()
    {
        $proxies = config('security.trusted_proxies');

        // An empty string from an unset .env line must mean "trust nothing",
        // not "trust a proxy whose address is the empty string".
        return filled($proxies) ? $proxies : null;
    }
}
