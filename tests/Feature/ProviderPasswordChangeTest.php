<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProviderPasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected User $clientUser;
    protected Client $client;
    protected string $providerOldPassword;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerOldPassword = 'old-secret-1';
        $this->providerUser = User::create([
            'name' => 'Provider',
            'email' => 'provider@x.com',
            'role' => 'prestataire',
            'password_hash' => Hash::make($this->providerOldPassword),
        ]);

        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Co',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $this->clientUser = User::create([
            'name' => 'Client',
            'email' => 'client@x.com',
            'role' => 'client',
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->clientUser->id,
            'account_number' => 'ACC-001',
            'full_name' => 'Test Client',
            'email' => 'client@x.com',
        ]);
    }

    public function test_provider_can_change_password_with_correct_old_password(): void
    {
        $newPassword = 'new-secret-1';

        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => $this->providerOldPassword,
            'new_password' => $newPassword,
            'new_password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['message' => 'Mot de passe mis a jour.']);

        $this->providerUser->refresh();
        $this->assertTrue(Hash::check($newPassword, $this->providerUser->password_hash));
        $this->assertFalse(Hash::check($this->providerOldPassword, $this->providerUser->password_hash));
    }

    public function test_change_password_rejects_incorrect_old_password(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => 'wrong-password',
            'new_password' => 'new-secret-1',
            'new_password_confirmation' => 'new-secret-1',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Ancien mot de passe incorrect.']);

        $this->providerUser->refresh();
        $this->assertTrue(Hash::check($this->providerOldPassword, $this->providerUser->password_hash));
    }

    public function test_change_password_requires_old_password(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'new_password' => 'new-secret-1',
            'new_password_confirmation' => 'new-secret-1',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['old_password']);
    }

    public function test_change_password_requires_new_password(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => $this->providerOldPassword,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['new_password']);
    }

    public function test_change_password_requires_confirmation_match(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => $this->providerOldPassword,
            'new_password' => 'new-secret-1',
            'new_password_confirmation' => 'different-secret',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['new_password']);
    }

    public function test_change_password_enforces_min_length(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => $this->providerOldPassword,
            'new_password' => 'short',
            'new_password_confirmation' => 'short',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['new_password']);

        $this->providerUser->refresh();
        $this->assertTrue(Hash::check($this->providerOldPassword, $this->providerUser->password_hash));
    }

    public function test_client_cannot_access_provider_change_password_endpoint(): void
    {
        $response = $this->actingAs($this->clientUser, 'sanctum')->patchJson('/api/provider/change-password', [
            'old_password' => 'whatever',
            'new_password' => 'new-secret-1',
            'new_password_confirmation' => 'new-secret-1',
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_change_password_request_is_rejected(): void
    {
        $response = $this->patchJson('/api/provider/change-password', [
            'old_password' => $this->providerOldPassword,
            'new_password' => 'new-secret-1',
            'new_password_confirmation' => 'new-secret-1',
        ]);

        $response->assertStatus(401);
    }
}
