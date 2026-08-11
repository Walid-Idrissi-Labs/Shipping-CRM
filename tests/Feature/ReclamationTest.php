<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Facture;
use App\Models\Provider;
use App\Models\Reclamation;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReclamationTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerUser;

    protected Provider $provider;

    protected User $clientUser;

    protected Client $client;

    protected User $otherClientUser;

    protected Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->providerUser = User::create([
            'name' => 'Provider',
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

        // Six digits, matching the real generateAccountNumber() format: the
        // column is char(6), which sqlite ignores and MySQL truncates on.
        [$this->clientUser, $this->client] = $this->makeClient('alice@x.com', 'Alice Client', '100001');
        [$this->otherClientUser, $this->otherClient] = $this->makeClient('bob@x.com', 'Bob Other', '100002');
    }

    // ============ Client side ============

    public function test_client_opens_a_thread_and_gets_a_reference(): void
    {
        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/my/reclamations', [
            'type' => 'reclamation',
            'sujet' => 'Colis endommagé à la livraison',
            'message' => 'Le carton est arrivé ouvert et un article manque.',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('statut', 'ouverte');
        $response->assertJsonPath('reference', 'REC-' . now()->year . '-0001');
        $response->assertJsonPath('messages.0.author_role', 'client');
        $response->assertJsonPath('messages.0.author_name', 'Alice Client');
        $this->assertSame(1, $response->json('messages_count'));
    }

    public function test_references_increment_per_thread(): void
    {
        Sanctum::actingAs($this->clientUser);

        foreach (['Un', 'Deux', 'Trois'] as $sujet) {
            $this->postJson('/api/my/reclamations', [
                'type' => 'remarque',
                'sujet' => $sujet,
                'message' => 'Contenu du message.',
            ])->assertStatus(201);
        }

        $this->assertSame(
            ['REC-' . now()->year . '-0001', 'REC-' . now()->year . '-0002', 'REC-' . now()->year . '-0003'],
            Reclamation::orderBy('id')->pluck('reference')->all(),
        );
    }

    public function test_client_can_attach_their_own_shipment(): void
    {
        $shipment = $this->makeShipment($this->client, '100000001');

        Sanctum::actingAs($this->clientUser);

        $response = $this->postJson('/api/my/reclamations', [
            'type' => 'reclamation',
            'sujet' => 'Retard',
            'message' => 'Toujours pas livré.',
            'subject_type' => 'shipment',
            'subject_id' => $shipment->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('subject_label', 'Expédition 100000001');
        $response->assertJsonPath('subject_link', '/client/mes-expeditions/' . $shipment->id);
    }

    public function test_client_cannot_attach_another_clients_shipment(): void
    {
        $foreign = $this->makeShipment($this->otherClient, '900000999');

        Sanctum::actingAs($this->clientUser);

        $this->postJson('/api/my/reclamations', [
            'type' => 'reclamation',
            'sujet' => 'Curiosité',
            'message' => 'Je tente ma chance.',
            'subject_type' => 'shipment',
            'subject_id' => $foreign->id,
        ])->assertStatus(422)->assertJsonValidationErrors('subject_id');

        $this->assertSame(0, Reclamation::count());
    }

    public function test_client_cannot_attach_another_clients_facture(): void
    {
        $foreign = $this->makeFacture($this->otherClient, 7);

        Sanctum::actingAs($this->clientUser);

        $this->postJson('/api/my/reclamations', [
            'type' => 'reclamation',
            'sujet' => 'Facturation',
            'message' => 'Montant incorrect.',
            'subject_type' => 'facture',
            'subject_id' => $foreign->id,
        ])->assertStatus(422)->assertJsonValidationErrors('subject_id');
    }

    public function test_client_cannot_read_another_clients_thread(): void
    {
        $thread = $this->openThread($this->otherClient, $this->otherClientUser);

        Sanctum::actingAs($this->clientUser);

        $this->getJson('/api/my/reclamations/' . $thread->id)->assertStatus(403);
        $this->postJson('/api/my/reclamations/' . $thread->id . '/messages', [
            'corps' => 'Bonjour ?',
        ])->assertStatus(403);
    }

    public function test_client_list_only_shows_their_own_threads(): void
    {
        $this->openThread($this->client, $this->clientUser, 'Le mien');
        $this->openThread($this->otherClient, $this->otherClientUser, 'Pas le mien');

        Sanctum::actingAs($this->clientUser);

        $response = $this->getJson('/api/my/reclamations');

        $response->assertStatus(200);
        $this->assertSame(1, $response->json('total'));
        $response->assertJsonPath('data.0.sujet', 'Le mien');
    }

    public function test_subjects_endpoint_lists_only_the_callers_records(): void
    {
        $this->makeShipment($this->client, '100000777');
        $this->makeShipment($this->otherClient, '900000888');
        $this->makeFacture($this->client, 1);
        $this->makeFacture($this->otherClient, 2);

        Sanctum::actingAs($this->clientUser);

        $response = $this->getJson('/api/my/reclamations/subjects');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('shipments'));
        $this->assertStringContainsString('100000777', $response->json('shipments.0.label'));
        $this->assertCount(1, $response->json('invoices'));
    }

    // ============ Provider side ============

    public function test_provider_sees_the_thread_and_can_reply(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser, 'Colis abîmé');

        Sanctum::actingAs($this->providerUser);

        $show = $this->getJson('/api/reclamations/' . $thread->id);
        $show->assertStatus(200);
        $show->assertJsonPath('client.full_name', 'Alice Client');
        // Sent before the read mark is stamped, so the badge the inbox showed
        // is still what the detail page reports.
        $this->assertSame(1, $show->json('unread_count'));

        $reply = $this->postJson('/api/reclamations/' . $thread->id . '/messages', [
            'corps' => 'Bonjour, nous ouvrons une enquête auprès du transporteur.',
        ]);

        $reply->assertStatus(201);
        $reply->assertJsonPath('author_role', 'prestataire');
        $reply->assertJsonPath('author_name', 'Notre équipe');

        // Answering an untouched thread advances it on its own.
        $this->assertSame('en_traitement', $thread->fresh()->statut);
    }

    public function test_reading_a_thread_clears_its_unread_count(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser);

        Sanctum::actingAs($this->providerUser);

        $this->getJson('/api/reclamations/' . $thread->id)->assertStatus(200);
        $this->assertSame(0, $this->getJson('/api/reclamations/' . $thread->id)->json('unread_count'));
    }

    public function test_provider_reply_shows_as_unread_for_the_client(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser);

        Sanctum::actingAs($this->providerUser);
        $this->postJson('/api/reclamations/' . $thread->id . '/messages', ['corps' => 'Réponse.'])
            ->assertStatus(201);

        Sanctum::actingAs($this->clientUser);
        $this->assertSame(1, $this->getJson('/api/my/reclamations/unread-count')->json('count'));

        $this->getJson('/api/my/reclamations/' . $thread->id)->assertStatus(200);
        $this->assertSame(0, $this->getJson('/api/my/reclamations/unread-count')->json('count'));
    }

    public function test_client_reply_reopens_a_resolved_thread(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser);

        Sanctum::actingAs($this->providerUser);
        $this->patchJson('/api/reclamations/' . $thread->id . '/status', ['statut' => 'resolue'])
            ->assertStatus(200)
            ->assertJsonPath('statut', 'resolue');

        Sanctum::actingAs($this->clientUser);
        $this->postJson('/api/my/reclamations/' . $thread->id . '/messages', [
            'corps' => 'Le problème est revenu.',
        ])->assertStatus(201);

        $this->assertSame('en_traitement', $thread->fresh()->statut);
    }

    public function test_pending_counts_flags_threads_awaiting_a_reply(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser);

        Sanctum::actingAs($this->providerUser);
        $this->assertSame(1, $this->getJson('/api/dashboard/pending-counts')->json('reclamations'));

        $this->getJson('/api/reclamations/' . $thread->id);
        $this->assertSame(0, $this->getJson('/api/dashboard/pending-counts')->json('reclamations'));

        // The regression this guards: the read mark and the next client message
        // can land in the same second, so a timestamp comparison would report
        // nothing new and the badge would never come back.
        Sanctum::actingAs($this->clientUser);
        $this->postJson('/api/my/reclamations/' . $thread->id . '/messages', ['corps' => 'Encore un mot.']);

        Sanctum::actingAs($this->providerUser);
        $this->assertSame(1, $this->getJson('/api/dashboard/pending-counts')->json('reclamations'));
    }

    public function test_provider_cannot_reach_another_providers_thread(): void
    {
        $otherProviderUser = User::create([
            'name' => 'Rival',
            'email' => 'rival@x.com',
            'password' => 'secret',
            'role' => 'prestataire',
        ]);
        $otherProvider = Provider::create([
            'user_id' => $otherProviderUser->id,
            'company_name' => 'Rival Co',
            'city' => 'Rabat',
            'country' => 'Maroc',
        ]);

        $thread = $this->openThread($this->client, $this->clientUser);
        $thread->update(['provider_id' => $otherProvider->id]);

        Sanctum::actingAs($this->providerUser);

        $this->getJson('/api/reclamations/' . $thread->id)->assertStatus(403);
        $this->patchJson('/api/reclamations/' . $thread->id . '/status', ['statut' => 'resolue'])
            ->assertStatus(403);
    }

    // ============ Validation ============

    public function test_a_client_cannot_open_a_thread_with_an_unknown_type_or_empty_body(): void
    {
        Sanctum::actingAs($this->clientUser);

        $this->postJson('/api/my/reclamations', [
            'type' => 'plainte',
            'sujet' => 'X',
            'message' => 'Y',
        ])->assertStatus(422)->assertJsonValidationErrors('type');

        $this->postJson('/api/my/reclamations', [
            'type' => 'remarque',
            'sujet' => '   ',
            'message' => '',
        ])->assertStatus(422)->assertJsonValidationErrors(['sujet', 'message']);

        $this->postJson('/api/my/reclamations', [
            'type' => 'remarque',
            'sujet' => str_repeat('a', 151),
            'message' => str_repeat('b', 4001),
        ])->assertStatus(422)->assertJsonValidationErrors(['sujet', 'message']);
    }

    public function test_a_provider_cannot_set_an_unknown_status(): void
    {
        $thread = $this->openThread($this->client, $this->clientUser);

        Sanctum::actingAs($this->providerUser);

        $this->patchJson('/api/reclamations/' . $thread->id . '/status', ['statut' => 'archivee'])
            ->assertStatus(422)->assertJsonValidationErrors('statut');
    }

    public function test_a_provider_cannot_open_a_thread(): void
    {
        Sanctum::actingAs($this->providerUser);

        // There is no provider-side store route at all -- opening a thread is
        // the client's act by design.
        $this->postJson('/api/reclamations', [
            'type' => 'remarque',
            'sujet' => 'X',
            'message' => 'Y',
        ])->assertStatus(405);
    }

    // ============ Helpers ============

    /** @return array{0: User, 1: Client} */
    private function makeClient(string $email, string $name, string $account): array
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => 'secret',
            'role' => 'client',
            'password_hash' => Hash::make('secret'),
        ]);

        $client = Client::create([
            'provider_id' => $this->provider->id,
            'user_id' => $user->id,
            'account_number' => $account,
            'full_name' => $name,
            'email' => $email,
            'city' => 'Casablanca',
            'country' => 'Maroc',
        ]);

        return [$user, $client];
    }

    private function makeShipment(Client $client, string $number): Shipment
    {
        return Shipment::create([
            'provider_id' => $this->provider->id,
            'client_id' => $client->id,
            'created_by' => $this->providerUser->id,
            'shipping_number' => $number,
            'sender_name' => 'S',
            'sender_country' => 'Maroc',
            'recipient_name' => 'Destinataire',
            'recipient_country' => 'France',
            'recipient_city' => 'Paris',
            'type_service' => 'international_express_dap',
            'type_colis' => 'paquet',
        ]);
    }

    private function makeFacture(Client $client, int $numero): Facture
    {
        return Facture::create([
            'provider_id' => $this->provider->id,
            'client_id' => $client->id,
            'numero_n' => $numero,
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
    }

    private function openThread(Client $client, User $user, string $sujet = 'Sujet de test'): Reclamation
    {
        Sanctum::actingAs($user);

        $id = $this->postJson('/api/my/reclamations', [
            'type' => 'reclamation',
            'sujet' => $sujet,
            'message' => 'Description du problème.',
        ])->assertStatus(201)->json('id');

        return Reclamation::findOrFail($id);
    }
}
