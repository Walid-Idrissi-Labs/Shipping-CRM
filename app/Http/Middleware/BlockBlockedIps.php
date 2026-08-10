<?php

namespace App\Http\Middleware;

use App\Models\BlockedIp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Turns away submissions from addresses the provider has blocked.
//
// Only guards the public write endpoints. Public tracking is handled instead by
// a much harsher rate limit in AppServiceProvider, because a Moroccan mobile
// carrier can put thousands of subscribers behind one address: if a block ever
// lands on the wrong one, a real client should still be able to look up their
// parcel rather than hit a wall with no explanation.
class BlockBlockedIps
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();

        if (! BlockedIp::isBlocked($ip)) {
            return $next($request);
        }

        BlockedIp::recordHit($ip);

        // 403 rather than 429: a rate limit invites a retry in sixty seconds,
        // and this is not going to start working. The message says nothing
        // about blocklists or IP addresses -- a spammer learns nothing they can
        // act on, and the rare legitimate visitor caught by a bad block is
        // given a way to reach a human instead of a dead end.
        return response()->json([
            'message' => "Votre demande n'a pas pu etre envoyee. Si vous pensez qu'il s'agit d'une erreur, contactez-nous par telephone.",
        ], 403);
    }
}
