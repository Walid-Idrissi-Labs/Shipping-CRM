<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientActivity;

class ClientActivityLogger
{
    public static function log(
        Client $client,
        string $type,
        ?string $description = null,
        ?string $subjectType = null,
        ?int $subjectId = null,
    ): void {
        try {
            ClientActivity::create([
                'provider_id' => $client->provider_id,
                'client_id' => $client->id,
                'type' => $type,
                'description' => $description,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'created_at' => now(),
            ]);

            // This host has no cron/queue worker (see MAINTENANCE.md), so
            // retention is enforced opportunistically on writes rather than
            // via a scheduled prune job.
            ClientActivity::where('created_at', '<', now()->subDays(30))->delete();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
