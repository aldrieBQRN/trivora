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
     *  2. UsersSeeder               — no FK deps beyond ColorCodingSchemes
     *  3. TricyclesSeeder           — depends on Operators
     *  4. ApplicationsSeeder        — depends on Operators, Tricycles, Users, ColorCodingSchemes
     *  5. ViolationsSeeder          — depends on Tricycles, FranchiseSchemes, ColorCodingSchemes, Users
     *  6. MobileAppDataSeeder       — depends on Drivers/Operators/Tricycles (passenger bookings,
     *                                  ride history, GPS breadcrumb pings)
     *  7. TestAccountsSeeder        — demo online drivers and
     *                                  seeds the universal driver.test@/passenger.test@ QA logins
     *  8. DemoStageDriversSeeder    — depends on ColorCodingSchemes + TMO/BPLO users;
     *                                  FIVE demo driver logins, one per Application Tracker status
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('🚀 Seeding Trivora database...');
        $this->command->info('');

        $this->call([
            ColorCodingSchemesSeeder::class,
            UsersSeeder::class,
            TricyclesSeeder::class,
            ApplicationsSeeder::class,
            ViolationsSeeder::class,
            MobileAppDataSeeder::class,
            TestAccountsSeeder::class,
            DemoStageDriversSeeder::class,
            DemoDriverMTOPApplicationsSeeder::class,
            DemoDriverViolationsSeeder::class,
            TestDriverViolationsSeeder::class,
            FareConfigurationsSeeder::class,
            SystemAuditLogSeeder::class,
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
                ['Driver App Demo',     'driver.test@trivora.test',       'TestDriver123!'],
                ['Demo Workflow',       'driver.expired@trivora.ph',      'Driver@123'],
                ['Demo Workflow',       'driver.review@trivora.ph',       'Driver@123'],
                ['Demo Workflow',       'driver.resubmit@trivora.ph',     'Driver@123'],
                ['Demo Workflow',       'driver.inspection@trivora.ph',   'Driver@123'],
                ['Demo Workflow',       'driver.reinspection@trivora.ph', 'Driver@123'],
                ['Demo Workflow',       'driver.bplo@trivora.ph',         'Driver@123'],
                ['Demo Workflow',       'driver.confirm@trivora.ph',      'Driver@123'],
                ['Demo Workflow',       'driver.renewed@trivora.ph',      'Driver@123'],
                ['Passenger',           'passenger@trivora.ph',           'Passenger@123'],
                ['Passenger (Test)',    'passenger.test@trivora.test',    'TestPassenger123!'],
            ]
        );
    }
}
