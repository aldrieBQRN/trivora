<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use App\Models\FareConfiguration;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class CleanOperationalDataSeeder extends Seeder
{
    /**
     * Purges all application records, driver/operator/passenger data,
     * violations, telematics coordination pings, and bookings.
     *
     * PRESERVES:
     * 1. BPLO Staff, TMO Personnel, and Administrator accounts
     * 2. Municipal Rules (Color Coding Schemes, Fare Configurations)
     */
    public function run(): void
    {
        $this->command?->info('');
        $this->command?->info('🧹 Purging operational data (Applications, Drivers, Violations, Coordination)...');
        $this->command?->info('');

        // Disable foreign key checks for clean deletion
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // 1. Applications & MTOP workflow records
        $applicationTables = [
            'application_documents',
            'application_drivers',
            'application_status_histories',
            'inspections',
            'payments',
            'franchise_status_histories',
            'franchise_schemes',
            'applications',
        ];

        // 2. Violations & Appeals
        $violationTables = [
            'violation_appeals',
            'violations',
        ];

        // 3. Coordination, GPS Telematics, Rides & Bookings
        $coordinationAndBookingTables = [
            'tricycle_locations',
            'gps_devices',
            'booking_driver_declines',
            'ride_ratings',
            'ride_sessions',
            'bookings',
            'saved_places',
        ];

        // 4. Drivers, Operators, Tricycles, Passengers & Notifications
        $fleetAndPersonTables = [
            'drivers',
            'operators',
            'tricycles',
            'passengers',
            'notifications',
        ];

        $tablesToClean = array_merge(
            $applicationTables,
            $violationTables,
            $coordinationAndBookingTables,
            $fleetAndPersonTables
        );

        foreach ($tablesToClean as $table) {
            if (Schema::hasTable($table)) {
                $count = DB::table($table)->count();
                DB::table($table)->delete();
                $this->command?->line("  ✔ Cleared {$table} ({$count} records removed)");
            }
        }

        // 5. Clean activity audit logs
        if (Schema::hasTable('audit_logs')) {
            $logCount = DB::table('audit_logs')->count();
            DB::table('audit_logs')->delete();
            $this->command?->line("  ✔ Cleared audit_logs ({$logCount} records removed)");
        }

        // 6. Delete non-staff users (drivers, operators, passengers)
        $staffRoles = ['admin', 'tmo_personnel', 'bplo_staff'];

        if (Schema::hasTable('personal_access_tokens')) {
            $staffUserIds = User::whereIn('role', $staffRoles)->pluck('id');
            $tokensCount = DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereNotIn('tokenable_id', $staffUserIds)
                ->delete();
            $this->command?->line("  ✔ Cleared non-staff personal_access_tokens ({$tokensCount} tokens revoked)");
        }

        $nonStaffCount = User::whereNotIn('role', $staffRoles)->count();
        User::whereNotIn('role', $staffRoles)->delete();
        $this->command?->line("  ✔ Cleared non-staff users ({$nonStaffCount} driver/operator/passenger accounts removed)");

        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 7. Ensure baseline BPLO, TMO, and Admin accounts exist
        $this->ensureStaffAccounts();

        // 8. Ensure municipal rules remain (Color coding schemes and Fare configurations)
        $this->call(ColorCodingSchemesSeeder::class);
        $this->call(FareConfigurationsSeeder::class);

        // 9. Flush cache
        Cache::flush();

        $this->command?->info('');
        $this->command?->info('✨ Clean-up successful! Database has been reset to staff accounts & rules only.');
        $this->command?->info('');

        // Display remaining active staff accounts
        $staffAccounts = User::whereIn('role', $staffRoles)
            ->get(['name', 'email', 'role', 'contact_number'])
            ->map(fn($u) => [
                'Name'    => $u->name,
                'Email'   => $u->email,
                'Role'    => $u->role,
                'Contact' => $u->contact_number,
            ])
            ->toArray();

        $this->command?->table(['Name', 'Email', 'Role', 'Contact Number'], $staffAccounts);
        $this->command?->info('Preserved Rules: ' . ColorCodingScheme::count() . ' Color Coding Schemes, ' . FareConfiguration::count() . ' Fare Configuration(s).');
        $this->command?->info('');
    }

    /**
     * Ensures default administrative, TMO, and BPLO staff accounts exist.
     */
    protected function ensureStaffAccounts(): void
    {
        // 1. Admin
        User::updateOrCreate(
            ['email' => 'admin@trivora.gov.ph'],
            [
                'name'           => 'System Administrator',
                'password'       => Hash::make('Admin@123'),
                'role'           => 'admin',
                'is_active'      => true,
                'contact_number' => '09170000001',
            ]
        );

        // 2. TMO Personnel
        $tmoUsers = [
            [
                'name'    => 'Juan dela Cruz',
                'email'   => 'tmo.jdelacruz@trivora.gov.ph',
                'contact' => '09170000002',
            ],
            [
                'name'    => 'Maria Santos',
                'email'   => 'tmo.msantos@trivora.gov.ph',
                'contact' => '09170000003',
            ],
        ];

        foreach ($tmoUsers as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name'           => $data['name'],
                    'password'       => Hash::make('TmoUser@123'),
                    'role'           => 'tmo_personnel',
                    'is_active'      => true,
                    'contact_number' => $data['contact'],
                ]
            );
        }

        // 3. BPLO Staff
        $bploUsers = [
            [
                'name'    => 'Ana Reyes',
                'email'   => 'bplo.areyes@trivora.gov.ph',
                'contact' => '09170000004',
            ],
            [
                'name'    => 'Carlos Mendoza',
                'email'   => 'bplo.cmendoza@trivora.gov.ph',
                'contact' => '09170000005',
            ],
        ];

        foreach ($bploUsers as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name'           => $data['name'],
                    'password'       => Hash::make('BploUser@123'),
                    'role'           => 'bplo_staff',
                    'is_active'      => true,
                    'contact_number' => $data['contact'],
                ]
            );
        }
    }
}
