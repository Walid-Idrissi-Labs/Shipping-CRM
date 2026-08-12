<?php

namespace Tests\Unit;

use App\Services\FiscalCalculator;
use PHPUnit\Framework\TestCase;

class FiscalCalculatorTest extends TestCase
{
    /**
     * Invariant fiscal : les lignes imprimees sur la facture doivent s'additionner
     * au total imprime. Une base saisie a 3 decimales cassait ca avant (la TVA et
     * le TTC etaient derives de la base brute, la base stockee etait arrondie).
     */
    public function test_stored_lines_always_sum_to_the_ttc(): void
    {
        $cases = [
            ['international', 86.825, 330.81],
            ['international', 0.615, 0.0],
            ['international', 2.675, 1.005],
            ['international', 100.0, 0.0],
            ['national', 86.825, 0.0],
            ['national', 1.005, 0.0],
            ['national', 1234.567, 0.0],
        ];

        foreach ($cases as [$type, $taxable, $nonTaxable]) {
            [, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute($type, $taxable, $nonTaxable);

            $this->assertSame(
                $ttc,
                round($nt + $tb + $tva, 2),
                "non_taxable + taxable + tva doit valoir ttc pour {$type} {$taxable}/{$nonTaxable}"
            );
        }
    }

    public function test_three_decimal_base_is_rounded_before_deriving_tva_and_ttc(): void
    {
        [$taux, $nt, $tb, $tva, $ttc] = FiscalCalculator::compute('international', 86.825, 330.81);

        $this->assertSame(20.0, $taux);
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
        $this->assertSame(95.51, $ttc);
    }

    public function test_credit_notes_keep_the_invariant_on_negative_values(): void
    {
        [, $nt, $tb, $tva, $ttc] = FiscalCalculator::computeNegative('international', 86.825, 330.81);

        $this->assertSame(-435.01, $ttc);
        $this->assertSame($ttc, round($nt + $tb + $tva, 2));
    }
}
