<?php

namespace App\Http\Controllers\Concerns;

use Carbon\Carbon;
use Closure;

trait ValidatesFutureDate
{
    /**
     * Build a validation closure that parses the given value in the provider's own
     * timezone (rather than the server's) and rejects it if it lands after "now" in
     * that same timezone. Keeps status-date validation correct regardless of what
     * timezone the app server itself runs in.
     */
    protected function notInFutureRule(string $timezone): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($timezone) {
            $date = Carbon::parse($value, $timezone);

            if ($date->gt(Carbon::now($timezone))) {
                $fail('La date ne peut pas être dans le futur.');
            }
        };
    }
}
