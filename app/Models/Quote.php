<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'provider_id', 'client_id', 'quote_number', 'quote_year', 'quote_sequence',
    'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country',
    'origin_city', 'origin_country',
    'client_email', 'client_phone',
    'recipient_name', 'recipient_company', 'recipient_address', 'recipient_city', 'recipient_postal_code',
    'recipient_country', 'recipient_phone',
    'poids', 'longueur', 'largeur', 'hauteur', 'nb_pieces',
    'type_colis', 'type_service', 'description_colis',
    'valeur_declaree', 'devise_valeur',
    'montant_ht', 'montant_ttc', 'statut',
    'public_link_token', 'public_link_expires_at',
])]
class Quote extends Model
{
    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function shipment()
    {
        return $this->hasOne(Shipment::class);
    }

    public function request()
    {
        return $this->hasOne(QuoteRequest::class);
    }

    public function expeditionRequest(): HasOne
    {
        return $this->hasOne(ExpeditionRequest::class);
    }

    public function colis(): MorphMany
    {
        return $this->morphMany(Colis::class, 'colisable')->orderBy('position');
    }

    public function getTotalPoidsAttribute(): float
    {
        return $this->colis->sum(fn ($c) => ($c->nb_pieces ?? 0) * ($c->poids ?? 0));
    }

    public function getTotalVolumeAttribute(): float
    {
        return $this->colis->sum(function ($c) {
            if (! $c->longueur || ! $c->largeur || ! $c->hauteur) {
                return 0;
            }
            return ($c->nb_pieces ?? 0) * (($c->longueur / 100) * ($c->largeur / 100) * ($c->hauteur / 100));
        });
    }

    public function getTotalPiecesAttribute(): int
    {
        return $this->colis->sum('nb_pieces');
    }

    protected function casts(): array
    {
        return [
            'poids' => 'decimal:3',
            'longueur' => 'decimal:2',
            'largeur' => 'decimal:2',
            'hauteur' => 'decimal:2',
            'valeur_declaree' => 'decimal:2',
            'montant_ht' => 'decimal:2',
            'montant_ttc' => 'decimal:2',
            'public_link_expires_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
