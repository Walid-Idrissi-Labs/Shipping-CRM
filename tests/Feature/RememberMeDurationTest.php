<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * "Remember me" is what keeps a user signed in past the 2h SESSION_LIFETIME:
 * once the session lapses, SessionGuard falls back to the recaller cookie and
 * mints a fresh session. Laravel 13 defaults that cookie to 576000 minutes
 * (~400 days), which is far longer than this app wants, so AuthController
 * caps it at a week. These tests pin that down — a framework upgrade silently
 * restoring the 400-day default would otherwise go unnoticed.
 */
class RememberMeDurationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The recaller cookie is *queued* on the cookie jar, and queued cookies are
     * only attached to the response by the `web` middleware group — which
     * Sanctum applies to an API route only when the request looks like it came
     * from the SPA. Pinning the stateful domain here (rather than relying on
     * whatever the local .env happens to say) keeps that deterministic.
     */
    protected function setUp(): void
    {
        parent::setUp();

        config(['sanctum.stateful' => ['localhost']]);
    }

    private function login(bool $remember)
    {
        return $this->withHeader('Referer', 'http://localhost/login')
            ->postJson('/api/auth/login', [
                'identifier' => 'remember@example.com',
                'password' => 'secret-password',
                'remember' => $remember,
            ]);
    }

    private function makeUser(): User
    {
        return User::create([
            'name' => 'Remember Test',
            'email' => 'remember@example.com',
            'password_hash' => Hash::make('secret-password'),
            'role' => 'prestataire',
        ]);
    }

    private function recallerCookie($response)
    {
        $recaller = Auth::guard('web')->getRecallerName();

        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === $recaller) {
                return $cookie;
            }
        }

        return null;
    }

    public function test_remember_me_cookie_lasts_one_week_not_the_framework_default(): void
    {
        $this->makeUser();

        $response = $this->login(true);
        $response->assertOk();

        $cookie = $this->recallerCookie($response);
        $this->assertNotNull($cookie, 'Expected a remember-me cookie when remember=true.');

        $days = ($cookie->getExpiresTime() - time()) / 86400;

        // Allow a little slack for clock/rounding, but stay far away from the
        // ~400-day framework default this is deliberately overriding.
        $this->assertGreaterThan(6.9, $days);
        $this->assertLessThan(7.1, $days);
    }

    public function test_no_remember_me_cookie_when_the_box_is_unchecked(): void
    {
        $this->makeUser();

        $response = $this->login(false);
        $response->assertOk();

        $this->assertNull(
            $this->recallerCookie($response),
            'Without remember=true the session lifetime alone should govern.'
        );
    }
}
