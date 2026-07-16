<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['shipment_id', 'statut', 'description', 'user_id'])]
class SousEtape extends Model
{
    protected $table = 'sous_etapes';

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
