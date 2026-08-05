<?php

namespace Tests\Feature;

use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderTimezoneTest extends TestCase
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

    public function test_settings_endpoint_persists_timezone(): void
    {
        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'timezone' => 'Europe/Paris',
        ])->assertOk();

        $this->provider->refresh();
        $this->assertEquals('Europe/Paris', $this->provider->timezone);

        $show = $this->getJson('/api/provider/settings');
        $this->assertEquals('Europe/Paris', $show->json('timezone'));
        $this->assertNotNull($show->json('server_time'));
    }

    public function test_invalid_timezone_is_rejected(): void
    {
        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'timezone' => 'Not/ARealZone',
        ])->assertStatus(422);
    }

    public function test_tracking_date_is_evaluated_in_provider_timezone(): void
    {
        $this->provider->update(['timezone' => 'Africa/Casablanca']);

        $shipment = Shipment::create([
            'provider_id' => $this->provider->id,
            'shipping_number' => '100000001',
            'sender_name' => 'Sender',
            'recipient_name' => 'Recipient',
            'type_service' => 'national',
            'statut_actuel' => 'information_recue',
        ]);

        // Casablanca is UTC+1: this instant is already in the past in UTC,
        // but its wall-clock reading is 59 minutes ahead of true UTC "now" —
        // i.e. exactly the kind of value a Morocco-based prestataire submits.
        $nowInCasablanca = Carbon::now('Africa/Casablanca');
        $almostNow = $nowInCasablanca->copy()->subMinute()->format('Y-m-d\TH:i');

        Sanctum::actingAs($this->providerUser);
        $this->postJson("/api/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => $almostNow,
        ])->assertCreated();
    }

    public function test_tracking_date_still_rejects_genuine_future(): void
    {
        $this->provider->update(['timezone' => 'Africa/Casablanca']);

        $shipment = Shipment::create([
            'provider_id' => $this->provider->id,
            'shipping_number' => '100000002',
            'sender_name' => 'Sender',
            'recipient_name' => 'Recipient',
            'type_service' => 'national',
            'statut_actuel' => 'information_recue',
        ]);

        $future = Carbon::now('Africa/Casablanca')->addHours(3)->format('Y-m-d\TH:i');

        Sanctum::actingAs($this->providerUser);
        $this->postJson("/api/shipments/{$shipment->id}/tracking", [
            'statut' => 'ramasse',
            'date_statut' => $future,
        ])->assertStatus(422);
    }
}
