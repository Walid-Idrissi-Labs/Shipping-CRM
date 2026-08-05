<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\Client;
use App\Models\User;
use App\Services\ClientActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $identifier = $request->input('identifier');
        $password = $request->input('password');

        $user = $this->resolveUser($identifier);

        if (! $user) {
            return response()->json(['message' => 'Identifiants incorrects. Veuillez reessayer.'], 401);
        }

        if (! $this->verifyPassword($user, $password)) {
            return response()->json(['message' => 'Identifiants incorrects. Veuillez reessayer.'], 401);
        }

        $remember = $request->boolean('remember');

        // Without "remember me" the 2h SESSION_LIFETIME governs, and the SPA
        // now redirects to /login when it lapses. With it, Laravel falls back
        // to the remember cookie and mints a fresh session transparently — but
        // its default lifetime is 576000 minutes (~400 days, see
        // SessionGuard::$rememberDuration), which is far longer than this app
        // wants. Cap it at a week. Auth::login() below resolves to this same
        // cached 'web' guard instance, so the duration set here applies.
        if ($remember) {
            Auth::guard('web')->setRememberDuration(60 * 24 * 7);
        }

        Auth::login($user, $remember);

        if ($user->role === 'client' && ! $user->first_login_completed) {
            $user->update(['first_login_completed' => true]);
        }

        if ($user->role === 'client' && $user->client) {
            ClientActivityLogger::log($user->client, 'login', 'Connexion au compte');
        }

        return response()->json([
            'user' => $this->userResponse($user),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Deconnecte.'])
            ->withCookie(cookie()->forget(config('session.cookie')))
            ->withCookie(cookie()->forget('XSRF-TOKEN'));
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user ? $this->userResponse($user) : null,
        ]);
    }

    private function resolveUser(string $identifier): ?User
    {
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return User::where('email', $identifier)->first();
        }

        if (preg_match('/^\d{6}$/', $identifier)) {
            $client = Client::where('account_number', $identifier)->with('user')->first();
            if ($client?->user) {
                return $client->user;
            }

            return User::where('email', $identifier)->first();
        }

        $client = Client::where('phone', $identifier)->with('user')->first();
        if ($client?->user) {
            return $client->user;
        }

        return User::where('email', $identifier)->first();
    }

    private function verifyPassword(User $user, string $password): bool
    {
        if ($user->password_hash && Hash::check($password, $user->password_hash)) {
            return true;
        }

        if ($user->origin_password_hash && Hash::check($password, $user->origin_password_hash)) {
            return true;
        }

        return false;
    }

    private function userResponse(User $user): array
    {
        $data = [
            'id' => $user->id,
            'role' => $user->role,
            'email' => $user->email,
            'first_login_completed' => $user->first_login_completed,
        ];

        if ($user->role === 'client' && $user->client) {
            $data['client'] = [
                'id' => $user->client->id,
                'account_number' => $user->client->account_number,
                'full_name' => $user->client->full_name,
                'email' => $user->client->email,
                'phone' => $user->client->phone,
                'address' => $user->client->address,
                'postal_code' => $user->client->postal_code,
                'city' => $user->client->city,
                'country' => $user->client->country,
            ];
        }

        if ($user->role === 'prestataire' && $user->provider) {
            $data['provider'] = [
                'id' => $user->provider->id,
                'company_name' => $user->provider->company_name,
            ];
        }

        if ($user->role === 'employe' && $user->provider) {
            $data['provider'] = [
                'id' => $user->provider->id,
                'company_name' => $user->provider->company_name,
            ];
        }

        return $data;
    }
}
