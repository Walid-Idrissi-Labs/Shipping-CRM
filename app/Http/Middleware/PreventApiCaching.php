<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Shared hosting (and some browsers on a plain reload) will otherwise reuse a
// stale cached response for these endpoints — this is what previously forced
// users to hard-refresh (Ctrl+Shift+R) to see data they'd just saved.
class PreventApiCaching
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    }
}
