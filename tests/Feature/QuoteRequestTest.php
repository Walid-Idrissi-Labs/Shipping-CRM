<?php

namespace Tests\Feature;

use App\Models\Provider;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuoteRequestTest extends TestCase
{
    use RefreshDatabase;

    protected Provider $provider;
    protected User $providerUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->providerUser = User::create([
            'email' => 'provider@test.com',
            'password' => bcrypt('password'),
            'full_name' => 'Test Provider',
            'role' => 'prestataire',
        ]);
        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Provider',
            'email' => 'provider@test.com',
            'phone' => '+212600000000',
            'address' => 'Test Address',
            'city' => 'Casablanca',
            'country' => 'Maroc',
            'postal_code' => '20000',
        ]);
    }

    public function test_public_can_create_quote_request_with_email(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'international_express_dap',
            'description_colis' => 'Documents urgents',
            'client_name' => 'Jean Dupont',
            'client_email' => 'jean@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(201);
        $this->assertEquals('Demande de devis envoyee.', $response->json('message'));
        $this->assertEquals('en_attente', $response->json('quote_request.statut'));
        $this->assertEquals('jean@example.com', $response->json('quote_request.client_email'));
        $this->assertNull($response->json('quote_request.client_phone'));
        $this->assertEquals($this->provider->id, $response->json('quote_request.provider_id'));
        $this->assertNull($response->json('quote_request.client_id'));
    }

    public function test_public_can_create_quote_request_with_phone_only(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'national',
            'client_name' => 'Marie Martin',
            'client_phone' => '+33612345678',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(201);
        $this->assertEquals('+33612345678', $response->json('quote_request.client_phone'));
        $this->assertNull($response->json('quote_request.client_email'));
    }

    public function test_public_rejects_quote_request_without_email_or_phone(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'national',
            'client_name' => 'Test User',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('email ou numero de telephone', $response->json('message'));
        $this->assertArrayHasKey('client_email', $response->json('errors'));
        $this->assertArrayHasKey('client_phone', $response->json('errors'));
    }

    public function test_public_rejects_quote_request_missing_destination_fields(): void
    {
        $payload = [
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'national',
            'client_name' => 'Test User',
            'client_email' => 'test@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(422);
        $this->assertArrayHasKey('recipient_address', $response->json('errors'));
    }

    public function test_public_rejects_quote_request_missing_colis_fields(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'client_name' => 'Test User',
            'client_email' => 'test@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(422);
        $this->assertArrayHasKey('poids', $response->json('errors'));
        $this->assertArrayHasKey('longueur', $response->json('errors'));
        $this->assertArrayHasKey('largeur', $response->json('errors'));
        $this->assertArrayHasKey('hauteur', $response->json('errors'));
    }

    public function test_public_rejects_invalid_type_service(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'invalid_service',
            'client_name' => 'Test User',
            'client_email' => 'test@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(422);
        $this->assertArrayHasKey('type_service', $response->json('errors'));
    }

    public function test_public_rejects_invalid_email(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'national',
            'client_name' => 'Test User',
            'client_email' => 'not-an-email',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(422);
        $this->assertArrayHasKey('client_email', $response->json('errors'));
    }

    public function test_provider_can_list_quote_requests(): void
    {
        QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Client 1',
            'client_email' => 'c1@test.com',
            'recipient_name' => 'Recipient 1',
            'recipient_city' => 'Paris',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);
        QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Client 2',
            'client_email' => 'c2@test.com',
            'recipient_name' => 'Recipient 2',
            'recipient_city' => 'Lyon',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);
        QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Client 3',
            'client_email' => 'c3@test.com',
            'recipient_name' => 'Recipient 3',
            'recipient_city' => 'Marseille',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/quote-requests')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_provider_can_mark_quote_request_as_treated(): void
    {
        $request = QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Client',
            'client_email' => 'client@test.com',
            'recipient_name' => 'Recipient',
            'recipient_city' => 'Paris',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        $this->actingAs($this->providerUser, 'sanctum')
            ->patchJson("/api/quote-requests/{$request->id}/treat")
            ->assertStatus(200)
            ->assertJsonPath('quote_request.statut', 'traitee');
    }

    public function test_provider_can_delete_quote_request(): void
    {
        $request = QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Client',
            'client_email' => 'client@test.com',
            'recipient_name' => 'Recipient',
            'recipient_city' => 'Paris',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => 'en_attente',
        ]);

        $this->actingAs($this->providerUser, 'sanctum')
            ->deleteJson("/api/quote-requests/{$request->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('quote_requests', ['id' => $request->id]);
    }

    public function test_quote_request_stores_origin_fields(): void
    {
        $payload = [
            'origin_city' => 'Casablanca',
            'origin_country' => 'Maroc',
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'international_express_dap',
            'client_name' => 'Jean Dupont',
            'client_email' => 'jean@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(201);
        $this->assertEquals('Casablanca', $response->json('quote_request.origin_city'));
        $this->assertEquals('Maroc', $response->json('quote_request.origin_country'));
    }

    public function test_quote_request_origin_fields_are_optional(): void
    {
        $payload = [
            'recipient_address' => '12 Rue de la Paix',
            'recipient_city' => 'Paris',
            'recipient_postal_code' => '75002',
            'recipient_country' => 'France',
            'poids' => 2.5,
            'longueur' => 30,
            'largeur' => 20,
            'hauteur' => 15,
            'nb_pieces' => 1,
            'type_colis' => 'paquet',
            'type_service' => 'international_express_dap',
            'client_name' => 'Jean Dupont',
            'client_email' => 'jean@example.com',
        ];

        $response = $this->postJson('/api/quote-requests', $payload);

        $response->assertStatus(201);
        $this->assertNull($response->json('quote_request.origin_city'));
        $this->assertNull($response->json('quote_request.origin_country'));
    }

    public function test_quote_created_from_request_inherits_origin_fields(): void
    {
        $quoteRequest = QuoteRequest::create([
            'provider_id' => $this->provider->id,
            'client_name' => 'Jean Dupont',
            'client_email' => 'jean@example.com',
            'client_address' => '10 Bd Mohammed V',
            'client_city' => 'Casablanca',
            'client_postal_code' => '20000',
            'client_country' => 'Maroc',
            'origin_city' => 'Casablanca',
            'origin_country' => 'Maroc',
            'recipient_name' => 'Marie Martin',
            'recipient_city' => 'Paris',
            'recipient_country' => 'France',
            'type_service' => 'international_express_dap',
            'statut' => 'en_attente',
        ]);

        $this->actingAs($this->providerUser, 'sanctum')
            ->postJson("/api/quote-requests/{$quoteRequest->id}/create-quote", [
                'montant_ht' => 100,
                'montant_ttc' => 120,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('quotes', [
            'origin_city' => 'Casablanca',
            'origin_country' => 'Maroc',
        ]);
    }
}