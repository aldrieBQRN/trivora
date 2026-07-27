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
        // 4b. Default Passengers
        // ---------------------------------------------------------------------
        $pUser = User::firstOrCreate(
            ['email' => 'passenger@trivora.ph'],
            [
                'name'      => 'Default Passenger',
                'password'  => Hash::make('Passenger@123'),
                'role'      => 'passenger',
                'is_active' => true,
            ]
        );
        \App\Models\Passenger::firstOrCreate(
            ['user_id' => $pUser->id],
            ['mobile_number' => '09170001122', 'rating' => 5.00, 'total_rides' => 0]
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
            $op = $user->operator;
            if (! $op) {
                $op = Operator::create(array_merge(
                    ['user_id' => $user->id],
                    $entry['operator']
                ));
            }

            // Ensure Driver record and Tricycle linking
            $driverRec = \App\Models\Driver::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'operator_id'    => $op->id,
                    'license_number' => $op->license_number,
                    'mobile_number'  => $op->contact_number,
                    'is_online'      => true,
                    'is_available'   => true,
                    'rating'         => 5.00,
                    'total_trips'    => 0,
                ]
            );

            // Configure Mobile App GPS for driver.rsantos@trivora.ph
            if (in_array($user->email, ['driver.rsantos@trivora.ph'])) {
                $trike = \App\Models\Tricycle::firstOrCreate(
                    ['plate_number' => 'TRV-MOBGPS'],
                    [
                        'operator_id'          => $op->id,
                        'coding_scheme_number' => '0142',
                        'engine_number'        => 'ENG-MOBGPS-888',
                        'chassis_number'       => 'CHS-MOBGPS-888',
                        'make'                 => 'Honda',
                        'model'                => 'TMX 125',
                        'year_model'           => 2022,
                        'body_color'           => 'Blue',
                        'body_type'            => 'Standard Side Car',
                        'status'               => 'active',
                        'tracking_capability'  => 'mobile_only',
                        'active_tracking_mode' => 'mobile_app',
                    ]
                );
                $driverRec->update(['tricycle_id' => $trike->id]);
            }
        }

        // ---------------------------------------------------------------------
        // 6. Unlinked MTOP Franchise Operator for New Driver Registration
        // ---------------------------------------------------------------------
        $unlinkedOp = Operator::firstOrCreate(
            ['license_number' => 'N01-99-999999'],
            [
                'user_id'                  => null,
                'first_name'               => 'Juan',
                'middle_name'              => 'Dela',
                'last_name'                => 'Cruz',
                'contact_number'           => '09179998877',
                'address'                  => '100 Municipal Rd., Poblacion',
                'barangay'                 => 'Poblacion',
                'date_of_birth'            => '1992-08-20',
                'license_expiry_date'      => '2028-08-20',
                'license_restriction_code' => '1,2',
                'toda_id'                  => $toda1?->id,
            ]
        );
        $unlinkedOp->applications()->firstOrCreate([
            'reference_number' => 'APPL-2026-0999',
        ], [
            'tricycle_id'      => \App\Models\Tricycle::value('id') ?: 1,
            'application_type' => 'new',
            'status'           => 'completed',
            'submitted_at'     => now(),
        ]);

        $unlinkedOp2 = Operator::firstOrCreate(
            ['license_number' => 'N01-88-888888'],
            [
                'user_id'                  => null,
                'first_name'               => 'Mario',
                'middle_name'              => 'Santos',
                'last_name'                => 'Dizon',
                'contact_number'           => '09187776655',
                'address'                  => '55 Laurel St., Bucana',
                'barangay'                 => 'Bucana',
                'date_of_birth'            => '1991-04-15',
                'license_expiry_date'      => '2028-04-15',
                'license_restriction_code' => '1,2',
                'toda_id'                  => $toda1?->id,
            ]
        );
        $unlinkedOp2->applications()->firstOrCreate([
            'reference_number' => 'APPL-2026-0888',
        ], [
            'tricycle_id'      => \App\Models\Tricycle::value('id') ?: 1,
            'application_type' => 'new',
            'status'           => 'completed',
            'submitted_at'     => now(),
        ]);

        $this->command->info('✔ Users seeded (1 admin, 2 TMO, 2 BPLO, 1 treasurer, 3 drivers, unlinked permits N01-99-999999, N01-88-888888).');
    }
}
