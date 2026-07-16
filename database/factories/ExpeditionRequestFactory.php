<?php

namespace Database\Factories;

use App\Models\ExpeditionRequest;
use App\Models\Provider;
use App\Models\Quote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpeditionRequest>
 */
class ExpeditionRequestFactory extends Factory
{
    protected $model = ExpeditionRequest::class;

    public function definition(): array
    {
        return [
            'quote_id' => Quote::factory(),
            'provider_id' => Provider::factory(),
            'token' => bin2hex(random_bytes(32)),
            'sender_name' => $this->faker->name(),
            'sender_company' => $this->faker->optional()->company(),
            'sender_address' => $this->faker->streetAddress(),
            'sender_city' => $this->faker->city(),
            'sender_postal_code' => $this->faker->postcode(),
            'sender_country' => 'MA',
            'sender_email' => $this->faker->optional()->safeEmail(),
            'sender_phone' => $this->faker->optional()->phoneNumber(),
            'recipient_name' => $this->faker->name(),
            'recipient_company' => $this->faker->optional()->company(),
            'recipient_address' => $this->faker->streetAddress(),
            'recipient_city' => $this->faker->city(),
            'recipient_postal_code' => $this->faker->postcode(),
            'recipient_country' => 'MA',
            'recipient_phone' => $this->faker->optional()->phoneNumber(),
            'recipient_email' => $this->faker->optional()->safeEmail(),
            'colis' => [],
            'valeur_declaree' => $this->faker->optional()->randomFloat(2, 0, 10000),
            'devise_valeur' => $this->faker->randomElement(['MAD', 'USD', 'EUR']),
            'type_service' => $this->faker->randomElement(['national', 'international_express_dap', 'fret_aerien', 'routier_groupage', 'maritime_groupage']),
            'statut' => 'en_attente',
        ];
    }
}
