<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['affectation_id', 'expedition_id'])]
class AffectationExpedition extends Model
{
    protected $table = 'affectation_expeditions';

    public $incrementing = false;

    protected $primaryKey = null;

    public $timestamps = false;

    public $fillable = ['affectation_id', 'expedition_id'];

    public function affectation()
    {
        return $this->belongsTo(Affectation::class);
    }

    public function expedition()
    {
        return $this->belongsTo(Shipment::class, 'expedition_id');
    }
}
