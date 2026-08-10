<?php

namespace App\Services;

use App\Models\IpGeolocation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Turns an IP address into a city and country.
//
// The one rule that shapes this whole class: it must never run while a visitor
// is waiting on a form submission. An outbound HTTP call inside the POST would
// hand a third party the ability to make our public forms hang, or fail, every
// time their API has a bad day. So submissions only ever record the raw address,
// and resolution happens later -- when a provider opens the demande, by which
// point a slow lookup costs a spinner in the back office instead of a lost
// prospect.
//
// Everything below is written so a failed lookup is a non-event: the caller
// always gets an IpGeolocation back, and the worst case is one that says
// "localisation inconnue".
class IpGeolocator
{
    private const ENDPOINT = 'https://ipinfo.io/';

    // How long before we bother retrying an address whose lookup failed. Long
    // enough that a spam wave against a dead API does not turn into one doomed
    // outbound call per demande view, short enough that a transient outage
    // heals itself by tomorrow.
    private const RETRY_FAILED_AFTER_HOURS = 24;

    public function resolve(?string $ip): ?IpGeolocation
    {
        if (blank($ip)) {
            return null;
        }

        $existing = IpGeolocation::where('ip_address', $ip)->first();

        if ($existing && ! $this->isStale($existing)) {
            return $existing;
        }

        // Private, loopback and reserved ranges have no location to look up, and
        // asking about them would leak our own network layout for nothing. This
        // is also what a demande looks like when the app sits behind an
        // unconfigured proxy, which is exactly when the provider needs to be
        // told plainly rather than shown a blank.
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return $this->store($ip, ['status' => IpGeolocation::STATUS_PRIVATE]);
        }

        $token = config('services.ipinfo.token');

        if (blank($token)) {
            return $this->store($ip, ['status' => IpGeolocation::STATUS_UNCONFIGURED]);
        }

        return $this->store($ip, $this->lookup($ip, $token));
    }

    // A failed or unconfigured record is worth revisiting; a resolved or private
    // one never is. An address does not move between countries often enough to
    // justify re-querying, and if one is ever reassigned, the snapshot stored on
    // the block record is what mattered anyway.
    private function isStale(IpGeolocation $geo): bool
    {
        if ($geo->status === IpGeolocation::STATUS_UNCONFIGURED) {
            return filled(config('services.ipinfo.token'));
        }

        if ($geo->status !== IpGeolocation::STATUS_FAILED) {
            return false;
        }

        return $geo->resolved_at === null
            || $geo->resolved_at->addHours(self::RETRY_FAILED_AFTER_HOURS)->isPast();
    }

    private function lookup(string $ip, string $token): array
    {
        try {
            $response = Http::timeout(4)
                ->connectTimeout(3)
                ->withHeaders(['Accept' => 'application/json'])
                ->get(self::ENDPOINT.$ip.'/json', ['token' => $token]);

            if (! $response->successful()) {
                return ['status' => IpGeolocation::STATUS_FAILED];
            }

            $data = $response->json();

            // ipinfo answers 200 with {"bogon": true} for addresses that exist
            // in no registry. Treating that as a failure would put it on the
            // 24h retry loop forever, when the truthful answer is that it has
            // no location and never will.
            if (! is_array($data) || ($data['bogon'] ?? false)) {
                return ['status' => IpGeolocation::STATUS_PRIVATE];
            }

            return [
                'status' => IpGeolocation::STATUS_RESOLVED,
                'country_code' => $this->trim($data['country'] ?? null, 2),
                'country' => $this->countryName($data['country'] ?? null),
                'region' => $this->trim($data['region'] ?? null, 100),
                'city' => $this->trim($data['city'] ?? null, 100),
                'org' => $this->trim($data['org'] ?? null, 150),
            ];
        } catch (\Throwable $e) {
            // Deliberately swallowed after logging. A geolocation outage must
            // not become an error the provider sees: the demande is still
            // perfectly readable without a city on it.
            Log::warning('Geolocalisation IP indisponible', ['ip' => $ip, 'error' => $e->getMessage()]);

            return ['status' => IpGeolocation::STATUS_FAILED];
        }
    }

    private function store(string $ip, array $attributes): IpGeolocation
    {
        return IpGeolocation::updateOrCreate(
            ['ip_address' => $ip],
            array_merge([
                'country_code' => null,
                'country' => null,
                'region' => null,
                'city' => null,
                'org' => null,
                'resolved_at' => now(),
            ], $attributes),
        );
    }

    private function trim(?string $value, int $length): ?string
    {
        return blank($value) ? null : mb_substr(trim($value), 0, $length);
    }

    // ipinfo's free tier returns a two-letter code, not a name. The provider
    // reads this list, so it gets a French country name. Codes outside the list
    // fall through as-is rather than being dropped -- "SG" tells them more than
    // a blank does.
    private function countryName(?string $code): ?string
    {
        if (blank($code)) {
            return null;
        }

        $names = [
            'MA' => 'Maroc', 'FR' => 'France', 'ES' => 'Espagne', 'DZ' => 'Algerie',
            'TN' => 'Tunisie', 'MR' => 'Mauritanie', 'SN' => 'Senegal', 'CI' => "Cote d'Ivoire",
            'BE' => 'Belgique', 'NL' => 'Pays-Bas', 'DE' => 'Allemagne', 'IT' => 'Italie',
            'GB' => 'Royaume-Uni', 'PT' => 'Portugal', 'CH' => 'Suisse', 'US' => 'Etats-Unis',
            'CA' => 'Canada', 'CN' => 'Chine', 'IN' => 'Inde', 'RU' => 'Russie',
            'TR' => 'Turquie', 'AE' => 'Emirats Arabes Unis', 'SA' => 'Arabie Saoudite',
            'EG' => 'Egypte', 'NG' => 'Nigeria', 'BR' => 'Bresil', 'VN' => 'Vietnam',
            'ID' => 'Indonesie', 'PK' => 'Pakistan', 'BD' => 'Bangladesh', 'UA' => 'Ukraine',
            'PL' => 'Pologne', 'RO' => 'Roumanie', 'SG' => 'Singapour', 'HK' => 'Hong Kong',
            'JP' => 'Japon', 'KR' => 'Coree du Sud', 'AU' => 'Australie', 'ZA' => 'Afrique du Sud',
        ];

        return $names[strtoupper($code)] ?? strtoupper($code);
    }
}
