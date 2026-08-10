<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'ip_address', 'blocked_by_user_id', 'reason',
    'country_code', 'country', 'city',
])]
class BlockedIp extends Model
{
    // The whole list lives in one cache entry rather than one entry per address.
    // It is a handful of rows at most, and public tracking consults it on every
    // single request -- one cache read for the set beats a database round trip,
    // and a single key is trivial to invalidate correctly.
    private const CACHE_KEY = 'blocked_ips.all';

    protected function casts(): array
    {
        return [
            'last_hit_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Forget on every write. Getting this wrong in the stale direction is
        // the dangerous one: an unblock that does not take effect leaves a real
        // customer locked out with no way for the provider to tell why.
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    public function blockedBy()
    {
        return $this->belongsTo(User::class, 'blocked_by_user_id');
    }

    /** @return array<int, string> */
    public static function all_addresses(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn () => self::query()->pluck('ip_address')->all());
    }

    public static function isBlocked(?string $ip): bool
    {
        return filled($ip) && in_array($ip, self::all_addresses(), true);
    }

    // Counted with a raw update rather than a model save so that a flood of
    // blocked traffic stays one cheap statement per hit, and so it does not fire
    // the saved() hook above and clear the cache on every single rejection.
    public static function recordHit(string $ip): void
    {
        DB::table('blocked_ips')
            ->where('ip_address', $ip)
            ->update([
                'hits' => DB::raw('hits + 1'),
                'last_hit_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
