<?php

namespace App\Services;

use App\Models\AccountRequest;
use App\Models\BlockedIp;
use App\Models\QuoteRequest;
use Illuminate\Http\Request;

// Builds the "Origine de la demande" block the provider sees, and the evidence
// they need before deciding to block.
//
// The counts below are the part that earns its keep. Blocking an address is
// easy to do and easy to regret: a company office is one address for everyone
// in it, and Moroccan mobile carriers put thousands of subscribers behind a
// single one. So the panel does not just say "here is an IP, block it?" -- it
// says how many demandes have ever come from that address and how many of them
// turned into real business, so a block that would cut off a returning customer
// is visible before the click rather than discovered weeks later.
class SubmissionOrigin
{
    public function __construct(private IpGeolocator $geolocator) {}

    public function describe(?string $ip, ?string $forwardedFor, ?string $botSignal, Request $viewer): array
    {
        if (blank($ip)) {
            // Demandes submitted before this feature shipped have no address.
            // Saying so plainly beats an empty panel the provider has to guess at.
            return [
                'ip_address' => null,
                'unavailable_reason' => 'Cette demande est anterieure a l\'enregistrement des adresses IP.',
            ];
        }

        $geo = $this->geolocator->resolve($ip);

        return [
            'ip_address' => $ip,
            'geo' => $geo?->toDisplayArray(),
            'bot_signal' => $botSignal,
            'is_blocked' => BlockedIp::isBlocked($ip),

            // Blocking the address you are currently browsing from is the one
            // mistake that locks the provider out of their own public forms.
            'is_your_own_ip' => $ip === $viewer->ip(),

            // True when the stored address is a private one while a forwarded
            // header was present: the host is proxying and config/security.php
            // has not been told. Surfaced rather than hidden, because in that
            // state every demande shares one meaningless address and blocking
            // would hit every visitor at once.
            'proxy_misconfigured' => $this->looksProxied($ip, $forwardedFor),

            'history' => $this->history($ip),
        ];
    }

    private function looksProxied(string $ip, ?string $forwardedFor): bool
    {
        return filled($forwardedFor)
            && ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    /**
     * What this address has ever sent us, across both public forms.
     */
    public function history(string $ip): array
    {
        $quotes = QuoteRequest::where('ip_address', $ip);
        $accounts = AccountRequest::where('ip_address', $ip);

        $total = (clone $quotes)->count() + (clone $accounts)->count();

        // "Accepted" means a human here judged it real: a devis that was
        // processed, or an account request that became a client. One of these
        // is the strongest possible argument against blocking.
        $accepted = (clone $quotes)->where('statut', 'traitee')->count()
            + (clone $accounts)->where('statut', 'approuvee')->count();

        return [
            'total_requests' => $total,
            'accepted_requests' => $accepted,
        ];
    }
}
