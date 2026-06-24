<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $user = User::create([
            'role' => 'prestataire',
            'email' => 'admin@shippingcrm.test',
            'password_hash' => Hash::make('password123'),
            'first_login_completed' => true,
        ]);

        Provider::create([
            'user_id' => $user->id,
            'company_name' => 'Shipping CRM Demo',
            'address' => '123 Rue de la Logistique',
            'postal_code' => '20000',
            'city' => 'Casablanca',
            'country' => 'Maroc',
            'phone' => '+212 5 22 00 00 00',
            'email' => 'contact@shippingcrm.test',
            'website' => 'https://shippingcrm.test',
            'ice' => '001234567000089',
            'rc' => '123456',
            'if_' => '12345678',
            'cnss' => '1234567',
            'patente' => '12345678',
        ]);
        $this->seedAccountRequests();
    }

    private function seedAccountRequests(): void
    {
        $demandes = [
            [
                'full_name' => 'Ahmed Benjelloun',
                'email' => 'ahmed.b@maroclogistics.ma',
                'phone' => '+212 6 12 34 56 78',
                'address' => '12 Rue du Commerce',
                'city' => 'Casablanca',
                'postal_code' => '20250',
                'ice' => '001234567000090',
                'notes' => 'Client recommande par Mr. Alaoui. Besoin urgent de compte pour facturation.',
                'statut' => 'en_attente',
            ],
            [
                'full_name' => 'Fatima Zahra El Amrani',
                'email' => 'f.amrani@expresscargo.ma',
                'phone' => '+212 6 23 45 67 89',
                'address' => '45 Avenue Hassan II',
                'city' => 'Rabat',
                'postal_code' => '10000',
                'ice' => '009876543000012',
                'notes' => 'Transporteur partenaire. Souhaite recevoir les devis par email.',
                'statut' => 'en_attente',
            ],
            [
                'full_name' => 'Omar Alami',
                'email' => 'omar.alami@maroctransports.com',
                'phone' => '+212 6 34 56 78 90',
                'address' => '78 Boulevard Mohamed VI',
                'city' => 'Marrakech',
                'postal_code' => '40000',
                'ice' => '005678901000034',
                'notes' => '',
                'statut' => 'en_attente',
            ],
            [
                'full_name' => 'Sara Bennani',
                'email' => 's.bennani@logistique.ma',
                'phone' => '+212 6 45 67 89 01',
                'address' => '33 Rue des Palmiers',
                'city' => 'Tanger',
                'postal_code' => '90000',
                'ice' => '003456789000056',
                'notes' => 'Prefere les communications par email.',
                'statut' => 'rejetee',
            ],
        ];

        foreach ($demandes as $data) {
            \App\Models\AccountRequest::create($data);
        }
    }
}
