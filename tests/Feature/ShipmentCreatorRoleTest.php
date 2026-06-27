<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShipmentCreatorRoleTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected User $clientUser;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider',
            'email' => 'p@x.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);
        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Co A',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $this->clientUser = User::create([
            'name' => 'Client User',
            'email' => 'c@x.com',
            'password' => 'secret',
            'role' => 'client',
        ]);
        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $this->clientUser->id,
            'account_number' => 'ACC-001',
            'full_name' => 'Alice Client',
            'email' => 'c@x.com',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);
    }

    private function makeShipment(string $shippingNumber, ?int $createdBy, ?int $clientId = null): Shipment
    {
        return Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $clientId,
            'created_by' => $createdBy,
            'shipping_number' => $shippingNumber,
            'sender_name' => 'Sender',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Recipient',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'statut_actuel' => 'information_recue',
        ]);
    }

    public function test_index_returns_creator_role_for_each_shipment(): void
    {
        $providerShipment = $this->makeShipment('PRO-00001', $this->providerUser->id, $this->client->id);
        $clientShipment = $this->makeShipment('CLI-00001', $this->clientUser->id, $this->client->id);

        Sanctum::actingAs($this->providerUser);

        $response = $this->getJson('/api/shipments');
        $response->assertStatus(200);

        $items = collect($response->json('data'))->keyBy('shipping_number');

        $this->assertEquals('prestataire', $items['PRO-00001']['creator_role']);
        $this->assertEquals('client', $items['CLI-00001']['creator_role']);
    }

    public function test_filter_creator_role_client_only_returns_client_created(): void
    {
        $this->makeShipment('PRO-00002', $this->providerUser->id, $this->client->id);
        $this->makeShipment('CLI-00002', $this->clientUser->id, $this->client->id);

        Sanctum::actingAs($this->providerUser);

        $response = $this->getJson('/api/shipments?created_by_role=client');
        $response->assertStatus(200);

        $items = $response->json('data');
        $this->assertCount(1, $items);
        $this->assertEquals('CLI-00002', $items[0]['shipping_number']);
        $this->assertEquals('client', $items[0]['creator_role']);
    }

    public function test_filter_creator_role_prestataire_returns_provider_created(): void
    {
        $this->makeShipment('PRO-00003', $this->providerUser->id, $this->client->id);
        $this->makeShipment('CLI-00003', $this->clientUser->id, $this->client->id);
        $this->makeShipment('NONE-00003', null, $this->client->id);

        Sanctum::actingAs($this->providerUser);

        $response = $this->getJson('/api/shipments?created_by_role=prestataire');
        $response->assertStatus(200);

        $numbers = collect($response->json('data'))->pluck('shipping_number')->sort()->values()->all();
        $this->assertEquals(['PRO-00003'], $numbers);
    }

    public function test_client_role_does_not_expose_source_filter(): void
    {
        $this->makeShipment('CLI-00004', $this->clientUser->id, $this->client->id);

        Sanctum::actingAs($this->clientUser);

        $this->getJson('/api/my/shipments?created_by_role=client')->assertStatus(200);
    }
}
