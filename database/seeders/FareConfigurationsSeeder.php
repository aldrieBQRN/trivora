<?php

namespace Database\Seeders;

use App\Models\FareConfiguration;
use Illuminate\Database\Seeder;

class FareConfigurationsSeeder extends Seeder
{
    /**
     * Seed initial fare configuration if none exists.
     */
    public function run(): void
    {
        FareConfiguration::firstOrCreate(
            ['effective_date' => '2026-01-01'],
            [
                'base_fare' => 50.00,
                'base_fare_per_passenger' => 25.00,
                'included_distance_km' => 4.00,
                'rate_per_km' => 5.00,
                'is_active' => true,
            ]
        );
    }
}
