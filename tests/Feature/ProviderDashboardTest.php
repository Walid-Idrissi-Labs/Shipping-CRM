<?php

namespace Tests\Feature;

use App\Models\Affectation;
use App\Models\AffectationExpedition;
use App\Models\Chauffeur;
use App\Models\Client;
use App\Models\Facture;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;
    protected Provider $provider;
    protected User $otherProviderUser;
    protected Provider $otherProvider;
    protected Client $client;
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
        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => 'ACC-001',
            'full_name' => 'Alice',
            'email' => 'c@x.com',
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        $this->chauffeur = Chauffeur::create([
            'provider_id' => $this->provider->id,
            'nom_complet' => 'Yassine Driver',
            'statut' => 'actif',
        ]);

        $this->vehicule = Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'A-99999-Z',
            'marque_modele' => 'Mercedes',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
            'exp_assurance' => now()->addDays(15),
        ]);
    }

    public function test_provider_dashboard_returns_enriched_payload(): void
    {
        Sanctum::actingAs($this->providerUser);

        $response = $this->getJson('/api/dashboard/provider');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'total_shipments',
            'total_clients',
            'pending_quotes',
            'unpaid_invoices',
            'shipments_by_status',
            'shipments_by_service',
            'shipments_this_month',
            'shipments_last_month',
            'unassigned_count',
            'missions_today',
            'revenue_this_month',
            'revenue_last_month',
            'unpaid_invoices_total',
            'fleet_summary' => [
                'available_vehicles',
                'mission_vehicles',
                'maintenance_vehicles',
                'hors_service_vehicles',
                'available_drivers',
                'mission_drivers',
                'leave_drivers',
            ],
            'document_alerts',
        ]);
    }

    public function test_provider_dashboard_aggregates_shipments_by_status_recent(): void
    {
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'FRESH-1',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'statut_actuel' => 'livre',
        ]);

        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'FRESH-2',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'France',
            'recipient_city' => 'Lyon',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'statut_actuel' => 'en_cours',
        ]);

        $old = Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'OLD-1',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'Maroc',
            'recipient_city' => 'Rabat',
            'type_service' => 'national',
            'type_colis' => 'paquet',
            'statut_actuel' => 'livre',
        ]);
        $old->created_at = now()->subDays(90);
        $old->updated_at = now()->subDays(90);
        $old->save();

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/dashboard/provider');

        $byStatus = $response->json('shipments_by_status');
        $this->assertEquals(1, $byStatus['livre'] ?? null);
        $this->assertEquals(1, $byStatus['en_cours'] ?? null);
        $this->assertArrayNotHasKey('old', $byStatus);
    }

    public function test_provider_dashboard_aggregates_shipments_by_service(): void
    {
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'N-1',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'Maroc',
            'recipient_city' => 'Rabat',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'N-2',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'Maroc',
            'recipient_city' => 'Fes',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);
        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'F-1',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'fret_aerien',
            'type_colis' => 'paquet',
        ]);

        Sanctum::actingAs($this->providerUser);
        $byService = $this->getJson('/api/dashboard/provider')->json('shipments_by_service');

        $this->assertEquals(2, $byService['national'] ?? null);
        $this->assertEquals(1, $byService['fret_aerien'] ?? null);
    }

    public function test_provider_dashboard_counts_unassigned_shipments(): void
    {
        $s1 = Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'ASSIGNED',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'Maroc',
            'recipient_city' => 'Rabat',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);

        Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => 'UNASSIGNED',
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'R',
            'recipient_country' => 'Maroc',
            'recipient_city' => 'Casa',
            'type_service' => 'national',
            'type_colis' => 'paquet',
        ]);

        $affectation = Affectation::create([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour(),
            'ville_arrivee' => 'Rabat',
            'pays_arrivee' => 'Maroc',
            'statut' => 'planifiee',
            'client_id' => $this->client->id,
        ]);
        AffectationExpedition::create([
            'affectation_id' => $affectation->id,
            'expedition_id' => $s1->id,
        ]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/dashboard/provider');

        $this->assertEquals(1, $response->json('unassigned_count'));
    }

    public function test_provider_dashboard_counts_today_missions(): void
    {
        Affectation::create([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addHour(),
            'ville_arrivee' => 'Rabat',
            'pays_arrivee' => 'Maroc',
            'statut' => 'planifiee',
        ]);

        Affectation::create([
            'provider_id' => $this->provider->id,
            'chauffeur_id' => $this->chauffeur->id,
            'vehicule_id' => $this->vehicule->id,
            'ville_depart' => 'Casa',
            'pays_depart' => 'Maroc',
            'date_heure_depart' => now()->addDays(2),
            'ville_arrivee' => 'Rabat',
            'pays_arrivee' => 'Maroc',
            'statut' => 'planifiee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $this->assertEquals(1, $this->getJson('/api/dashboard/provider')->json('missions_today'));
    }

    public function test_provider_dashboard_returns_revenue_figures(): void
    {
        $year = (int) date('Y');

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 100,
            'annee' => $year,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 1000,
            'tva' => 200,
            'ttc' => 1200,
            'statut' => 'payee',
        ]);

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 200,
            'annee' => $year,
            'date_facture' => now()->subMonth()->toDateString(),
            'date_echeance' => now()->subMonth()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 500,
            'tva' => 100,
            'ttc' => 600,
            'statut' => 'payee',
        ]);

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 300,
            'annee' => $year,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 200,
            'tva' => 40,
            'ttc' => 240,
            'statut' => 'impayee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/dashboard/provider');

        $this->assertEquals(1440.0, (float) $response->json('revenue_this_month'));
        $this->assertEquals(600.0, (float) $response->json('revenue_last_month'));
        $this->assertEquals(240.0, (float) $response->json('unpaid_invoices_total'));
        $this->assertEquals(1, $response->json('unpaid_invoices'));
    }

    public function test_provider_dashboard_returns_fleet_summary(): void
    {
        Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'B-11111',
            'marque_modele' => 'A',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
        ]);
        Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'B-22222',
            'marque_modele' => 'B',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'en_mission',
        ]);

        Chauffeur::create([
            'provider_id' => $this->provider->id,
            'nom_complet' => 'Other Driver',
            'statut' => 'en_mission',
        ]);

        Sanctum::actingAs($this->providerUser);
        $fleet = $this->getJson('/api/dashboard/provider')->json('fleet_summary');

        $this->assertEquals(2, $fleet['available_vehicles']);
        $this->assertEquals(1, $fleet['mission_vehicles']);
        $this->assertEquals(0, $fleet['maintenance_vehicles']);
        $this->assertEquals(1, $fleet['available_drivers']);
        $this->assertEquals(1, $fleet['mission_drivers']);
        $this->assertEquals(0, $fleet['leave_drivers']);
    }

    public function test_provider_dashboard_returns_document_alerts_with_severity(): void
    {
        Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'C-EXPIRED',
            'marque_modele' => 'Ex',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
            'exp_controle_technique' => now()->subDays(5),
        ]);

        Vehicule::create([
            'provider_id' => $this->provider->id,
            'immatriculation' => 'C-SOON',
            'marque_modele' => 'Soon',
            'type_vehicule' => 'camionnette_fourgon_leger',
            'statut' => 'disponible',
            'exp_carte_grise' => now()->addDays(10),
        ]);

        Sanctum::actingAs($this->providerUser);
        $alerts = $this->getJson('/api/dashboard/provider')->json('document_alerts');

        $severities = collect($alerts)->pluck('severity')->all();
        $this->assertContains('danger', $severities);
        $this->assertContains('warning', $severities);

        $labels = collect($alerts)->pluck('label')->all();
        $this->assertContains('Controle technique', $labels);
        $this->assertContains('Carte grise', $labels);
    }

    public function test_provider_dashboard_is_prestataire_only(): void
    {
        $clientUser = User::create([
            'name' => 'C',
            'email' => 'cl@x.com',
            'password' => 'secret',
            'role' => 'client',
        ]);
        Sanctum::actingAs($clientUser);
        $this->getJson('/api/dashboard/provider')->assertStatus(403);
    }

    public function test_provider_dashboard_scopes_to_provider(): void
    {
        $year = (int) date('Y');

        Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'numero_n' => 500,
            'annee' => $year,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 100,
            'tva' => 20,
            'ttc' => 120,
            'statut' => 'impayee',
        ]);
        Facture::create([
            'provider_id' => $this->otherProvider->id,
            'client_id' => null,
            'client_divers_nom' => 'Other Co',
            'numero_n' => 600,
            'annee' => $year,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => 100,
            'tva' => 20,
            'ttc' => 120,
            'statut' => 'impayee',
        ]);

        Sanctum::actingAs($this->providerUser);
        $this->assertEquals(1, $this->getJson('/api/dashboard/provider')->json('unpaid_invoices'));
    }
}
