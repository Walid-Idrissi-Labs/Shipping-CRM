<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'provider_id', 'client_id', 'quote_id',
    'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country',
    'origin_city', 'origin_country',
    'client_email', 'client_phone',
    'recipient_name', 'recipient_company', 'recipient_address', 'recipient_city', 'recipient_postal_code',
    'recipient_country', 'recipient_phone', 'recipient_email',
    'poids', 'longueur', 'largeur', 'hauteur', 'nb_pieces',
    'type_colis', 'type_service', 'description_colis',
    'valeur_declaree', 'devise_valeur', 'statut',
    'ip_address', 'ip_forwarded_for', 'bot_signal',
])]
class QuoteRequest extends Model
{
    // Kept out of the default serialisation so a visitor's address cannot ride
    // along in a list payload or a client-facing endpoint by accident. The
    // provider's detail view reads these deliberately, via SubmissionOrigin.
    protected $hidden = ['ip_address', 'ip_forwarded_for', 'bot_signal'];

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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
