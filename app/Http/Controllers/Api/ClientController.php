<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\PasswordView;
use App\Models\User;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $provider = $request->user()->provider;
        $query = Client::query()->where('provider_id', $provider->id);

        if ($search = $request->input('search')) {
            $q = '%' . mb_strtolower($search) . '%';
            $query->where(function ($qb) use ($q) {
                $qb->whereRaw('LOWER(full_name) like ?', [$q])
                    ->orWhereRaw('LOWER(email) like ?', [$q])
                    ->orWhereRaw('LOWER(phone) like ?', [$q])
                    ->orWhereRaw('LOWER(account_number) like ?', [$q]);
            });
        }

        $this->applySort(
            $query,
            $request,
            ['account_number', 'full_name', 'company_name', 'email', 'phone', 'city', 'created_at'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'ice' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $provider = $request->user()->provider;
        $accountNumber = $this->generateAccountNumber();
        $originPassword = $this->generateOriginPassword();

        $result = DB::transaction(function () use ($validated, $provider, $accountNumber, $originPassword) {
            $user = User::create([
                'role' => 'client',
                'email' => $validated['email'],
                'password_hash' => null,
                'origin_password_hash' => Hash::make($originPassword),
                'origin_password_encrypted' => Crypt::encryptString($originPassword),
                'first_login_completed' => false,
            ]);

            $client = Client::create([
                'provider_id' => $provider->id,
                'user_id' => $user->id,
                'account_number' => $accountNumber,
                'full_name' => $validated['full_name'],
                'company_name' => $validated['company_name'] ?? null,
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'ice' => $validated['ice'] ?? null,
                'address' => $validated['address'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'city' => $validated['city'] ?? null,
                'country' => $validated['country'] ?? 'Maroc',
            ]);

            return ['user' => $user, 'client' => $client, 'origin_password' => $originPassword];
        });

        return response()->json([
            'message' => 'Client cree.',
            'client' => $result['client'],
            'account_number' => $result['client']->account_number,
            'origin_password' => $result['origin_password'],
        ], 201);
    }

    public function show(Request $request, Client $client)
    {
        if ($client->provider_id !== $request->user()->provider->id) {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $client->load('user');

        // Log every read of the origin password so the prestataire has an audit trail.
        $plainOrigin = null;
        try {
            if (! empty($client->user->origin_password_encrypted)) {
                $plainOrigin = Crypt::decryptString($client->user->origin_password_encrypted);
            }
        } catch (\Throwable $e) {
            // If decryption fails (e.g., rotated APP_KEY), just expose null rather than 500.
            $plainOrigin = null;
        }

        PasswordView::create([
            'client_id' => $client->id,
            'viewed_by' => $request->user()->id,
            'created_at' => now(),
        ]);

        return response()->json([
            'client' => $client,
            'origin_password' => $plainOrigin,
            'account_created_at' => $client->user?->created_at,
        ]);
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$client->user_id],
            'phone' => ['nullable', 'string', 'max:50'],
            'ice' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $client->update([
            'full_name' => $validated['full_name'],
            'company_name' => $validated['company_name'] ?? null,
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'ice' => $validated['ice'] ?? null,
            'address' => $validated['address'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'city' => $validated['city'] ?? null,
            'country' => $validated['country'] ?? 'Maroc',
        ]);

        $client->user->update(['email' => $validated['email']]);

        return response()->json(['message' => 'Client mis a jour.', 'client' => $client->fresh()]);
    }

    public function destroy(Client $client)
    {
        $client->user->delete();
        $client->delete();

        return response()->json(['message' => 'Client supprime.']);
    }

    public function updateOwnProfile(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'Profil client introuvable.'], 404);
        }

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:50'],
            'ice' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($client, $user, $validated) {
            $client->update([
                'full_name' => $validated['full_name'],
                'company_name' => $validated['company_name'] ?? null,
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'ice' => $validated['ice'] ?? null,
                'address' => $validated['address'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'city' => $validated['city'] ?? null,
                'country' => $validated['country'] ?? $client->country ?? 'Maroc',
            ]);

            $user->update([
                'email' => $validated['email'],
            ]);
        });

        return response()->json([
            'message' => 'Profil mis a jour.',
            'client' => $client->fresh(),
        ]);
    }
}
