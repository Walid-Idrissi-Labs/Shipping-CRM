<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\Chauffeur;
use App\Models\ChauffeurTypeVehicule;
use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase4FleetTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;

    protected Provider $provider;

    protected User $otherProviderUser;

    protected Provider $otherProvider;

    protected User $clientUser;

    protected Client $client;

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

        $this->otherProviderUser = User::create([
            'name' => 'Other Provider',
            'email' => 'other@x.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);

        $this->otherProvider = Provider::create([
            'user_id' => $this->otherProviderUser->id,
            'company_name' => 'Other Co',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $clientUser = User::create([
            'name' => 'Client User',
            'email' => 'c@x.com',
            'password' => 'secret',
            'role' => 'client',
        ]);
        $this->clientUser = $clientUser;

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => '999990',
            'full_name' => 'Test Client',
            'email' => 'c@x.com',
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
            'shipping_number' => '111999'.random_int(100, 999),
            'sender_name' => 'Test Sender',
            'sender_country' => 'Maroc',
            'sender_email' => 's@x.com',
            'sender_phone' => '+212600000000',
            'recipient_name' => 'Test RCPT',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ], $overrides));
    }

    private function makeVehicule(array $overrides = [], ?Provider $provider = null): Vehicule
    {
        return Vehicule::create(array_merge([
            'provider_id' => ($provider ?? $this->provider)->id,
            'immatriculation' => 'A-'.random_int(10000, 99999).'-B',
            'marque_modele' => 'Renault Kangoo',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
        ], $overrides));
    }

    private function makeChauffeur(array $overrides = [], ?Provider $provider = null, array $types = []): Chauffeur
    {
        $chauffeur = Chauffeur::create(array_merge([
            'provider_id' => ($provider ?? $this->provider)->id,
            'nom_complet' => 'Ali Driver',
            'telephone' => '+212600000000',
            'statut' => 'actif',
        ], $overrides));

        foreach ($types as $type) {
            ChauffeurTypeVehicule::create([
                'chauffeur_id' => $chauffeur->id,
                'type_vehicule' => $type,
            ]);
        }

        return $chauffeur;
    }

    // ============ VEHICLE TESTS ============

    public function test_can_list_vehicules(): void
    {
        $this->makeVehicule();
        $this->makeVehicule(['immatriculation' => 'B-22222-C']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/vehicles');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_can_create_vehicule(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/vehicles', [
            'immatriculation' => 'NEW-12345-X',
            'marque_modele' => 'Ford Transit',
            'annee_circulation' => 2020,
            'couleur' => 'Blanc',
            'type_vehicule' => 'fourgon_grand_volume',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'vehicule']);
        $this->assertDatabaseHas('vehicules', ['immatriculation' => 'NEW-12345-X']);
    }

    public function test_vehicule_creation_requires_type(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/vehicles', [
            'immatriculation' => 'TY-99999-E',
        ]);

        $response->assertStatus(422);
    }

    public function test_vehicule_immatriculation_must_be_unique(): void
    {
        $this->makeVehicule(['immatriculation' => 'DUP-12345-Z']);

        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/vehicles', [
            'immatriculation' => 'DUP-12345-Z',
            'type_vehicule' => 'camionnette_fourgon_leger',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_show_vehicule_with_alerts(): void
    {
        $vehicule = $this->makeVehicule(['immatriculation' => 'DOC-12345-Y', 'exp_assurance' => now()->subDays(5)->toDateString()]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/vehicles/{$vehicule->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['vehicule', 'alerts']);
    }

    public function test_can_update_vehicule(): void
    {
        $vehicule = $this->makeVehicule(['immatriculation' => 'UPD-12345-A']);
        Sanctum::actingAs($this->providerUser);

        $response = $this->patchJson("/api/vehicles/{$vehicule->id}", [
            'immatriculation' => 'UPD-12345-A',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'marque_modele' => 'Mercedes Sprinter',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Mercedes Sprinter', $vehicule->fresh()->marque_modele);
    }

    public function test_can_delete_vehicule(): void
    {
        $vehicule = $this->makeVehicule();
        Sanctum::actingAs($this->providerUser);

        $response = $this->deleteJson("/api/vehicles/{$vehicule->id}");

        $response->assertStatus(200);
        $this->assertNull(Vehicule::find($vehicule->id));
    }

    public function test_cannot_delete_vehicule_in_mission(): void
    {
        $vehicule = $this->makeVehicule(['statut' => 'en_mission']);
        Sanctum::actingAs($this->providerUser);

        $response = $this->deleteJson("/api/vehicles/{$vehicule->id}");

        $response->assertStatus(409);
        $this->assertNotNull(Vehicule::find($vehicule->id));
    }

    public function test_available_vehicles_only_returns_disponible(): void
    {
        $this->makeVehicule(['statut' => 'disponible']);
        $this->makeVehicule(['immatriculation' => 'X-99999-Y', 'statut' => 'hors_service']);

        Sanctum::actingAs($this->providerUser);

        $response = $this->getJson('/api/vehicles/available');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_provider_cannot_access_other_provider_vehicule(): void
    {
        $otherVehicule = $this->makeVehicule([], $this->otherProvider);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/vehicles/{$otherVehicule->id}");

        $response->assertStatus(403);
    }

    // ============ DRIVER TESTS ============

    public function test_can_list_drivers(): void
    {
        $this->makeChauffeur();
        $this->makeChauffeur(['nom_complet' => 'Bob Driver']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/drivers');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_can_create_chauffeur_with_qualifications(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/drivers', [
            'nom_complet' => 'Hassan Driver',
            'telephone' => '+212600000123',
            'types_vehicules' => ['camionnette_fourgon_leger', 'moto_scooter'],
        ]);

        $response->assertStatus(201);
        $chauffeur = Chauffeur::where('nom_complet', 'Hassan Driver')->first();
        $this->assertNotNull($chauffeur);
        $this->assertEqualsCanonicalizing(['camionnette_fourgon_leger', 'moto_scooter'], $chauffeur->qualifiedTypes());
    }

    public function test_chauffeur_creation_requires_nom_complet(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/drivers', [
            'telephone' => '+212600000999',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_update_chauffeur_and_qualifications(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->patchJson("/api/drivers/{$chauffeur->id}", [
            'nom_complet' => 'Updated Name',
            'types_vehicules' => ['camion_porteur', 'semi_remorque_tracteur'],
        ]);

        $response->assertStatus(200);
        $fresh = $chauffeur->fresh();
        $this->assertEquals('Updated Name', $fresh->nom_complet);
        $this->assertEqualsCanonicalizing(['camion_porteur', 'semi_remorque_tracteur'], $fresh->qualifiedTypes());
    }

    public function test_can_delete_chauffeur(): void
    {
        $chauffeur = $this->makeChauffeur();
        Sanctum::actingAs($this->providerUser);

        $response = $this->deleteJson("/api/drivers/{$chauffeur->id}");

        $response->assertStatus(200);
        $this->assertNull(Chauffeur::find($chauffeur->id));
    }

    public function test_cannot_delete_chauffeur_in_mission(): void
    {
        $chauffeur = $this->makeChauffeur(['statut' => 'en_mission']);
        Sanctum::actingAs($this->providerUser);

        $response = $this->deleteJson("/api/drivers/{$chauffeur->id}");

        $response->assertStatus(409);
    }

    public function test_active_drivers_only_returns_actif(): void
    {
        $this->makeChauffeur(['statut' => 'actif']);
        $this->makeChauffeur(['nom_complet' => 'On Leave', 'statut' => 'en_conge']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/drivers/active');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_provider_cannot_access_other_provider_chauffeur(): void
    {
        $otherChauffeur = $this->makeChauffeur([], $this->otherProvider);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/drivers/{$otherChauffeur->id}");

        $response->assertStatus(403);
    }

    // ============ ASSIGNMENT TESTS ============

    public function test_can_create_affectation(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule();
        $shipment = $this->makeShipment();

        Sanctum::actingAs($this->providerUser);
        $response = $this->postJson('/api/assignments', [
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'ville_arrivee' => 'Paris',
            'pays_arrivee' => 'France',
            'expedition_ids' => [$shipment->id],
        ]);

        $response->assertStatus(201);
        $affectation = Affectation::first();
        $this->assertNotNull($affectation);
        $this->assertEquals('planifiee', $affectation->statut);
    }

    public function test_affectation_creation_requires_departure(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/assignments', [
            'ville_arrivee' => 'Paris',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_assign_unavailable_vehicule(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule(['statut' => 'hors_service']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->postJson('/api/assignments', [
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
        ]);

        $response->assertStatus(409);
    }

    public function test_cannot_assign_non_qualified_chauffeur_to_vehicule(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['moto_scooter']);
        $vehicule = $this->makeVehicule(['type_vehicule' => 'camion_porteur']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->postJson('/api/assignments', [
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
        ]);

        $response->assertStatus(422);
    }

    public function test_affectation_creation_sets_vehicule_and_chauffeur_to_en_mission(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule();
        $shipment = $this->makeShipment();

        Sanctum::actingAs($this->providerUser);
        $this->postJson('/api/assignments', [
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'expedition_ids' => [$shipment->id],
        ])->assertStatus(201);

        $this->assertEquals('en_mission', $vehicule->fresh()->statut);
        $this->assertEquals('en_mission', $chauffeur->fresh()->statut);
    }

    public function test_affectation_status_change_to_terminee_reverts_resources(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule();

        $affectation = Affectation::create([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'statut' => 'planifiee',
        ]);

        $vehicule->update(['statut' => 'en_mission']);
        $chauffeur->update(['statut' => 'en_mission']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->patchJson("/api/assignments/{$affectation->id}/status", [
            'statut' => 'terminee',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('disponible', $vehicule->fresh()->statut);
        $this->assertEquals('actif', $chauffeur->fresh()->statut);
    }

    public function test_affectation_status_change_to_annulee_reverts_resources(): void
    {
        $chauffeur = $this->makeChauffeur(['statut' => 'en_mission'], types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule(['statut' => 'en_mission']);

        $affectation = Affectation::create([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'statut' => 'planifiee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $this->patchJson("/api/assignments/{$affectation->id}/status", ['statut' => 'annulee'])
            ->assertStatus(200);

        $this->assertEquals('disponible', $vehicule->fresh()->statut);
        $this->assertEquals('actif', $chauffeur->fresh()->statut);
    }

    public function test_today_assignments_returns_today_only(): void
    {
        Affectation::create([
            'provider_id' => $this->provider->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->setTime(14, 0)->toDateTimeString(),
            'statut' => 'planifiee',
        ]);

        Affectation::create([
            'provider_id' => $this->provider->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->subDays(5)->toDateTimeString(),
            'statut' => 'planifiee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/assignments/today');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_unassigned_shipments_excludes_assigned(): void
    {
        $chauffeur = $this->makeChauffeur(types: ['camionnette_fourgon_leger']);
        $vehicule = $this->makeVehicule();
        $assigned = $this->makeShipment();
        $unassigned = $this->makeShipment();

        Sanctum::actingAs($this->providerUser);

        $this->postJson('/api/assignments', [
            'chauffeur_id' => $chauffeur->id,
            'vehicule_id' => $vehicule->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'expedition_ids' => [$assigned->id],
        ])->assertStatus(201);

        $response = $this->getJson('/api/assignments/unassigned-shipments');
        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($assigned->id, $ids);
        $this->assertContains($unassigned->id, $ids);
    }

    public function test_provider_cannot_access_other_provider_affectation(): void
    {
        $otherVehicule = $this->makeVehicule([], $this->otherProvider);
        $otherChauffeur = $this->makeChauffeur([], $this->otherProvider);
        $otherAffectation = Affectation::create([
            'provider_id' => $this->otherProvider->id,
            'chauffeur_id' => $otherChauffeur->id,
            'vehicule_id' => $otherVehicule->id,
            'ville_depart' => 'Rabat',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'statut' => 'planifiee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/assignments/{$otherAffectation->id}");

        $response->assertStatus(403);
    }

    // ============ FLEET DASHBOARD TEST ============

    public function test_fleet_dashboard_returns_correct_stats(): void
    {
        $this->makeVehicule(['statut' => 'disponible']);
        $this->makeVehicule(['immatriculation' => 'B-22222-C', 'statut' => 'en_mission']);
        $this->makeVehicule(['immatriculation' => 'B-33333-C', 'statut' => 'en_maintenance']);

        $this->makeChauffeur(['statut' => 'actif']);
        $this->makeChauffeur(['nom_complet' => 'On Leave', 'statut' => 'en_conge']);
        $this->makeChauffeur(['nom_complet' => 'On Mission', 'statut' => 'en_mission']);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/dashboard/fleet');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'vehicles_by_status',
            'drivers_by_status',
            'document_alerts',
            'today_missions',
            'unassigned_shipments_count',
        ]);

        $this->assertEquals(1, $response->json('vehicles_by_status.disponible'));
        $this->assertEquals(1, $response->json('vehicles_by_status.en_mission'));
        $this->assertEquals(1, $response->json('drivers_by_status.actif'));
    }

    public function test_fleet_dashboard_includes_expired_documents(): void
    {
        $this->makeVehicule([
            'immatriculation' => 'EXP-99999-Z',
            'exp_assurance' => now()->subDays(10)->toDateString(),
        ]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/dashboard/fleet');

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('document_alerts'));
        $first = $response->json('document_alerts.0');
        $this->assertEquals('assurance', $first['type']);
        $this->assertEquals('expired', $first['status']);
    }

    // ============ ACL TESTS ============

    public function test_client_cannot_access_fleet_endpoints(): void
    {
        Sanctum::actingAs($this->clientUser);

        $this->getJson('/api/vehicles')->assertStatus(403);
        $this->getJson('/api/drivers')->assertStatus(403);
        $this->getJson('/api/assignments')->assertStatus(403);
        $this->getJson('/api/dashboard/fleet')->assertStatus(403);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/vehicles')->assertStatus(401);
        $this->getJson('/api/drivers')->assertStatus(401);
        $this->getJson('/api/assignments')->assertStatus(401);
        $this->getJson('/api/dashboard/fleet')->assertStatus(401);
    }
}
