<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'full_name', 'email', 'phone', 'address', 'city', 'postal_code',
    'ice', 'notes', 'statut', 'client_id',
    'ip_address', 'ip_forwarded_for', 'bot_signal',
])]
class AccountRequest extends Model
{
    // See the matching note on QuoteRequest: these are exposed only through the
    // provider's detail view, never through a list or a client-facing payload.
    protected $hidden = ['ip_address', 'ip_forwarded_for', 'bot_signal'];

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
