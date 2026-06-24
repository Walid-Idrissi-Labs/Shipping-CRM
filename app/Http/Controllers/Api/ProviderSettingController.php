<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProviderSettingController extends Controller
{
    public function show(Request $request)
    {
        $provider = $request->user()->provider;
        $provider->load('user');

        return response()->json([
            'id' => $provider->id,
            'company_name' => $provider->company_name,
            'address' => $provider->address,
            'postal_code' => $provider->postal_code,
            'city' => $provider->city,
            'country' => $provider->country,
            'phone' => $provider->phone,
            'email' => $provider->email,
            'website' => $provider->website,
            'ice' => $provider->ice,
            'rc' => $provider->rc,
            'if' => $provider->if_,
            'cnss' => $provider->cnss,
            'patente' => $provider->patente,
            'logo_invoice_url' => $provider->logo_invoice_url ? asset('storage/'.$provider->logo_invoice_url) : null,
            'login_email' => $provider->user->email,
        ]);
    }

    public function update(Request $request)
    {
        $provider = $request->user()->provider;

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'ice' => ['nullable', 'string', 'max:50'],
            'rc' => ['nullable', 'string', 'max:50'],
            'if' => ['nullable', 'string', 'max:50'],
            'cnss' => ['nullable', 'string', 'max:50'],
            'patente' => ['nullable', 'string', 'max:50'],
            'login_email' => ['required', 'email', 'max:255', 'unique:users,email,'.$request->user()->id],
        ]);

        $provider->update([
            'company_name' => $validated['company_name'],
            'address' => $validated['address'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'city' => $validated['city'] ?? null,
            'country' => $validated['country'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'website' => $validated['website'] ?? null,
            'ice' => $validated['ice'] ?? null,
            'rc' => $validated['rc'] ?? null,
            'if_' => $validated['if'] ?? null,
            'cnss' => $validated['cnss'] ?? null,
            'patente' => $validated['patente'] ?? null,
        ]);

        $request->user()->update(['email' => $validated['login_email']]);

        return response()->json(['message' => 'Parametres mis a jour.', 'provider' => $provider->fresh()]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo_invoice' => ['required', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
        ]);

        $provider = $request->user()->provider;

        if ($provider->logo_invoice_url) {
            Storage::disk('public')->delete($provider->logo_invoice_url);
        }

        $path = $request->file('logo_invoice')->store('logos', 'public');
        $provider->update(['logo_invoice_url' => $path]);

        return response()->json([
            'logo_invoice_url' => $provider->logo_invoice_url ? asset('storage/'.$provider->logo_invoice_url) : null,
        ]);
    }
}
