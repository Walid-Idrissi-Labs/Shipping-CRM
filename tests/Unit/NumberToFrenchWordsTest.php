<?php

namespace Tests\Unit;

use App\Services\NumberToFrenchWords;
use PHPUnit\Framework\TestCase;

class NumberToFrenchWordsTest extends TestCase
{
    public function test_spells_integers_with_french_particularities(): void
    {
        $cases = [
            0 => 'zéro',
            21 => 'vingt et un',
            71 => 'soixante et onze',
            80 => 'quatre-vingts',
            81 => 'quatre-vingt-un',
            91 => 'quatre-vingt-onze',
            100 => 'cent',
            200 => 'deux cents',
            203 => 'deux cent trois',
            380 => 'trois cent quatre-vingts',
            1000 => 'mille',
            1971 => 'mille neuf cent soixante et onze',
            80000 => 'quatre-vingt mille',
            200000 => 'deux cent mille',
            1000000 => 'un million',
            2000000 => 'deux millions',
            2500000 => 'deux millions cinq cent mille',
        ];

        foreach ($cases as $number => $expected) {
            $this->assertSame($expected, NumberToFrenchWords::spell($number), "spell({$number})");
        }
    }

    public function test_spells_amounts_with_dirhams_and_centimes(): void
    {
        $this->assertSame(
            'quatre mille cinq cent vingt dirhams et cinquante centimes',
            NumberToFrenchWords::amount(4520.50)
        );
        $this->assertSame('un dirham et cinq centimes', NumberToFrenchWords::amount(1.05));
        $this->assertSame('soixante-quinze centimes', NumberToFrenchWords::amount(0.75));
        $this->assertSame('mille dirhams', NumberToFrenchWords::amount(1000.00));
        $this->assertSame('deux millions de dirhams', NumberToFrenchWords::amount(2000000));
        // Un avoir stocke des montants négatifs : la mention reste en valeur absolue.
        $this->assertSame('cent dirhams', NumberToFrenchWords::amount(-100.0));
        // Les arrondis flottants ne doivent pas produire « cent centimes ».
        $this->assertSame('deux dirhams', NumberToFrenchWords::amount(1.9999));
    }
}
