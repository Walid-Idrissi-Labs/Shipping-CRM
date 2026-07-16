<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'colisable_type',
    'colisable_id',
    'position',
    'nb_pieces',
    'poids',
    'longueur',
    'largeur',
    'hauteur',
    'type_colis',
    'description_colis',
])]
class Colis extends Model
{
    public function colisable(): MorphTo
    {
        return $this->morphTo();
    }
}
