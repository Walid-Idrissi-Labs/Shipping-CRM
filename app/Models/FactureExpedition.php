<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FactureExpedition extends Model
{
    protected $table = 'facture_expeditions';

    public $incrementing = false;

    protected $primaryKey = null;

    protected $fillable = ['facture_id', 'expedition_id'];

    public $timestamps = false;

    public function facture()
    {
        return $this->belongsTo(Facture::class);
    }

    public function expedition()
    {
        return $this->belongsTo(Shipment::class, 'expedition_id');
    }
}
