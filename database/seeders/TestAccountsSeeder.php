<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds dedicated test & demo accounts:
 * - 1 Passenger test account
 * - 1 Universal Driver test account (driver.test@trivora.test)
 * - 1 Dedicated active driver account for EACH of the 11 TODA zones in Nasugbu
 *
 * Safe to re-run: every record is created via updateOrCreate keyed on unique columns.
 */
class TestAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure TODA zones exist first
        $this->call(TodaZonesSeeder::class);

        $allZones = TodaZone::where('is_active', true)->get()->keyBy('code');

        if ($allZones->isEmpty()) {
            $this->command->error('TestAccountsSeeder: no TODA zones available — aborting.');
            return;
        }

        // ---------------------------------------------------------------------
        // 1. Passenger test account
        // ---------------------------------------------------------------------
        $passengerUser = User::updateOrCreate(
            ['email' => 'passenger.test@trivora.test'],
            [
                'name' => 'Test Passenger',
                'password' => Hash::make('TestPassenger123!'),
                'role' => 'passenger',
                'is_active' => true,
            ]
        );

        Passenger::updateOrCreate(
            ['user_id' => $passengerUser->id],
            [
                'mobile_number' => '+63 900 111 2222',
                'rating' => 5.00,
                'total_rides' => 0,
            ]
        );

        // Also ensure default passenger@trivora.ph exists
        $defaultPassenger = User::updateOrCreate(
            ['email' => 'passenger@trivora.ph'],
            [
                'name' => 'Default Passenger',
                'password' => Hash::make('Passenger@123'),
                'role' => 'passenger',
                'is_active' => true,
            ]
        );

        Passenger::updateOrCreate(
            ['user_id' => $defaultPassenger->id],
            [
                'mobile_number' => '+63 917 000 1122',
                'rating' => 4.90,
                'total_rides' => 14,
            ]
        );

        // ---------------------------------------------------------------------
        // 2. Universal Driver Test Account (driver.test@trivora.test)
        // ---------------------------------------------------------------------
        $brgy10Zone = $allZones->get('TODA-BRGY10') ?? $allZones->first();

        $driverTestUser = User::updateOrCreate(
            ['email' => 'driver.test@trivora.test'],
            [
                'name' => 'Test Driver',
                'password' => Hash::make('TestDriver123!'),
                'role' => 'tricycle_driver',
                'is_active' => true,
            ]
        );

        $testOperator = Operator::updateOrCreate(
            ['license_number' => 'TEST-DRV-000001'],
            [
                'user_id' => $driverTestUser->id,
                'toda_id' => $brgy10Zone->id,
                'first_name' => 'Test',
                'last_name' => 'Driver',
                'contact_number' => '09170001111',
                'address' => 'Test Address, Barangay 10, Nasugbu',
                'barangay' => 'Barangay 10',
                'date_of_birth' => '1990-01-01',
                'license_expiry_date' => now()->addYears(3)->toDateString(),
                'license_restriction_code' => '1,2',
            ]
        );

        $testTricycle = Tricycle::updateOrCreate(
            ['plate_number' => 'TEST-0001'],
            [
                'operator_id' => $testOperator->id,
                'toda_zone_id' => $brgy10Zone->id,
                'coding_scheme_number' => '9999',
                'engine_number' => 'TEST-ENG-0001',
                'chassis_number' => 'TEST-CHS-0001',
                'make' => 'Honda',
                'model' => 'TMX 125',
                'year_model' => (int) now()->format('Y'),
                'body_color' => 'White',
                'body_type' => 'Standard',
                'status' => 'active',
                'tracking_capability' => 'mobile_only',
                'active_tracking_mode' => 'mobile_app',
            ]
        );

        Driver::updateOrCreate(
            ['user_id' => $driverTestUser->id],
            [
                'operator_id' => $testOperator->id,
                'tricycle_id' => $testTricycle->id,
                'license_number' => 'TEST-DRV-000001',
                'mobile_number' => '09170001111',
                'is_online' => true,
                'is_available' => true,
                'current_lat' => (float) ($brgy10Zone->latitude ?? 14.0725),
                'current_lng' => (float) ($brgy10Zone->longitude ?? 120.6322),
                'last_location_updated_at' => now(),
                'rating' => 5.00,
                'total_trips' => 12,
                'today_earnings' => 240.00,
            ]
        );

        TricycleLocation::updateOrCreate(
            ['tricycle_id' => $testTricycle->id],
            [
                'latitude'    => (float) ($brgy10Zone->latitude ?? 14.0725),
                'longitude'   => (float) ($brgy10Zone->longitude ?? 120.6322),
                'speed_kmh'   => 0,
                'heading_deg' => 0,
                'accuracy_m'  => 5.0,
                'source'      => 'mobile_app',
                'recorded_at' => now(),
            ]
        );

        // ---------------------------------------------------------------------
        // 3. One Driver Account for EACH of the 11 TODA Zones
        // ---------------------------------------------------------------------
        $todaDriversConfig = [
            [
                'code'       => 'TODA-BRGY1',
                'email'      => 'driver.brgy1@trivora.ph',
                'first_name' => 'Eduardo',
                'last_name'  => 'Ramos',
                'body'       => '0101',
                'plate'      => 'TRV-0101',
                'phone'      => '0917-100-0001',
                'make'       => 'Kawasaki Barako II',
            ],
            [
                'code'       => 'TODA-BRGY2',
                'email'      => 'driver.brgy2@trivora.ph',
                'first_name' => 'Roberto',
                'last_name'  => 'Mendoza',
                'body'       => '0201',
                'plate'      => 'TRV-0201',
                'phone'      => '0917-200-0002',
                'make'       => 'Honda TMX 125',
            ],
            [
                'code'       => 'TODA-BRGY3',
                'email'      => 'driver.brgy3@trivora.ph',
                'first_name' => 'Danilo',
                'last_name'  => 'Santos',
                'body'       => '0301',
                'plate'      => 'TRV-0301',
                'phone'      => '0917-300-0003',
                'make'       => 'Yamaha STX 125',
            ],
            [
                'code'       => 'TODA-BRGY4',
                'email'      => 'driver.brgy4@trivora.ph',
                'first_name' => 'Maria',
                'last_name'  => 'Clara',
                'body'       => '0401',
                'plate'      => 'TRV-0401',
                'phone'      => '0917-400-0004',
                'make'       => 'Honda TMX Alpha',
            ],
            [
                'code'       => 'TODA-BRGY5',
                'email'      => 'driver.brgy5@trivora.ph',
                'first_name' => 'Vicente',
                'last_name'  => 'Mercado',
                'body'       => '0501',
                'plate'      => 'TRV-0501',
                'phone'      => '0917-500-0005',
                'make'       => 'Suzuki GD110',
            ],
            [
                'code'       => 'TODA-BRGY6',
                'email'      => 'driver.brgy6@trivora.ph',
                'first_name' => 'Manuel',
                'last_name'  => 'De Silva',
                'body'       => '0601',
                'plate'      => 'TRV-0601',
                'phone'      => '0917-600-0006',
                'make'       => 'Kawasaki Barako 175',
            ],
            [
                'code'       => 'TODA-BRGY7',
                'email'      => 'driver.brgy7@trivora.ph',
                'first_name' => 'Ferdinand',
                'last_name'  => 'Castillo',
                'body'       => '0701',
                'plate'      => 'TRV-0701',
                'phone'      => '0917-700-0007',
                'make'       => 'Honda TMX Supremo',
            ],
            [
                'code'       => 'TODA-BRGY8',
                'email'      => 'driver.brgy8@trivora.ph',
                'first_name' => 'Emilio',
                'last_name'  => 'Villanueva',
                'body'       => '0801',
                'plate'      => 'TRV-0801',
                'phone'      => '0917-800-0008',
                'make'       => 'Yamaha YTX 125',
            ],
            [
                'code'       => 'TODA-BRGY9',
                'email'      => 'driver.brgy9@trivora.ph',
                'first_name' => 'Crisanto',
                'last_name'  => 'Villanueva',
                'body'       => '0901',
                'plate'      => 'TRV-0901',
                'phone'      => '0917-900-0009',
                'make'       => 'Bajaj CT 100',
            ],
            [
                'code'       => 'TODA-BRGY10',
                'email'      => 'driver.brgy10@trivora.ph',
                'first_name' => 'Jose',
                'last_name'  => 'Bautista',
                'body'       => '1001',
                'plate'      => 'TRV-1001',
                'phone'      => '0917-010-0010',
                'make'       => 'Honda TMX 125',
            ],
            [
                'code'       => 'TODA-BUCANA',
                'email'      => 'driver.bucana@trivora.ph',
                'first_name' => 'Pedro',
                'last_name'  => 'Ramos',
                'body'       => '1101',
                'plate'      => 'TRV-1101',
                'phone'      => '0917-011-0011',
                'make'       => 'Kawasaki Barako II',
            ],
        ];

        foreach ($todaDriversConfig as $cfg) {
            $todaZone = $allZones->get($cfg['code']);
            if (!$todaZone) {
                continue;
            }

            // 1. Create or update Driver User
            $user = User::updateOrCreate(
                ['email' => $cfg['email']],
                [
                    'name'      => "{$cfg['first_name']} {$cfg['last_name']}",
                    'password'  => Hash::make('TestDriver123!'),
                    'role'      => 'tricycle_driver',
                    'is_active' => true,
                ]
            );

            // 2. Create or update Operator
            $operator = Operator::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'toda_id'                  => $todaZone->id,
                    'first_name'               => $cfg['first_name'],
                    'last_name'                => $cfg['last_name'],
                    'contact_number'           => $cfg['phone'],
                    'address'                  => "{$todaZone->name} Terminal Area, {$todaZone->barangay}, Nasugbu",
                    'barangay'                 => $todaZone->barangay,
                    'date_of_birth'            => '1988-06-15',
                    'license_number'           => 'LIC-' . strtoupper(str_replace('-', '', $cfg['code'])),
                    'license_expiry_date'      => now()->addYears(3)->toDateString(),
                    'license_restriction_code' => '1,2',
                ]
            );

            // 3. Create or update Tricycle
            $tricycle = Tricycle::updateOrCreate(
                ['plate_number' => $cfg['plate']],
                [
                    'operator_id'          => $operator->id,
                    'toda_zone_id'         => $todaZone->id,
                    'coding_scheme_number' => $cfg['body'],
                    'engine_number'        => 'ENG-' . $cfg['body'],
                    'chassis_number'       => 'CHS-' . $cfg['body'],
                    'make'                 => $cfg['make'],
                    'model'                => 'Standard Tricycle',
                    'year_model'           => (int) now()->format('Y'),
                    'body_color'           => 'White/Municipal Blue',
                    'body_type'            => 'Standard',
                    'status'               => 'active',
                    'tracking_capability'  => 'mobile_only',
                    'active_tracking_mode' => 'mobile_app',
                ]
            );

            // 4. Create or update Driver record (online and placed at the TODA terminal coordinates)
            $terminalLat = (float) ($todaZone->latitude ?? 14.0725);
            $terminalLng = (float) ($todaZone->longitude ?? 120.6322);

            Driver::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'operator_id'              => $operator->id,
                    'tricycle_id'              => $tricycle->id,
                    'license_number'           => $operator->license_number,
                    'mobile_number'            => $cfg['phone'],
                    'is_online'                => true,
                    'is_available'             => true,
                    'current_lat'              => $terminalLat,
                    'current_lng'              => $terminalLng,
                    'last_location_updated_at' => now(),
                    'rating'                   => 4.90,
                    'total_trips'              => rand(25, 80),
                    'today_earnings'           => rand(300, 750),
                ]
            );

            // 5. Create or update initial location ping so all units are active on Live Fleet Monitoring
            TricycleLocation::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'latitude'    => $terminalLat,
                    'longitude'   => $terminalLng,
                    'speed_kmh'   => 0,
                    'heading_deg' => 0,
                    'accuracy_m'  => 5.0,
                    'source'      => 'mobile_app',
                    'recorded_at' => now(),
                ]
            );
        }

        $this->command->info('✔ Successfully seeded active driver accounts for all 11 TODA zones!');
    }
}
