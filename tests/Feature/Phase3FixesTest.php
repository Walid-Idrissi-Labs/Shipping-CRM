<?php

namespace Tests\Feature;

use App\Models\Avoir;
use App\Models\Client;
use App\Models\Facture;
use App\Models\FactureExpedition;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase3FixesTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected Client $client;
    protected string $providerToken;
    protected User $otherUser;

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

        $this->providerToken = $this->providerUser->load('provider')->createToken('test')->plainTextToken;

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

    public function test_facture_creation_no_longer_throws_mass_assignment_error(): void
    {
        $shipment = $this->makeShipment();
        $dateFacture = now()->subDays(3)->toDateString();
        $numeroN = 42;

        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'numero_n' => $numeroN,
            'date_facture' => $dateFacture,
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'facture' => ['id', 'numero']]);

        $this->assertDatabaseHas('factures', [
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'type_destination' => 'international',
            'taxable' => 100,
            'numero_n' => $numeroN,
            'date_facture' => $dateFacture . ' 00:00:00',
        ]);

        $this->assertDatabaseHas('facture_expeditions', [
            'facture_id' => $response->json('facture.id'),
            'expedition_id' => $shipment->id,
        ]);
    }

    public function test_facture_creation_rejects_duplicate_numero_for_same_year(): void
    {
        $firstShipment = $this->makeShipment(['shipping_number' => '900000100']);
        $secondShipment = $this->makeShipment(['shipping_number' => '900000101']);

        $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$firstShipment->id],
            'numero_n' => 77,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 100,
        ])->assertStatus(201);

        $duplicate = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$secondShipment->id],
            'numero_n' => 77,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 120,
        ]);

        $duplicate->assertStatus(422);
        $duplicate->assertJsonPath('message', 'Ce numero de facture existe deja pour cette annee.');
    }

    public function test_divers_facture_creation_works(): void
    {
        $shipment = $this->makeShipment(['client_id' => null]);

        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'expedition_ids' => [$shipment->id],
            'client_divers_nom' => 'Walk-in Customer',
            'client_divers_adresse' => 'Some Address',
            'client_divers_tel' => '+212698765432',
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taxable' => 200,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('factures', [
            'client_id' => null,
            'client_divers_nom' => 'Walk-in Customer',
            'type_destination' => 'national',
            'taux_tva' => '10.00',
            'taxable' => '200.00',
            'tva' => '20.00',
            'ttc' => '220.00',
            'non_taxable' => '0.00',
        ]);
    }

    public function test_duplicate_invoice_for_same_shipment_is_rejected(): void
    {
        $shipment = $this->makeShipment();

        $payload = [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ];

        $first = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', $payload);
        $first->assertStatus(201);

        $second = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', $payload);
        $second->assertStatus(409);
        $second->assertJsonStructure(['message', 'invoiced_expedition_ids']);
    }

