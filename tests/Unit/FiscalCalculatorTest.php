<?php

namespace Tests\Unit;

use App\Services\FiscalCalculator;
use PHPUnit\Framework\TestCase;

/**
 * La reference de ces tests, c'est l'ecran de creation de facture : les montants
 * enregistres doivent etre exactement ceux que le provider a vus avant de valider.
 * Cote frontend le calcul vit dans frontend/src/lib/fiscal.js et s'appuie sur
 * toFixed(2) ; FiscalCalculator::round2() est ecrit pour reproduire cette regle.
 *
 * Les valeurs attendues ci-dessous ont ete relevees sur le pipeline JS d'origine,
 * pas calculees a la main.
 */
class FiscalCalculatorTest extends TestCase
{
    /**
     * Le cas qui a motive le correctif : facture FE 222/2026. La base saisie a
     * 3 decimales donne un TTC de 435,00 (330,81 + 86,825 * 1,20). L'ecran de
     * creation l'affichait bien, mais round() enregistrait 435,01.
     */
    public function test_three_decimal_base_matches_what_the_creation_screen_shows(): void
    {
        [$taux, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute('international', 86.825, 330.81);

        $this->assertSame(20.0, $taux);
        $this->assertSame(330.81, $nt);
        $this->assertSame(86.83, $tb, 'la base est arrondie pour l\'affichage seulement');
        $this->assertSame(17.37, $tva);
        $this->assertSame(435.00, $ttc, 'round() donnait 435,01 ici');
    }

    /**
     * Cas ou round() derape : la somme flottante tombe juste SOUS la limite du
     * centime, round() la recale sur son ecriture decimale courte et arrondit
     * vers le haut, l'ecran de creation non.
     */
    public function test_sums_just_below_the_centime_boundary_round_down(): void
    {
        $cases = [
            ['international', 40.961, 14.234, 63.38],
            ['international', 115.211, 142.944, 281.19],
            ['international', 39.237, 128.168, 175.25],
            ['international', 123.237, 42.618, 190.50],
            ['national', 193.225, 0.0, 212.54],
            ['national', 170.375, 0.0, 187.41],
        ];

        foreach ($cases as [$type, $taxable, $nonTaxable, $expected]) {
            [, , , , $ttc] = FiscalCalculator::compute($type, $taxable, $nonTaxable);
            $this->assertSame($expected, $ttc, "ttc pour {$type} {$taxable}/{$nonTaxable}");
        }
    }

    /**
     * Le pendant : sur une egalite binaire EXACTE (25,625 est representable tel
     * quel), toFixed() s'ecarte de zero. C'est ce qui interdit d'implementer
     * round2() avec sprintf('%.2f'), qui lui arrondit au pair et donnerait 25,62.
     */
    public function test_exact_binary_ties_round_away_from_zero(): void
    {
        $cases = [
            ['national', 23.295, 0.0, 25.63],
            ['national', 61.935, 0.0, 68.13],
            ['national', 100.115, 0.0, 110.13],
            ['international', 75.807, 63.658, 154.63],
        ];

        foreach ($cases as [$type, $taxable, $nonTaxable, $expected]) {
            [, , , , $ttc] = FiscalCalculator::compute($type, $taxable, $nonTaxable);
            $this->assertSame($expected, $ttc, "ttc pour {$type} {$taxable}/{$nonTaxable}");
        }
    }

    public function test_plain_two_decimal_bases_are_unaffected(): void
    {
        [, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute('international', 86.83, 330.81);

        $this->assertSame(330.81, $nt);
        $this->assertSame(86.83, $tb);
        $this->assertSame(17.37, $tva);
        $this->assertSame(435.01, $ttc);
    }

    public function test_national_locks_non_taxable_to_zero(): void
    {
        [$taux, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute('national', 86.825, 999.0);

        $this->assertSame(10.0, $taux);
        $this->assertSame(0.0, $nt);
        $this->assertSame(86.83, $tb);
        $this->assertSame(8.68, $tva);
        $this->assertSame(95.50, $ttc, 'round() donnait 95,51 ici');
    }

    public function test_credit_notes_mirror_the_invoice_with_negative_values(): void
    {
        [, $nt, $tb, $tva, $ttc] = FiscalCalculator::computeNegative('international', 86.825, 330.81);

        $this->assertSame(-330.81, $nt);
        $this->assertSame(-86.83, $tb);
        $this->assertSame(-17.37, $tva);
        $this->assertSame(-435.00, $ttc);
    }

    public function test_zero_and_negative_input_are_clamped(): void
    {
        [, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute('international', -5.0, -3.0);

        $this->assertSame(0.0, $nt);
        $this->assertSame(0.0, $tb);
        $this->assertSame(0.0, $tva);
        $this->assertSame(0.0, $ttc);
    }
}
