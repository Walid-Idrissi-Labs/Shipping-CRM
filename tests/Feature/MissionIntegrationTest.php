<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\AffectationExpedition;
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

class MissionIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected User $otherProviderUser;
    protected Provider $otherProvider;
    protected User $clientUser;
    protected Client $client;
    protected Client $otherClient;
    protected User $otherClientUser;
    protected Chauffeur $chauffeur;
    protected Vehicule $vehicule;

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

        $this->otherProviderUser = User::create([
            'name' => 'Other',
            'email' => 'op@x.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);
        $this->otherProvider = Provider::create([
            'user_id' => $this->otherProviderUser->id,
            'company_name' => 'Co B',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $clientUser = User::create([
            'name' => 'C',
            'email' => 'c@x.com',
            'password' => 'secret',
            'role' => 'client',
        ]);
        $this->clientUser = $clientUser;
        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => 'ACC-001',
            'full_name' => 'Alice',
            'email' => 'c@x.com',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $otherClientUser = User::create([
            'name' => 'OC',
            'email' => 'oc@x.com',
            'password' => 'secret',
            'role' => 'client',
        ]);
        $this->otherClientUser = $otherClientUser;
        $this->otherClient = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $otherClientUser->id,
            'account_number' => 'ACC-002',
            'full_name' => 'Bob',
            'email' => 'oc@x.com',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $this->chauffeur = Chauffeur::create([
            'provider_id' => $this->provider->id,
            'nom_complet' => 'Ali Driver',
            'statut' => 'actif',
        ]);
        ChauffeurTypeVehicule::create([
            'chauffeur_id' => $this->chauffeur->id,
            'type_vehicule' => 'camionnette_fourgon_leger',
        ]);

        $this->vehicule = Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'A-12345-B',
            'marque_modele' => 'Renault',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
        ]);
    }

    protected function makeShipment(array $overrides = [], ?Client $client = null, ?Provider $provider = null): Shipment
    {
        return Shipment::create(array_merge([
            'provider_id' => ($provider ?? $this->provider)->id,
            'client_id' => ($client ?? $this->client)->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'SHIP-' . random_int(10000, 99999),
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ], $overrides));
    }

    protected function makeAffectation(array $overrides = [], ?array $expeditionIds = null): Affectation
    {
        $affectation = Affectation::create(array_merge([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour(),
            'ville_arrivee' => 'Paris',
            'pays_arrivee' => 'France',
            'statut' => 'planifiee',
            'client_id' => $this->client->id,
        ], $overrides));

        if ($expeditionIds !== null) {
            foreach ($expeditionIds as $expId) {
                AffectationExpedition::create([
                    'affectation_id' => $affectation->id,
                    'expedition_id' => $expId,
                ]);
            }
        }
        return $affectation;
    }

    // ============== missions create with client_id ==============

    public function test_create_affectation_sets_client_id_from_first_expedition(): void
    {
        $shipment = $this->makeShipment(['shipping_number' => 'SHP-CL-001']);

        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/assignments', [
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casablanca',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
            'ville_arrivee' => 'Paris',
            'pays_arrivee' => 'France',
            'expedition_ids' => [$shipment->id],
        ]);

        $response->assertStatus(201);
        $id = $response->json('affectation.id');
        $this->assertEquals($this->client->id, Affectation::find($id)->client_id);
    }

    public function test_create_affectation_leaves_client_id_null_when_no_expedition(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->postJson('/api/assignments', [
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour()->toDateTimeString(),
        ]);

        $response->assertStatus(201);
        $id = $response->json('affectation.id');
        $this->assertNull(Affectation::find($id)->client_id);
    }

    // ============== byClient ==============

    public function test_can_list_missions_for_a_client_via_affectation_client_id_match(): void
    {
        $s = $this->makeShipment();
        $m = $this->makeAffectation([], [$s->id]);
        $this->assertEquals($this->client->id, $m->client_id);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/clients/{$this->client->id}/missions");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($m->id, $ids);
    }

    public function test_can_list_missions_for_a_client_via_expedition_match(): void
    {
        // Affectation has client_id null but shipments tied to a specific client
        $s = $this->makeShipment();
        $m = $this->makeAffectation(['client_id' => null], [$s->id]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/clients/{$this->client->id}/missions");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($m->id, $ids);
    }

    public function test_other_clients_missions_not_returned(): void
    {
        $s = $this->makeShipment([], $this->otherClient);
        $m = $this->makeAffectation(['client_id' => $this->otherClient->id], [$s->id]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/clients/{$this->client->id}/missions");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($m->id, $ids);
    }

    public function test_other_provider_cannot_access_clients_missions(): void
    {
        Sanctum::actingAs($this->otherProviderUser);
        $this->getJson("/api/clients/{$this->client->id}/missions")
            ->assertStatus(403);
    }

    // ============== providershipmentshowMissions ==============

    public function test_shipment_show_returns_affectations_with_chauffeur_and_vehicule(): void
    {
        $s = $this->makeShipment();
        $m = $this->makeAffectation([], [$s->id]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/shipments/{$s->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['shipment', 'affectations', 'suivi_statuts']);

        $aff = collect($response->json('affectations'))->firstWhere('id', $m->id);
        $this->assertNotNull($aff, 'Mission should be present in shipment show response.');
        $this->assertEquals('planifiee', $aff['statut']);
        $this->assertEquals($this->chauffeur->nom_complet, $aff['chauffeur']['nom_complet']);
        $this->assertEquals($this->vehicule->immatriculation, $aff['vehicule']['immatriculation']);
    }

    public function test_shipment_without_mission_returns_empty_array(): void
    {
        $s = $this->makeShipment();

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/shipments/{$s->id}");

        $response->assertStatus(200);
        $this->assertEquals([], $response->json('affectations'));
    }

    // ============== assignmentShowShape ==============

    public function test_assignment_show_returns_client_relation(): void
    {
        $s = $this->makeShipment();
        $m = $this->makeAffectation([], [$s->id]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/assignments/{$m->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('affectation.client.id', $this->client->id);
        $response->assertJsonPath('affectation.chauffeur.id', $this->chauffeur->id);
        $response->assertJsonPath('affectation.vehicule.id', $this->vehicule->id);
    }

    public function test_assignment_index_can_filter_by_client_id(): void
    {
        $s1 = $this->makeShipment([], $this->client);
        $s2 = $this->makeShipment(['shipping_number' => 'SHIP-OTHER'], $this->otherClient);
        $m1 = $this->makeAffectation(['client_id' => $this->client->id], [$s1->id]);
        $m2 = $this->makeAffectation(['client_id' => $this->otherClient->id], [$s2->id]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson("/api/assignments?client_id={$this->client->id}");

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($m1->id, $ids);
        $this->assertNotContains($m2->id, $ids);
    }
}
