<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'expedition_id', 'statut', 'sous_statut', 'date_statut', 'description', 'changed_by'
])]
class SuiviStatut extends Model
{
    protected $table = 'suivi_statuts';

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'expedition_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    protected function casts(): array
    {
        return [
            'date_statut' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (SuiviStatut $event) {
            $event->shipment->update([
                'statut_actuel' => $event->statut,
                'sous_statut_actuel' => $event->sous_statut,
            ]);
        });
    }
}
