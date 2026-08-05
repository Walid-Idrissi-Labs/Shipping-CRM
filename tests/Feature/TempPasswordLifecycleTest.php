<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

// Covers the full life of the provider-generated "mot de passe temporaire":
// a client must be able to trade it for their own, and once they have, the
// temporary one must stop working — otherwise it is a permanent credential
// sitting in whatever email or WhatsApp thread it was first sent through.
class TempPasswordLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private const TEMP = 'aB3xY9';

    private function makeClientOnTempPassword(): User
    {
        $providerUser = User::create([
            'role' => 'prestataire',
            'email' => 'provider@test.ma',
            'password_hash' => Hash::make('provider-secret'),
            'first_login_completed' => true,
        ]);

        $provider = Provider::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Test Provider',
        ]);

        // Mirrors ClientController::store exactly: no password_hash yet, the
        // temporary password is the client's only credential.
        $user = User::create([
            'role' => 'client',
            'email' => 'client@test.ma',
            'password_hash' => null,
            'origin_password_hash' => Hash::make(self::TEMP),
            'origin_password_encrypted' => Crypt::encryptString(self::TEMP),
            'first_login_completed' => false,
        ]);

        Client::create([
            'provider_id' => $provider->id,
            'user_id' => $user->id,
            'account_number' => '123456',
            'full_name' => 'Test Client',
            'email' => 'client@test.ma',
        ]);

        return $user;
    }

    public function test_client_on_temp_password_can_change_it(): void
    {
        $user = $this->makeClientOnTempPassword();

        $response = $this->actingAs($user)->postJson('/api/client/change-password', [
            'old_password' => self::TEMP,
            'new_password' => 'MonNouveauMotDePasse1',
            'new_password_confirmation' => 'MonNouveauMotDePasse1',
        ]);

        $response->assertOk();
    }

    // Drives the change through the model rather than the HTTP endpoint (which
    // the test above already covers) purely to keep the guard clean: actingAs()
    // makes 'sanctum' the default guard for the rest of the request lifecycle,
    // and the login endpoint needs the session-backed 'web' guard.
    public function test_temp_password_stops_working_once_client_sets_their_own(): void
    {
        $user = $this->makeClientOnTempPassword();

        // Sanity check: it authenticates before the change.
        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => self::TEMP,
        ])->assertOk();

        $user->setPassword('MonNouveauMotDePasse1');

        // The old temporary password must no longer authenticate.
        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => self::TEMP,
        ])->assertStatus(401);

        // ...and the new one must.
        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'MonNouveauMotDePasse1',
        ])->assertOk();
    }

    public function test_temp_password_client_is_flagged_to_the_frontend(): void
    {
        $user = $this->makeClientOnTempPassword();

        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => self::TEMP,
        ])->assertOk()->assertJsonPath('user.using_temp_password', true);

        $user->setPassword('MonNouveauMotDePasse1');

        $this->postJson('/api/auth/login', [
            'identifier' => 'client@test.ma',
            'password' => 'MonNouveauMotDePasse1',
        ])->assertOk()->assertJsonPath('user.using_temp_password', false);
    }

    public function test_weak_new_passwords_are_rejected(): void
    {
        $user = $this->makeClientOnTempPassword();

        // Each of these breaks exactly one advertised rule.
        $weak = [
            'Ab1',              // too short
            'motdepasse123',    // no uppercase
            'MOTDEPASSE123',    // no lowercase
            'MotDePasseSansNum', // no digit
        ];

        foreach ($weak as $candidate) {
            $this->actingAs($user)->postJson('/api/client/change-password', [
                'old_password' => self::TEMP,
                'new_password' => $candidate,
                'new_password_confirmation' => $candidate,
            ])->assertStatus(422);
        }

        // The temporary password must still work — a rejected change must never
        // leave someone locked out of their own account.
        $this->assertTrue($user->fresh()->checkPassword(self::TEMP));
    }

    // A wrong current password must be reported as such, rather than the user
    // being sent off to fix their new password's capitalisation.
    public function test_wrong_current_password_is_reported_before_strength_rules(): void
    {
        $user = $this->makeClientOnTempPassword();

        $this->actingAs($user)->postJson('/api/client/change-password', [
            'old_password' => 'pas-le-bon',
            'new_password' => 'faible',
            'new_password_confirmation' => 'faible',
        ])->assertStatus(422)->assertJsonPath('message', 'Ancien mot de passe incorrect.');
    }

    public function test_removed_reset_password_endpoint_is_gone(): void
    {
        // It changed a password with no old password, needing only a live
        // session, and nothing in the frontend ever called it.
        $user = $this->makeClientOnTempPassword();

        $this->actingAs($user)
            ->postJson('/api/auth/reset-password', ['new_password' => 'Nouveau12345'])
            ->assertNotFound();
    }

    public function test_plaintext_temp_password_is_erased_once_client_sets_their_own(): void
    {
        $user = $this->makeClientOnTempPassword();

        $this->actingAs($user)->postJson('/api/client/change-password', [
            'old_password' => self::TEMP,
            'new_password' => 'MonNouveauMotDePasse1',
            'new_password_confirmation' => 'MonNouveauMotDePasse1',
        ])->assertOk();

        $user->refresh();

        $this->assertNull($user->origin_password_hash);
        $this->assertNull($user->origin_password_encrypted);
    }
}
