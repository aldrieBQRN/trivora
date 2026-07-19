<?php

namespace Database\Seeders;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    /**
     * Seed system users for every role, plus sample tricycle driver accounts.
     */
    public function run(): void
    {
        // ---------------------------------------------------------------------
        // 1. Admin
        // ---------------------------------------------------------------------
        User::firstOrCreate(
            ['email' => 'admin@trivora.gov.ph'],
            [
                'name'      => 'System Administrator',
                'password'  => Hash::make('Admin@123'),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 2. TMO Personnel
        // ---------------------------------------------------------------------
        $tmoUsers = [
            [
                'name'  => 'Juan dela Cruz',
                'email' => 'tmo.jdelacruz@trivora.gov.ph',
            ],
            [
                'name'  => 'Maria Santos',
                'email' => 'tmo.msantos@trivora.gov.ph',
            ],
        ];

        foreach ($tmoUsers as $data) {
            User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name'      => $data['name'],
                    'password'  => Hash::make('TmoUser@123'),
                    'role'      => 'tmo_personnel',
                    'is_active' => true,
                ]
            );
        }

        // ---------------------------------------------------------------------
        // 3. BPLO Staff
        // ---------------------------------------------------------------------
        $bploUsers = [
            [
                'name'  => 'Ana Reyes',
                'email' => 'bplo.areyes@trivora.gov.ph',
            ],
            [
                'name'  => 'Carlos Mendoza',
                'email' => 'bplo.cmendoza@trivora.gov.ph',
            ],
        ];

        foreach ($bploUsers as $data) {
            User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name'      => $data['name'],
                    'password'  => Hash::make('BploUser@123'),
                    'role'      => 'bplo_staff',
                    'is_active' => true,
                ]
            );
        }

        // ---------------------------------------------------------------------
        // 4. Municipal Treasurer
        // ---------------------------------------------------------------------
        User::firstOrCreate(
            ['email' => 'treasurer@trivora.gov.ph'],
            [
                'name'      => 'Roberto Aquino',
                'password'  => Hash::make('Treasurer@123'),
                'role'      => 'municipal_treasurer',
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 5. Tricycle Drivers (with Operator profiles)
        // ---------------------------------------------------------------------
        $toda1 = TodaZone::where('code', 'TODA-01')->first();
        $toda2 = TodaZone::where('code', 'TODA-02')->first();
        $toda3 = TodaZone::where('code', 'TODA-03')->first();

        $drivers = [
            [
                'user' => [
                    'name'  => 'Pedro Ramos',
                    'email' => 'driver.pramos@trivora.ph',
                ],
                'operator' => [
                    'first_name'               => 'Pedro',
                    'middle_name'              => 'Cruz',
                    'last_name'                => 'Ramos',
                    'contact_number'           => '09171234501',
                    'address'                  => '12 Sampaguita St., Poblacion',
                    'barangay'                 => 'Poblacion',
                    'date_of_birth'            => '1985-06-15',
                    'license_number'           => 'N01-85-123456',
                    'license_expiry_date'      => '2027-06-15',
                    'license_restriction_code' => '1,2',
                    'toda_id'                  => $toda1?->id,
                ],
            ],
            [
                'user' => [
                    'name'  => 'Jose Bautista',
                    'email' => 'driver.jbautista@trivora.ph',
                ],
                'operator' => [
                    'first_name'               => 'Jose',
                    'middle_name'              => 'Andres',
                    'last_name'                => 'Bautista',
                    'contact_number'           => '09181234502',
                    'address'                  => '7 Rosal Ave., Bagong Silang',
                    'barangay'                 => 'Bagong Silang',
                    'date_of_birth'            => '1990-03-22',
                    'license_number'           => 'N01-90-234567',
                    'license_expiry_date'      => '2026-03-22',
                    'license_restriction_code' => '1',
                    'toda_id'                  => $toda2?->id,
                ],
            ],
            [
                'user' => [
                    'name'  => 'Ernesto Villanueva',
                    'email' => 'driver.evillanueva@trivora.ph',
                ],
                'operator' => [
                    'first_name'               => 'Ernesto',
                    'middle_name'              => null,
                    'last_name'                => 'Villanueva',
                    'contact_number'           => '09201234503',
                    'address'                  => '3 Dahlia St., San Isidro',
                    'barangay'                 => 'San Isidro',
                    'date_of_birth'            => '1978-11-05',
                    'license_number'           => 'N01-78-345678',
                    'license_expiry_date'      => '2025-11-05',
                    'license_restriction_code' => '1,2,3',
                    'toda_id'                  => $toda3?->id,
                ],
            ],
            [
                'user' => [
                    'name'  => 'Maria Clara',
                    'email' => 'driver.mclara@trivora.ph',
                ],
                'operator' => [
                    'first_name'               => 'Maria',
                    'middle_name'              => 'Luz',
                    'last_name'                => 'Clara',
                    'contact_number'           => '09191234504',
                    'address'                  => '45 Makiling St., Poblacion',
                    'barangay'                 => 'Poblacion',
                    'date_of_birth'            => '1995-05-10',
                    'license_number'           => 'N01-95-456789',
                    'license_expiry_date'      => '2028-05-10',
                    'license_restriction_code' => '1',
                    'toda_id'                  => $toda1?->id,
                ],
            ],
            [
                'user' => [
                    'name'  => 'Ricardo Santos',
                    'email' => 'driver.rsantos@trivora.ph',
                ],
                'operator' => [
                    'first_name'               => 'Ricardo',
                    'middle_name'              => 'Diaz',
                    'last_name'                => 'Santos',
                    'contact_number'           => '09211234505',
                    'address'                  => '88 Apo St., Bagong Silang',
                    'barangay'                 => 'Bagong Silang',
                    'date_of_birth'            => '1988-12-12',
                    'license_number'           => 'N01-88-567890',
                    'license_expiry_date'      => '2027-12-12',
                    'license_restriction_code' => '1,2',
                    'toda_id'                  => $toda2?->id,
                ],
            ],
        ];

        foreach ($drivers as $entry) {
            $user = User::firstOrCreate(
                ['email' => $entry['user']['email']],
                [
                    'name'      => $entry['user']['name'],
                    'password'  => Hash::make('Driver@123'),
                    'role'      => 'tricycle_driver',
                    'is_active' => true,
                ]
            );

            // Create operator profile only if it doesn't exist yet
            if (! $user->operator) {
                Operator::create(array_merge(
                    ['user_id' => $user->id],
                    $entry['operator']
                ));
            }
        }

        $this->command->info('✔ Users seeded (1 admin, 2 TMO, 2 BPLO, 1 treasurer, 3 drivers with operator profiles).');
    }
}
