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
     * La TVA et le TTC sont derives de la base SAISIE, pas de la base arrondie :
     * pour 86,825 le TTC vaut 330,81 + 86,825 * 1,20 = 435,00, et non 435,01 qu'on
     * obtiendrait en arrondissant la base a 86,83 d'abord (un centime de trop
     * facture au client). Seul l'affichage de la base est arrondi.
     *
     * L'arrondi passe par self::round2() et non par round() : voir la note qui
     * accompagne cette methode, c'est ce qui fait coller le total enregistre a
     * celui annonce par l'ecran de creation.
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
        $tva = self::round2($taxable * ($taux / 100));
        $ttc = self::round2($taxable + $tva);

        return [$taux, 0.0, self::round2($taxable), $tva, $ttc];
    }

    private static function international(float $taxable, float $nonTaxable): array
    {
        $taxable = max(0, $taxable);
        $nonTaxable = max(0, $nonTaxable);
        $taux = self::TVA_INTERNATIONAL;
        $tva = self::round2($taxable * ($taux / 100));
        $ttc = self::round2($nonTaxable + $taxable + $tva);

        return [$taux, self::round2($nonTaxable), self::round2($taxable), $tva, $ttc];
    }

    /**
     * Arrondi au centime identique a Number.prototype.toFixed(2) en JavaScript.
     *
     * Pourquoi pas round() : les deux n'arrondissent pas la meme valeur. La somme
     * 330,81 + 86,825 + 17,37 vaut en flottant 435,004999999999995..., un poil SOUS
     * la limite. toFixed() arrondit cette valeur binaire exacte et donne donc 435,00,
     * alors que round() "recale" d'abord le nombre sur son ecriture decimale courte
     * (435,005) puis arrondit vers le haut : 435,01. D'ou l'ecart d'un centime entre
     * l'ecran de creation (JS) et la facture enregistree (PHP).
     *
     * sprintf('%.2f') ne suffit pas non plus : sur une egalite binaire exacte
     * (23,295 + 2,33 = 25,625, representable exactement) il arrondit au pair, 25,62,
     * la ou toFixed() s'ecarte de zero, 25,63.
     *
     * On reproduit donc la regle de toFixed() : arrondir le developpement decimal
     * exact du double, en s'ecartant de zero en cas d'egalite parfaite. sprintf
     * '%.53F' donne ce developpement exact (53 est le maximum de PHP, largement au
     * dela de l'ulp d'un montant de facture, donc aucune troncature significative).
     */
    private static function round2(float $value): float
    {
        if (! is_finite($value)) {
            return 0.0;
        }

        [$int, $frac] = explode('.', sprintf('%.53F', abs($value)), 2);
        $rest = substr($frac, 2);
        $cents = ((int) $int) * 100 + ((int) substr($frac, 0, 2));

        // $rest >= "500...0" : on s'ecarte de zero (egalite comprise).
        if (strcmp($rest, str_pad('5', strlen($rest), '0')) >= 0) {
            $cents++;
        }

        return $value < 0 ? -($cents / 100) : $cents / 100;
    }
}
