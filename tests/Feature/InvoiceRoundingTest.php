<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le trajet complet du montant : ce que l'ecran de creation annonce doit etre ce
 * que l'API enregistre, et ce que la page de detail relit. Le test unitaire
 * (tests/Unit/FiscalCalculatorTest.php) verifie la regle d'arrondi elle-meme ;
 * celui-ci verifie qu'aucune couche entre les deux ne la deforme.
 */
class InvoiceRoundingTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;

    protected Provider $provider;

    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider User',
            'email' => 'provider@rounding.test',
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
            'email' => 'p@rounding.test',
            'ice' => '001',
        ]);

        $clientUser = User::create([
            'name' => 'Client User',
            'email' => 'c@rounding.test',
            'password' => bcrypt('secret'),
            'role' => 'client',
        ]);

        $this->client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $clientUser->id,
            'account_number' => '702448',
            'full_name' => 'Moroccan Made',
            'email' => 'c@rounding.test',
            'phone' => '+212600000001',
            'address' => 'Y',
            'city' => 'Marrakech',
            'country' => 'Maroc',
        ]);
    }

    private function makeShipment(): Shipment
    {
        return Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $this->client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => '111999500',
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
        ]);
    }

    /**
     * Cas FE 222/2026 : base saisie a 3 decimales. L'ecran de creation annonce
     * 435,00 ; l'API enregistrait 435,01 et la page de detail affichait donc un
     * centime de plus que ce que le provider avait valide.
     */
    public function test_three_decimal_base_is_stored_and_returned_as_the_creation_screen_showed_it(): void
    {
        $shipment = $this->makeShipment();

        $created = $this->actingAs($this->providerUser, 'sanctum')->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'expedition_ids' => [$shipment->id],
            'numero_n' => 222,
            'date_facture' => now()->toDateString(),
            'date_echeance' => now()->addDays(30)->toDateString(),
            'type_destination' => 'international',
            'taxable' => 86.825,
            'non_taxable' => 330.81,
        ]);

        $created->assertStatus(201);
        $factureId = $created->json('facture.id');

        $this->assertDatabaseHas('factures', [
            'id' => $factureId,
            'non_taxable' => 330.81,
            'taxable' => 86.83,
            'tva' => 17.37,
            'ttc' => 435.00,
        ]);

        // Ce que la page de detail relit.
        $detail = $this->actingAs($this->providerUser, 'sanctum')->getJson("/api/invoices/{$factureId}");

        $detail->assertStatus(200);
        $this->assertSame(435.00, (float) $detail->json('ttc'));
        $this->assertSame(17.37, (float) $detail->json('tva'));
        $this->assertSame(86.83, (float) $detail->json('taxable'));
        $this->assertSame(330.81, (float) $detail->json('non_taxable'));
    }
}
