<?php

namespace Database\Seeders;

use App\Models\Affectation;
use App\Models\Avoir;
use App\Models\Chauffeur;
use App\Models\ChauffeurTypeVehicule;
use App\Models\Client;
use App\Models\Facture;
use App\Models\FactureExpedition;
use App\Models\Provider;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Shipment;
use App\Models\SuiviStatut;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Idempotent, additive seeder that populates a realistic volume of demo data
 * for the existing prestataire (admin@shippingcrm.test) and client
 * (ahmed.b@maroclogistics.ma) accounts, plus a few extra clients and employees.
 *
 * It never deletes or modifies existing rows. It reads the current max sequence
 * numbers and resumes from there, so running it multiple times will keep adding
 * data (use --class to control when to run).
 *
 * WithoutModelEvents is used so the Affectation / SuiviStatut booted hooks do not
 * fire; statuses are kept consistent manually instead.
 */
class DemoDataSeeder extends Seeder
{
    use WithoutModelEvents;

    protected Provider $provider;
    protected User $admin;
    protected ?User $ahmed = null;
    protected ?Client $ahmedClient = null;

    protected array $moroccanCities = [
        'Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger', 'Agadir',
        'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Nador', 'El Jadida',
        'Beni Mellal', 'Safi', 'Mohammedia', 'Khouribga', 'Settat', 'Berrechid',
    ];

    protected array $foreignCities = [
        'Paris', 'Lyon', 'Marseille', 'Bruxelles', 'Anvers', 'Madrid',
        'Barcelone', 'Lisbonne', 'Francfort', 'Hambourg', 'Milan', 'Genève',
        'Le Havre', 'Rotterdam', 'Dubaï', 'New York',
    ];

    protected array $typeServices = ['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage'];
    protected array $shipmentStatuts = ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre'];
    protected array $subStatuts = ['en_cours_de_livraison', 'tentative_de_livraison', 'on_hold', 'retour'];
    protected array $typeColisOptions = ['document', 'paquet', 'palette'];

    protected array $vehicleTypes = [
        'camionnette_fourgon_leger', 'fourgon_grand_volume', 'camion_porteur',
        'semi_remorque_tracteur', 'vehicule_frigorifique', 'moto_scooter',
        'utilitaire_bache_plateau',
    ];

    protected array $firstNames = ['Youssef', 'Fatima', 'Rachid', 'Sara', 'Nabil', 'Imane', 'Anas', 'Khadija', 'Mehdi', 'Salma', 'Hamza', 'Leila', 'Omar', 'Nadia', 'Karim', 'Sofia'];
    protected array $lastNames = ['El Amrani', 'Bouazza', 'Chraibi', 'Drissi', 'Fassi', 'Ghali', 'Benkirane', 'Ouali', 'Tahiri', 'Yazidi', 'Bennani', 'Lahlou', 'Sabri', 'Mansouri'];

