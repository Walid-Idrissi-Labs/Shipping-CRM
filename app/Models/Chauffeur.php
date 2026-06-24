<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'nom_complet', 'telephone', 'email', 'photo_url', 'statut'
])]
class Chauffeur extends Model
{
    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function typesVehicules()
    {
        return $this->hasMany(ChauffeurTypeVehicule::class, 'chauffeur_id');
    }

    public function affectations()
    {
        return $this->hasMany(Affectation::class, 'chauffeur_id');
    }

    public function qualifiedTypes(): array
    {
        return $this->typesVehicules()->pluck('type_vehicule')->toArray();
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
