<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiCacheHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_api_response_is_not_cacheable(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'cache-check@x.com',
            'password' => bcrypt('secret'),
            'role' => 'prestataire',
        ]);

        // A Referer matching sanctum.stateful triggers Sanctum's nested
        // stateful-request pipeline (StartSession, VerifyCsrfToken, ...),
        // which is what a real logged-in browser request looks like.
        $response = $this->actingAs($user)
            ->withHeader('Referer', 'http://localhost:8000/dashboard')
            ->getJson('/api/auth/me');

        $response->assertHeader('Pragma', 'no-cache');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-cache', $response->headers->get('Cache-Control'));
    }
}
