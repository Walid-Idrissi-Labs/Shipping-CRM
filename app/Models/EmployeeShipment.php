<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'employee_id', 'shipment_id', 'old_status', 'new_status',
    'old_sub_status', 'new_sub_status', 'description', 'changed_at'
])]
class EmployeeShipment extends Model
{
    protected $table = 'employee_shipments';

    protected function casts(): array
    {
        return [
            'changed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}