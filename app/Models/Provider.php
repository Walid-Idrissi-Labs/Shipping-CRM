<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id', 'company_name', 'address', 'postal_code', 'city', 'country',
    'phone', 'website', 'email', 'ice', 'rc', 'if_', 'cnss', 'patente',
    'logo_invoice_url'
])]
class Provider extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function clients()
    {
        return $this->hasMany(Client::class);
    }

    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function factures()
    {
        return $this->hasMany(Facture::class);
    }

    public function vehicules()
    {
        return $this->hasMany(Vehicule::class);
    }

    public function chauffeurs()
    {
        return $this->hasMany(Chauffeur::class);
    }

    public function affectations()
    {
        return $this->hasMany(Affectation::class);
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
