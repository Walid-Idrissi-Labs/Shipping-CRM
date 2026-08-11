<?php

namespace Tests\Feature;

use App\Models\Avoir;
use App\Models\Client;
use App\Models\Facture;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientUnpaidBalanceTest extends TestCase
{
    use RefreshDatabase;

    private User $providerUser;

    private Provider $provider;

    private int $seq = 0;

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

    private function makeClient(string $name, string $email): Client
    {
        $user = User::create([
            'email' => $email,
            'password' => bcrypt('secret123'),
            'role' => 'client',
        ]);

        return Client::create([
            'user_id' => $user->id,
            'provider_id' => $this->provider->id,
            'account_number' => str_pad((string) (++$this->seq), 6, '0', STR_PAD_LEFT),
            'full_name' => $name,
            'email' => $email,
        ]);
    }

    private function makeFacture(Client $client, float $ttc, string $statut): Facture
    {
        return Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $client->id,
            'numero_n' => ++$this->seq,
            'annee' => 2026,
            'date_facture' => '2026-01-01',
            'date_echeance' => '2026-02-01',
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => round($ttc / 1.2, 2),
            'tva' => round($ttc - ($ttc / 1.2), 2),
            'ttc' => $ttc,
            'statut' => $statut,
        ]);
    }

    /** Avoirs are stored with a negative TTC (FiscalCalculator::computeNegative). */
    private function makeAvoir(Facture $facture, float $ttc): Avoir
    {
        return Avoir::create([
            'provider_id' => $this->provider->id,
            'client_id' => $facture->client_id,
            'facture_id' => $facture->id,
            'numero_n' => ++$this->seq,
            'annee' => 2026,
            'type_destination' => 'national',
            'taux_tva' => 20,
            'taxable' => -abs(round($ttc / 1.2, 2)),
            'tva' => -abs(round($ttc - ($ttc / 1.2), 2)),
            'ttc' => -abs($ttc),
        ]);
    }

    private function balances(array $query = []): array
    {
        Sanctum::actingAs($this->providerUser);
        $response = $this->getJson('/api/clients?'.http_build_query($query));
        $response->assertOk();

        return collect($response->json('data'))
            ->mapWithKeys(fn ($c) => [$c['full_name'] => (float) $c['impayee_ttc']])
            ->all();
    }

    public function test_balance_sums_only_unpaid_invoices(): void
    {
        $client = $this->makeClient('Solde Mixte', 'mixte@test.ma');
        $this->makeFacture($client, 1200.00, 'impayee');
        $this->makeFacture($client, 300.50, 'impayee');
        $this->makeFacture($client, 999.99, 'payee');

        $this->assertEquals(1500.50, $this->balances()['Solde Mixte']);
    }

    public function test_avoir_is_netted_against_an_unpaid_parent_invoice(): void
    {
        $client = $this->makeClient('Avec Avoir', 'avoir@test.ma');
        $facture = $this->makeFacture($client, 1000.00, 'impayee');
        $this->makeAvoir($facture, 250.00);

        $this->assertEquals(750.00, $this->balances()['Avec Avoir']);
    }

    public function test_avoir_on_a_paid_invoice_does_not_reduce_the_balance(): void
    {
        $client = $this->makeClient('Avoir Paye', 'avoirpaye@test.ma');
        $unpaid = $this->makeFacture($client, 400.00, 'impayee');
        $paid = $this->makeFacture($client, 800.00, 'payee');
        $this->makeAvoir($paid, 800.00);

        $this->assertEquals(400.00, $this->balances()['Avoir Paye']);
        $this->assertNotNull($unpaid->id);
    }

    public function test_client_without_invoices_has_a_zero_balance(): void
    {
        $this->makeClient('Sans Facture', 'vide@test.ma');

        $this->assertSame(0.0, $this->balances()['Sans Facture']);
    }

    public function test_balance_matches_the_client_detail_entries_total(): void
    {
        $client = $this->makeClient('Croisement', 'croise@test.ma');
        $facture = $this->makeFacture($client, 1272.28, 'impayee');
        $this->makeFacture($client, 46.88, 'impayee');
        $this->makeFacture($client, 500.00, 'payee');
        $this->makeAvoir($facture, 120.00);

        Sanctum::actingAs($this->providerUser);
        $entries = $this->getJson("/api/clients/{$client->id}/invoices-entries")->assertOk()->json('data');

        // Same reduction as ClientDetail.jsx -> netTtcImpaye.
        $expected = collect($entries)
            ->filter(fn ($e) => ($e['statut'] ?? null) === 'impayee')
            ->reduce(fn ($sum, $e) => $sum + ($e['kind'] === 'avoir' ? -1 : 1) * abs((float) $e['ttc']), 0.0);

        $this->assertEqualsWithDelta($expected, $this->balances()['Croisement'], 0.005);
        $this->assertEqualsWithDelta(1199.16, $expected, 0.005);
    }

    public function test_balance_is_sortable_in_both_directions(): void
    {
        $low = $this->makeClient('Petit Solde', 'low@test.ma');
        $high = $this->makeClient('Gros Solde', 'high@test.ma');
        $zero = $this->makeClient('Solde Zero', 'zero@test.ma');
        $this->makeFacture($low, 100.00, 'impayee');
        $this->makeFacture($high, 9000.00, 'impayee');
        $this->makeFacture($zero, 700.00, 'payee');

        $asc = array_keys($this->balances(['sort_by' => 'impayee_ttc', 'sort_dir' => 'asc']));
        $this->assertSame(['Solde Zero', 'Petit Solde', 'Gros Solde'], $asc);

        $desc = array_keys($this->balances(['sort_by' => 'impayee_ttc', 'sort_dir' => 'desc']));
        $this->assertSame(['Gros Solde', 'Petit Solde', 'Solde Zero'], $desc);
    }

    public function test_client_list_search_still_works_with_the_computed_column(): void
    {
        $this->makeClient('Rachid Cherkaoui', 'rachid@test.ma');
        $this->makeClient('Autre Personne', 'autre@test.ma');

        $balances = $this->balances(['search' => 'cherkaoui']);
        $this->assertSame(['Rachid Cherkaoui'], array_keys($balances));
    }

    public function test_client_list_exposes_the_provider_threshold(): void
    {
        Sanctum::actingAs($this->providerUser);
        // Numeric, not a string: MySQL would otherwise hand back "5000.00".
        $default = $this->getJson('/api/clients')->json('unpaid_alert_threshold');
        $this->assertIsNumeric($default);
        $this->assertEquals(5000, $default);

        $this->provider->update(['unpaid_alert_threshold' => 1500]);
        // Fresh instance: acting as the same in-memory user would reuse its
        // already-loaded `provider` relation and hide the update.
        Sanctum::actingAs($this->providerUser->fresh());
        $this->assertEquals(1500, $this->getJson('/api/clients')->json('unpaid_alert_threshold'));
    }

    public function test_settings_endpoint_persists_the_threshold(): void
    {
        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'unpaid_alert_threshold' => 12000.50,
        ])->assertOk();

        $this->provider->refresh();
        $this->assertEquals(12000.50, $this->provider->unpaid_alert_threshold);
        $this->assertEquals(12000.50, $this->getJson('/api/provider/settings')->json('unpaid_alert_threshold'));
    }

    public function test_negative_threshold_is_rejected(): void
    {
        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/provider/settings', [
            'company_name' => 'Test Express',
            'country' => 'Maroc',
            'login_email' => 'prov@test.ma',
            'unpaid_alert_threshold' => -1,
        ])->assertStatus(422);
    }
}
