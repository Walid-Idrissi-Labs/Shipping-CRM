<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'immatriculation', 'marque_modele', 'annee_circulation', 'couleur',
    'photo_url', 'type_vehicule', 'statut',
    'exp_controle_technique', 'exp_assurance', 'exp_carte_grise'
])]
class Vehicule extends Model
{
    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function affectations()
    {
        return $this->hasMany(Affectation::class, 'vehicule_id');
    }

    protected function casts(): array
    {
        return [
            'exp_controle_technique' => 'date',
            'exp_assurance' => 'date',
            'exp_carte_grise' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function documentAlerts(): array
    {
        $today = now()->startOfDay();
        $alerts = [];

        $docs = [
            'controle_technique' => $this->exp_controle_technique,
            'assurance' => $this->exp_assurance,
            'carte_grise' => $this->exp_carte_grise,
        ];

        foreach ($docs as $name => $date) {
            if (! $date) {
                continue;
            }

            $diff = $today->diffInDays($date, false);
            if ($diff < 0) {
                $alerts[] = ['type' => $name, 'status' => 'expired', 'days' => (int) $diff];
            } elseif ($diff <= 30) {
                $alerts[] = ['type' => $name, 'status' => 'expiring_soon', 'days' => (int) $diff];
            }
        }

        return $alerts;
    }
}
