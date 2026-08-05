<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

// The point of these limits is to stop scripted guessing without ever being met
// by a real person, so the tests assert both halves: the limit exists, AND the
// ordinary human patterns (mistype then succeed, several people on one office
// IP) sail straight through it.
class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login|client@test.ma|127.0.0.1');
    }

    private function makeClient(string $email = 'client@test.ma', string $password = 'MotDePasse123'): User
    {
        $providerUser = User::create([
            'role' => 'prestataire',
            'email' => 'provider-'.$email,
            'password_hash' => Hash::make('provider-secret'),
            'first_login_completed' => true,
        ]);

        $provider = Provider::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Test Provider',
        ]);

        $user = User::create([
            'role' => 'client',
            'email' => $email,
            'password_hash' => Hash::make($password),
            'first_login_completed' => true,
        ]);

        Client::create([
            'provider_id' => $provider->id,
            'user_id' => $user->id,
            'account_number' => (string) random_int(100000, 999999),
            'full_name' => 'Test Client',
            'email' => $email,
        ]);

        return $user;
    }

    public function test_repeated_failed_logins_are_eventually_blocked(): void
    {
        $this->makeClient();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'client@test.ma',
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        $blocked = $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'wrong-password',
        ]);

        $blocked->assertStatus(429);
        $blocked->assertJsonStructure(['message', 'retry_after']);
    }

    public function test_block_message_is_french_and_tells_the_user_what_to_do(): void
    {
        $this->makeClient();

        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'client@test.ma',
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'wrong-password',
        ]);

        $message = $response->json('message');

        $this->assertStringContainsString('patienter', $message);
        // No English, and no developer instructions.
        $this->assertStringNotContainsStringIgnoringCase('too many', $message);
        $this->assertStringNotContainsStringIgnoringCase('throttle', $message);
    }

    // The realistic human pattern: a couple of typos, then the right password.
    public function test_mistyping_then_succeeding_is_never_blocked(): void
    {
        $this->makeClient();

        foreach (['wrong1', 'wrong2', 'wrong3'] as $bad) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'client@test.ma',
                'password' => $bad,
            ])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'MotDePasse123',
        ])->assertOk();
    }

    // A successful login must reset the counter, so the same person can log out,
    // fumble the password again later, and still not be locked out.
    public function test_successful_login_clears_the_failure_counter(): void
    {
        $this->makeClient();

        foreach (['a', 'b', 'c', 'd'] as $bad) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'client@test.ma',
                'password' => $bad,
            ])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'MotDePasse123',
        ])->assertOk();

        // Counter reset: four more failures still must not trip the limit.
        foreach (['a', 'b', 'c', 'd'] as $bad) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'client@test.ma',
                'password' => $bad,
            ])->assertStatus(401);
        }
    }

    // The office-IP case: colleagues share one public IP. One of them getting
    // locked out must not affect anybody else.
    public function test_one_user_being_blocked_does_not_block_a_colleague(): void
    {
        $this->makeClient('alice@test.ma', 'AlicePassword1');
        $this->makeClient('bob@test.ma', 'BobPassword1');

        for ($i = 0; $i < 8; $i++) {
            $this->postJson('/api/auth/login', [
                'identifier' => 'alice@test.ma',
                'password' => 'wrong',
            ]);
        }

        // Alice is locked out...
        $this->postJson('/api/auth/login', [
            'identifier' => 'alice@test.ma',
            'password' => 'wrong',
        ])->assertStatus(429);

        // ...Bob, on the same IP, is completely unaffected.
        $this->postJson('/api/auth/login', [
            'identifier' => 'bob@test.ma',
            'password' => 'BobPassword1',
        ])->assertOk();
    }

    public function test_public_tracking_is_throttled(): void
    {
        $hitLimit = false;

        for ($i = 0; $i < 40; $i++) {
            $response = $this->getJson('/api/shipments/999999999/tracking');
            if ($response->status() === 429) {
                $hitLimit = true;
                break;
            }
        }

        $this->assertTrue($hitLimit, 'Public tracking should throttle bulk enumeration.');
    }
}
