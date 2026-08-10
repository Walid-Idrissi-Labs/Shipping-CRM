<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedIp;
use App\Models\IpGeolocation;
use App\Services\IpGeolocator;
use Illuminate\Http\Request;

class BlockedIpController extends Controller
{
    public function __construct(private IpGeolocator $geolocator) {}

    public function index(Request $request)
    {
        $blocked = BlockedIp::with('blockedBy:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (BlockedIp $b) => [
                'id' => $b->id,
                'ip_address' => $b->ip_address,
                'reason' => $b->reason,
                'city' => $b->city,
                'country' => $b->country,
                'country_code' => $b->country_code,
                'location_label' => $this->locationLabel($b),
                'hits' => $b->hits,
                'last_hit_at' => $b->last_hit_at,
                'blocked_at' => $b->created_at,
                'blocked_by' => $b->blockedBy?->name,

                // Lets the UI warn before an unblock-then-reblock loop, and
                // stops the provider blocking the address they are sitting on.
                'is_your_own_ip' => $b->ip_address === $request->ip(),
            ]);

        return response()->json(['data' => $blocked]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'ip_address' => ['required', 'ip'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $ip = $validated['ip_address'];

        // Blocking your own address locks you out of your own public forms, and
        // the symptom -- "the site stopped accepting demandes" -- looks nothing
        // like the cause. Cheaper to refuse than to debug later.
        if ($ip === $request->ip()) {
            return response()->json([
                'message' => "Il s'agit de votre propre adresse IP. La bloquer vous empecherait d'utiliser vos formulaires publics.",
            ], 422);
        }

        // A private or reserved address is never a visitor on the internet. If
        // one shows up on a demande, the real cause is an unconfigured proxy
        // (see config/security.php) and blocking it would turn away every
        // visitor at once, since in that state they all share it.
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return response()->json([
                'message' => "Cette adresse est une adresse de reseau interne, pas celle d'un visiteur. La bloquer bloquerait tous vos visiteurs a la fois. Contactez votre developpeur : la configuration du serveur doit etre ajustee.",
            ], 422);
        }

        if (BlockedIp::where('ip_address', $ip)->exists()) {
            return response()->json(['message' => 'Cette adresse IP est deja bloquee.'], 422);
        }

        // Snapshot the location as it reads today. Addresses get reassigned, and
        // a year from now the useful question is what this looked like when the
        // call was made, not where it resolves now.
        $geo = $this->geolocator->resolve($ip);

        $blocked = BlockedIp::create([
            'ip_address' => $ip,
            'reason' => $validated['reason'] ?? null,
            'blocked_by_user_id' => $request->user()->id,
            'country_code' => $geo?->status === IpGeolocation::STATUS_RESOLVED ? $geo->country_code : null,
            'country' => $geo?->status === IpGeolocation::STATUS_RESOLVED ? $geo->country : null,
            'city' => $geo?->status === IpGeolocation::STATUS_RESOLVED ? $geo->city : null,
        ]);

        return response()->json([
            'message' => 'Adresse IP bloquee. Les demandes venant de cette adresse seront refusees.',
            'blocked_ip' => $blocked,
        ], 201);
    }

    public function destroy(BlockedIp $blockedIp)
    {
        $blockedIp->delete();

        return response()->json(['message' => 'Adresse IP debloquee.']);
    }

    private function locationLabel(BlockedIp $blocked): string
    {
        $parts = array_filter([$blocked->city, $blocked->country]);

        return $parts ? implode(', ', $parts) : 'Localisation inconnue';
    }
}
