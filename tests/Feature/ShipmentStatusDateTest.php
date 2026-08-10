<?php

namespace Tests\Feature;

use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A shipment status date is deliberately unbounded — it can be backdated to
 * when the event really happened, or set ahead for something planned. This
 * replaces the old provider-timezone rule, which rejected anything after "now".
 */
class ShipmentStatusDateTest extends TestCase
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

    private function makeShipment(string $number): Shipment
    {
        return Shipment::create([
            'provider_id' => $this->provider->id,
            'shipping_number' => $number,
            'sender_name' => 'Sender',
            'recipient_name' => 'Recipient',
            'type_service' => 'national',
            'statut_actuel' => 'information_recue',
        ]);
    }

    public function test_provider_can_set_a_status_date_in_the_future(): void
    {
        $shipment = $this->makeShipment('100000001');
        $future = Carbon::now()->addDays(3)->format('Y-m-d\TH:i');

        Sanctum::actingAs($this->providerUser);
        $this->postJson("/api/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => $future,
        ])->assertCreated();

        $this->assertDatabaseCount('suivi_statuts', 1);
    }

    public function test_provider_can_set_a_status_date_in_the_past(): void
    {
        $shipment = $this->makeShipment('100000002');
        $past = Carbon::now()->subMonths(2)->format('Y-m-d\TH:i');

        Sanctum::actingAs($this->providerUser);
        $this->postJson("/api/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => $past,
        ])->assertCreated();
    }

    public function test_employee_can_set_a_status_date_in_the_future(): void
    {
        $shipment = $this->makeShipment('100000003');

        $employee = User::create([
            'email' => 'emp@test.ma',
            'password' => bcrypt('secret123'),
            'role' => 'employe',
            'provider_id' => $this->provider->id,
        ]);

        $future = Carbon::now()->addDay()->format('Y-m-d\TH:i');

        Sanctum::actingAs($employee);
        $this->postJson("/api/employe/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => $future,
        ])->assertCreated();
    }

    public function test_a_value_that_is_not_a_date_is_still_rejected(): void
    {
        $shipment = $this->makeShipment('100000004');

        Sanctum::actingAs($this->providerUser);
        $this->postJson("/api/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => 'pas-une-date',
        ])->assertStatus(422);
    }

    public function test_settings_no_longer_expose_a_timezone(): void
    {
        Sanctum::actingAs($this->providerUser);

        $show = $this->getJson('/api/provider/settings')->assertOk();

        $this->assertArrayNotHasKey('timezone', $show->json());
        $this->assertArrayNotHasKey('server_time', $show->json());
    }
}
