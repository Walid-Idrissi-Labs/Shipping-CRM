<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'ip_address', 'status', 'country_code', 'country', 'region', 'city', 'org', 'resolved_at',
])]
class IpGeolocation extends Model
{
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_PRIVATE = 'private';
    public const STATUS_FAILED = 'failed';
    public const STATUS_UNCONFIGURED = 'unconfigured';

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    // One line the provider can read at a glance, e.g. "Casablanca, Maroc".
    // Falls back to whatever we do know rather than showing nothing: a country
    // with no city is still useful, and an honest "localisation inconnue" beats
    // an empty field the provider cannot interpret.
    public function label(): string
    {
        if ($this->status !== self::STATUS_RESOLVED) {
            return match ($this->status) {
                self::STATUS_PRIVATE => 'Adresse locale (reseau interne)',
                self::STATUS_UNCONFIGURED => 'Geolocalisation non configuree',
                default => 'Localisation inconnue',
            };
        }

        $parts = array_filter([$this->city, $this->country]);

        return $parts ? implode(', ', $parts) : 'Localisation inconnue';
    }

    public function toDisplayArray(): array
    {
        return [
            'status' => $this->status,
            'label' => $this->label(),
            'city' => $this->city,
            'region' => $this->region,
            'country' => $this->country,
            'country_code' => $this->country_code,
            'org' => $this->org,
        ];
    }
}
