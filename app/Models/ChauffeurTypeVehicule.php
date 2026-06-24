<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['chauffeur_id', 'type_vehicule'])]
class ChauffeurTypeVehicule extends Model
{
    protected $table = 'chauffeur_types_vehicules';

    public $incrementing = false;

    protected $primaryKey = null;

    public $timestamps = false;

    public $fillable = ['chauffeur_id', 'type_vehicule'];

    public function chauffeur()
    {
        return $this->belongsTo(Chauffeur::class);
    }
}
