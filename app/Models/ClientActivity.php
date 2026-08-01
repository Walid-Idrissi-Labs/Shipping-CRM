<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientActivity extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'provider_id', 'client_id', 'type', 'description', 'subject_id', 'subject_type', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
