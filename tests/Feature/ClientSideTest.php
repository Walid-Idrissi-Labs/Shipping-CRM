<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Facture;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientSideTest extends TestCase
{
    use RefreshDatabase;

    protected User $clientUser;

    protected Client $client;

    protected User $providerUser;

    protected Provider $provider;

    protected User $otherClientUser;

    protected Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider',
            'email' => 'provider@x.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);

        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Co',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $this->clientUser = User::create([
            'name' => 'Client User',
            'email' => 'client@x.com',
            'password' => 'old_secret_1',
            'role' => 'client',
            'password_hash' => Hash::make('old_secret_1'),
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->clientUser->id,
            'account_number' => 'ACME-001',
            'full_name' => 'Alice Client',
            'email' => 'client@x.com',
            'phone' => '+212600000001',
            'ice' => 'ICE001',
            'address' => '1 rue test',
            'postal_code' => '20000',
            'city' => 'Casablanca',
            'country' => 'Maroc',
        ]);

        $this->otherClientUser = User::create([
            'name' => 'Other Client',
            'email' => 'other@x.com',
            'password' => 'secret',
            'role' => 'client',
            'password_hash' => Hash::make('secret'),
        ]);

        $this->otherClient = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->otherClientUser->id,
            'account_number' => 'ACME-002',
            'full_name' => 'Bob Other',
            'email' => 'other@x.com',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);
    }

    // ============ Client dashboard ============

    public function test_client_dashboard_returns_stats(): void
    {
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'SHIP-CLI-001',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ]);

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 1,
            'annee' => (int) date('Y'),
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 100,
            'tva' => 20,
            'ttc' => 120,
            'statut' => 'impayee',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/dashboard/client');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'total_shipments',
            'total_invoices',
            'unpaid_total',
            'paid_total',
            'recent_shipments',
            'recent_invoices',
        ]);

        $this->assertEquals(1, $response->json('total_shipments'));
        $this->assertEquals(1, $response->json('total_invoices'));
        $this->assertEquals(120, (int) $response->json('unpaid_total'));
    }

    public function test_provider_cannot_access_client_dashboard(): void
    {
        Sanctum::actingAs($this->providerUser);
        $this->getJson('/api/dashboard/client')->assertStatus(403);
    }

    // ============ My shipments ============

    public function test_client_can_list_only_own_shipments(): void
    {
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'MINE-001',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'My recipient',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ]);

        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'OTHER-001',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Someone else',
            'recipient_country' => 'Espagne',
            'recipient_city' => 'Madrid',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/my/shipments');

        $response->assertStatus(200);
        $numbers = collect($response->json('data'))->pluck('shipping_number')->toArray();
        $this->assertContains('MINE-001', $numbers);
        $this->assertNotContains('OTHER-001', $numbers);
    }

    // ============ My invoices ============

    public function test_client_can_list_only_own_invoices(): void
    {
        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 100,
            'annee' => (int) date('Y'),
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 100,
            'tva' => 20,
            'ttc' => 120,
            'statut' => 'impayee',
        ]);

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'numero_n' => 200,
            'annee' => (int) date('Y'),
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 50,
            'tva' => 10,
            'ttc' => 60,
            'statut' => 'payee',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/my/invoices');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->client->factures()->first()->id, $ids);
        $this->assertNotContains($this->otherClient->factures()->first()->id, $ids);
    }

    public function test_client_can_filter_invoices_by_statut(): void
    {
        $invA = Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 301,
            'annee' => (int) date('Y'),
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 1, 'tva' => 0, 'ttc' => 1,
            'statut' => 'impayee',
        ]);

        $invB = Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 302,
            'annee' => (int) date('Y'),
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 1, 'tva' => 0, 'ttc' => 1,
            'statut' => 'payee',
        ]);

        Sanctum::actingAs($this->clientUser);

        $unpaidResponse = $this->getJson('/api/my/invoices?statut=impayee');
        $unpaidIds = collect($unpaidResponse->json('data'))->pluck('id')->toArray();
        $this->assertEqualsCanonicalizing([$invA->id], $unpaidIds);

        $paidResponse = $this->getJson('/api/my/invoices?statut=payee');
        $paidIds = collect($paidResponse->json('data'))->pluck('id')->toArray();
        $this->assertEqualsCanonicalizing([$invB->id], $paidIds);
    }

    // ============ Profile update ============

    public function test_client_can_update_own_profile(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->patchJson('/api/client/profile', [
            'full_name' => 'Alice Updated',
            'email' => 'alice.updated@x.com',
            'phone' => '+212600099999',
            'address' => 'New address',
            'postal_code' => '20200',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'client']);

        $fresh = $this->client->fresh();
        $this->assertEquals('Alice Updated', $fresh->full_name);
        $this->assertEquals('alice.updated@x.com', $fresh->email);
        $this->assertEquals('+212600099999', $fresh->phone);
        $this->assertEquals('New address', $fresh->address);

        // user.email must be synced
        $this->assertEquals('alice.updated@x.com', $this->clientUser->fresh()->email);
    }

    public function test_profile_email_must_be_unique(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->patchJson('/api/client/profile', [
            'full_name' => 'Alice',
            'email' => 'other@x.com', // taken by otherClient
        ]);

        $response->assertStatus(422);
    }

    public function test_provider_cannot_access_client_profile_endpoint(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->patchJson('/api/client/profile', [
            'full_name' => 'Hacker',
            'email' => 'hello@x.com',
        ]);

        $response->assertStatus(403);
    }

    // ============ Password change ============

    public function test_client_can_change_password(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/client/change-password', [
            'old_password' => 'old_secret_1',
            'new_password' => 'new_secret_999',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('new_secret_999', $this->clientUser->fresh()->password_hash));
    }

    public function test_client_password_change_requires_old_password(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/client/change-password', [
            'old_password' => 'wrong_password',
            'new_password' => 'new_one_999',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Ancien mot de passe incorrect.');
    }

    public function test_provider_cannot_use_client_change_password(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/client/change-password', [
            'old_password' => 'secret',
            'new_password' => 'new_for_provider_999',
        ]);

        $response->assertStatus(403);
    }

    public function test_password_change_enforces_min_length(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/client/change-password', [
            'old_password' => 'old_secret_1',
            'new_password' => 'short',
        ]);

        $response->assertStatus(422);
    }

    // ============ ACL ============

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/dashboard/client')->assertStatus(401);
        $this->getJson('/api/my/shipments')->assertStatus(401);
        $this->getJson('/api/my/invoices')->assertStatus(401);
        $this->patchJson('/api/client/profile', [])->assertStatus(401);
        $this->postJson('/api/client/change-password', [])->assertStatus(401);
    }
}
