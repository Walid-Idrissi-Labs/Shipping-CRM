<?php

namespace App\Services;

class FiscalCalculator
{
    public const TVA_NATIONAL = 10.00;

    public const TVA_INTERNATIONAL = 20.00;

    /**
     * Calcule TVA et TTC pour une facture selon le type et la base taxable saisie.
     *
     - National: non_taxable = 0 (verrouillé). tva = taxable * 0.10. ttc = taxable * 1.10.
     - International: non_taxable = saisi. tva = taxable * 0.20. ttc = non_taxable + (taxable * 1.20).
     *
     * Retourne [taux_tva, non_taxable, taxable, tva, ttc].
     */
    public static function compute(string $typeDestination, float $taxable, float $nonTaxable = 0.0): array
    {
        $type = trim((string) $typeDestination);

        if ($type === 'national') {
            return self::national($taxable);
        }

        if ($type === 'international') {
            return self::international($taxable, $nonTaxable);
        }

        throw new \InvalidArgumentException("type_destination invalide: {$typeDestination}");
    }

    /**
     * Calcule en stockant les valeurs comme NEGATIVES (utilisé pour les avoirs).
     */
    public static function computeNegative(string $typeDestination, float $taxable, float $nonTaxable = 0.0): array
    {
        [$taux, $nt, $tb, $tva, $ttc] = self::compute($typeDestination, $taxable, $nonTaxable);

        return [
            $taux,
            -abs($nt),
            -abs($tb),
            -abs($tva),
            -abs($ttc),
        ];
    }

    private static function national(float $taxable): array
    {
        $taxable = max(0, $taxable);
        $taux = self::TVA_NATIONAL;
        $tva = round($taxable * ($taux / 100), 2);
        $ttc = round($taxable + $tva, 2);

        return [$taux, 0.0, round($taxable, 2), $tva, $ttc];
    }

    private static function international(float $taxable, float $nonTaxable): array
    {
        $taxable = max(0, $taxable);
        $nonTaxable = max(0, $nonTaxable);
        $taux = self::TVA_INTERNATIONAL;
        $tva = round($taxable * ($taux / 100), 2);
        $ttc = round($nonTaxable + $taxable + $tva, 2);

        return [$taux, round($nonTaxable, 2), round($taxable, 2), $tva, $ttc];
    }
}
