<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'user_id', 'account_number', 'full_name', 'company_name', 'email', 'phone', 'ice',
    'address', 'postal_code', 'city', 'country'
])]
class Client extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    public function factures()
    {
        return $this->hasMany(Facture::class);
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
