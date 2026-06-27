<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestEnCompteClientSeeder extends Seeder
{
    protected string $clientEmail = 'k.benali@atlas-distribution.ma';
    protected string $clientCompany = 'Atlas Distribution Maroc';
    protected string $clientFullName = 'Karim Benali';

    public function run(): void
    {
        $provider = Provider::query()->first();
        if (! $provider) {
            $this->command->error('No provider found in the database. Cannot seed.');
            return;
        }

        $existingClients = Client::where('email', $this->clientEmail)
            ->where('provider_id', $provider->id)
            ->get();

        if ($existingClients->isNotEmpty()) {
            $existingShipments = Shipment::whereIn('client_id', $existingClients->pluck('id'))->get();
            DB::table('suivi_statuts')->whereIn('expedition_id', $existingShipments->pluck('id'))->delete();
            DB::table('shipments')->whereIn('id', $existingShipments->pluck('id'))->delete();
            $clientUserIds = $existingClients->pluck('user_id')->filter()->all();
            DB::table('quote_requests')->whereIn('user_id', $clientUserIds)->delete();
            DB::table('clients')->whereIn('id', $existingClients->pluck('id'))->delete();
            DB::table('users')->whereIn('id', $clientUserIds)->delete();
            $this->command->info('Cleaned up previous Atlas Distribution Maroc test data.');
        }

        $clientUser = User::create([
            'role' => 'client',
            'email' => $this->clientEmail,
            'password_hash' => Hash::make('testpassword123'),
            'first_login_completed' => true,
        ]);

        $baseAccount = (string) random_int(100000, 999999);

        $client = Client::create([
            'provider_id' => $provider->id,
            'user_id' => $clientUser->id,
            'account_number' => $this->uniqueAccountNumber($baseAccount),
            'full_name' => $this->clientFullName,
            'company_name' => $this->clientCompany,
            'email' => $this->clientEmail,
            'phone' => '+212522445566',
            'ice' => '002668347000087',
            'address' => '15 Rue Al Jisr, Maarif',
            'postal_code' => '20390',
            'city' => 'Casablanca',
            'country' => 'Maroc',
        ]);

        $senderInfo = [
            'sender_name' => $this->clientFullName,
            'sender_company' => $this->clientCompany,
            'sender_address' => $client->address,
            'sender_city' => $client->city,
            'sender_postal_code' => $client->postal_code,
            'sender_country' => $client->country,
            'sender_phone' => $client->phone,
            'sender_email' => $client->email,
        ];

        $recipientFirstNames = ['Youssef', 'Fatima', 'Rachid', 'Sara', 'Nabil', 'Imane', 'Anas', 'Khadija', 'Mehdi', 'Salma'];
        $recipientLastNames = ['El Amrani', 'Bouazza', 'Chraibi', 'Drissi', 'Fassi', 'Ghali', 'Benkirane', 'Ouali', 'Tahiri', 'Yazidi'];
        $cities = ['Marrakech', 'Fes', 'Rabat', 'Tangier', 'Agadir', 'Oujda', 'Meknes', 'Kenitra', 'Casablanca', 'Tetouan'];
        $countries = ['Maroc', 'France', 'Espagne', 'Belgique', 'Allemagne'];
        $typeServices = ['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage'];
        $statuts = ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre'];
        $typeColisOptions = ['document', 'paquet', 'palette'];

        $created = 0;

        for ($i = 1; $i <= 10; $i++) {
            $statut = $statuts[array_rand($statuts)];
            $typeService = $typeServices[array_rand($typeServices)];
            $typeColis = $typeColisOptions[array_rand($typeColisOptions)];

            $shipment = Shipment::create(array_merge($senderInfo, [
                'provider_id' => $provider->id,
                'client_id' => $client->id,
                'created_by' => $clientUser->id,
                'shipping_number' => $this->uniqueShippingNumber(),
                'recipient_name' => $recipientFirstNames[array_rand($recipientFirstNames)] . ' ' . $recipientLastNames[array_rand($recipientLastNames)],
                'recipient_company' => 'Destinataire Test ' . $i,
                'recipient_address' => random_int(1, 200) . ' Rue Test ' . $i,
                'recipient_city' => $cities[array_rand($cities)],
                'recipient_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'recipient_country' => $countries[array_rand($countries)],
                'recipient_phone' => '+2126' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT),
                'recipient_email' => 'destinataire' . $i . '@example.test',
                'poids' => round(random_int(50, 25000) / 100, 3),
                'longueur' => round(random_int(100, 1500) / 100, 2),
                'largeur' => round(random_int(100, 1500) / 100, 2),
                'hauteur' => round(random_int(100, 1500) / 100, 2),
                'nb_pieces' => random_int(1, 10),
                'valeur_declaree' => round(random_int(100, 20000) / 100, 2),
                'devise_valeur' => 'MAD',
                'type_colis' => $typeColis,
                'description_colis' => "Test en-compte shipment #{$i}",
                'type_service' => $typeService,
                'statut_actuel' => $statut,
                'sous_statut_actuel' => null,
            ]));

            $shipment->suiviStatuts()->create([
                'statut' => $statut,
                'sous_statut' => null,
                'date_statut' => now(),
                'description' => "Initial status for test en-compte shipment #{$i}.",
            ]);

            $created++;
        }

        $this->command->info("Created client '{$this->clientCompany}' with {$created} shipments.");
    }

    protected function uniqueShippingNumber(): string
    {
        do {
            $number = str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        } while (Shipment::where('shipping_number', $number)->exists());

        return $number;
    }

    protected function uniqueAccountNumber(string $base): string
    {
        do {
            $candidate = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (Client::where('account_number', $candidate)->exists());

        return $candidate;
    }
}
