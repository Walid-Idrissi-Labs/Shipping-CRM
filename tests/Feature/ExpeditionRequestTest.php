<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ExpeditionRequest;
use App\Models\Provider;
use App\Models\Quote;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExpeditionRequestTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider User',
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
    }

    protected function createQuote(array $attributes = []): Quote
    {
        return Quote::create(array_merge([
            'provider_id' => $this->provider->id,
            'statut' => 'accepte',
            'client_id' => null,
            'quote_year' => now()->year,
            'quote_sequence' => Quote::where('quote_year', now()->year)->max('quote_sequence') + 1,
            'quote_number' => 'DE ' . (Quote::where('quote_year', now()->year)->max('quote_sequence') + 1) . '/' . now()->year,
            'client_name' => 'Client Test',
            'client_address' => '10 Rue Test',
            'client_city' => 'Casablanca',
            'client_postal_code' => '20000',
            'client_country' => 'MA',
            'client_email' => 'client@test.com',
            'client_phone' => '+212 6 00 00 00 00',
            'recipient_name' => 'Recipient Test',
            'recipient_address' => '5 Avenue Test',
            'recipient_city' => 'Rabat',
            'recipient_postal_code' => '10000',
            'recipient_country' => 'MA',
            'recipient_phone' => '+212 6 11 11 11 11',
            'type_service' => 'national',
            'montant_ht' => 100,
            'montant_ttc' => 120,
        ], $attributes));
    }

    protected function createExpeditionRequest(array $attributes = []): ExpeditionRequest
    {
        $quoteId = $attributes['quote_id'] ?? null;
        if ($quoteId === null) {
            $quote = $this->createQuote();
            $quoteId = $quote->id;
        }

        return ExpeditionRequest::create(array_merge([
            'quote_id' => $quoteId,
            'provider_id' => $this->provider->id,
            'token' => bin2hex(random_bytes(32)),
            'sender_name' => 'Sender',
            'recipient_name' => 'Recipient',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ], $attributes));
    }

    public function test_provider_can_generate_link_for_public_quote(): void
    {
        $quote = $this->createQuote();

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/quotes/{$quote->id}/generate-link");

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'url', 'expires_at']);
    }

    public function test_provider_cannot_generate_link_for_client_quote(): void
    {
        // Create a client first
        $client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Client',
            'account_number' => 'TEST-001',
            'full_name' => 'Test Client',
            'email' => 'test@client.com',
            'phone' => '123456789',
            'address' => '123 Test St',
            'city' => 'Test City',
            'postal_code' => '12345',
            'country' => 'Test Country',
        ]);
        $quote = $this->createQuote(['client_id' => $client->id]);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/quotes/{$quote->id}/generate-link");

        $response->assertStatus(422);
    }

    public function test_provider_can_cancel_link(): void
    {
        $quote = $this->createQuote([
            'public_link_token' => bin2hex(random_bytes(32)),
            'public_link_expires_at' => now()->addDays(30),
        ]);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/quotes/{$quote->id}/cancel-link");

        $response->assertStatus(200);

        $quote->refresh();
        $this->assertNull($quote->public_link_token);
        $this->assertNull($quote->public_link_expires_at);
    }

    public function test_public_can_view_valid_link(): void
    {
        $token = bin2hex(random_bytes(32));
        $quote = $this->createQuote([
            'public_link_token' => $token,
            'public_link_expires_at' => now()->addDays(30),
        ]);

        $response = $this->getJson("/api/expedition-requests/complete/{$token}");

        $response->assertStatus(200)
            ->assertJsonStructure(['quote' => ['id', 'quote_number']]);
    }

    public function test_public_cannot_view_expired_link(): void
    {
        $token = bin2hex(random_bytes(32));
        $quote = $this->createQuote([
            'public_link_token' => $token,
            'public_link_expires_at' => now()->subDay(),
        ]);

        $response = $this->getJson("/api/expedition-requests/complete/{$token}");

        $response->assertStatus(404);
    }

    public function test_public_cannot_view_used_link(): void
    {
        $token = bin2hex(random_bytes(32));
        $quote = $this->createQuote([
            'public_link_token' => $token,
            'public_link_expires_at' => now()->addDays(30),
        ]);

        ExpeditionRequest::create([
            'quote_id' => $quote->id,
            'provider_id' => $this->provider->id,
            'token' => $token,
            'sender_name' => 'Test',
            'recipient_name' => 'Test',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        $response = $this->getJson("/api/expedition-requests/complete/{$token}");

        $response->assertStatus(404);
    }

    public function test_public_submission_creates_expedition_request(): void
    {
        $token = bin2hex(random_bytes(32));
        $quote = $this->createQuote([
            'public_link_token' => $token,
            'public_link_expires_at' => now()->addDays(30),
        ]);

        $payload = [
            'sender_name' => 'Jean Dupont',
            'sender_address' => '10 Rue de Paris',
            'sender_city' => 'Casablanca',
            'sender_postal_code' => '20000',
            'sender_country' => 'MA',
            'sender_email' => 'jean@example.com',
            'sender_phone' => '+212 6 00 00 00 00',
            'recipient_name' => 'Marie Martin',
            'recipient_address' => '5 Avenue Mohammed V',
            'recipient_city' => 'Rabat',
            'recipient_postal_code' => '10000',
            'recipient_country' => 'MA',
            'recipient_phone' => '+212 6 11 11 11 11',
            'recipient_email' => 'marie@example.com',
            'colis' => [
                ['nb_pieces' => 2, 'poids' => 5, 'longueur' => 30, 'largeur' => 20, 'hauteur' => 15, 'type_colis' => 'paquet', 'description_colis' => 'Documents'],
            ],
            'valeur_declaree' => 1000,
            'devise_valeur' => 'MAD',
            'type_service' => 'national',
        ];

        $response = $this->postJson("/api/expedition-requests/complete/{$token}", $payload);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'expedition_request' => ['id', 'statut']]);

        $this->assertDatabaseHas('expedition_requests', [
            'quote_id' => $quote->id,
            'statut' => 'en_attente',
            'sender_name' => 'Jean Dupont',
        ]);

        $quote->refresh();
        $this->assertTrue($quote->public_link_expires_at->isPast());
    }

    public function test_public_submission_validates_required_fields(): void
    {
        $token = bin2hex(random_bytes(32));
        $quote = $this->createQuote([
            'public_link_token' => $token,
            'public_link_expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson("/api/expedition-requests/complete/{$token}", []);

        $response->assertStatus(422);
        $this->assertArrayHasKey('sender_name', $response->json('errors'));
        $this->assertArrayHasKey('recipient_name', $response->json('errors'));
    }

    public function test_provider_can_list_expedition_requests(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->createExpeditionRequest(['statut' => 'en_attente'], false);
        }

        $response = $this->actingAs($this->providerUser)
            ->getJson('/api/expedition-requests');

        $response->assertStatus(200);
        $json = $response->json();
        // Debug: check structure
        $this->assertArrayHasKey('data', $json);
        $this->assertCount(3, $json['data']);
    }

    public function test_provider_can_filter_expedition_requests_by_statut(): void
    {
        $this->createExpeditionRequest(['statut' => 'en_attente'], false);
        $this->createExpeditionRequest(['statut' => 'acceptee'], false);

        $response = $this->actingAs($this->providerUser)
            ->getJson('/api/expedition-requests?statut=en_attente');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('en_attente', $response->json('data.0.statut'));
    }

    public function test_provider_can_show_expedition_request(): void
    {
        $request = $this->createExpeditionRequest(['statut' => 'en_attente']);

        // Debug: check if request exists in database
        $this->assertDatabaseHas('expedition_requests', ['id' => $request->id, 'provider_id' => $this->provider->id]);

        // Also try directly accessing the model
        $found = \App\Models\ExpeditionRequest::find($request->id);
        $this->assertNotNull($found);

        // Check the provider relationship
        $this->assertEquals($this->provider->id, $found->provider_id);

        // Test the actual route - use correct parameter name: expedition_request
        $response = $this->actingAs($this->providerUser)
            ->getJson("/api/expedition-requests/{$request->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'quote_id', 'sender_name', 'recipient_name', 'statut']);
    }

    public function test_provider_cannot_access_other_provider_request(): void
    {
        $otherProviderUser = User::create([
            'name' => 'Other Provider',
            'email' => 'other@provider.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);

        $otherProvider = Provider::create([
            'user_id' => $otherProviderUser->id,
            'company_name' => 'Other Co',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $request = $this->createExpeditionRequest(['provider_id' => $otherProvider->id]);

        $response = $this->actingAs($this->providerUser)
            ->getJson("/api/expedition-requests/{$request->id}");

        // Should not be accessible - either 403 or 404
        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_provider_can_accept_expedition_request(): void
    {
        $quote = $this->createQuote([
            'recipient_name' => 'Marie Martin',
            'recipient_address' => '5 Avenue Mohammed V',
            'recipient_city' => 'Rabat',
            'recipient_postal_code' => '10000',
            'recipient_country' => 'MA',
            'recipient_phone' => '+212 6 11 11 11 11',
            'type_service' => 'national',
        ]);

        $request = $this->createExpeditionRequest([
            'quote_id' => $quote->id,
            'statut' => 'en_attente',
            'sender_name' => 'Jean Dupont',
            'sender_address' => '10 Rue de Paris',
            'sender_city' => 'Casablanca',
            'sender_postal_code' => '20000',
            'sender_country' => 'MA',
            'sender_email' => 'jean@example.com',
            'sender_phone' => '+212 6 00 00 00 00',
            'recipient_name' => 'Marie Martin',
            'recipient_address' => '5 Avenue Mohammed V',
            'recipient_city' => 'Rabat',
            'recipient_postal_code' => '10000',
            'recipient_country' => 'MA',
            'recipient_phone' => '+212 6 11 11 11 11',
            'recipient_email' => 'marie@example.com',
            'colis' => [
                ['nb_pieces' => 2, 'poids' => 5, 'longueur' => 30, 'largeur' => 20, 'hauteur' => 15, 'type_colis' => 'paquet', 'description_colis' => 'Documents'],
            ],
            'valeur_declaree' => 1000,
            'devise_valeur' => 'MAD',
            'type_service' => 'national',
        ]);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/expedition-requests/{$request->id}/accept");

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'shipment' => ['id', 'shipping_number']]);

        $request->refresh();
        $this->assertEquals('acceptee', $request->statut);

        $shipment = Shipment::where('quote_id', $quote->id)->first();
        $this->assertNotNull($shipment);
        $this->assertEquals('information_recue', $shipment->statut_actuel);
        $this->assertEquals($quote->id, $shipment->quote_id);
        $this->assertNull($shipment->client_id);
        $this->assertEquals(1, $shipment->colis->count());
    }

    public function test_provider_cannot_accept_already_processed_request(): void
    {
        $request = $this->createExpeditionRequest(['statut' => 'acceptee']);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/expedition-requests/{$request->id}/accept");

        $response->assertStatus(422);
    }

    public function test_provider_can_reject_expedition_request(): void
    {
        $request = $this->createExpeditionRequest(['statut' => 'en_attente']);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/expedition-requests/{$request->id}/reject");

        $response->assertStatus(200);

        $request->refresh();
        $this->assertEquals('refusee', $request->statut);
    }

    public function test_provider_cannot_reject_already_processed_request(): void
    {
        $request = $this->createExpeditionRequest(['statut' => 'refusee']);

        $response = $this->actingAs($this->providerUser)
            ->postJson("/api/expedition-requests/{$request->id}/reject");

        $response->assertStatus(422);
    }
}