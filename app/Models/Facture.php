<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'client_id', 'client_divers_nom', 'client_divers_adresse',
    'client_divers_tel', 'client_divers_email',
    'numero_n', 'annee', 'date_facture', 'date_echeance',
    'type_destination', 'taux_tva', 'non_taxable', 'taxable', 'tva', 'ttc', 'statut'
])]
class Facture extends Model
{
    protected $table = 'factures';

    protected $appends = ['numero'];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function expeditions()
    {
        return $this->belongsToMany(Shipment::class, 'facture_expeditions', 'facture_id', 'expedition_id');
    }

    public function avoir()
    {
        return $this->hasOne(Avoir::class, 'facture_id');
    }

    public function getNumeroAttribute(): string
    {
        return "FA {$this->numero_n}/{$this->annee}";
    }

    protected function casts(): array
    {
        return [
            'date_facture' => 'date',
            'date_echeance' => 'date',
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
