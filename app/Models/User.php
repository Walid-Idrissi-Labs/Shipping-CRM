<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['role', 'name', 'email', 'password_hash', 'origin_password_hash', 'origin_password_encrypted', 'first_login_completed', 'provider_id'])]
#[Hidden(['password_hash', 'origin_password_hash', 'origin_password_encrypted', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    public function getAuthPassword(): string
    {
        return $this->password_hash ?? '';
    }

    // --- Credentials -------------------------------------------------------
    //
    // A client is created by their provider with no password of their own:
    // `password_hash` is null and the only thing that authenticates them is
    // `origin_password_hash`, the temporary password printed on the client
    // creation screen. Both are accepted until the client sets their own,
    // at which point the temporary one is destroyed by setPassword().
    //
    // These three live on the model rather than in a controller because login
    // and the change-password form must agree on what a valid password is.
    // When they disagreed, the change-password form rejected the temporary
    // password as "incorrect" — so the clients who most needed to move off a
    // temporary credential were the only ones who couldn't.

    public function checkPassword(string $plain): bool
    {
        if ($this->password_hash && Hash::check($plain, $this->password_hash)) {
            return true;
        }

        return (bool) $this->origin_password_hash && Hash::check($plain, $this->origin_password_hash);
    }

    public function setPassword(string $plain): void
    {
        $this->update([
            'password_hash' => Hash::make($plain),
            // Revoked together: the temporary password must stop authenticating,
            // and the recoverable copy the provider could read exists only to
            // re-send credentials during onboarding — which is now over.
            'origin_password_hash' => null,
            'origin_password_encrypted' => null,
            'first_login_completed' => true,
        ]);
    }

    public function isUsingTemporaryPassword(): bool
    {
        return $this->role === 'client'
            && is_null($this->password_hash)
            && ! is_null($this->origin_password_hash);
    }

    public function client()
    {
        return $this->hasOne(Client::class);
    }

    public function provider()
    {
        if ($this->role === 'prestataire') {
            return $this->hasOne(Provider::class);
        }
        
        if ($this->role === 'employe') {
            return $this->belongsTo(Provider::class, 'provider_id');
        }
        
        return $this->hasOne(Provider::class);
    }

    public function employeeShipments()
    {
        return $this->hasMany(EmployeeShipment::class, 'employee_id');
    }

    public function passwordViews()
    {
        return $this->hasMany(PasswordView::class, 'viewed_by');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'first_login_completed' => 'boolean',
            'provider_id' => 'integer',
        ];
    }
}