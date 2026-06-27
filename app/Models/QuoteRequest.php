<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'client_id', 'quote_id',
    'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country',
    'client_email', 'client_phone',
    'recipient_name', 'recipient_company', 'recipient_address', 'recipient_city', 'recipient_postal_code',
    'recipient_country', 'recipient_phone', 'recipient_email',
    'poids', 'longueur', 'largeur', 'hauteur', 'nb_pieces',
    'type_colis', 'type_service', 'description_colis', 'statut'
])]
class QuoteRequest extends Model
{
    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    protected function casts(): array
    {
        return [
            'poids' => 'decimal:3',
            'longueur' => 'decimal:2',
            'largeur' => 'decimal:2',
            'hauteur' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
