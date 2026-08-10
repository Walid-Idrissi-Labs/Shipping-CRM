<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Our subclass reads the proxy list from config/security.php rather than
        // from a boot-time static, so the setting survives `config:cache`.
        // It has to stay where the framework put it in the global stack: every
        // IP-based check downstream, throttling included, reads the address this
        // middleware resolves.
        $middleware->replace(
            \Illuminate\Http\Middleware\TrustProxies::class,
            \App\Http\Middleware\TrustProxies::class,
        );

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
            'blocked.ip' => \App\Http\Middleware\BlockBlockedIps::class,
        ]);

        // PreventApiCaching kept outermost (first) so it always has the final
        // say over Cache-Control, regardless of what else sits in this stack.
        $middleware->api(prepend: [
            \App\Http\Middleware\PreventApiCaching::class,
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : '/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