public function test_destroy_facture_works_and_cleans_pivot(): void
    {
        $shipment = $this->makeShipment();
        $this->actingAs($this->providerUser, 'sanctum');

        $response = $this->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $response->assertStatus(201);
        $factureId = $response->json('facture.id');

        $this->actingAs($this->providerUser, 'sanctum');
        $destroyResponse = $this->deleteJson("/api/invoices/{$factureId}");
        $destroyResponse->assertStatus(200);

        $this->assertNull(\App\Models\Facture::find($factureId), 'Facture was not deleted');
        $this->assertEquals(0, \App\Models\FactureExpedition::where('facture_id', $factureId)->count(), 'Pivot records not cleaned');
    }

    public function test_destroy_facture_with_avoir_is_rejected(): void
    {
        $shipment = $this->makeShipment();
        $this->actingAs($this->providerUser, 'sanctum');

        $response = $this->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $response->assertStatus(201);
        $factureId = $response->json('facture.id');

        \App\Models\Avoir::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'facture_id' => $factureId,
            'numero_n' => 1,
            'annee' => now()->year,
            'type_destination' => 'international',
            'taux_tva' => 20,
            'non_taxable' => -50,
            'taxable' => -100,
            'tva' => -20,
            'ttc' => -170,
        ]);

        $this->actingAs($this->providerUser, 'sanctum');
        $destroyResponse = $this->deleteJson("/api/invoices/{$factureId}");
        $destroyResponse->assertStatus(409);

        $this->assertNotNull(\App\Models\Facture::find($factureId));
    }

    public function test_destroy_facture_for_wrong_provider_is_forbidden(): void
    {
        $otherUser = User::create([
            'name' => 'Other',
            'email' => 'o@x.com',
            'password' => bcrypt('secret'),
            'role' => 'prestataire',
        ]);
        $other = Provider::create([
            'user_id' => $otherUser->id,
            'company_name' => 'Other',
            'city' => 'X',
            'country' => 'Maroc',
        ]);

        $shipment = $this->makeShipment();
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $factureId = $response->json('facture.id');

        $destroyResponse = $this->actingAs($otherUser, 'sanctum')->deleteJson("/api/invoices/{$factureId}");
        $destroyResponse->assertStatus(403);

        $this->assertDatabaseHas('factures', ['id' => $factureId]);
    }

    public function test_avoir_creation_stores_negative_values(): void
    {
        $shipment = $this->makeShipment();
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $factureId = $response->json('facture.id');

        $avoirResponse = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/credit-notes', [
            'facture_id' => $factureId,
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $avoirResponse->assertStatus(201);

        $avoir = Avoir::firstOrFail();
        $this->assertEquals(-100, (float) $avoir->taxable);
        $this->assertEquals(-50, (float) $avoir->non_taxable);
        $this->assertLessThan(0, (float) $avoir->ttc);
    }

    public function test_avoir_rejected_when_facture_already_has_one(): void
    {
        $shipment = $this->makeShipment();
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $factureId = $response->json('facture.id');

        $first = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/credit-notes', [
            'facture_id' => $factureId,
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $first->assertStatus(201);

        $second = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/credit-notes', [
            'facture_id' => $factureId,
            'type_destination' => 'international',
            'taxable' => 50,
        ]);
        $second->assertStatus(409);
    }

    public function test_unbilled_shipments_endpoint_excludes_already_invoiced(): void
    {
        $shipment1 = $this->makeShipment(['shipping_number' => '111999001']);
        $shipment2 = $this->makeShipment(['shipping_number' => '111999002']);

        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment1->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
        ]);
        $response->assertStatus(201);

        $unbilled = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices/unbilled-shipments?client_id=' . $this->client->id);
        $unbilled->assertStatus(200);

        $ids = collect($unbilled->json('data'))->pluck('id')->toArray();
        $this->assertContains($shipment2->id, $ids);
        $this->assertNotContains($shipment1->id, $ids);
    }

    public function test_unbilled_shipments_divers_mode_only_returns_shipments_without_client(): void
    {
        $registered = $this->makeShipment(['shipping_number' => '111999003']);
        $divers = $this->makeShipment([
            'shipping_number' => '111999004',
            'client_id' => null,
            'sender_name' => 'Walk-in Sender',
            'recipient_name' => 'Walk-in RCPT',
        ]);

        $response = $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/invoices/unbilled-shipments?client_id=');

        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($divers->id, $ids, 'Divers shipment should appear in divers mode.');
        $this->assertNotContains($registered->id, $ids, 'Registered-client shipment must NOT appear in divers mode.');
    }

    public function test_label_endpoint_returns_pdf(): void
    {
        $shipment = $this->makeShipment();

        $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/shipments', [
            'sender_name' => 'X',
            'recipient_name' => 'Y',
            'type_service' => 'international_express_dap',
        ]);

        $response = $this->actingAs($this->providerUser, 'sanctum')->get("/api/shipments/{$shipment->id}/label");
        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type', ''));

        $shipment->refresh();
        $this->assertNotEmpty($shipment->label_url);
    }

    public function test_label_endpoint_label_url_points_to_existing_pdf(): void
    {
        $shipment = $this->makeShipment();

        $shipmentController = app(\App\Http\Controllers\Api\ShipmentController::class);
        $request = \Illuminate\Http\Request::create("/api/shipments/{$shipment->id}/label", 'GET');
        $request->setUserResolver(fn () => $this->providerUser);
        $shipmentController->label($request, $shipment);

        $shipment->refresh();
        $this->assertNotEmpty($shipment->label_url);
        $path = public_path(str_replace('/storage/', 'storage/', $shipment->label_url));
        $this->assertFileExists($path);
        $this->assertGreaterThan(1000, filesize($path));

        $fh = fopen($path, 'rb');
        $header = fread($fh, 4);
        fclose($fh);
        $this->assertSame('25504446', bin2hex($header), 'Should be valid PDF magic bytes');
    }

    public function test_invoice_pdf_endpoint_returns_pdf(): void
    {
        $shipment = $this->makeShipment();
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $factureId = $response->json('facture.id');

        $pdfResponse = $this->actingAs($this->providerUser, 'sanctum')->get("/api/invoices/{$factureId}/pdf");
        $pdfResponse->assertStatus(200);
    }

    public function test_avoir_pdf_endpoint_returns_pdf(): void
    {
        $shipment = $this->makeShipment();
        $response = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $factureId = $response->json('facture.id');

        $avoirResponse = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/credit-notes', [
            'facture_id' => $factureId,
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ]);
        $avoirId = $avoirResponse->json('avoir.id');

        $pdfResponse = $this->actingAs($this->providerUser, 'sanctum')->get("/api/credit-notes/{$avoirId}/pdf");
        $pdfResponse->assertStatus(200);
    }

    public function test_clients_search_is_case_insensitive(): void
    {
        \App\Models\PasswordView::query()->delete();
        $johnUser = User::create([
            'name' => 'John User',
            'email' => 'john.smith@example.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);
        $janeUser = User::create([
            'name' => 'Jane User',
            'email' => 'jane.doe@example.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);
        Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $johnUser->id,
            'account_number' => 'ACC001',
            'full_name' => 'John Smith',
            'email' => 'john.smith@example.com',
            'country' => 'Maroc',
        ]);
        Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $janeUser->id,
            'account_number' => 'ACC002',
            'full_name' => 'Jane Doe',
            'email' => 'jane.doe@example.com',
            'country' => 'Maroc',
        ]);

        $lower = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/clients?search=john');
        $lower->assertStatus(200);
        $this->assertCount(1, $lower->json('data'));
        $this->assertSame('John Smith', $lower->json('data.0.full_name'));

        $upper = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/clients?search=JOHN');
        $upper->assertStatus(200);
        $this->assertCount(1, $upper->json('data'));
        $this->assertSame('John Smith', $upper->json('data.0.full_name'));

        $mixed = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/clients?search=SmItH');
        $mixed->assertStatus(200);
        $this->assertCount(1, $mixed->json('data'));
    }

    public function test_invoices_search_is_case_insensitive_and_matches_numero(): void
    {
        $shipment = $this->makeShipment();
        $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ])->assertStatus(201);

        $clientUpdate = Client::find($this->client->id);
        $johnUser = User::create([
            'name' => 'John Client',
            'email' => 'john.unique@example.com',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);

        $johnClient = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $johnUser->id,
            'account_number' => 'ACC999',
            'full_name' => 'Johnny Cash',
            'email' => 'john.unique@example.com',
            'country' => 'Maroc',
        ]);

        $johnShip = Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $johnClient->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => '111999777',
            'sender_name' => 'X',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Y',
            'recipient_country' => 'France',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
            'poids' => 1,
            'longueur' => 10,
            'largeur' => 10,
            'hauteur' => 10,
            'nb_pieces' => 1,
            'statut_actuel' => 'information_recue',
        ]);
        $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $johnClient->id,
            'expedition_ids' => [$johnShip->id],
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 100,
            'non_taxable' => 50,
        ])->assertStatus(201);

        $lower = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices?search=johnny');
        $lower->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($lower->json('data')));
        $foundJohn = collect($lower->json('data'))->firstWhere('client_id', $johnClient->id);
        $this->assertNotNull($foundJohn, 'Lowercase search should find client Johnny Cash');

        $upper = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices?search=JOHNNY');
        $upper->assertStatus(200);
        $foundJohnUpper = collect($upper->json('data'))->firstWhere('client_id', $johnClient->id);
        $this->assertNotNull($foundJohnUpper, 'Uppercase search should find client Johnny Cash');

        $numero = $lower->json('data.0.numero');
        $byNumero = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices?search=' . urlencode(strtolower($numero)));
        $byNumero->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($byNumero->json('data')));

        $byNumN = $this->actingAs($this->providerUser, 'sanctum')->getJson('/api/invoices?search=1');
        $byNumN->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($byNumN->json('data')));
    }

    public function test_clients_sort_by_full_name_asc_returns_alphabetical_order(): void
    {
        $alphabetUsers = ['alice', 'charlie'];
        $createdClientIds = [];
        foreach (['Zoe First', 'Alice Second', 'Charlie Third'] as $name) {
            $user = User::create([
                'name' => $name,
                'email' => 'sort.' . uniqid() . '@x.com',
                'password' => bcrypt('secret'),
                'role' => 'client',
            ]);
            $createdClientIds[] = Client::create([
                'provider_id' => $this->provider->id,
                'user_id' => $user->id,
                'account_number' => 'S' . uniqid(),
                'full_name' => $name,
                'email' => $user->email,
                'country' => 'Maroc',
            ])->id;
        }

        $asc = $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/clients?sort_by=full_name&sort_dir=asc');
        $asc->assertStatus(200);
        $ascNames = collect($asc->json('data'))->pluck('full_name')->all();
        $sortedAsc = array_values(array_filter($ascNames, fn ($n) => str_contains($n, 'First') || str_contains($n, 'Second') || str_contains($n, 'Third')));
        $this->assertSame(['Alice Second', 'Charlie Third', 'Zoe First'], $sortedAsc);

        $desc = $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/clients?sort_by=full_name&sort_dir=desc');
        $desc->assertStatus(200);
        $descNames = collect($desc->json('data'))->pluck('full_name')->all();
        $sortedDesc = array_values(array_filter($descNames, fn ($n) => str_contains($n, 'First') || str_contains($n, 'Second') || str_contains($n, 'Third')));
        $this->assertSame(['Zoe First', 'Charlie Third', 'Alice Second'], $sortedDesc);
    }

    public function test_invoices_sort_by_ttc_desc_orders_by_money(): void
    {
        // Create three factures with distinct TTC values
        $values = [50, 350, 150];
        foreach ($values as $i => $taxable) {
            $ship = \App\Models\Shipment::create([
                'provider_id' => $this->provider->id,
                'client_id' => $this->client->id,
                'created_by' => $this->providerUser->id,
                'shipping_number' => '99900' . $i,
                'sender_name' => 'X',
                'sender_country' => 'Maroc',
                'recipient_name' => 'R' . $i,
                'recipient_country' => 'France',
                'type_service' => 'international_express_dap',
                'type_colis' => 'paquet',
                'poids' => 1,
                'longueur' => 10,
                'largeur' => 10,
                'hauteur' => 10,
                'nb_pieces' => 1,
                'statut_actuel' => 'information_recue',
            ]);
            $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
                'client_id' => $this->client->id,
                'expedition_ids' => [$ship->id],
                'date_echeance' => now()->addDays(30)->toDateString(),
                'type_destination' => 'international',
                'taxable' => $taxable,
                'non_taxable' => 0,
            ])->assertStatus(201);
        }

        $desc = $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/invoices?sort_by=ttc&sort_dir=desc');
        $desc->assertStatus(200);
        $ttcs = collect($desc->json('data'))->pluck('ttc');
        // ttc should be sorted descending
        $isDesc = true;
        $previous = PHP_INT_MAX;
        foreach ($ttcs as $t) {
            if ((float) $t > $previous) {
                $isDesc = false;
                break;
            }
            $previous = (float) $t;
        }
        $this->assertTrue($isDesc, 'TTC column should be sorted descending');
    }

    public function test_invalid_sort_colum_falls_back_to_default(): void
    {
        $client1 = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => User::create([
                'name' => 'X1',
                'email' => 'invalid.sort.x1@x.com',
                'password' => bcrypt('secret'),
                'role' => 'client',
            ])->id,
            'account_number' => 'BAD1',
            'full_name' => 'Bad One',
            'email' => 'invalid.sort.x1@x.com',
            'country' => 'Maroc',
        ]);

        $response = $this->actingAs($this->providerUser, 'sanctum')
            ->getJson('/api/clients?sort_by=evil_column; DROP TABLE&sort_dir=desc');
        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }
}
