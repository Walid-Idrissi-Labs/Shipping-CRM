<?php

namespace App\Services;

/**
 * Convertit un montant en toutes lettres (orthographe traditionnelle),
 * pour la mention légale « Arrêté la présente facture à la somme de … »
 * exigée sur les factures marocaines.
 */
class NumberToFrenchWords
{
    private const UNITS = [
        'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf',
    ];

    private const TENS = [
        2 => 'vingt', 3 => 'trente', 4 => 'quarante', 5 => 'cinquante', 6 => 'soixante',
    ];

    /**
     * Montant monétaire en lettres : 4520,50 -> "quatre mille cinq cent vingt
     * dirhams et cinquante centimes".
     */
    public static function amount(
        float $amount,
        string $unitSingular = 'dirham',
        string $unitPlural = 'dirhams',
        string $subunitSingular = 'centime',
        string $subunitPlural = 'centimes'
    ): string {
        $amount = round(abs($amount), 2);
        $integer = (int) floor($amount);
        $cents = (int) round(($amount - $integer) * 100);
        if ($cents === 100) {
            $integer++;
            $cents = 0;
        }

        $unit = $integer > 1 ? $unitPlural : $unitSingular;
        // « deux millions DE dirhams » quand le nombre se termine par million/milliard.
        $de = ($integer >= 1_000_000 && $integer % 1_000_000 === 0) ? ' de' : '';

        if ($integer === 0 && $cents > 0) {
            return self::spell($cents) . ' ' . ($cents > 1 ? $subunitPlural : $subunitSingular);
        }

        $words = self::spell($integer) . $de . ' ' . $unit;

        if ($cents > 0) {
            $words .= ' et ' . self::spell($cents) . ' ' . ($cents > 1 ? $subunitPlural : $subunitSingular);
        }

        return $words;
    }

    /** Nombre entier en lettres (0 à 999 999 999 999). */
    public static function spell(int $number): string
    {
        if ($number < 0) {
            return 'moins ' . self::spell(-$number);
        }

        if ($number < 20) {
            return self::UNITS[$number];
        }

        if ($number < 100) {
            return self::belowHundred($number);
        }

        if ($number < 1000) {
            return self::belowThousand($number);
        }

        if ($number < 1_000_000) {
            $thousands = intdiv($number, 1000);
            $rest = $number % 1000;
            $prefix = $thousands === 1 ? 'mille' : self::belowThousand($thousands, final: false) . ' mille';

            return $rest === 0 ? $prefix : $prefix . ' ' . self::spell($rest);
        }

        foreach ([1_000_000_000 => 'milliard', 1_000_000 => 'million'] as $scale => $word) {
            if ($number >= $scale) {
                $count = intdiv($number, $scale);
                $rest = $number % $scale;
                $prefix = self::spell($count) . ' ' . $word . ($count > 1 ? 's' : '');

                return $rest === 0 ? $prefix : $prefix . ' ' . self::spell($rest);
            }
        }

        return self::UNITS[0];
    }

    private static function belowHundred(int $n, bool $final = true): string
    {
        if ($n < 20) {
            return self::UNITS[$n];
        }

        // 70-79 et 90-99 se construisent sur soixante / quatre-vingt + 10-19.
        if ($n >= 70 && $n < 80) {
            return $n === 71 ? 'soixante et onze' : 'soixante-' . self::UNITS[$n - 60];
        }
        if ($n >= 90) {
            return 'quatre-vingt-' . self::UNITS[$n - 80];
        }
        if ($n >= 80) {
            return $n === 80 ? ($final ? 'quatre-vingts' : 'quatre-vingt') : 'quatre-vingt-' . self::UNITS[$n - 80];
        }

        $ten = self::TENS[intdiv($n, 10)];
        $unit = $n % 10;

        if ($unit === 0) {
            return $ten;
        }
        if ($unit === 1) {
            return $ten . ' et un';
        }

        return $ten . '-' . self::UNITS[$unit];
    }

    private static function belowThousand(int $n, bool $final = true): string
    {
        if ($n < 100) {
            return self::belowHundred($n, $final);
        }

        $hundreds = intdiv($n, 100);
        $rest = $n % 100;

        if ($hundreds === 1) {
            $prefix = 'cent';
        } else {
            // « deux cents » mais « deux cent trois » ; pas de s non plus devant « mille ».
            $prefix = self::UNITS[$hundreds] . ' cent' . ($rest === 0 && $final ? 's' : '');
        }

        return $rest === 0 ? $prefix : $prefix . ' ' . self::belowHundred($rest, $final);
    }
}
