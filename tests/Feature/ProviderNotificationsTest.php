<?php

namespace Tests\Feature;

use App\Models\AccountRequest;
use App\Models\ExpeditionRequest;
use App\Models\Provider;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $providerAUser;

    protected Provider $providerA;

    protected User $providerBUser;

    protected Provider $providerB;

    protected function setUp(): void
    {
        parent::setUp();

        [$this->providerAUser, $this->providerA] = $this->makeProvider('a');
        [$this->providerBUser, $this->providerB] = $this->makeProvider('b');
    }

    private function makeProvider(string $suffix): array
    {
        $user = User::create([
            'name' => "Provider {$suffix}",
            'email' => "provider{$suffix}@x.com",
            'password' => 'secret',
            'role' => 'prestataire',
        ]);

        $provider = Provider::create([
            'user_id' => $user->id,
            'company_name' => "Co {$suffix}",
            'city' => 'Casa',
            'country' => 'Maroc',
        ]);

        return [$user, $provider];
    }

    private function makeQuoteRequest(Provider $provider, string $statut = 'en_attente'): QuoteRequest
    {
        return QuoteRequest::create([
            'provider_id' => $provider->id,
            'client_name' => 'Jean Dupont',
            'recipient_address' => 'Somewhere',
            'recipient_city' => 'Lyon',
            'recipient_postal_code' => '69000',
            'recipient_country' => 'France',
            'type_service' => 'national',
            'statut' => $statut,
        ]);
    }

    private function makeExpeditionRequest(Provider $provider, string $statut = 'en_attente'): ExpeditionRequest
    {
        $quote = Quote::create([
            'provider_id' => $provider->id,
            'quote_year' => 2026,
            'quote_sequence' => random_int(1, 1000000),
            'quote_number' => 'DE ' . random_int(1, 1000000) . '/2026',
            'statut' => 'envoye',
            'type_service' => 'national',
            'client_name' => 'Client Test',
            'client_email' => 'client@test.com',
            'client_phone' => '+212600000000',
            'recipient_name' => 'Recipient A',
        ]);

        return ExpeditionRequest::create([
            'quote_id' => $quote->id,
            'provider_id' => $provider->id,
            'token' => bin2hex(random_bytes(8)),
            'sender_name' => 'Sender A',
            'recipient_name' => 'Recipient A',
            'type_service' => 'national',
            'statut' => $statut,
        ]);
    }

    public function test_pending_counts_are_scoped_per_provider(): void
    {
        $this->makeQuoteRequest($this->providerA);
        $this->makeQuoteRequest($this->providerA, 'traitee');
        $this->makeQuoteRequest($this->providerB);

        $this->makeExpeditionRequest($this->providerA);
        $this->makeExpeditionRequest($this->providerB);
        $this->makeExpeditionRequest($this->providerB);

        AccountRequest::create(['full_name' => 'Someone', 'statut' => 'en_attente']);
        AccountRequest::create(['full_name' => 'Someone else', 'statut' => 'approuvee']);

        Sanctum::actingAs($this->providerAUser);
        $response = $this->getJson('/api/dashboard/pending-counts');

        $response->assertStatus(200)->assertJson([
            'quote_requests' => 1,
            'account_requests' => 1,
            'expedition_requests' => 1,
        ]);

        Sanctum::actingAs($this->providerBUser);
        $this->getJson('/api/dashboard/pending-counts')->assertJson([
            'quote_requests' => 1,
            'expedition_requests' => 2,
        ]);
    }

    public function test_quote_request_reject_marks_refusee_without_deleting_and_clears_pending_count(): void
    {
        $quoteRequest = $this->makeQuoteRequest($this->providerA);

        Sanctum::actingAs($this->providerAUser);

        $this->getJson('/api/dashboard/pending-counts')->assertJson(['quote_requests' => 1]);

        $response = $this->postJson("/api/quote-requests/{$quoteRequest->id}/reject");
        $response->assertStatus(200);

        $this->assertDatabaseHas('quote_requests', [
            'id' => $quoteRequest->id,
            'statut' => 'refusee',
        ]);

        $this->getJson('/api/dashboard/pending-counts')->assertJson(['quote_requests' => 0]);

        // Already-treated requests cannot be rejected again.
        $this->postJson("/api/quote-requests/{$quoteRequest->id}/reject")->assertStatus(422);
    }

    public function test_quote_request_reject_is_scoped_to_owning_provider(): void
    {
        $quoteRequest = $this->makeQuoteRequest($this->providerA);

        Sanctum::actingAs($this->providerBUser);
        $this->postJson("/api/quote-requests/{$quoteRequest->id}/reject")->assertStatus(403);
    }

    public function test_account_request_force_delete_requires_rejected_status(): void
    {
        $pending = AccountRequest::create(['full_name' => 'Pending Guy', 'statut' => 'en_attente']);

        Sanctum::actingAs($this->providerAUser);

        $this->deleteJson("/api/account-requests/{$pending->id}/force")->assertStatus(422);
        $this->assertDatabaseHas('account_requests', ['id' => $pending->id]);

        $pending->update(['statut' => 'rejetee']);

        $this->deleteJson("/api/account-requests/{$pending->id}/force")->assertStatus(200);
        $this->assertDatabaseMissing('account_requests', ['id' => $pending->id]);
    }

    public function test_dashboard_notifications_feed_includes_recent_requests_only(): void
    {
        // created_at is not mass-assignable on QuoteRequest, so backdate via
        // forceFill to bypass the Fillable guard.
        $recent = $this->makeQuoteRequest($this->providerA);
        $recent->forceFill(['created_at' => now()->subDays(2)])->save();

        $old = $this->makeQuoteRequest($this->providerA);
        $old->forceFill(['created_at' => now()->subDays(10)])->save();

        $otherProvider = $this->makeQuoteRequest($this->providerB);
        $otherProvider->forceFill(['created_at' => now()->subDay()])->save();

        Sanctum::actingAs($this->providerAUser);
        $response = $this->getJson('/api/dashboard/provider');

        $response->assertStatus(200);
        $ids = collect($response->json('notifications'))
            ->where('type', 'quote_request')
            ->pluck('id')
            ->toArray();

        $this->assertContains($recent->id, $ids);
        $this->assertNotContains($old->id, $ids);
        $this->assertNotContains($otherProvider->id, $ids);
    }
}
