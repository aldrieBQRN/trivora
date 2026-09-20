<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Execution order respects foreign key dependencies:
     *
     *  1. ColorCodingSchemesSeeder  — no FK deps
     *  2. TodaZonesSeeder           — no FK deps (includes TodaZoneRoutes)
     *  3. UsersSeeder               — depends on TodaZones (for operator toda_id)
     *  4. TricyclesSeeder           — depends on Operators + TodaZones
     *  5. ApplicationsSeeder        — depends on Operators, Tricycles, Users, ColorCodingSchemes
     *  6. ViolationsSeeder          — depends on Tricycles, FranchiseSchemes, ColorCodingSchemes, Users
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('🚀 Seeding Trivora database...');
        $this->command->info('');

        $this->call([
            ColorCodingSchemesSeeder::class,
            TodaZonesSeeder::class,
            UsersSeeder::class,
            TricyclesSeeder::class,
            ApplicationsSeeder::class,
            ViolationsSeeder::class,
            MobileAppDataSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('✅ All seeders completed successfully!');
        $this->command->info('');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Admin',               'admin@trivora.gov.ph',           'Admin@123'],
                ['TMO Personnel',       'tmo.jdelacruz@trivora.gov.ph',   'TmoUser@123'],
                ['TMO Personnel',       'tmo.msantos@trivora.gov.ph',     'TmoUser@123'],
                ['BPLO Staff',          'bplo.areyes@trivora.gov.ph',     'BploUser@123'],
                ['BPLO Staff',          'bplo.cmendoza@trivora.gov.ph',   'BploUser@123'],
                ['Tricycle Driver',     'driver.pramos@trivora.ph',       'Driver@123'],
                ['Tricycle Driver',     'driver.jbautista@trivora.ph',    'Driver@123'],
                ['Tricycle Driver',     'driver.evillanueva@trivora.ph',  'Driver@123'],
                ['Tricycle Driver',     'driver.mclara@trivora.ph',       'Driver@123'],
                ['Tricycle Driver',     'driver.rsantos@trivora.ph',      'Driver@123'],
                ['Passenger',           'passenger@trivora.ph',           'Passenger@123'],
                ['Passenger',           'passenger.maria@trivora.ph',     'Passenger@123'],
                ['Passenger',           'passenger.juan@trivora.ph',      'Passenger@123'],
            ]
        );
    }
}
