<?php

namespace Tests\Feature;

use App\Models\AccountRequest;
use App\Models\Client;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase5AccountRequestFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;

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
    }

    private function makeRequest(array $overrides = []): AccountRequest
    {
        return AccountRequest::create(array_merge([
            'full_name' => 'Demo',
            'email' => 'demo@x.com',
            'phone' => '+212698765432',
            'address' => 'Some St',
            'city' => 'Casa',
            'postal_code' => '20000',
            'ice' => '0001',
            'notes' => 'Calls me at 5pm please',
            'statut' => 'en_attente',
        ], $overrides));
    }

    public function test_show_returns_full_demande_data(): void
    {
        $r = $this->makeRequest();

        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/account-requests/{$r->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'id' => $r->id,
            'full_name' => 'Demo',
            'email' => 'demo@x.com',
            'phone' => '+212698765432',
            'address' => 'Some St',
            'city' => 'Casa',
            'postal_code' => '20000',
            'ice' => '0001',
            'notes' => 'Calls me at 5pm please',
            'statut' => 'en_attente',
        ]);
    }

    public function test_approve_links_client_to_demande(): void
    {
        $r = $this->makeRequest();

        $clientUser = User::create([
            'name' => 'C',
            'email' => 'cli@x.com',
            'password' => bcrypt('x'),
            'role' => 'client',
        ]);
        $client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => '111111',
            'full_name' => 'C',
            'email' => 'cli@x.com',
        ]);

        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson(
            "/api/account-requests/{$r->id}/approve",
            ['client_id' => $client->id]
        );

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'account_request' => ['id', 'statut', 'client_id']]);
        $response->assertJsonPath('account_request.statut', 'approuvee');
        $response->assertJsonPath('account_request.client_id', $client->id);

        $this->assertDatabaseHas('account_requests', [
            'id' => $r->id,
            'statut' => 'approuvee',
            'client_id' => $client->id,
        ]);
    }

    public function test_double_approval_is_rejected(): void
    {
        $r = $this->makeRequest();

        $first = $this->actingAs($this->providerUser, 'sanctum')->patchJson("/api/account-requests/{$r->id}/approve");
        $first->assertStatus(200);

        $second = $this->actingAs($this->providerUser, 'sanctum')->patchJson("/api/account-requests/{$r->id}/approve");
        $second->assertStatus(422);
        $second->assertJsonPath('statut', 'approuvee');
    }

    public function test_rejected_demande_cannot_be_approved(): void
    {
        $r = $this->makeRequest(['statut' => 'rejetee']);

        $response = $this->actingAs($this->providerUser, 'sanctum')->patchJson("/api/account-requests/{$r->id}/approve");

        $response->assertStatus(422);
        $response->assertJsonPath('statut', 'rejetee');
    }

    public function test_full_flow_create_then_approve(): void
    {
        $r = $this->makeRequest();

        $createResponse = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/clients', [
            'full_name' => $r->full_name,
            'email' => $r->email,
            'phone' => $r->phone,
            'ice' => $r->ice,
            'address' => $r->address,
            'postal_code' => $r->postal_code,
            'city' => $r->city,
        ]);
        $createResponse->assertStatus(201);
        $newClientId = $createResponse->json('client.id');

        $approveResponse = $this->actingAs($this->providerUser, 'sanctum')->patchJson("/api/account-requests/{$r->id}/approve", ['client_id' => $newClientId]);
        $approveResponse->assertStatus(200);

        $demande = AccountRequest::find($r->id);
        $this->assertSame('approuvee', $demande->statut);
        $this->assertSame($newClientId, $demande->client_id);
    }

    public function test_index_eager_loads_client_relation(): void
    {
        $r = $this->makeRequest();
        $clientUser = User::create([
            'name' => 'C',
            'email' => 'cli2@x.com',
            'password' => bcrypt('x'),
            'role' => 'client',
        ]);
        $client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => '222222',
            'full_name' => 'C2',
            'email' => 'cli2@x.com',
        ]);
        $r->update(['statut' => 'approuvee', 'client_id' => $client->id]);

        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/account-requests');
        $response->assertStatus(200);
        $response->assertJsonFragment(['account_number' => '222222']);
    }

    public function test_destroy_marks_demande_as_rejetee(): void
    {
        $r = $this->makeRequest();

        $this->actingAs($this->providerUser, 'sanctum')->deleteJson("/api/account-requests/{$r->id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('account_requests', ['id' => $r->id, 'statut' => 'rejetee']);
    }

    public function test_public_create_accepts_notes(): void
    {
        $response = $this->postJson('/api/account-requests', [
            'full_name' => 'John Doe',
            'email' => 'john@x.com',
            'phone' => '+212698765432',
            'notes' => 'Prefers email contact',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('notes', 'Prefers email contact');
        $response->assertJsonPath('statut', 'en_attente');
    }

    public function test_show_rejects_clients_without_access(): void
    {
        $r = $this->makeRequest();

        $otherClient = User::create([
            'name' => 'Other Client',
            'email' => 'other-client@x.com',
            'password' => bcrypt('x'),
            'role' => 'client',
        ]);

        $response = $this->actingAs($otherClient, 'sanctum')->getJson("/api/account-requests/{$r->id}");
        $response->assertStatus(403);
    }
}
