<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Facture;
use App\Models\Reclamation;
use App\Models\ReclamationMessage;
use App\Models\Shipment;

// Both sides of a reclamation render the same thread, so both sides serialise
// it here. The only thing that differs is the caller's side, which decides what
// counts as unread and where the "rattache a" link points -- the client must
// never be handed a /dashboard URL and vice versa.
trait PresentsReclamations
{
    /**
     * @param  'client'|'prestataire'  $side
     */
    protected function presentThread(Reclamation $reclamation, string $side, bool $withMessages = false): array
    {
        $last = $reclamation->messages->last();
        $subjectLabel = $this->subjectLabel($reclamation);

        $payload = [
            'id' => $reclamation->id,
            'reference' => $reclamation->reference,
            'type' => $reclamation->type,
            'sujet' => $reclamation->sujet,
            'statut' => $reclamation->statut,
            'subject_type' => $reclamation->subject_type,
            'subject_id' => $reclamation->subject_id,
            'subject_label' => $subjectLabel,
            'subject_link' => $subjectLabel ? $this->subjectLink($reclamation, $side) : null,
            'created_at' => $reclamation->created_at,
            'last_message_at' => $reclamation->last_message_at,
            'messages_count' => $reclamation->messages->count(),
            'unread_count' => $reclamation->unreadCountFor($side === 'client' ? 'client' : 'provider'),
            'last_message_excerpt' => $last ? $this->excerpt($last->corps) : null,
            'last_message_author_role' => $last?->author_role,
        ];

        // The client already knows who they are; sending their own record back
        // on every row is noise the provider inbox genuinely needs and they do not.
        if ($side === 'prestataire' && $reclamation->relationLoaded('client') && $reclamation->client) {
            $payload['client'] = [
                'id' => $reclamation->client->id,
                'full_name' => $reclamation->client->full_name,
                'company_name' => $reclamation->client->company_name,
            ];
        }

        if ($withMessages) {
            $payload['messages'] = $reclamation->messages
                ->map(fn (ReclamationMessage $m) => $this->presentMessage($m, $reclamation))
                ->values();
        }

        return $payload;
    }

    protected function presentMessage(ReclamationMessage $message, Reclamation $reclamation): array
    {
        return [
            'id' => $message->id,
            'author_role' => $message->author_role,
            'author_name' => $this->authorName($message, $reclamation),
            'corps' => $message->corps,
            'created_at' => $message->created_at,
        ];
    }

    /**
     * The label a thread's attached expedition or facture shows in the UI.
     * Returns null when the record has since been deleted -- see the migration.
     */
    protected function subjectLabel(Reclamation $reclamation): ?string
    {
        if (! $reclamation->subject_type || ! $reclamation->subject_id) {
            return null;
        }

        if ($reclamation->subject_type === 'shipment') {
            $shipment = Shipment::find($reclamation->subject_id);

            return $shipment ? "Expédition {$shipment->shipping_number}" : null;
        }

        $facture = Facture::find($reclamation->subject_id);

        return $facture ? "Facture {$facture->numero}" : null;
    }

    protected function subjectLink(Reclamation $reclamation, string $side): string
    {
        $routes = [
            'client' => ['shipment' => '/client/mes-expeditions/', 'facture' => '/client/mes-factures/'],
            'prestataire' => ['shipment' => '/dashboard/expeditions/', 'facture' => '/dashboard/factures/'],
        ];

        return $routes[$side][$reclamation->subject_type] . $reclamation->subject_id;
    }

    private function authorName(ReclamationMessage $message, Reclamation $reclamation): string
    {
        if ($message->author_role === 'client') {
            $client = $reclamation->client;

            return $client?->company_name ?: ($client?->full_name ?: 'Client');
        }

        // Never "le prestataire" -- see AGENTS.md.
        return 'Notre équipe';
    }

    private function excerpt(string $corps, int $length = 120): string
    {
        $flat = trim(preg_replace('/\s+/u', ' ', $corps));

        return mb_strlen($flat) > $length ? mb_substr($flat, 0, $length - 1) . '…' : $flat;
    }
}
