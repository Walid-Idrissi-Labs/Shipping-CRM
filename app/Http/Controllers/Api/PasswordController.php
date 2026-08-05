<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    // Applied to every password a user chooses for themselves. These are exactly
    // the rules the account pages have always *displayed* — the server only
    // enforced min(8), so the checklist users were reading was decorative and a
    // password failing it saved fine. Matching the server to the promise closes
    // the gap without changing anything a user sees.
    //
    // Deliberately stops here: symbol requirements and forced rotation mostly
    // push people toward "Password1!" on a sticky note. Kept in one place so
    // both the provider and client endpoints cannot drift apart.
    // Mirrored in frontend/src/components/ui/PasswordRules.jsx.
    private function passwordRules(): array
    {
        return ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()];
    }

    public function changeProviderPassword(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'prestataire') {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        return $this->change($request, $user);
    }

    public function changeClientPassword(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'client') {
            return response()->json(['message' => 'Acces refuse.'], 403);
        }

        return $this->change($request, $user);
    }

    private function change(Request $request, $user)
    {
        $request->validate([
            'old_password' => ['required', 'string'],
            'new_password' => ['required', 'string'],
        ]);

        // Deliberately checked BEFORE the strength rules. If someone mistypes
        // their current password, "votre mot de passe actuel est incorrect" is
        // the useful thing to tell them; complaining that their *new* password
        // needs a capital letter sends them off fixing the wrong field.
        //
        // checkPassword() accepts the temporary onboarding password as well as
        // one the user set themselves, so a client still on their temporary
        // credential can trade it in here. This used to compare against
        // password_hash alone, which is null for exactly those clients.
        if (! $user->checkPassword($request->input('old_password'))) {
            return response()->json(['message' => 'Ancien mot de passe incorrect.'], 422);
        }

        $validated = $request->validate(['new_password' => $this->passwordRules()]);

        $user->setPassword($validated['new_password']);

        return response()->json(['message' => 'Mot de passe mis a jour.']);
    }
}
