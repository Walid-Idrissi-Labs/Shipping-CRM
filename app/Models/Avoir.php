<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'client_id', 'facture_id', 'numero_n', 'annee',
    'type_destination', 'taux_tva', 'non_taxable', 'taxable', 'tva', 'ttc'
])]
class Avoir extends Model
{
    protected $appends = ['numero'];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function facture()
    {
        return $this->belongsTo(Facture::class);
    }

    public function getNumeroAttribute(): string
    {
        return "AV {$this->numero_n}/{$this->annee}";
    }

    protected function casts(): array
    {
        return [
            'taux_tva' => 'decimal:2',
            'non_taxable' => 'decimal:2',
            'taxable' => 'decimal:2',
            'tva' => 'decimal:2',
            'ttc' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
