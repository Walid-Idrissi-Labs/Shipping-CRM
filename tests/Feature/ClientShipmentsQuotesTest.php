<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientShipmentsQuotesTest extends TestCase
{
    use RefreshDatabase;

    protected User $clientUser;

    protected Client $client;

    protected User $otherClientUser;

    protected Client $otherClient;

    protected User $providerUser;

    protected Provider $provider;

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
            'name' => 'Alice',
            'email' => 'alice@x.com',
            'password' => 'old_secret_1',
            'role' => 'client',
            'password_hash' => Hash::make('old_secret_1'),
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->clientUser->id,
            'account_number' => 'ACME-001',
            'full_name' => 'Alice Client',
            'email' => 'alice@x.com',
            'phone' => '+212600000001',
            'address' => '1 rue test',
            'postal_code' => '20000',
            'city' => 'Casablanca',
            'country' => 'Maroc',
        ]);

        $this->otherClientUser = User::create([
            'name' => 'Bob',
            'email' => 'bob@x.com',
            'password' => 'secret',
            'role' => 'client',
            'password_hash' => Hash::make('secret'),
        ]);

        $this->otherClient = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->otherClientUser->id,
            'account_number' => 'ACME-002',
            'full_name' => 'Bob Other',
            'email' => 'bob@x.com',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);
    }

    // ============ Client shipments index/store/show ============

    public function test_client_can_create_shipment(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/my/expeditions', [
            'sender_name' => 'Alice Client',
            'sender_country' => 'Maroc',
            'recipient_name' => 'John Doe',
            'recipient_address' => '12 rue rive',
            'recipient_city' => 'Lyon',
            'recipient_postal_code' => '69001',
            'recipient_country' => 'France',
            'recipient_phone' => '+33000000000',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
            'poids' => 1.5,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'shipment']);
        $this->assertEquals($this->client->id, $response->json('shipment.client_id'));
        $this->assertEquals($this->provider->id, $response->json('shipment.provider_id'));
        $this->assertEquals('information_recue', $response->json('shipment.statut_actuel'));
    }

    public function test_client_can_only_see_own_shipments_via_my_expeditions(): void
    {
        $mine = Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'MINE-002',
            'sender_name' => 'Alice',
            'sender_country' => 'Maroc',
            'recipient_name' => 'My recipient',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);

        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'OTHER-002',
            'sender_name' => 'Bob',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Someone else',
            'recipient_country' => 'Espagne',
            'recipient_city' => 'Madrid',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/my/expeditions');

        $response->assertStatus(200);
        $numbers = collect($response->json('data'))->pluck('shipping_number')->toArray();
        $this->assertContains('MINE-002', $numbers);
        $this->assertNotContains('OTHER-002', $numbers);
    }

    public function test_client_can_show_only_own_shipment(): void
    {
        $shipment = Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'SHOW-001',
            'sender_name' => 'Alice',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Recipi',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);

        Sanctum::actingAs($this->clientUser);
        $this->getJson("/api/my/expeditions/{$shipment->id}")->assertStatus(200);

        Sanctum::actingAs($this->otherClientUser);
        $this->getJson("/api/my/expeditions/{$shipment->id}")->assertStatus(403);
    }

    public function test_provider_cannot_access_my_expeditions_endpoints(): void
    {
        Sanctum::actingAs($this->providerUser);
        $this->getJson('/api/my/expeditions')->assertStatus(403);
        $this->postJson('/api/my/expeditions', [])->assertStatus(403);
    }

    // ============ Client quote requests ============

    public function test_client_can_create_quote_request(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/my/quote-requests', [
            'recipient_name' => 'John Doe',
            'recipient_address' => '12 rue',
            'recipient_city' => 'Madrid',
            'recipient_postal_code' => '28001',
            'recipient_country' => 'Espagne',
            'recipient_phone' => '+34000000000',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
            'poids' => 2.5,
        ]);

        $response->assertStatus(201);
        $this->assertEquals($this->client->id, $response->json('quote_request.client_id'));
        $this->assertEquals($this->client->full_name, $response->json('quote_request.client_name'));
        $this->assertEquals($this->client->email, $response->json('quote_request.client_email'));
        $this->assertEquals('en_attente', $response->json('quote_request.statut'));
    }

    public function test_client_only_sees_own_quote_requests(): void
    {
        QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'recipient_name' => 'My recipient',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'client_name' => 'Bob',
            'client_email' => 'bob@x.com',
            'client_phone' => '+212600000002',
            'recipient_name' => 'Other recipient',
            'recipient_country' => 'Espagne',
            'recipient_city' => 'Madrid',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/my/quote-requests');

        $response->assertStatus(200);
        $recipients = collect($response->json('data'))->pluck('recipient_name')->toArray();
        $this->assertContains('My recipient', $recipients);
        $this->assertNotContains('Other recipient', $recipients);
    }

    public function test_client_cannot_view_other_clients_quote_request(): void
    {
        $r = QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'client_name' => 'Bob',
            'client_email' => 'bob@x.com',
            'client_phone' => '+212600000002',
            'recipient_name' => 'Other recipient',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        Sanctum::actingAs($this->clientUser);
        $this->getJson("/api/my/quote-requests/{$r->id}")->assertStatus(403);
    }

    public function test_quote_request_requires_service(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/my/quote-requests', [
            'recipient_name' => 'Recipi',
            'recipient_country' => 'France',
        ]);

        $response->assertStatus(422);
    }

    // ============ Client quotes list/show/status ============

    public function test_client_only_sees_own_quotes(): void
    {
        Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 1,
            'quote_number' => 'DE 1/' . (int) date('Y'),
            'recipient_name' => 'Mine Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'envoye',
        ]);

        Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->otherClient->id,
            'client_name' => 'Bob',
            'client_email' => 'bob@x.com',
            'client_phone' => '+212600000002',
            'client_phone' => '+212600000002',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 2,
            'quote_number' => 'DE 2/' . (int) date('Y'),
            'recipient_name' => 'Other Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->getJson('/api/my/quotes');

        $response->assertStatus(200);
        $recipients = collect($response->json('data'))->pluck('recipient_name')->toArray();
        $this->assertContains('Mine Rec', $recipients);
        $this->assertNotContains('Other Rec', $recipients);
    }

    public function test_client_can_show_own_quote(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 11,
            'quote_number' => 'DE 11/' . (int) date('Y'),
            'recipient_name' => 'Show Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'montant_ht' => 100,
            'montant_ttc' => 120,
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->otherClientUser);
        $this->getJson("/api/my/quotes/{$q->id}")->assertStatus(403);

        Sanctum::actingAs($this->clientUser);
        $this->getJson("/api/my/quotes/{$q->id}")->assertStatus(200);
    }

    public function test_client_can_accept_own_quote(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 21,
            'quote_number' => 'DE 21/' . (int) date('Y'),
            'recipient_name' => 'Accept Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'montant_ht' => 100,
            'montant_ttc' => 120,
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->patchJson("/api/my/quotes/{$q->id}/status", ['statut' => 'accepte']);

        $response->assertStatus(200);
        $this->assertEquals('accepte', $q->fresh()->statut);
    }

    public function test_client_can_reject_own_quote(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 31,
            'quote_number' => 'DE 31/' . (int) date('Y'),
            'recipient_name' => 'Reject Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'montant_ht' => 100,
            'montant_ttc' => 120,
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->patchJson("/api/my/quotes/{$q->id}/status", ['statut' => 'refuse']);

        $response->assertStatus(200);
        $this->assertEquals('refuse', $q->fresh()->statut);
    }

    public function test_client_cannot_change_status_when_already_accepte(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 41,
            'quote_number' => 'DE 41/' . (int) date('Y'),
            'recipient_name' => 'Locked Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'montant_ht' => 100,
            'montant_ttc' => 120,
            'statut' => 'accepte',
        ]);

        Sanctum::actingAs($this->clientUser);
        $response = $this->patchJson("/api/my/quotes/{$q->id}/status", ['statut' => 'refuse']);

        $response->assertStatus(422);
    }

    public function test_invalid_statut_value_rejected(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 51,
            'quote_number' => 'DE 51/' . (int) date('Y'),
            'recipient_name' => 'Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->clientUser);
        $this->patchJson("/api/my/quotes/{$q->id}/status", ['statut' => 'invalid'])->assertStatus(422);
    }

    public function test_other_client_cannot_change_status_of_different_client_quote(): void
    {
        $q = Quote::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'client_name' => 'Alice',
            'client_email' => 'alice@x.com',
            'client_phone' => '+212600000001',
            'quote_year' => (int) date('Y'),
            'quote_sequence' => 61,
            'quote_number' => 'DE 61/' . (int) date('Y'),
            'recipient_name' => 'Rec',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'envoye',
        ]);

        Sanctum::actingAs($this->otherClientUser);
        $this->patchJson("/api/my/quotes/{$q->id}/status", ['statut' => 'refuse'])->assertStatus(403);
    }

    public function test_provider_cannot_access_my_quotes_endpoints(): void
    {
        Sanctum::actingAs($this->providerUser);
        $this->getJson('/api/my/quotes')->assertStatus(403);
        $this->getJson('/api/my/quote-requests')->assertStatus(403);
        $this->getJson('/api/my/expeditions')->assertStatus(403);
    }

    public function test_unauthenticated_my_endpoints_rejected(): void
    {
        $this->getJson('/api/my/expeditions')->assertStatus(401);
        $this->getJson('/api/my/quotes')->assertStatus(401);
        $this->getJson('/api/my/quote-requests')->assertStatus(401);
    }
}
