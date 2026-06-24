<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountRequest;
use App\Models\Client;
use App\Traits\AppliesSorting;
use Illuminate\Http\Request;

class AccountRequestController extends Controller
{
    use AppliesSorting;

    public function index(Request $request)
    {
        $query = AccountRequest::with('client');

        if ($request->has('statut')) {
            $query->where('statut', $request->input('statut'));
        }

        $this->applySort(
            $query,
            $request,
            ['full_name', 'email', 'created_at', 'statut'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function show(AccountRequest $accountRequest)
    {
        $accountRequest->load('client');

        return response()->json($accountRequest);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'ice' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $accountRequest = AccountRequest::create(array_merge($validated, ['statut' => 'en_attente']));

        return response()->json($accountRequest, 201);
    }

    public function destroy(AccountRequest $accountRequest)
    {
        $accountRequest->update(['statut' => 'rejetee']);

        return response()->json(['message' => 'Demande rejetee.']);
    }

    public function approve(Request $request, AccountRequest $accountRequest)
    {
        if ($accountRequest->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Cette demande a deja ete traitee.',
                'statut' => $accountRequest->statut,
                'client_id' => $accountRequest->client_id,
            ], 422);
        }

        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
        ]);

        $accountRequest->update([
            'statut' => 'approuvee',
            'client_id' => $data['client_id'] ?? null,
        ]);

        return response()->json([
            'message' => 'Demande approuvee.',
            'account_request' => $accountRequest->load('client'),
        ]);
    }
}
