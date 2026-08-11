<?php

namespace App\Providers;

use App\Models\BlockedIp;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    // Laravel 10 and earlier shipped `throttle:api` in the default API middleware
    // group; Laravel 11 dropped it, and this app was built on the newer skeleton,
    // so until now nothing was throttled at all.
    //
    // Every limit here is tuned so a real person never meets it. The costly
    // mistake would be keying on IP alone: a client's whole office shares one
    // public IP, so one person fat-fingering their password would lock out their
    // colleagues. Login is therefore keyed per-account (see AuthController), and
    // the IP limits below sit far above human speed as a backstop against bulk
    // automation only.
    private function configureRateLimiting(): void
    {
        // Password changes. Someone who mistypes their current password a few
        // times in a row is normal; sixty attempts a minute is a script.
        RateLimiter::for('password-change', fn (Request $request) => Limit::perMinute(6)
            ->by($request->user()?->id ?: $request->ip())
            ->response($this->tooManyResponse()));

        // Public forms (account + quote requests). A visitor submits these once.
        RateLimiter::for('public-forms', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip())
            ->response($this->tooManyResponse()));

        // Public parcel tracking. A real person checks a handful of numbers;
        // this exists to make scraping the whole 9-digit range impractical.
        //
        // A blocked address is squeezed rather than shut out. Blocking is aimed
        // at form spam, and tracking is the one public feature a real customer
        // genuinely needs: Moroccan carriers put thousands of subscribers behind
        // a single address, so a block that lands slightly wrong should slow a
        // stranger down, not strand a client who just wants to find their
        // parcel. Three a minute is unusable for scraping and barely noticeable
        // to someone checking one number.
        RateLimiter::for('public-tracking', fn (Request $request) => Limit::perMinute(
            BlockedIp::isBlocked($request->ip()) ? 3 : 30
        )->by($request->ip())->response($this->tooManyResponse()));

        // Remarques & reclamations. These are clients en compte, already known
        // and already paying, so the limits are set to catch a runaway script
        // and nothing else: opening six threads in an hour, or sending twenty
        // messages in a minute, is past anything a person does while actually
        // describing a problem.
        RateLimiter::for('reclamation-new', fn (Request $request) => Limit::perHour(6)
            ->by($request->user()?->id ?: $request->ip())
            ->response($this->tooManyResponse()));

        RateLimiter::for('reclamation-message', fn (Request $request) => Limit::perMinute(20)
            ->by($request->user()?->id ?: $request->ip())
            ->response($this->tooManyResponse()));

        // Backstop across all authenticated API traffic: high enough that busy
        // dashboard use never approaches it.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)
            ->by($request->user()?->id ?: $request->ip())
            ->response($this->tooManyResponse()));
    }

    // Laravel's stock 429 body is the English "Too Many Attempts." — this app is
    // French throughout, and the message tells the user what to do rather than
    // naming the thing that went wrong.
    private function tooManyResponse(): callable
    {
        return function (Request $request, array $headers) {
            $seconds = (int) ($headers['Retry-After'] ?? 60);

            return response()->json([
                'message' => "Trop de tentatives. Merci de patienter {$seconds} secondes avant de reessayer.",
                'retry_after' => $seconds,
            ], 429, $headers);
        };
    }
}
