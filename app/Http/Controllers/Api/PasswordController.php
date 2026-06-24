<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    public function resetClientPassword(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'client') {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $validated = $request->validate([
            'new_password' => ['required', 'string', Password::min(8)],
        ]);

        $user->update([
            'password_hash' => Hash::make($validated['new_password']),
            'first_login_completed' => true,
        ]);

        return response()->json(['message' => 'Mot de passe mis a jour.']);
    }

    public function changeProviderPassword(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'prestataire') {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $validated = $request->validate([
            'old_password' => ['required', 'string'],
            'new_password' => ['required', 'string', Password::min(8), 'confirmed'],
        ]);

        if (! Hash::check($validated['old_password'], $user->password_hash)) {
            return response()->json(['message' => 'Ancien mot de passe incorrect.'], 422);
        }

        $user->update([
            'password_hash' => Hash::make($validated['new_password']),
        ]);

        return response()->json(['message' => 'Mot de passe mis a jour.']);
    }

    public function changeClientPassword(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'client') {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        $validated = $request->validate([
            'old_password' => ['required', 'string'],
            'new_password' => ['required', 'string', Password::min(8)],
        ]);

        if (! Hash::check($validated['old_password'], $user->password_hash)) {
            return response()->json(['message' => 'Ancien mot de passe incorrect.'], 422);
        }

        $user->update([
            'password_hash' => Hash::make($validated['new_password']),
            'first_login_completed' => true,
        ]);

        return response()->json(['message' => 'Mot de passe mis a jour.']);
    }
}
