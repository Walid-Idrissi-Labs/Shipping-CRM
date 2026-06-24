<?php

namespace Tests\Feature;

use App\Models\PasswordView;
use App\Models\Client;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class Phase5ClientPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected User $clientUser;
    protected Client $client;
    protected string $knownPassword;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider',
            'email' => 'provider@x.com',
            'password' => bcrypt('secret'),
            'role' => 'prestataire',
        ]);

        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Co',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $this->knownPassword = 'aBc3De';
        $this->clientUser = User::create([
            'name' => 'Client',
            'email' => 'c@x.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
            'origin_password_hash' => Hash::make($this->knownPassword),
            'origin_password_encrypted' => Crypt::encryptString($this->knownPassword),
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->clientUser->id,
            'account_number' => '999990',
            'full_name' => 'Test Client',
            'email' => 'c@x.com',
        ]);
    }

    public function test_client_creation_stores_origin_password_encrypted_and_plaintext_is_returned(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/clients', [
            'full_name' => 'New Client',
            'email' => 'new@x.com',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['account_number', 'origin_password', 'client']);

        $plain = $response->json('origin_password');
        $this->assertIsString($plain);
        $this->assertSame(6, strlen($plain));

        $clientId = $response->json('client.id');
        $client = Client::findOrFail($clientId);
        $user = $client->user;

        // Hashed cast means origin_password_hash is bcrypt format, not the plaintext.
        $this->assertNotSame($plain, $user->origin_password_hash);
        $this->assertTrue(Hash::check($plain, $user->origin_password_hash));

        // Encrypted field must be the ciphertext (NOT plaintext).
        $this->assertNotSame($plain, $user->origin_password_encrypted);
        $this->assertSame($plain, Crypt::decryptString($user->origin_password_encrypted));
    }

    public function test_show_client_returns_decrypted_origin_password_any_time(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['client', 'origin_password', 'account_created_at']);

        $this->assertSame($this->knownPassword, $response->json('origin_password'));
        $this->assertNotNull($response->json('account_created_at'));
    }

    public function test_show_client_is_idempotent_and_always_returns_same_plaintext(): void
    {
        $first = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");
        $second = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");

        $first->assertStatus(200);
        $second->assertStatus(200);
        $this->assertSame(
            $first->json('origin_password'),
            $second->json('origin_password')
        );
    }

    public function test_show_client_logs_every_view_into_password_views(): void
    {
        $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}")->assertStatus(200);
        $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}")->assertStatus(200);
        $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}")->assertStatus(200);

        $this->assertSame(3, PasswordView::where('client_id', $this->client->id)->count());
        $this->assertSame(
            $this->providerUser->id,
            PasswordView::where('client_id', $this->client->id)->latest('id')->first()->viewed_by
        );
    }

    public function test_show_returns_null_password_when_encryption_is_corrupted(): void
    {
        // Simulate rotation of APP_KEY by manually corrupting the encrypted field.
        $this->clientUser->update(['origin_password_encrypted' => 'tampered-not-decryptable']);

        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");

        $response->assertStatus(200);
        $this->assertNull($response->json('origin_password'));
    }

    public function test_provider_cannot_see_other_providers_client_password(): void
    {
        $otherProviderUser = User::create([
            'name' => 'Other Provider',
            'email' => 'other@x.com',
            'password' => bcrypt('secret'),
            'role' => 'prestataire',
        ]);
        Provider::create([
            'user_id' => $otherProviderUser->id,
            'company_name' => 'Other Co',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $response = $this->actingAs($otherProviderUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");

        $response->assertStatus(403);
    }

    public function test_client_role_cannot_view_another_client_password(): void
    {
        $otherClientUser = User::create([
            'name' => 'Other Client',
            'email' => 'other-client@x.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);

        $response = $this->actingAs($otherClientUser, 'sanctum')->getJson("/api/clients/{$this->client->id}");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_view_is_rejected(): void
    {
        $response = $this->getJson("/api/clients/{$this->client->id}");
        $response->assertStatus(401);
    }
}
