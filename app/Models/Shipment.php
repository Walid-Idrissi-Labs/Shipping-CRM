<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'provider_id', 'client_id', 'quote_id', 'created_by', 'shipping_number', 'label_url',
    'sender_name', 'sender_company', 'sender_address', 'sender_city', 'sender_postal_code', 'sender_country',
    'sender_email', 'sender_phone',
    'recipient_name', 'recipient_company', 'recipient_address', 'recipient_city', 'recipient_postal_code',
    'recipient_country', 'recipient_phone', 'recipient_email',
    'poids', 'longueur', 'largeur', 'hauteur', 'nb_pieces',
    'valeur_declaree', 'devise_valeur', 'type_colis', 'description_colis', 'type_service',
    'statut_actuel', 'sous_statut_actuel'
])]
class Shipment extends Model
{
    protected $table = 'shipments';

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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function suiviStatuts()
    {
        return $this->hasMany(SuiviStatut::class, 'expedition_id')->orderBy('date_statut');
    }

    public function sousEtapes()
    {
        return $this->hasMany(SousEtape::class, 'shipment_id')->orderBy('created_at');
    }

    public function factureExpedition()
    {
        return $this->hasOne(FactureExpedition::class, 'expedition_id');
    }

    public function facture()
    {
        return $this->belongsToMany(Facture::class, 'facture_expeditions', 'expedition_id', 'facture_id');
    }

    public function affectations()
    {
        return $this->belongsToMany(Affectation::class, 'affectation_expeditions', 'expedition_id', 'affectation_id');
    }

    public function employeeShipments()
    {
        return $this->hasMany(EmployeeShipment::class, 'shipment_id')->orderByDesc('changed_at');
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

    public function scopeUnbilledForProvider($query, $providerId, $clientId = null)
    {
        return $query->where('provider_id', $providerId)
            ->when($clientId !== null, fn ($q) => $q->where('client_id', $clientId))
            ->whereDoesntHave('factureExpedition')
            ->orderByDesc('created_at');
    }

    protected function casts(): array
    {
        return [
            'poids' => 'decimal:3',
            'longueur' => 'decimal:2',
            'largeur' => 'decimal:2',
            'hauteur' => 'decimal:2',
            'valeur_declaree' => 'decimal:2',
            'nb_pieces' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
