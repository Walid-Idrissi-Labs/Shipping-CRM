<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['reclamation_id', 'user_id', 'author_role', 'corps', 'created_at'])]
class ReclamationMessage extends Model
{
    // Messages are never edited, so there is no updated_at to maintain.
    public $timestamps = false;

    public function reclamation()
    {
        return $this->belongsTo(Reclamation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
