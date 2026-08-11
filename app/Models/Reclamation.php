<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'provider_id', 'client_id', 'reference', 'type', 'sujet', 'statut',
    'subject_type', 'subject_id', 'last_message_at',
    'client_read_message_id', 'provider_read_message_id',
])]
class Reclamation extends Model
{
    public const TYPES = ['remarque', 'reclamation'];

    public const STATUTS = ['ouverte', 'en_traitement', 'resolue'];

    public const SUBJECT_TYPES = ['shipment', 'facture'];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function messages()
    {
        return $this->hasMany(ReclamationMessage::class)->orderBy('created_at');
    }

    /**
     * Per-year sequential reference, e.g. REC-2026-0007.
     *
     * Derived from the highest reference rather than a row count, so deleting a
     * thread never hands its number to the next one. Racy in the same way the
     * quote and facture numbering already is; the unique index on `reference`
     * turns a collision into a failed insert rather than two threads sharing a
     * number, and the caller retries with $offset advanced.
     */
    public static function nextReference(int $offset = 0): string
    {
        $year = now()->year;

        // Zero-padded to four digits so a lexicographic MAX is also the
        // numeric one. A year with more than 9999 threads would break that,
        // which is several orders of magnitude past this business.
        $highest = static::where('reference', 'like', "REC-{$year}-%")->max('reference');
        $sequence = $highest ? (int) substr($highest, -4) : 0;

        return sprintf('REC-%d-%04d', $year, $sequence + 1 + $offset);
    }

    /** Messages from the other side that this one has not seen yet. */
    public function unreadCountFor(string $side): int
    {
        $watermark = (int) ($side === 'client' ? $this->client_read_message_id : $this->provider_read_message_id);
        $otherRole = $side === 'client' ? 'prestataire' : 'client';

        return $this->messages
            ->where('author_role', $otherRole)
            ->where('id', '>', $watermark)
            ->count();
    }

    /** The watermark value that marks this thread fully read. */
    public function latestMessageId(): ?int
    {
        return $this->messages()->max('id');
    }

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
