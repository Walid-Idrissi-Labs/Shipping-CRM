<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestDiversShipmentsSeeder extends Seeder
{
    public function run(): void
    {
        $provider = Provider::query()->first();
        if (! $provider) {
            $this->command->error('No provider found in the database. Cannot seed.');
            return;
        }

        $user = User::where('id', $provider->user_id)->first() ?? User::where('role', 'prestataire')->first() ?? User::first();

        $existingTestShipments = Shipment::where('description_colis', 'like', 'Test divers shipment%')
            ->where('provider_id', $provider->id)
            ->get();
        if ($existingTestShipments->isNotEmpty()) {
            DB::table('suivi_statuts')->whereIn('expedition_id', $existingTestShipments->pluck('id'))->delete();
            DB::table('shipments')->whereIn('id', $existingTestShipments->pluck('id'))->delete();
            $this->command->info('Cleaned up ' . $existingTestShipments->count() . ' previous test shipments.');
        }

        $sharedSender = [
            'sender_name' => 'Test Sender',
            'sender_company' => 'Test Sender SARL',
            'sender_address' => '45 Avenue Mohammed V',
            'sender_city' => 'Casablanca',
            'sender_postal_code' => '20000',
            'sender_country' => 'Maroc',
            'sender_phone' => '+212600000000',
            'sender_email' => 'sender@example.test',
        ];

        $diversGroups = [
            [
                'nom' => 'Client Divers 1',
                'adresse' => '12 Rue Allal Ben Abdellah',
                'tel' => '+212611111111',
                'email' => 'divers1@example.test',
            ],
            [
                'nom' => 'Client Divers 2',
                'adresse' => '78 Boulevard Mohammed V',
                'tel' => '+212622222222',
                'email' => 'divers2@example.test',
            ],
        ];

        $created = 0;

        foreach ($diversGroups as $groupIndex => $group) {
            for ($i = 1; $i <= 5; $i++) {
                $recipientNumber = ($groupIndex * 5) + $i;

                $existing = Shipment::where('shipping_number', $this->uniqueShippingNumber())->first();
                if ($existing) {
                    continue;
                }

                $shipment = Shipment::create(array_merge($sharedSender, [
                    'provider_id' => $provider->id,
                    'client_id' => null,
                    'created_by' => $user?->id,
                    'shipping_number' => $this->uniqueShippingNumber(),
                    'recipient_name' => $group['nom'] . " Destinataire {$i}",
                    'recipient_company' => $group['nom'],
                    'recipient_address' => $group['adresse'],
                    'recipient_city' => 'Rabat',
                    'recipient_postal_code' => '10000',
                    'recipient_country' => 'Maroc',
                    'recipient_phone' => $group['tel'],
                    'recipient_email' => $group['email'],
                    'poids' => 2.500,
                    'longueur' => 30.00,
                    'largeur' => 20.00,
                    'hauteur' => 15.00,
                    'nb_pieces' => 1,
                    'valeur_declaree' => 500.00,
                    'devise_valeur' => 'MAD',
                    'type_colis' => 'paquet',
                    'description_colis' => "Test divers shipment #{$recipientNumber} for {$group['nom']}",
                    'type_service' => 'national',
                    'statut_actuel' => 'livre',
                    'sous_statut_actuel' => null,
                ]));

                $shipment->suiviStatuts()->create([
                    'statut' => 'livre',
                    'sous_statut' => null,
                    'date_statut' => now(),
                    'description' => 'Test seed shipment (livre).',
                ]);

                $created++;
            }
        }

        $this->command->info("Created {$created} divers shipments.");
    }

    protected function uniqueShippingNumber(): string
    {
        do {
            $number = str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        } while (Shipment::where('shipping_number', $number)->exists());

        return $number;
    }
}
