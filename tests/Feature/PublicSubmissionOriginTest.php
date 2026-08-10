<?php

namespace Tests\Feature;

use App\Models\AccountRequest;
use App\Models\BlockedIp;
use App\Models\Provider;
use App\Models\QuoteRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

// Covers the whole chain: a public submission records where it came from, the
// provider can see that, blocking turns the address away, and unblocking lets
// it back in.
//
// Two themes run through these tests deliberately. First, every failure mode of
// the third-party geolocation API must be a non-event for the provider -- no
// token, a timeout, a 500, all have to leave a readable demande behind. Second,
// the guards against blocking the wrong thing matter as much as the blocking
// itself, so they are asserted just as hard.
class PublicSubmissionOriginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // These tests post to the same public endpoints repeatedly from one
        // address, which is exactly what the throttle exists to stop.
        RateLimiter::clear('');
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        // No test may ever reach the real ipinfo.io. Each test that cares
        // declares its own fake; this is the backstop that turns an
        // accidentally un-faked call into a clear failure rather than a slow,
        // flaky, occasionally-billed test.
        Http::preventStrayRequests();
    }

    private function provider(): Provider
    {
        $user = User::create([
            'role' => 'prestataire',
            'email' => 'presta@test.ma',
            'password_hash' => Hash::make('secret-123'),
            'first_login_completed' => true,
        ]);

        return Provider::create(['user_id' => $user->id, 'company_name' => 'DPEX Test']);
    }

    private function accountRequestPayload(array $overrides = []): array
    {
        return array_merge([
            'full_name' => 'Karim Bennani',
            'email' => 'karim@example.ma',
            'phone' => '0600000000',
            'form_elapsed_ms' => 45000,
        ], $overrides);
    }

    private function quoteRequestPayload(array $overrides = []): array
    {
        return array_merge([
            'client_name' => 'Karim Bennani',
            'client_email' => 'karim@example.ma',
            'client_phone' => '0600000000',
            'recipient_address' => '12 rue des Fleurs',
            'recipient_city' => 'Rabat',
            'recipient_postal_code' => '10000',
            'recipient_country' => 'MA',
            'type_service' => 'national',
            'colis' => [['nb_pieces' => 1, 'poids' => 2, 'longueur' => 10, 'largeur' => 10, 'hauteur' => 10]],
            'form_elapsed_ms' => 45000,
        ], $overrides);
    }

    public function test_account_request_records_the_submitting_ip(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.2'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        $this->assertSame('105.66.1.2', AccountRequest::first()->ip_address);
    }

    public function test_quote_request_records_the_submitting_ip(): void
    {
        $this->provider();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.3'])
            ->postJson('/api/quote-requests', $this->quoteRequestPayload())
            ->assertCreated();

        $this->assertSame('105.66.1.3', QuoteRequest::first()->ip_address);
    }

    // The single most important test in this file. If X-Forwarded-For were
    // trusted by default, a spammer could put any address they liked in this
    // header: they would step around their own block, reset their own rate
    // limit at will, and get their spam recorded against an innocent address
    // that the provider might then block. Trusting nothing by default is what
    // makes a wrong proxy setting merely useless instead of exploitable.
    public function test_forwarded_for_header_is_not_trusted_by_default(): void
    {
        config(['security.trusted_proxies' => null]);

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.4'])
            ->postJson('/api/account-requests', $this->accountRequestPayload(), ['X-Forwarded-For' => '8.8.8.8'])
            ->assertCreated();

        $record = AccountRequest::first();

        $this->assertSame('105.66.1.4', $record->ip_address, 'A forged X-Forwarded-For must never become the recorded address.');

        // Kept anyway, unparsed: on a host where we do not yet know whether a
        // proxy sits in front, this column is the evidence that tells us.
        $this->assertSame('8.8.8.8', $record->ip_forwarded_for);
    }

    public function test_forwarded_for_header_is_used_once_the_proxy_is_trusted(): void
    {
        config(['security.trusted_proxies' => '10.0.0.9']);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.9'])
            ->postJson('/api/account-requests', $this->accountRequestPayload(), ['X-Forwarded-For' => '105.66.1.5'])
            ->assertCreated();

        $this->assertSame('105.66.1.5', AccountRequest::first()->ip_address);
    }

    public function test_filled_honeypot_is_rejected_and_stores_nothing(): void
    {
        $this->postJson('/api/account-requests', $this->accountRequestPayload(['company_website' => 'http://spam.example']))
            ->assertStatus(422);

        $this->assertSame(0, AccountRequest::count());
    }

    public function test_impossibly_fast_submission_is_rejected(): void
    {
        $this->postJson('/api/account-requests', $this->accountRequestPayload(['form_elapsed_ms' => 400]))
            ->assertStatus(422);

        $this->assertSame(0, AccountRequest::count());
    }

    // A visitor on a stale cached bundle would not send the timing field at
    // all. Turning those people away to catch a bot is a bad trade, so absence
    // is recorded as something for the provider to weigh, never acted on.
    public function test_missing_timing_field_is_flagged_but_accepted(): void
    {
        $payload = $this->accountRequestPayload();
        unset($payload['form_elapsed_ms']);

        $this->postJson('/api/account-requests', $payload)->assertCreated();

        $this->assertSame('sans_mesure_de_saisie', AccountRequest::first()->bot_signal);
    }

    public function test_a_normal_submission_carries_no_bot_signal(): void
    {
        $this->postJson('/api/account-requests', $this->accountRequestPayload())->assertCreated();

        $this->assertNull(AccountRequest::first()->bot_signal);
    }

    public function test_blocked_ip_cannot_submit_either_public_form(): void
    {
        $this->provider();
        BlockedIp::create(['ip_address' => '203.0.113.7']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertStatus(403);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->postJson('/api/quote-requests', $this->quoteRequestPayload())
            ->assertStatus(403);

        $this->assertSame(0, AccountRequest::count());
        $this->assertSame(0, QuoteRequest::count());
    }

    public function test_blocking_counts_the_attempts_it_turns_away(): void
    {
        BlockedIp::create(['ip_address' => '203.0.113.8']);

        foreach (range(1, 3) as $ignored) {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.8'])
                ->postJson('/api/account-requests', $this->accountRequestPayload())
                ->assertStatus(403);
        }

        $blocked = BlockedIp::first();
        $this->assertSame(3, $blocked->hits);
        $this->assertNotNull($blocked->last_hit_at);
    }

    public function test_other_addresses_are_unaffected_by_a_block(): void
    {
        BlockedIp::create(['ip_address' => '203.0.113.9']);

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.2.1'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();
    }

    public function test_unblocking_restores_access_immediately(): void
    {
        $blocked = BlockedIp::create(['ip_address' => '203.0.113.10']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertStatus(403);

        // Through the model, so the cache invalidation hook is exercised. A
        // stale blocklist after an unblock is the failure that would leave a
        // real customer shut out with nobody able to work out why.
        $blocked->delete();

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();
    }

    public function test_provider_sees_the_origin_and_location_of_a_demande(): void
    {
        config(['services.ipinfo.token' => 'test-token']);
        Http::fake(['ipinfo.io/*' => Http::response([
            'ip' => '105.66.1.20',
            'city' => 'Casablanca',
            'region' => 'Casablanca-Settat',
            'country' => 'MA',
            'org' => 'AS36903 Maroc Telecom',
        ])]);

        $provider = $this->provider();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.20'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        $response = $this->actingAs($provider->user)
            ->getJson('/api/account-requests/'.AccountRequest::first()->id)
            ->assertOk();

        $response->assertJsonPath('origin.ip_address', '105.66.1.20');
        $response->assertJsonPath('origin.geo.city', 'Casablanca');
        $response->assertJsonPath('origin.geo.country', 'Maroc');
        $response->assertJsonPath('origin.geo.label', 'Casablanca, Maroc');
        $response->assertJsonPath('origin.is_blocked', false);
    }

    // Opening ten demandes from one spam wave must not mean ten API calls.
    public function test_a_location_is_looked_up_once_and_then_cached(): void
    {
        config(['services.ipinfo.token' => 'test-token']);
        Http::fake(['ipinfo.io/*' => Http::response(['city' => 'Casablanca', 'country' => 'MA'])]);

        $provider = $this->provider();

        foreach (range(1, 3) as $ignored) {
            $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.21'])
                ->postJson('/api/account-requests', $this->accountRequestPayload())
                ->assertCreated();
        }

        foreach (AccountRequest::all() as $demande) {
            $this->actingAs($provider->user)->getJson('/api/account-requests/'.$demande->id)->assertOk();
        }

        Http::assertSentCount(1);
    }

    // A geolocation outage must never turn into an error the provider sees.
    // The demande is perfectly readable without a city on it.
    public function test_a_failing_geolocation_api_still_yields_a_readable_demande(): void
    {
        config(['services.ipinfo.token' => 'test-token']);
        Http::fake(['ipinfo.io/*' => Http::response(null, 500)]);

        $provider = $this->provider();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.22'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        $this->actingAs($provider->user)
            ->getJson('/api/account-requests/'.AccountRequest::first()->id)
            ->assertOk()
            ->assertJsonPath('origin.ip_address', '105.66.1.22')
            ->assertJsonPath('origin.geo.label', 'Localisation inconnue');
    }

    public function test_no_api_token_means_no_outbound_call_at_all(): void
    {
        config(['services.ipinfo.token' => null]);

        $provider = $this->provider();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.23'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        $this->actingAs($provider->user)
            ->getJson('/api/account-requests/'.AccountRequest::first()->id)
            ->assertOk()
            ->assertJsonPath('origin.geo.status', 'unconfigured');

        // preventStrayRequests() in setUp would have failed the test on any
        // outbound call; this states the intent explicitly.
        Http::assertNothingSent();
    }

    // Submitting a form must never wait on a third party. If it did, ipinfo
    // having a bad day would mean our public forms hang or fail.
    public function test_submitting_never_calls_the_geolocation_api(): void
    {
        config(['services.ipinfo.token' => 'test-token']);
        Http::fake();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.1.24'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        Http::assertNothingSent();
    }

    public function test_provider_can_block_and_unblock_an_address(): void
    {
        config(['services.ipinfo.token' => null]);
        $provider = $this->provider();

        $this->actingAs($provider->user)
            ->postJson('/api/provider/blocked-ips', ['ip_address' => '203.0.113.20', 'reason' => 'Spam repete'])
            ->assertCreated();

        $this->actingAs($provider->user)
            ->getJson('/api/provider/blocked-ips')
            ->assertOk()
            ->assertJsonPath('data.0.ip_address', '203.0.113.20')
            ->assertJsonPath('data.0.reason', 'Spam repete')
            ->assertJsonPath('data.0.hits', 0);

        $this->actingAs($provider->user)
            ->deleteJson('/api/provider/blocked-ips/'.BlockedIp::first()->id)
            ->assertOk();

        $this->assertSame(0, BlockedIp::count());
    }

    public function test_provider_cannot_block_their_own_address(): void
    {
        $provider = $this->provider();

        $this->actingAs($provider->user)
            ->withServerVariables(['REMOTE_ADDR' => '105.66.3.1'])
            ->postJson('/api/provider/blocked-ips', ['ip_address' => '105.66.3.1'])
            ->assertStatus(422);

        $this->assertSame(0, BlockedIp::count());
    }

    // A private address on a demande means an unconfigured proxy, not a
    // visitor. In that state every visitor shares it, so blocking it would turn
    // the whole public site off at once.
    public function test_provider_cannot_block_a_private_address(): void
    {
        $provider = $this->provider();

        foreach (['127.0.0.1', '192.168.1.4', '10.0.0.3'] as $ip) {
            $this->actingAs($provider->user)
                ->postJson('/api/provider/blocked-ips', ['ip_address' => $ip])
                ->assertStatus(422);
        }

        $this->assertSame(0, BlockedIp::count());
    }

    public function test_blocking_the_same_address_twice_is_refused(): void
    {
        config(['services.ipinfo.token' => null]);
        $provider = $this->provider();

        $this->actingAs($provider->user)
            ->postJson('/api/provider/blocked-ips', ['ip_address' => '203.0.113.21'])
            ->assertCreated();

        $this->actingAs($provider->user)
            ->postJson('/api/provider/blocked-ips', ['ip_address' => '203.0.113.21'])
            ->assertStatus(422);
    }

    // The evidence that makes a block a decision rather than a reflex: an
    // address that has already produced real business should say so loudly
    // before the provider cuts it off.
    public function test_origin_reports_how_much_real_business_came_from_the_address(): void
    {
        config(['services.ipinfo.token' => null]);
        $provider = $this->provider();

        foreach (range(1, 2) as $ignored) {
            $this->withServerVariables(['REMOTE_ADDR' => '105.66.4.1'])
                ->postJson('/api/account-requests', $this->accountRequestPayload())
                ->assertCreated();
        }

        AccountRequest::first()->update(['statut' => 'approuvee']);

        $this->actingAs($provider->user)
            ->getJson('/api/account-requests/'.AccountRequest::latest('id')->first()->id)
            ->assertOk()
            ->assertJsonPath('origin.history.total_requests', 2)
            ->assertJsonPath('origin.history.accepted_requests', 1);
    }

    public function test_visitor_addresses_do_not_leak_into_list_payloads(): void
    {
        config(['services.ipinfo.token' => null]);
        $provider = $this->provider();

        $this->withServerVariables(['REMOTE_ADDR' => '105.66.5.1'])
            ->postJson('/api/account-requests', $this->accountRequestPayload())
            ->assertCreated();

        $this->actingAs($provider->user)
            ->getJson('/api/account-requests')
            ->assertOk()
            ->assertJsonMissing(['ip_address' => '105.66.5.1']);
    }

    // Blocking targets form spam. Tracking is the one public feature a real
    // customer genuinely needs, and Moroccan carriers put thousands of
    // subscribers behind one address, so a block squeezes tracking rather than
    // severing it.
    public function test_a_blocked_address_can_still_track_a_parcel(): void
    {
        BlockedIp::create(['ip_address' => '203.0.113.30']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.30'])
            ->getJson('/api/shipments/000000000/tracking')
            ->assertStatus(404);
    }
}
