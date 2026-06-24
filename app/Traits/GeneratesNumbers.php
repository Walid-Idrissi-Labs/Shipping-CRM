<?php

namespace App\Traits;

use App\Models\Client;
use App\Models\Quote;
use App\Models\Shipment;
use App\Models\Facture;
use App\Models\Avoir;

trait GeneratesNumbers
{
    protected function generateAccountNumber(): string
    {
        do {
            $number = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (Client::where('account_number', $number)->exists());

        return $number;
    }

    protected function generateOriginPassword(): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $password = '';
        for ($i = 0; $i < 6; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $password;
    }

    protected function generateShippingNumber(): string
    {
        do {
            $number = str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        } while (Shipment::where('shipping_number', $number)->exists());

        return $number;
    }

    protected function nextQuoteSequence(): array
    {
        $year = now()->year;
        $last = Quote::where('quote_year', $year)->max('quote_sequence') ?? 0;

        return ['sequence' => $last + 1, 'year' => $year];
    }

    protected function nextInvoiceSequence(): array
    {
        $year = now()->year;
        $last = Facture::where('annee', $year)->max('numero_n') ?? 0;

        return ['sequence' => $last + 1, 'year' => $year];
    }

    protected function nextAvoirSequence(): array
    {
        $year = now()->year;
        $last = Avoir::where('annee', $year)->max('numero_n') ?? 0;

        return ['sequence' => $last + 1, 'year' => $year];
    }
}
