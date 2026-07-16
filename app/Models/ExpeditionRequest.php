<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'quote_id', 'provider_id', 'token',
    'sender_name', 'sender_company', 'sender_address', 'sender_city', 'sender_postal_code', 'sender_country', 'sender_email', 'sender_phone',
    'recipient_name', 'recipient_company', 'recipient_address', 'recipient_city', 'recipient_postal_code', 'recipient_country', 'recipient_phone', 'recipient_email',
    'colis', 'valeur_declaree', 'devise_valeur', 'type_service', 'statut',
])]
class ExpeditionRequest extends Model
{
    use HasFactory;

    protected $table = 'expedition_requests';

    protected function casts(): array
    {
        return [
            'colis' => 'array',
            'valeur_declaree' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }
}