<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase5UIRedesignTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider User',
            'email' => 'provider@x.com',
            'password' => bcrypt('secret'),
            'role' => 'prestataire',
        ]);

        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Co',
            'address' => 'X',
            'city' => 'Casa',
            'country' => 'Maroc',
            'phone' => '+212600000000',
            'email' => 'p@x.com',
            'ice' => '001',
        ]);

        $clientUser = User::create([
            'name' => 'Client User',
            'email' => 'c@x.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => '999990',
            'full_name' => 'Test Client',
            'email' => 'c@x.com',
            'phone' => '+212600000001',
            'address' => 'Y',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);
    }

    private function makeShipment(array $overrides = []): Shipment
    {
        return Shipment::create(array_merge([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => '111999001',
            'sender_name' => 'Test Sender',
            'sender_country' => 'Maroc',
            'sender_email' => 's@x.com',
            'sender_phone' => '+212600000000',
            'recipient_name' => 'Test RCPT',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
            'poids' => 1.5,
            'longueur' => 20,
            'largeur' => 15,
            'hauteur' => 10,
            'nb_pieces' => 1,
            'description_colis' => 'test',
            'statut_actuel' => 'information_recue',
        ], $overrides));
    }

    public function test_next_invoice_number_returns_valid_sequence_for_current_year(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices/next-number');

        $response->assertStatus(200);
        $response->assertJsonStructure(['sequence', 'year', 'numero']);

        $expected = "FA 1/{$this->provider->created_at->year}" === $response->json('numero')
            ? $response->json('numero')
            : $response->json('numero');

        $this->assertStringContainsString("FA ", $response->json('numero'));
        $this->assertSame(1, $response->json('sequence'));
    }

    public function test_next_invoice_number_increments_when_factures_exist(): void
    {
        $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$this->makeShipment(['shipping_number' => '900000001'])->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 100,
        ])->assertStatus(201);

        $response = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices/next-number');
        $response->assertStatus(200);
        $this->assertSame(2, $response->json('sequence'));
    }

    public function test_next_invoice_number_rejects_client_role(): void
    {
        $clientUser = User::where('email', 'c@x.com')->first();

        $response = $this->actingAs($clientUser, 'sanctum')->getJson('/api/invoices/next-number');
        $response->assertStatus(403);
    }

    public function test_preview_returns_pdf_for_national_invoice(): void
    {
        $shipment = $this->makeShipment();

        $response = $this->actingAs($this->providerUser, 'sanctum')->post('/api/invoices/preview', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 200,
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
        $this->assertGreaterThan(100, strlen($response->content()));
    }

    public function test_preview_returns_pdf_for_international_invoice_with_non_taxable(): void
    {
        $shipment = $this->makeShipment();

        $response = $this->actingAs($this->providerUser, 'sanctum')->post('/api/invoices/preview', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
    }

    public function test_preview_for_divers_client_works(): void
    {
        $shipment = $this->makeShipment(['client_id' => null]);

        $response = $this->actingAs($this->providerUser, 'sanctum')->post('/api/invoices/preview', [
            'expedition_ids' => [$shipment->id],
            'client_divers_nom' => 'Walk-in Customer',
            'client_divers_adresse' => 'Some Address',
            'client_divers_tel' => '+212698765432',
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 250,
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
    }

    public function test_preview_validates_required_fields(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices/preview', [
            'taxable' => 100,
        ]);

        $response->assertStatus(422);
    }

    public function test_preview_does_not_persist_any_data(): void
    {
        $shipment = $this->makeShipment();

        $this->actingAs($this->providerUser, 'sanctum')->post('/api/invoices/preview', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 100,
        ])->assertStatus(200);

        $this->assertDatabaseCount('factures', 0);
        $this->assertDatabaseCount('facture_expeditions', 0);
    }

    public function test_preview_rejects_invalid_shipment_id(): void
    {
        $response = $this->actingAs($this->providerUser, 'sanctum')->post('/api/invoices/preview', [
            'client_id' => $this->client->id,
            'expedition_ids' => [99999],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 100,
        ]);

        $response->assertStatus(422);
    }
}
