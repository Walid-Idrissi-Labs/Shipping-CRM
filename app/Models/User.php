<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['role', 'email', 'password_hash', 'origin_password_hash', 'origin_password_encrypted', 'first_login_completed'])]
#[Hidden(['password_hash', 'origin_password_hash', 'origin_password_encrypted', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    public function getAuthPassword(): string
    {
        return $this->password_hash ?? '';
    }

    public function client()
    {
        return $this->hasOne(Client::class);
    }

    public function provider()
    {
        return $this->hasOne(Provider::class);
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
            'password_hash' => 'hashed',
            'origin_password_hash' => 'hashed',
        ];
    }
}