    public function run(): void
    {
        $this->admin = User::where('email', 'admin@shippingcrm.test')->first();
        if (! $this->admin) {
            $this->command->error('admin@shippingcrm.test not found. Run DatabaseSeeder first.');
            return;
        }

        $this->provider = Provider::where('user_id', $this->admin->id)->first();
        if (! $this->provider) {
            $this->command->error('No provider bound to admin@shippingcrm.test. Run DatabaseSeeder first.');
            return;
        }

        // Find or create the Ahmed client
        $this->ahmed = User::where('email', 'ahmed.b@maroclogistics.ma')->first();
        if ($this->ahmed) {
            $this->ahmedClient = Client::where('user_id', $this->ahmed->id)->first();
        }

        // Seed fleets / drivers / extra employees / extra clients first so we have
        // references for everything else.
        $employees = $this->seedEmployees();
        $extraClients = $this->seedExtraClients();
        $extraClients = array_merge($extraClients, $this->seedRandomClients(20));
        $vehicules = $this->seedVehicules();
        $chauffeurs = $this->seedChauffeurs();

        //_sequences for the current year
        $year = now()->year;

        // Quote requests (demandes) for ahmed + a couple extra clients + anonymous public
        $this->seedQuoteRequests($extraClients);

        // Quotes (devis) for clients + divers
        $this->seedQuotes($extraClients, $year);

        // Shipments (expeditions) - big volume for ahmed, smaller for extras + divers
        $ahmedShipments = $this->seedAhmedShipments();
        $extraClientShipments = $this->seedExtraClientShipments($extraClients);
        $diversShipments = $this->seedDiversShipments();
        $allShipments = array_merge($ahmedShipments, $extraClientShipments, $diversShipments);

        // Tracking timelines
        $this->seedSuiviStatuts($allShipments, $employees);

        // Affectations (missions) linking vehicule+chauffeur+shipments
        $this->seedAffectations($vehicules, $chauffeurs, $allShipments);

        // Factures + the pivot link + avoirs for some of them
        $this->seedFacturesAvoirs($allShipments, $year);

        // Extra factures with multiple expeditions (varying 2..25 per facture)
        $this->seedMultiExpeditionFactures($year, $allShipments);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    protected function uniqueAccountNumber(): string
    {
        do {
            $candidate = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (Client::where('account_number', $candidate)->exists());

        return $candidate;
    }

    protected function uniqueShippingNumber(): string
    {
        do {
            $number = str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        } while (Shipment::where('shipping_number', $number)->exists());

        return $number;
    }

    protected function nextQuoteSequence(int $year): int
    {
        $max = Quote::where('quote_year', $year)->max('quote_sequence') ?? 0;
        return $max + 1;
    }

    protected function nextFactureNumero(int $year): int
    {
        $max = Facture::where('annee', $year)->max('numero_n') ?? 0;
        return $max + 1;
    }

    protected function nextAvoirNumero(int $year): int
    {
        $max = Avoir::where('annee', $year)->max('numero_n') ?? 0;
        return $max + 1;
    }

    protected function fakeRecipientEmail(): string
    {
        $handles = ['destinataire', 'client', 'reception', 'contact', 'livraison', 'bureau'];
        $domains = ['example.ma', 'gmail.com', 'yahoo.fr', 'outlook.com', 'boot.ma', 'pro.fr'];
        return $handles[array_rand($handles)] . random_int(10, 99) . '@' . $domains[array_rand($domains)];
    }

    protected function fakePhone(): string
    {
        return '+2126' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
    }

    protected function randClientCity(): string
    {
        return $this->moroccanCities[array_rand($this->moroccanCities)];
    }

    protected function randClientCountry(): string
    {
        return random_int(0, 1) ? 'Maroc' : $this->foreignCities[array_rand($this->foreignCities)];
    }

    // ----------------------------------------------------------------
    // Employees (role=employe, provider_id set)
    // ----------------------------------------------------------------

    protected function seedEmployees(): array
    {
        $existing = User::where('role', 'employe')->where('provider_id', $this->provider->id)->get()
            ->keyBy('email')->all();

        $toCreate = [
            ['name' => 'Mehdi Benaarj',  'email' => 'm.benaarj@shippingcrm.com'],
            ['name' => 'Salma Ouazzani', 'email' => 's.ouazzani@shippingcrm.com', 'role_title' => 'Dispatcher'],
            ['name' => 'Karim Tahiri',   'email' => 'k.tahiri@shippingcrm.com',   'role_title' => 'Comptable'],
            ['name' => 'Nadia Lahlou',   'email' => 'n.lahlou@shippingcrm.com',   'role_title' => 'Manager'],
            ['name' => 'Youssef Drissi', 'email' => 'y.drissi@shippingcrm.com',   'role_title' => 'Dispatcher'],
        ];

        $employees = [];
        foreach ($toCreate as $data) {
            if (isset($existing[$data['email']])) {
                $employees[] = $existing[$data['email']];
                continue;
            }
            $employees[] = User::create([
                'role' => 'employe',
                'name' => $data['name'],
                'email' => $data['email'],
                'provider_id' => $this->provider->id,
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'first_login_completed' => true,
            ]);
        }

        $this->command->info(count($employees) . ' employees present for provider ' . $this->provider->id);
        return array_filter($employees, fn($u) => $u instanceof User);
    }

    // ----------------------------------------------------------------
    // Extra client accounts (real login-able users) + their Client rows
    // ----------------------------------------------------------------

    protected function seedExtraClients(): array
    {
        $specs = [
            [
                'full_name' => 'Fatima Zahra El Amrani',
                'company_name' => 'Express Cargo Maroc',
                'email' => 'f.amrani@expresscargo.ma',
                'phone' => '+212 6 23 45 67 89',
                'address' => '45 Avenue Hassan II',
                'city' => 'Rabat',
                'postal_code' => '10000',
            ],
            [
                'full_name' => 'Omar Alami',
                'company_name' => 'Alami Transports',
                'email' => 'o.alami@alamitransports.com',
                'phone' => '+212 6 34 56 78 90',
                'address' => '78 Boulevard Mohamed VI',
                'city' => 'Marrakech',
                'postal_code' => '40000',
            ],
            [
                'full_name' => 'Leila Bennani',
                'company_name' => 'Bennani Logistique',
                'email' => 'l.bennani@bennanilog.ma',
                'phone' => '+212 6 55 12 34 56',
                'address' => '33 Rue des Palmiers',
                'city' => 'Tanger',
                'postal_code' => '90000',
            ],
            [
                'full_name' => 'Hamza Chraibi',
                'company_name' => 'Chraibi Distribution',
                'email' => 'h.chraibi@chraibidist.ma',
                'phone' => '+212 6 77 88 99 00',
                'address' => '12 Boulevard de la Gare',
                'city' => 'Fes',
                'postal_code' => '30000',
            ],
        ];

        $clients = [];
        foreach ($specs as $spec) {
            $user = User::where('email', $spec['email'])->first();
            $client = $user ? Client::where('user_id', $user->id)->first() : null;

            if (! $user) {
                $user = User::create([
                    'role' => 'client',
                    'email' => $spec['email'],
                    'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                    'first_login_completed' => true,
                ]);
            }

            if (! $client) {
                $client = Client::create([
                    'provider_id' => $this->provider->id,
                    'user_id' => $user->id,
                    'account_number' => $this->uniqueAccountNumber(),
                    'full_name' => $spec['full_name'],
                    'company_name' => $spec['company_name'],
                    'email' => $spec['email'],
                    'phone' => $spec['phone'],
                    'address' => $spec['address'],
                    'city' => $spec['city'],
                    'postal_code' => $spec['postal_code'],
                    'country' => 'Maroc',
                    'ice' => str_pad((string) random_int(0, 99999999999), 15, '0', STR_PAD_LEFT),
                ]);
            }

            $clients[] = $client;
        }

        // Ensure the Ahmed client company_name is filled (it's empty in the existing DB)
        if ($this->ahmedClient && empty($this->ahmedClient->company_name)) {
            $this->ahmedClient->company_name = 'Maroc Logistics SARL';
            $this->ahmedClient->full_name = $this->ahmedClient->full_name ?: 'Ahmed Benjelloun';
            $this->ahmedClient->saveQuietly();
        }

        // Ensure Ahmed has a usable demo password (password123) so the app can
        // be browsed logged-in. The existing row may use the origin password flow
        // with an obsolete value; reset password_hash directly and keep
        // first_login_completed=true so no password-change flow triggers.
        if ($this->ahmed && ! password_verify('password123', (string) $this->ahmed->password_hash)) {
            $this->ahmed->password_hash = password_hash('password123', PASSWORD_DEFAULT);
            $this->ahmed->first_login_completed = true;
            $this->ahmed->saveQuietly();
        }

        $this->command->info(count($clients) . ' extra client accounts ready');
        return $clients;
    }

    // ----------------------------------------------------------------
    // Random client accounts (volume for pagination demo)
    // ----------------------------------------------------------------

    protected function seedRandomClients(int $count): array
    {
        $companySuffixes = ['Logistique', 'Transport', 'Distribution', 'Cargo', 'Express', 'Trans', 'Freight', 'Shipping', 'Maritime', 'Log'];
        $companyPrefixes = ['Alami', 'Bennani', 'Chraibi', 'Atlas', 'Maghreb', 'Sahara', 'Med', 'Royal', 'Cap', 'Nord', 'Sud', 'Express', 'Sept', 'Nouv', 'Plus', 'Top', 'Star', 'Pro'];
        $streetNames = ['Rue du Commerce', 'Avenue Hassan II', 'Boulevard Mohamed V', 'Rue des Palmiers', 'Avenue Mohammed VI', 'Rue Al Jisr', 'Boulevard de la Gare', 'Rue de la Liberté', 'Rue Ibn Sina', 'Avenue des FAR'];

        $clients = [];
        $created = 0;

        for ($i = 0; $i < $count; $i++) {
            $firstName = $this->firstNames[array_rand($this->firstNames)];
            $lastName = $this->lastNames[array_rand($this->lastNames)];
            $fullName = $firstName . ' ' . $lastName;
            $companyName = $companyPrefixes[array_rand($companyPrefixes)] . ' ' . $companySuffixes[array_rand($companySuffixes)];
            $localPart = strtolower($this->transliterate($firstName . '.' . substr($lastName, 0, 3))) . random_int(1, 99);
            $email = $localPart . '@' . $this->randomClientDomain();
            $city = $this->moroccanCities[array_rand($this->moroccanCities)];

            if (User::where('email', $email)->exists()) {
                continue;
            }

            $user = User::create([
                'role' => 'client',
                'email' => $email,
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'first_login_completed' => true,
            ]);

            $client = Client::create([
                'provider_id' => $this->provider->id,
                'user_id' => $user->id,
                'account_number' => $this->uniqueAccountNumber(),
                'full_name' => $fullName,
                'company_name' => $companyName,
                'email' => $email,
                'phone' => $this->fakePhone(),
                'address' => random_int(1, 200) . ' ' . $streetNames[array_rand($streetNames)],
                'city' => $city,
                'postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'country' => 'Maroc',
                'ice' => str_pad((string) random_int(0, 99999999999), 15, '0', STR_PAD_LEFT),
            ]);

            $clients[] = $client;
            $created++;
        }

        $this->command->info($created . ' random client accounts created');
        return $clients;
    }

    protected function randomClientDomain(): string
    {
        $domains = ['log.ma', 'transport.ma', 'cargo.ma', 'biz.ma', 'group.ma', 'logistique.ma', 'shipping.ma', 'express.ma'];
        return $domains[array_rand($domains)];
    }

    protected function transliterate(string $s): string
    {
        $from = ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'û', 'ü', 'ç', 'É', 'È'];
        $to   = ['e', 'e', 'e', 'e', 'a', 'a', 'i', 'i', 'o', 'u', 'u', 'c', 'e', 'e'];
        return str_replace($from, $to, $s);
    }

    // ----------------------------------------------------------------
    // Fleet (vehicules)
    // ----------------------------------------------------------------

    protected function seedVehicules(): array
    {
        $existingCount = Vehicule::where('provider_id', $this->provider->id)->count();
        if ($existingCount >= 12) {
            $this->command->info('Vehicules already seeded (' . $existingCount . ')');
            return Vehicule::where('provider_id', $this->provider->id)->get()->all();
        }

        $fleet = [
            ['type' => 'camionnette_fourgon_leger', 'plate' => '12345-A-1', 'marque' => 'Renault Express', 'color' => 'Blanc'],
            ['type' => 'camionnette_fourgon_leger', 'plate' => '23456-B-2', 'marque' => 'Peugeot Partner', 'color' => 'Blanc'],
            ['type' => 'fourgon_grand_volume',      'plate' => '34567-C-3', 'marque' => 'Iveco Daily 70C', 'color' => 'Blanc'],
            ['type' => 'fourgon_grand_volume',      'plate' => '45678-D-4', 'marque' => 'Mercedes Sprinter', 'color' => 'Gris'],
            ['type' => 'camion_porteur',            'plate' => '56789-E-5', 'marque' => 'Volvo FL 290', 'color' => 'Rouge'],
            ['type' => 'camion_porteur',            'plate' => '67890-F-6', 'marque' => 'DAF LF 250', 'color' => 'Bleu'],
            ['type' => 'semi_remorque_tracteur',    'plate' => '78901-G-7', 'marque' => 'Volvo FH16 750', 'color' => 'Blanc'],
            ['type' => 'semi_remorque_tracteur',    'plate' => '89012-H-8', 'marque' => 'Scania R 650', 'color' => 'Rouge'],
            ['type' => 'vehicule_frigorifique',     'plate' => '90123-I-9', 'marque' => 'MAN TGX Fridge', 'color' => 'Blanc'],
            ['type' => 'vehicule_frigorifique',     'plate' => '11234-J-1', 'marque' => 'Renault T Fridge', 'color' => 'Blanc'],
            ['type' => 'moto_scooter',              'plate' => '22345-K-2', 'marque' => 'Yamaha NMAX 125', 'color' => 'Noir'],
            ['type' => 'utilitaire_bache_plateau', 'plate' => '33456-L-3', 'marque' => 'Renault Master Plateau', 'color' => 'Jaune'],
        ];

        $vehicules = [];
        foreach ($fleet as $i => $v) {
            $statut = match (true) {
                $i < 2 => 'disponible',
                $i < 5 => 'disponible',
                default => ['disponible', 'en_maintenance', 'hors_service'][array_rand([0, 1, 2])],
            };

            $vehicules[] = Vehicule::create([
                'provider_id' => $this->provider->id,
                'immatriculation' => $v['plate'],
                'marque_modele' => $v['marque'],
                'annee_circulation' => random_int(2016, 2024),
                'couleur' => $v['color'],
                'type_vehicule' => $v['type'],
                'statut' => $statut,
                'exp_controle_technique' => now()->addMonths(random_int(-6, 18))->toDateString(),
                'exp_assurance' => now()->addMonths(random_int(-4, 14))->toDateString(),
                'exp_carte_grise' => now()->addYears(random_int(-2, 5))->toDateString(),
            ]);
        }

        $this->command->info(count($vehicules) . ' vehicules created');
        return $vehicules;
    }

    // ----------------------------------------------------------------
    // Drivers (chauffeurs) + their allowed vehicle types
    // ----------------------------------------------------------------

    protected function seedChauffeurs(): array
    {
        $existingCount = Chauffeur::where('provider_id', $this->provider->id)->count();
        if ($existingCount >= 8) {
            $this->command->info('Chauffeurs already seeded (' . $existingCount . ')');
            return Chauffeur::where('provider_id', $this->provider->id)->get()->all();
        }

        $driverFirstNames = ['Rachid', 'Hicham', 'Said', 'Yassine', 'Brahim', 'Abdessamad', 'Tarik', 'Mounir', 'Noureddine', 'Younes'];
        $driverLastNames = ['Alaoui', 'Berrada', 'Chraibi', 'Ouahbi', 'Sebti', 'Maazouz', 'Fikri', 'Hajji'];

        $drivers = [];
        for ($i = 0; $i < 8; $i++) {
            $statut = match (true) {
                $i < 5 => 'actif',
                $i === 5 => 'en_conge',
                default => ['actif', 'en_conge'][array_rand([0, 1])],
            };

            $driver = Chauffeur::create([
                'provider_id' => $this->provider->id,
                'nom_complet' => $driverFirstNames[$i] . ' ' . $driverLastNames[array_rand($driverLastNames)],
                'telephone' => $this->fakePhone(),
                'email' => 'chauffeur' . $i . '@shippingcrm.com',
                'statut' => $statut,
            ]);

            // Allow each driver to drive 2-3 vehicle types
            $allowed = array_rand(array_flip($this->vehicleTypes), random_int(2, 3));
            $allowed = is_array($allowed) ? $allowed : [$allowed];
            foreach ($allowed as $type) {
                ChauffeurTypeVehicule::create([
                    'chauffeur_id' => $driver->id,
                    'type_vehicule' => $type,
                ]);
            }

            $drivers[] = $driver;
        }

        $this->command->info(count($drivers) . ' chauffeurs created');
        return $drivers;
    }

    // ----------------------------------------------------------------
    // Quote requests (demandes)
    // ----------------------------------------------------------------

    protected function seedQuoteRequests(array $extraClients): void
    {
        $count = 0;
        $total = 16;

        for ($i = 0; $i < $total; $i++) {
            $useAhmedClient = $this->ahmedClient && random_int(0, 1) === 0;
            $client = $useAhmedClient
                ? $this->ahmedClient
                : $extraClients[array_rand($extraClients)];

            $originCity = $this->moroccanCities[array_rand($this->moroccanCities)];
            $recipientCity = random_int(0, 1) === 0
                ? $this->moroccanCities[array_rand($this->moroccanCities)]
                : $this->foreignCities[array_rand($this->foreignCities)];
            $recipientCountry = in_array($recipientCity, $this->moroccanCities, true) ? 'Maroc' : 'France';

            $typeService = $this->typeServices[array_rand($this->typeServices)];
            $statut = random_int(0, 3) === 0 ? 'traitee' : 'en_attente';

            QuoteRequest::create([
                'provider_id' => $this->provider->id,
                'client_id' => $client->id ?? null,
                'client_name' => $client->full_name ?? ($this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)]),
                'client_address' => $client->address ?? random_int(1, 200) . ' Rue Public',
                'client_city' => $client->city ?? 'Casablanca',
                'client_postal_code' => $client->postal_code ?? '20000',
                'client_country' => $client->country ?? 'Maroc',
                'origin_city' => $originCity,
                'origin_country' => 'Maroc',
                'client_email' => $client->email ?? 'demande' . $i . '@exemple.ma',
                'client_phone' => $client->phone ?? $this->fakePhone(),
                'recipient_name' => $this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)],
                'recipient_company' => random_int(0, 1) === 0 ? 'Societe ' . $i : null,
                'recipient_address' => random_int(1, 200) . ' Rue Destinataire',
                'recipient_city' => $recipientCity,
                'recipient_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'recipient_country' => $recipientCountry,
                'recipient_phone' => $this->fakePhone(),
                'poids' => round(random_int(50, 25000) / 100, 3),
                'longueur' => round(random_int(100, 1500) / 100, 2),
                'largeur' => round(random_int(100, 1500) / 100, 2),
                'hauteur' => round(random_int(100, 1500) / 100, 2),
                'nb_pieces' => random_int(1, 10),
                'type_colis' => $this->typeColisOptions[array_rand($this->typeColisOptions)],
                'type_service' => $typeService,
                'description_colis' => 'Demande de devis demo #' . $i,
                'statut' => $statut,
            ]);
            $count++;
        }

        $this->command->info($count . ' quote_requests (demandes) created');
    }

    // ----------------------------------------------------------------
    // Quotes (devis)
    // ----------------------------------------------------------------

    protected function seedQuotes(array $extraClients, int $year): void
    {
        $count = 0;
        $total = 20;

        for ($i = 0; $i < $total; $i++) {
            $useAhmedClient = $this->ahmedClient && random_int(0, 2) > 0;
            $client = $useAhmedClient
                ? $this->ahmedClient
                : $extraClients[array_rand($extraClients)];

            $seq = $this->nextQuoteSequence($year);
            $quoteNumber = "DE {$seq}/{$year}";

            $typeService = $this->typeServices[array_rand($this->typeServices)];
            $statut = ['envoye', 'envoye', 'envoye', 'accepte', 'refuse'][array_rand([0, 1, 2, 3, 4])];

            $originCity = $this->moroccanCities[array_rand($this->moroccanCities)];
            $recipientCity = random_int(0, 1) === 0
                ? $this->moroccanCities[array_rand($this->moroccanCities)]
                : $this->foreignCities[array_rand($this->foreignCities)];
            $recipientCountry = in_array($recipientCity, $this->moroccanCities, true) ? 'Maroc' : 'France';

            $montantHt = round(random_int(500, 50000) / 100, 2);
            $montantTtc = round($montantHt * 1.20, 2);

            Quote::create([
                'provider_id' => $this->provider->id,
                'client_id' => $client->id ?? null,
                'quote_number' => $quoteNumber,
                'quote_year' => $year,
                'quote_sequence' => $seq,
                'client_name' => $client->full_name ?? ($this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)]),
                'client_address' => $client->address ?? '12 Rue Public',
                'client_city' => $client->city ?? 'Casablanca',
                'client_postal_code' => $client->postal_code ?? '20000',
                'client_country' => $client->country ?? 'Maroc',
                'origin_city' => $originCity,
                'origin_country' => 'Maroc',
                'client_email' => $client->email ?? null,
                'client_phone' => $client->phone ?? null,
                'recipient_name' => $this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)],
                'recipient_company' => 'Societe ' . $i,
                'recipient_address' => random_int(1, 200) . ' Rue Dest',
                'recipient_city' => $recipientCity,
                'recipient_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'recipient_country' => $recipientCountry,
                'recipient_phone' => $this->fakePhone(),
                'poids' => round(random_int(50, 25000) / 100, 3),
                'longueur' => round(random_int(100, 1500) / 100, 2),
                'largeur' => round(random_int(100, 1500) / 100, 2),
                'hauteur' => round(random_int(100, 1500) / 100, 2),
                'nb_pieces' => random_int(1, 10),
                'type_colis' => $this->typeColisOptions[array_rand($this->typeColisOptions)],
                'type_service' => $typeService,
                'description_colis' => 'Devis demo #' . $i,
                'valeur_declaree' => round(random_int(100, 20000) / 100, 2),
                'devise_valeur' => 'MAD',
                'montant_ht' => $montantHt,
                'montant_ttc' => $montantTtc,
                'statut' => $statut,
            ]);
            $count++;
        }

        $this->command->info($count . ' quotes (devis) created');
    }

    // ----------------------------------------------------------------
    // Shipments
    // ----------------------------------------------------------------

    protected function seedAhmedShipments(): array
    {
        if (! $this->ahmedClient) {
            return [];
        }

        return $this->seedShipmentsForClient($this->ahmedClient, $this->ahmed, 30);
    }

    protected function seedExtraClientShipments(array $extraClients): array
    {
        $shipments = [];
        foreach ($extraClients as $client) {
            $user = User::find($client->user_id);
            $shipments = array_merge($shipments, $this->seedShipmentsForClient($client, $user, random_int(8, 14)));
        }
        return $shipments;
    }

    protected function seedDiversShipments(): array
    {
        $shipments = [];
        for ($i = 0; $i < 12; $i++) {
            $cityForeign = random_int(0, 2) === 0
                ? $this->foreignCities[array_rand($this->foreignCities)]
                : $this->moroccanCities[array_rand($this->moroccanCities)];
            $cityCountry = in_array($cityForeign, $this->moroccanCities, true) ? 'Maroc' : 'France';

            $shipment = Shipment::create([
                'provider_id' => $this->provider->id,
                'client_id' => null,
                'created_by' => $this->admin->id,
                'shipping_number' => $this->uniqueShippingNumber(),
                'sender_name' => $this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)],
                'sender_company' => 'Boutique Divers ' . $i,
                'sender_address' => random_int(1, 200) . ' Rue Publique',
                'sender_city' => $this->moroccanCities[array_rand($this->moroccanCities)],
                'sender_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'sender_country' => 'Maroc',
                'sender_email' => 'divers' . $i . '@example.ma',
                'sender_phone' => $this->fakePhone(),
                'recipient_name' => $this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)],
                'recipient_company' => random_int(0, 1) === 0 ? 'Client Divers ' . $i : null,
                'recipient_address' => random_int(1, 200) . ' Rue Dest',
                'recipient_city' => $cityForeign,
                'recipient_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'recipient_country' => $cityCountry,
                'recipient_phone' => $this->fakePhone(),
                'recipient_email' => $this->fakeRecipientEmail(),
                'poids' => round(random_int(50, 25000) / 100, 3),
                'longueur' => round(random_int(100, 1500) / 100, 2),
                'largeur' => round(random_int(100, 1500) / 100, 2),
                'hauteur' => round(random_int(100, 1500) / 100, 2),
                'nb_pieces' => random_int(1, 10),
                'valeur_declaree' => round(random_int(100, 20000) / 100, 2),
                'devise_valeur' => 'MAD',
                'type_colis' => $this->typeColisOptions[array_rand($this->typeColisOptions)],
                'description_colis' => 'Envoi divers demo #' . $i,
                'type_service' => $this->typeServices[array_rand($this->typeServices)],
                'statut_actuel' => $this->shipmentStatuts[array_rand($this->shipmentStatuts)],
                'sous_statut_actuel' => null,
            ]);
            $shipments[] = $shipment;
        }

        $this->command->info(count($shipments) . ' divers shipments created');
        return $shipments;
    }

    protected function seedShipmentsForClient(Client $client, ?User $user, int $count): array
    {
        $shipments = [];
        $senderInfo = [
            'sender_name' => $client->full_name,
            'sender_company' => $client->company_name,
            'sender_address' => $client->address,
            'sender_city' => $client->city,
            'sender_postal_code' => $client->postal_code,
            'sender_country' => $client->country,
            'sender_email' => $client->email,
            'sender_phone' => $client->phone,
        ];

        for ($i = 0; $i < $count; $i++) {
            $statut = $this->shipmentStatuts[array_rand($this->shipmentStatuts)];
            $recipientCountry = random_int(0, 2) === 0 && $client->country === 'Maroc'
                ? $this->foreignCities[array_rand($this->foreignCities)]
                : $this->moroccanCities[array_rand($this->moroccanCities)];
            $isForeign = ! in_array($recipientCountry, $this->moroccanCities, true);
            $recipientCountryStr = $isForeign ? 'France' : 'Maroc';
            $recipientCity = $isForeign
                ? $this->foreignCities[array_rand($this->foreignCities)]
                : $this->moroccanCities[array_rand($this->moroccanCities)];

            $shipment = Shipment::create(array_merge($senderInfo, [
                'provider_id' => $this->provider->id,
                'client_id' => $client->id,
                'created_by' => $user->id ?? $this->admin->id,
                'shipping_number' => $this->uniqueShippingNumber(),
                'recipient_name' => $this->firstNames[array_rand($this->firstNames)] . ' ' . $this->lastNames[array_rand($this->lastNames)],
                'recipient_company' => random_int(0, 1) === 0 ? 'Societe Dest ' . $i : null,
                'recipient_address' => random_int(1, 200) . ' Rue Dest',
                'recipient_city' => $recipientCity,
                'recipient_postal_code' => str_pad((string) random_int(10000, 99999), 5, '0', STR_PAD_LEFT),
                'recipient_country' => $recipientCountryStr,
                'recipient_phone' => $this->fakePhone(),
                'recipient_email' => $this->fakeRecipientEmail(),
                'poids' => round(random_int(50, 25000) / 100, 3),
                'longueur' => round(random_int(100, 1500) / 100, 2),
                'largeur' => round(random_int(100, 1500) / 100, 2),
                'hauteur' => round(random_int(100, 1500) / 100, 2),
                'nb_pieces' => random_int(1, 10),
                'valeur_declaree' => round(random_int(100, 20000) / 100, 2),
                'devise_valeur' => 'MAD',
                'type_colis' => $this->typeColisOptions[array_rand($this->typeColisOptions)],
                'description_colis' => 'Expedition demo #' . $i,
                'type_service' => $this->typeServices[array_rand($this->typeServices)],
                'statut_actuel' => $statut,
                'sous_statut_actuel' => null,
            ]));
            $shipments[] = $shipment;
        }

        return $shipments;
    }

    // ----------------------------------------------------------------
    // Tracking statuses (suivi_statuts) - one or several events per shipment
    // ----------------------------------------------------------------

    protected function seedSuiviStatuts(array $shipments, array $employees): void
    {
        $count = 0;
        $changedByPool = [];
        foreach ($employees as $emp) {
            $changedByPool[] = $emp->id;
        }
        $changedByPool[] = $this->admin->id;

        $orderedStatuts = ['information_recue', 'ramasse', 'en_transit', 'en_cours', 'livre'];

        foreach ($shipments as $shipment) {
            $currentIdx = array_search($shipment->statut_actuel, $orderedStatuts, true);
            if ($currentIdx === false) {
                $currentIdx = 0;
            }
            $lastEventIdx = $currentIdx;

            // Generate events from information_recue up to current status for realism
            $baseDate = Carbon::now()->subDays(random_int(0, 40));

            for ($step = 0; $step <= $lastEventIdx && $step <= 4; $step++) {
                $statut = $orderedStatuts[$step];
                $sousStatut = null;
                if ($statut === 'en_cours' && random_int(0, 2) === 0) {
                    $sousStatut = 'en_cours_de_livraison';
                } elseif ($statut === 'en_cours' && random_int(0, 4) === 0) {
                    $sousStatut = 'tentative_de_livraison';
                }

                SuiviStatut::create([
                    'expedition_id' => $shipment->id,
                    'statut' => $statut,
                    'sous_statut' => $sousStatut,
                    'date_statut' => $baseDate->copy()->addDays($step * random_int(1, 3)),
                    'description' => 'Suivi automatique - ' . $statut,
                    'changed_by' => $changedByPool[array_rand($changedByPool)],
                ]);
                $count++;
            }
        }

        $this->command->info($count . ' suivi_statuts events created');
    }

    // ----------------------------------------------------------------
    // Affectations (missions)
    // ----------------------------------------------------------------

    protected function seedAffectations(array $vehicules, array $chauffeurs, array $shipments): void
    {
        $count = 0;
        $target = 14;
        $today = Carbon::today();
        $availableDrivers = array_filter($chauffeurs, fn($c) => $c->statut === 'actif');
        $shipmentIdsTaken = [];

        for ($i = 0; $i < $target; $i++) {
            $vehicule = $vehicules[array_rand($vehicules)] ?? null;
            $driver = ! empty($availableDrivers) ? $availableDrivers[array_rand($availableDrivers)] : null;
            if (! $vehicule || ! $driver) {
                break;
            }

            $startDate = $today->copy()->subDays(random_int(-10, 25));
            $endDate = $startDate->copy()->addDays(random_int(1, 7));
            $statut = ['planifiee', 'en_cours', 'terminee', 'annulee'][array_rand([0, 1, 2, 3])];

            $affectation = Affectation::create([
                'provider_id' => $this->provider->id,
                'chauffeur_id' => $driver->id,
                'vehicule_id' => $vehicule->id,
                'client_id' => null,
                'ville_depart' => $this->moroccanCities[array_rand($this->moroccanCities)],
                'pays_depart' => 'Maroc',
                'date_heure_depart' => $startDate,
                'ville_arrivee' => random_int(0, 1) === 0
                    ? $this->moroccanCities[array_rand($this->moroccanCities)]
                    : $this->foreignCities[array_rand($this->foreignCities)],
                'pays_arrivee' => random_int(0, 1) === 0 ? 'Maroc' : 'France',
                'date_heure_arrivee' => $endDate,
                'statut' => $statut,
            ]);

            // Since WithoutModelEvents silences the booted status flips, manually
            // keep vehicule/chauffeur statut in sync with the affectation state.
            $this->syncAffectationDependencies($affectation, $vehicule, $driver, $statut);

            // Pick 1-3 shipments not already linked to a facture and link them to this mission
            $linkable = array_filter($shipments, function ($s) use ($shipmentIdsTaken) {
                return ! in_array($s->id, $shipmentIdsTaken, true);
            });
            $linkable = array_values($linkable);
            shuffle($linkable);
            $picked = array_slice($linkable, 0, min(random_int(1, 3), count($linkable)));

            foreach ($picked as $shipment) {
                \App\Models\AffectationExpedition::create([
                    'affectation_id' => $affectation->id,
                    'expedition_id' => $shipment->id,
                ]);
                $shipmentIdsTaken[] = $shipment->id;

                // Backfill client_id on the affectation from the first linked expedition
                if (! $affectation->client_id && $shipment->client_id) {
                    $affectation->client_id = $shipment->client_id;
                    $affectation->saveQuietly();
                }
            }

            $count++;
        }

        $this->command->info($count . ' affectations (missions) created');
    }

    /**
     * WithoutModelEvents silences the booted hook that would otherwise flip
     * vehicule/chauffeur statut. We keep the state consistent manually so the
     * UI shows realistic statuses.
     */
    protected function syncAffectationDependencies(Affectation $affectation, $vehicule, $driver, string $statut): void
    {
        if (in_array($statut, ['terminee', 'annulee'], true)) {
            $vehicule->statut = 'disponible';
            $driver->statut = 'actif';
        } else {
            // planifiee / en_cours => vehicule+driver on mission
            $vehicule->statut = 'en_mission';
            $driver->statut = 'en_mission';
        }
        $vehicule->saveQuietly();
        $driver->saveQuietly();
    }

    // ----------------------------------------------------------------
    // Factures + Avoirs (+ pivot with shipments)
    // ----------------------------------------------------------------

    protected function seedFacturesAvoirs(array $shipments, int $year): void
    {
        $factureCount = 0;
        $avoirCount = 0;
        $targetFactures = 24;

        for ($i = 0; $i < $targetFactures; $i++) {
            // Re-query billable shipments fresh each iteration: client_id NOT NULL
            // AND not already linked to a facture via the pivot. If the query
            // returns nothing, stop early.
            $billable = Shipment::where('provider_id', $this->provider->id)
                ->whereNotNull('client_id')
                ->whereNotIn('id', FactureExpedition::pluck('expedition_id')->all())
                ->inRandomOrder()
                ->limit(50)
                ->get()
                ->all();
            if (empty($billable)) {
                break;
            }

            // Group by client so each facture only links one client's shipments.
            $groupedByClient = [];
            foreach ($billable as $s) {
                $cid = $s->client_id;
                $groupedByClient[$cid][] = $s;
            }
            $clientGroups = array_values($groupedByClient);
            $group = $clientGroups[array_rand($clientGroups)];

            $pick = min(random_int(1, 4), count($group));
            $picked = array_slice($group, 0, $pick);
            $firstShipment = $picked[0];

            $num = $this->nextFactureNumero($year);
            $typeDest = $firstShipment->recipient_country === 'Maroc' ? 'national' : 'international';
            $taxable = round(random_int(500, 50000) / 100, 2);
            $nonTaxable = round(random_int(0, 5000) / 100, 2);
            $taux = 20.00;
            $tva = round($taxable * $taux / 100, 2);
            $ttc = round($taxable + $nonTaxable + $tva, 2);
            $statut = ['impayee', 'impayee', 'impayee', 'payee'][array_rand([0, 1, 2, 3])];

            $facture = Facture::create([
                'provider_id' => $this->provider->id,
                'client_id' => $firstShipment->client_id,
                'numero_n' => $num,
                'annee' => $year,
                'date_facture' => now()->subDays(random_int(0, 60))->toDateString(),
                'date_echeance' => now()->addDays(random_int(0, 30))->toDateString(),
                'type_destination' => $typeDest,
                'reference' => 'FACT-REF-' . str_pad((string) $num, 4, '0', STR_PAD_LEFT),
                'taux_tva' => $taux,
                'non_taxable' => $nonTaxable,
                'taxable' => $taxable,
                'tva' => $tva,
                'ttc' => $ttc,
                'statut' => $statut,
            ]);

            foreach ($picked as $shipment) {
                FactureExpedition::create([
                    'facture_id' => $facture->id,
                    'expedition_id' => $shipment->id,
                ]);
            }
            $factureCount++;

            // ~20% of paid factures generate an avoir (credit note)
            if ($statut === 'payee' && random_int(0, 4) === 0) {
                $avoirNum = $this->nextAvoirNumero($year);
                Avoir::create([
                    'provider_id' => $this->provider->id,
                    'client_id' => $firstShipment->client_id,
                    'facture_id' => $facture->id,
                    'numero_n' => $avoirNum,
                    'annee' => $year,
                    'type_destination' => $typeDest,
                    'taux_tva' => $taux,
                    'non_taxable' => round($nonTaxable / 2, 2),
                    'taxable' => round($taxable / 2, 2),
                    'tva' => round($tva / 2, 2),
                    'ttc' => round($ttc / 2, 2),
                ]);
                $avoirCount++;
            }
        }

        $this->command->info($factureCount . ' factures + ' . $avoirCount . ' avoirs created');
    }

    // ----------------------------------------------------------------
    // Extra multi-expedition factures (varying sizes 2..25)
    // ----------------------------------------------------------------

    protected function seedMultiExpeditionFactures(int $year, array &$allShipments): void
    {
        $totalNewShipments = 0;
        $this->command->info('Generating extra multi-expedition factures (2..25 expeditions each)');

        // We'll create ~25 factures. Sizes cycle through a varied pattern from 2 up to
        // 25 so the user can see real pagination/scrolling differences.
        $targetSizes = [
            2, 3, 4, 5, 7, 8, 10, 12,
            6, 9, 14, 18, 22, 25,
            15, 11, 16, 20, 13,
            19, 23, 17, 24, 21, 2,
        ];

        foreach ($targetSizes as $size) {
            // Find a client with no live (un-invoiced) shipments, OR any client.
            // Re-query each iteration to find un-invoiced client shipments.
            $uninvoiced = Shipment::where('provider_id', $this->provider->id)
                ->whereNotNull('client_id')
                ->whereNotIn('id', FactureExpedition::pluck('expedition_id')->all())
                ->inRandomOrder()
                ->limit($size)
                ->get();

            // If we don't have enough uninvoiced shipments, generate more for a random client.
            if ($uninvoiced->count() < $size) {
                $client = Client::where('provider_id', $this->provider->id)->inRandomOrder()->first();
                $user = User::find($client->user_id);
                $need = $size - $uninvoiced->count();
                $generated = $this->seedShipmentsForClient($client, $user, $need);
                $totalNewShipments += count($generated);
                $allShipments = array_merge($allShipments, $generated);
                // Re-query uninvoiced for the freshly created ones
                $uninvoiced = $uninvoiced->merge(collect($generated));
            }

            // Group by client so all expeditions on a facture belong to the same client.
            $byClient = [];
            foreach ($uninvoiced as $s) {
                $byClient[$s->client_id][] = $s;
            }

            // If multiple clients came back, use the largest group; we only want the first \$size anyway.
            $bestGroup = [];
            foreach ($byClient as $group) {
                if (count($group) > count($bestGroup)) {
                    $bestGroup = $group;
                }
            }

            if (empty($bestGroup)) {
                continue;
            }

            // Pad to the target size with freshly generated shipments matching the chosen client
            if (count($bestGroup) < $size) {
                $chosenClientId = array_key_first($byClient);
                $client = Client::find($chosenClientId);
                $user = User::find($client->user_id);
                $addToGenerate = $size - count($bestGroup);
                $generated = $this->seedShipmentsForClient($client, $user, $addToGenerate);
                $totalNewShipments += count($generated);
                $allShipments = array_merge($allShipments, $generated);
                $bestGroup = array_merge($bestGroup, $generated);
            }

            $picked = array_slice($bestGroup, 0, $size);
            $firstShipment = $picked[0];
            $clientId = $firstShipment->client_id;

            $num = $this->nextFactureNumero($year);
            $typeDest = $firstShipment->recipient_country === 'Maroc' ? 'national' : 'international';
            // Bigger factures should feel bigger
            $perLine = round(random_int(800, 4500) / 100, 2);
            $taxable = round($perLine * $size, 2);
            $nonTaxable = round(random_int(0, 3000) / 100, 2);
            $taux = 20.00;
            $tva = round($taxable * $taux / 100, 2);
            $ttc = round($taxable + $nonTaxable + $tva, 2);
            $statut = ['impayee', 'impayee', 'payee'][array_rand([0, 1, 2])];

            $facture = Facture::create([
                'provider_id' => $this->provider->id,
                'client_id' => $clientId,
                'numero_n' => $num,
                'annee' => $year,
                'date_facture' => now()->subDays(random_int(0, 60))->toDateString(),
                'date_echeance' => now()->addDays(random_int(0, 30))->toDateString(),
                'type_destination' => $typeDest,
                'reference' => 'FACT-MULTI-' . str_pad((string) $num, 4, '0', STR_PAD_LEFT),
                'taux_tva' => $taux,
                'non_taxable' => $nonTaxable,
                'taxable' => $taxable,
                'tva' => $tva,
                'ttc' => $ttc,
                'statut' => $statut,
            ]);

            foreach ($picked as $shipment) {
                FactureExpedition::create([
                    'facture_id' => $facture->id,
                    'expedition_id' => $shipment->id,
                ]);
            }
        }

        $this->command->info('Multi-expedition factures + ' . $totalNewShipments . ' extra shipments created');
    }
}
