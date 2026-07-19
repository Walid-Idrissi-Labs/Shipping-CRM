<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaginationSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $providerUser;

    private Provider $provider;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'email' => 'prov@test.ma',
            'password' => bcrypt('secret123'),
            'role' => 'prestataire',
        ]);
        $this->provider = Provider::create([
            'user_id' => $this->providerUser->id,
            'company_name' => 'Test Express',
        ]);
    }

    private function makeShipments(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            Shipment::create([
                'provider_id' => $this->provider->id,
                'shipping_number' => str_pad((string) (100000000 + $i), 9, '0', STR_PAD_LEFT),
                'sender_name' => "Sender {$i}",
                'recipient_name' => "Recipient {$i}",
                'type_service' => 'national',
                'statut_actuel' => 'information_recue',
            ]);
        }
    }

    public function test_shipments_use_provider_per_page_setting(): void
    {
        $this->provider->update(['per_page_expeditions' => 10]);
        $this->makeShipments(12);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/shipments');

        $response->assertOk();
        $this->assertEquals(10, $response->json('per_page'));
        $this->assertCount(10, $response->json('data'));
        $this->assertEquals(2, $response->json('last_page'));
    }

    public function test_shipments_page_param_returns_second_page(): void
    {
        $this->provider->update(['per_page_expeditions' => 10]);
        $this->makeShipments(12);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/shipments?page=2');

        $response->assertOk();
        $this->assertEquals(2, $response->json('current_page'));
        $this->assertCount(2, $response->json('data'));
    }

    public function test_invoices_use_provider_per_page_setting(): void
    {
        $this->provider->update(['per_page_factures' => 5]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/invoices');

        $response->assertOk();
        $this->assertEquals(5, $response->json('per_page'));
    }

    public function test_settings_endpoint_persists_per_page_values(): void
    {
        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'per_page_expeditions' => 50,
            'per_page_factures' => 15,
        ])->assertOk();

        $this->provider->refresh();
        $this->assertEquals(50, $this->provider->per_page_expeditions);
        $this->assertEquals(15, $this->provider->per_page_factures);

        $show = $this->getJson('/api/provider/settings');
        $this->assertEquals(50, $show->json('per_page_expeditions'));
        $this->assertEquals(15, $show->json('per_page_factures'));
    }

    public function test_per_page_values_are_clamped(): void
    {
        Sanctum::actingAs($this->providerUser);

        // Out-of-range values are rejected by validation.
        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'per_page_expeditions' => 500,
        ])->assertStatus(422);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'per_page_expeditions' => 2,
        ])->assertStatus(422);
    }

    public function test_client_role_gets_default_pagination(): void
    {
        $clientUser = User::create([
            'email' => 'client@test.ma',
            'password' => bcrypt('secret123'),
            'role' => 'client',
        ]);
        Client::create([
            'user_id' => $clientUser->id,
            'provider_id' => $this->provider->id,
            'account_number' => '123456',
            'full_name' => 'Client Test',
            'email' => 'client@test.ma',
        ]);

        Sanctum::actingAs($clientUser);
        $response = $this->getJson('/api/my/shipments');

        $response->assertOk();
        $this->assertEquals(25, $response->json('per_page'));
    }
}
