<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'chauffeur_id', 'vehicule_id', 'client_id',
    'ville_depart', 'pays_depart', 'date_heure_depart',
    'ville_arrivee', 'pays_arrivee', 'date_heure_arrivee', 'statut'
])]
class Affectation extends Model
{
    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function chauffeur()
    {
        return $this->belongsTo(Chauffeur::class, 'chauffeur_id');
    }

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class, 'vehicule_id');
    }

    public function expeditions()
    {
        return $this->belongsToMany(Shipment::class, 'affectation_expeditions', 'affectation_id', 'expedition_id');
    }

    protected function casts(): array
    {
        return [
            'date_heure_depart' => 'datetime',
            'date_heure_arrivee' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Affectation $affectation) {
            if ($affectation->vehicule_id) {
                $affectation->vehicule()->update(['statut' => 'en_mission']);
            }
            if ($affectation->chauffeur_id) {
                $affectation->chauffeur()->update(['statut' => 'en_mission']);
            }
        });

        static::updated(function (Affectation $affectation) {
            if (in_array($affectation->statut, ['terminee', 'annulee'], true)) {
                if ($affectation->vehicule_id) {
                    $affectation->vehicule()->update(['statut' => 'disponible']);
                }
                if ($affectation->chauffeur_id) {
                    $affectation->chauffeur()->update(['statut' => 'actif']);
                }
            }
        });
    }
}
