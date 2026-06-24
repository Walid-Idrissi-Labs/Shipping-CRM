<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'full_name', 'email', 'phone', 'address', 'city', 'postal_code',
    'ice', 'notes', 'statut', 'client_id'
])]
class AccountRequest extends Model
{
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
