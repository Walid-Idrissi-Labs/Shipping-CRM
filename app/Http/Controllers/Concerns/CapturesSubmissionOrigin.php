<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

// Records where a public submission came from, and screens out the automated
// ones, for the two forms anyone on the internet can post to.
//
// Only for genuinely public endpoints. The client-side equivalents sit behind a
// login, where we already know exactly who submitted and the traps below would
// be noise.
trait CapturesSubmissionOrigin
{
    // The hidden field bots fill in. Named to look like an ordinary optional
    // field to a scraper reading the DOM, while being something no browser
    // autofill profile recognises -- autofill dropping a value into a honeypot
    // is the one way this trap misfires on a real person.
    private const HONEYPOT_FIELD = 'company_website';

    // Nobody types a name, an address and a parcel's dimensions in under three
    // seconds. Set well below the fastest plausible human rather than near the
    // average, because the cost of the two errors is not symmetric: a bot that
    // slips through is one more demande to reject by hand, a real prospect who
    // is turned away is gone without either of you knowing.
    private const MIN_HUMAN_SECONDS = 3;

    /**
     * Columns to persist alongside the submission.
     *
     * @return array{ip_address: ?string, ip_forwarded_for: ?string, bot_signal: ?string}
     */
    protected function originAttributes(Request $request): array
    {
        return [
            'ip_address' => $request->ip(),

            // Stored raw and unparsed. Laravel ignores this header entirely
            // unless config/security.php names a trusted proxy, so on a host
            // where we are not yet sure (OVH mutualise) this column is the
            // evidence: a private ip_address next to a public value here means
            // there is a proxy in front and the config needs setting.
            'ip_forwarded_for' => $this->headerSnippet($request, 'X-Forwarded-For'),

            'bot_signal' => $this->suspicionSignal($request),
        ];
    }

    /**
     * Reject submissions that are certainly automated, before any record exists.
     *
     * @throws ValidationException
     */
    protected function rejectAutomatedSubmission(Request $request): void
    {
        if (! $this->isCertainlyABot($request)) {
            return;
        }

        // A deliberately ordinary-looking error rather than a silent fake
        // success. Discarding quietly would read better to a bot, but the day
        // this trap misfires on a real prospect -- a stray autofill, a browser
        // extension -- that person would walk away certain they had contacted
        // us. Erring on the side of the human means telling them something is
        // wrong and giving them a phone to reach, without naming the trap and
        // handing an actual spammer the fix.
        throw ValidationException::withMessages([
            'form' => ["Votre demande n'a pas pu etre validee. Merci de reessayer, ou de nous contacter par telephone."],
        ]);
    }

    private function isCertainlyABot(Request $request): bool
    {
        // Filled honeypot. A human never sees this field, so a value in it was
        // put there by something reading the markup rather than the page.
        if (filled($request->input(self::HONEYPOT_FIELD))) {
            return true;
        }

        $elapsed = $request->input('form_elapsed_ms');

        // Absence is not evidence -- an older cached bundle would not send it,
        // and stranding those visitors to catch a bot is a bad trade. It only
        // counts against a submission when it is present and impossibly fast.
        return is_numeric($elapsed) && $elapsed >= 0 && $elapsed < self::MIN_HUMAN_SECONDS * 1000;
    }

    // Softer tells, recorded on the row rather than acted on. None is
    // conclusive enough to refuse a demande over, but shown next to the IP they
    // let the provider judge for themselves -- which is the whole point of this
    // feature. Feeding the decision beats pre-empting it.
    private function suspicionSignal(Request $request): ?string
    {
        if (! $request->has('form_elapsed_ms')) {
            return 'sans_mesure_de_saisie';
        }

        if (blank($request->userAgent())) {
            return 'sans_navigateur';
        }

        return null;
    }

    private function headerSnippet(Request $request, string $header): ?string
    {
        $value = $request->headers->get($header);

        return blank($value) ? null : mb_substr($value, 0, 255);
    }
}
