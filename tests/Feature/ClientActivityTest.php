<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientActivity;
use App\Models\Facture;
use App\Models\Provider;
use App\Models\User;
use App\Services\ClientActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientActivityTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerAUser;

    protected Provider $providerA;

    protected User $clientAUser;

    protected Client $clientA;

    protected User $providerBUser;

    protected Provider $providerB;

    protected User $clientBUser;

    protected Client $clientB;

    protected function setUp(): void
    {
        parent::setUp();

        [$this->providerAUser, $this->providerA, $this->clientAUser, $this->clientA] =
            $this->makeProviderWithClient('a');

        [$this->providerBUser, $this->providerB, $this->clientBUser, $this->clientB] =
            $this->makeProviderWithClient('b');
    }

    private function makeProviderWithClient(string $suffix): array
    {
        $providerUser = User::create([
            'name' => "Provider {$suffix}",
            'email' => "provider{$suffix}@x.com",
            'password' => 'secret',
            'role' => 'prestataire',
        ]);

        $provider = Provider::create([
            'user_id' => $providerUser->id,
            'company_name' => "Co {$suffix}",
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $clientUser = User::create([
            'name' => "Client {$suffix}",
            'email' => "client{$suffix}@x.com",
            'password' => 'secret',
            'role' => 'client',
            'password_hash' => Hash::make('secret'),
        ]);

        $client = Client::create([
            'provider_id' => $provider->id,
            'user_id' => $clientUser->id,
            'account_number' => "ACC-{$suffix}",
            'full_name' => "Client {$suffix}",
            'email' => "client{$suffix}@x.com",
            'phone' => '+212600000000',
            'city' => 'Casablanca',
            'country' => 'Maroc',
        ]);

        return [$providerUser, $provider, $clientUser, $client];
    }

    public function test_client_login_creates_activity_row(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'clienta@x.com',
            'password' => 'secret',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('client_activities', [
            'client_id' => $this->clientA->id,
            'provider_id' => $this->providerA->id,
            'type' => 'login',
        ]);
    }

    public function test_client_shipment_creation_logs_activity(): void
    {
        Sanctum::actingAs($this->clientAUser);

        $response = $this->postJson('/api/my/expeditions', [
            'sender_name' => 'Client a',
            'sender_country' => 'Maroc',
            'recipient_name' => 'John Doe',
            'recipient_country' => 'France',
            'recipient_city' => 'Lyon',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'poids' => 1.5,
        ]);

        $response->assertStatus(201);
        $shipmentId = $response->json('shipment.id');

        $this->assertDatabaseHas('client_activities', [
            'client_id' => $this->clientA->id,
            'type' => 'shipment_created',
            'subject_type' => 'shipment',
            'subject_id' => $shipmentId,
        ]);
    }

    public function test_client_quote_request_logs_activity(): void
    {
        Sanctum::actingAs($this->clientAUser);

        $response = $this->postJson('/api/my/quote-requests', [
            'recipient_name' => 'John Doe',
            'recipient_country' => 'France',
            'recipient_city' => 'Lyon',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'poids' => 1.5,
        ]);

        $response->assertStatus(201);
        $quoteRequestId = $response->json('quote_request.id');

        $this->assertDatabaseHas('client_activities', [
            'client_id' => $this->clientA->id,
            'type' => 'quote_request_created',
            'subject_type' => 'quote_request',
            'subject_id' => $quoteRequestId,
        ]);
    }

    public function test_client_profile_update_logs_activity(): void
    {
        Sanctum::actingAs($this->clientAUser);

        $response = $this->patchJson('/api/client/profile', [
            'full_name' => 'Client a Updated',
            'email' => 'clienta@x.com',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('client_activities', [
            'client_id' => $this->clientA->id,
            'type' => 'profile_updated',
        ]);
    }

    public function test_client_invoice_pdf_download_logs_activity_only_for_client_role(): void
    {
        $facture = Facture::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
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

        Sanctum::actingAs($this->clientAUser);
        $this->get("/api/my/invoices/{$facture->id}/pdf")->assertStatus(200);

        $this->assertEquals(1, ClientActivity::where('type', 'invoice_downloaded')->count());

        Sanctum::actingAs($this->providerAUser);
        $this->get("/api/invoices/{$facture->id}/pdf")->assertStatus(200);

        // Provider downloading the same invoice must not add a second row.
        $this->assertEquals(1, ClientActivity::where('type', 'invoice_downloaded')->count());
    }

    public function test_provider_activity_feed_lists_own_clients_only(): void
    {
        ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'login',
            'description' => 'Provider A activity',
            'created_at' => now(),
        ]);

        ClientActivity::create([
            'provider_id' => $this->providerB->id,
            'client_id' => $this->clientB->id,
            'type' => 'login',
            'description' => 'Provider B activity',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($this->providerAUser);
        $response = $this->getJson('/api/client-activities');

        $response->assertStatus(200);
        $descriptions = collect($response->json('data'))->pluck('description')->toArray();
        $this->assertContains('Provider A activity', $descriptions);
        $this->assertNotContains('Provider B activity', $descriptions);
    }

    public function test_client_activity_feed_paginates(): void
    {
        for ($i = 0; $i < 30; $i++) {
            ClientActivity::create([
                'provider_id' => $this->providerA->id,
                'client_id' => $this->clientA->id,
                'type' => 'login',
                'description' => "Activity {$i}",
                'created_at' => now(),
            ]);
        }

        Sanctum::actingAs($this->providerAUser);

        $page1 = $this->getJson('/api/client-activities');
        $page1->assertStatus(200);
        $this->assertEquals(25, $page1->json('per_page'));
        $this->assertEquals(2, $page1->json('last_page'));

        $page2 = $this->getJson('/api/client-activities?page=2');
        $this->assertCount(5, $page2->json('data'));
    }

    public function test_activity_feed_excludes_entries_older_than_30_days(): void
    {
        $recent = ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'login',
            'description' => 'Recent login',
            'created_at' => now()->subDays(5),
        ]);

        $old = ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'login',
            'description' => 'Old login',
            'created_at' => now()->subDays(45),
        ]);

        Sanctum::actingAs($this->providerAUser);
        $response = $this->getJson('/api/client-activities');

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($recent->id, $ids);
        $this->assertNotContains($old->id, $ids);
    }

    public function test_logging_new_activity_prunes_entries_older_than_30_days(): void
    {
        ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'login',
            'description' => 'Very old login',
            'created_at' => now()->subDays(31),
        ]);

        $this->assertEquals(1, ClientActivity::count());

        ClientActivityLogger::log($this->clientA, 'login', 'Fresh login');

        $this->assertEquals(1, ClientActivity::count());
        $this->assertDatabaseHas('client_activities', ['description' => 'Fresh login']);
        $this->assertDatabaseMissing('client_activities', ['description' => 'Very old login']);
    }

    public function test_client_activity_feed_filters_by_type(): void
    {
        ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'login',
            'description' => 'A login',
            'created_at' => now(),
        ]);

        ClientActivity::create([
            'provider_id' => $this->providerA->id,
            'client_id' => $this->clientA->id,
            'type' => 'profile_updated',
            'description' => 'A profile update',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($this->providerAUser);
        $response = $this->getJson('/api/client-activities?type=login');

        $response->assertStatus(200);
        $types = collect($response->json('data'))->pluck('type')->unique()->toArray();
        $this->assertEquals(['login'], $types);
    }
}
