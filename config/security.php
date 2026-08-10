<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted proxies
    |--------------------------------------------------------------------------
    |
    | Which upstream machines are allowed to tell us a visitor's real IP address
    | via the X-Forwarded-For header.
    |
    | This matters because every IP-based defence in the app -- the rate limits
    | in AppServiceProvider, the blocklist, the origin shown on each demande --
    | reads whatever Laravel reports as the client address, and there are two
    | ways to get that wrong:
    |
    |   Trust nothing while sitting behind a proxy, and every visitor looks like
    |   the proxy. Rate limits then throttle the whole world as one visitor, and
    |   a block either does nothing or blocks everybody.
    |
    |   Trust everything while NOT behind a proxy, and anyone can send
    |   "X-Forwarded-For: 8.8.8.8" by hand. They walk past their own block,
    |   reset their own rate limit at will, and can pin their spam on an
    |   innocent address you might then block.
    |
    | The second mistake is much worse than the first, so the default here is to
    | trust nothing. A wrong setting is then merely useless, never exploitable.
    |
    | Values:
    |   null or ''        trust no proxy; use the raw connecting address
    |   '10.0.0.1,10.0.0.2'  trust these specific proxies
    |   'REMOTE_ADDR'     trust whichever machine connected to us, whatever it is
    |   '*'               trust any proxy -- ONLY safe when something upstream
    |                     strips inbound X-Forwarded-For, e.g. Cloudflare
    |
    | On OVH mutualisé we do not know up front whether a proxy sits in front of
    | PHP, so we start at null and let real traffic answer the question: every
    | public submission stores both the resolved address and the raw forwarded
    | header (see the add_origin_tracking_to_public_requests migration). If
    | demandes start showing a private ip_address next to a public forwarded
    | value, there is a proxy, and this is the setting to change.
    |
    */

    'trusted_proxies' => env('TRUSTED_PROXIES'),

];
