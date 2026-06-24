<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordView extends Model
{
    public $timestamps = false;

    protected $fillable = ['client_id', 'viewed_by', 'created_at'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function viewer()
    {
        return $this->belongsTo(User::class, 'viewed_by');
    }
}
