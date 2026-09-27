<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds dedicated test & demo accounts:
 * - 1 Passenger test account
 * - 1 Primary Driver App demo login account (driver.test@trivora.test / 09170001111)
 *   with exactly 1 active tricycle (TEST-0001) and exactly 1 active franchise (Unit 9999).
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
        // 1. Five Passenger Test Accounts (for Passenger App login)
        // ---------------------------------------------------------------------
        $passengersData = [
            [
                'email' => 'passenger.test@trivora.test',
                'name'  => 'Test Passenger 1',
                'phone' => '+63 900 111 2221',
                'rides' => 5,
            ],
            [
                'email' => 'passenger2@trivora.test',
                'name'  => 'Maria Santos',
                'phone' => '+63 900 111 2222',
                'rides' => 12,
            ],
            [
                'email' => 'passenger3@trivora.test',
                'name'  => 'Carlo Reyes',
                'phone' => '+63 900 111 2223',
                'rides' => 3,
            ],
            [
                'email' => 'passenger4@trivora.test',
                'name'  => 'Elena Dizon',
                'phone' => '+63 900 111 2224',
                'rides' => 8,
            ],
            [
                'email' => 'passenger5@trivora.test',
                'name'  => 'Rico Ramos',
                'phone' => '+63 900 111 2225',
                'rides' => 15,
            ],
        ];

        foreach ($passengersData as $pData) {
            $pUser = User::updateOrCreate(
                ['email' => $pData['email']],
                [
                    'name'      => $pData['name'],
                    'password'  => Hash::make('TestPassenger123!'),
                    'role'      => 'passenger',
                    'is_active' => true,
                ]
            );

            Passenger::updateOrCreate(
                ['user_id' => $pUser->id],
                [
                    'mobile_number' => $pData['phone'],
                    'rating'        => 5.00,
                    'total_rides'   => $pData['rides'],
                ]
            );
        }

        // Also ensure fallback passenger@trivora.ph exists
        $defaultPassenger = User::updateOrCreate(
            ['email' => 'passenger@trivora.ph'],
            [
                'name'      => 'Default Passenger',
                'password'  => Hash::make('Passenger@123'),
                'role'      => 'passenger',
                'is_active' => true,
            ]
        );

        Passenger::updateOrCreate(
            ['user_id' => $defaultPassenger->id],
            [
                'mobile_number' => '+63 917 000 1122',
                'rating'        => 4.90,
                'total_rides'   => 14,
            ]
        );

        // ---------------------------------------------------------------------
        // 2. Five Driver Demo Accounts (for Driver App login with mobile)
        // ---------------------------------------------------------------------
        $adminUser = User::where('email', 'admin@trivora.gov.ph')->first() ?: User::first();
        $colorSchemes = ColorCodingScheme::all()->keyBy('name');

        $canonicalDocTypes = [
            'police_clearance',
            'health_certificate',
            'orcr_photocopy',
            'drivers_license',
            'barangay_clearance',
            'toda_clearance',
            'cedula',
            'driver_id',
            'tariff_list',
        ];

        $driversData = [
            [
                'email'       => 'driver.test@trivora.test',
                'name'        => 'Test Driver',
                'first_name'  => 'Test',
                'last_name'   => 'Driver',
                'mobile'      => '09170001111',
                'license'     => 'TEST-DRV-000001',
                'plate'       => 'TEST-0001',
                'franchise'   => '9999',
                'sticker'     => 'STK-2026-9999',
                'engine'      => 'TEST-ENG-0001',
                'chassis'     => 'TEST-CHS-0001',
                'make'        => 'Honda',
                'model'       => 'TMX 125',
                'color'       => 'White',
                'scheme_name' => 'White',
                'toda_code'   => 'TODA-BRGY10',
                'ref'         => 'APP-2026-09999',
                'lat'         => 14.0725,
                'lng'         => 120.6322,
                'with_violations' => true,
            ],
            [
                'email'       => 'driver2@trivora.test',
                'name'        => 'Pedro Gomez',
                'first_name'  => 'Pedro',
                'last_name'   => 'Gomez',
                'mobile'      => '09170002222',
                'license'     => 'TEST-DRV-000002',
                'plate'       => 'TEST-0002',
                'franchise'   => '9992',
                'sticker'     => 'STK-2026-9992',
                'engine'      => 'TEST-ENG-0002',
                'chassis'     => 'TEST-CHS-0002',
                'make'        => 'Yamaha',
                'model'       => 'STX 125',
                'color'       => 'Blue',
                'scheme_name' => 'Red',
                'toda_code'   => 'TODA-BUCANA',
                'ref'         => 'APP-2026-09992',
                'lat'         => 14.0770,
                'lng'         => 120.6280,
                'with_violations' => false,
            ],
            [
                'email'       => 'driver3@trivora.test',
                'name'        => 'Ramon Bautista',
                'first_name'  => 'Ramon',
                'last_name'   => 'Bautista',
                'mobile'      => '09170003333',
                'license'     => 'TEST-DRV-000003',
                'plate'       => 'TEST-0003',
                'franchise'   => '9993',
                'sticker'     => 'STK-2026-9993',
                'engine'      => 'TEST-ENG-0003',
                'chassis'     => 'TEST-CHS-0003',
                'make'        => 'Kawasaki',
                'model'       => 'Barako II',
                'color'       => 'Red',
                'scheme_name' => 'Blue',
                'toda_code'   => 'TODA-BRGY8',
                'ref'         => 'APP-2026-09993',
                'lat'         => 14.0745,
                'lng'         => 120.6350,
                'with_violations' => false,
            ],
            [
                'email'       => 'driver4@trivora.test',
                'name'        => 'Arnel Mendoza',
                'first_name'  => 'Arnel',
                'last_name'   => 'Mendoza',
                'mobile'      => '09170004444',
                'license'     => 'TEST-DRV-000004',
                'plate'       => 'TEST-0004',
                'franchise'   => '9994',
                'sticker'     => 'STK-2026-9994',
                'engine'      => 'TEST-ENG-0004',
                'chassis'     => 'TEST-CHS-0004',
                'make'        => 'Bajaj',
                'model'       => 'RE 4S',
                'color'       => 'Green',
                'scheme_name' => 'Blue',
                'toda_code'   => 'TODA-BRGY4',
                'ref'         => 'APP-2026-09994',
                'lat'         => 14.0700,
                'lng'         => 120.6300,
                'with_violations' => false,
            ],
            [
                'email'       => 'driver5@trivora.test',
                'name'        => 'Eduardo Tolentino',
                'first_name'  => 'Eduardo',
                'last_name'   => 'Tolentino',
                'mobile'      => '09170005555',
                'license'     => 'TEST-DRV-000005',
                'plate'       => 'TEST-0005',
                'franchise'   => '9995',
                'sticker'     => 'STK-2026-9995',
                'engine'      => 'TEST-ENG-0005',
                'chassis'     => 'TEST-CHS-0005',
                'make'        => 'Honda',
                'model'       => 'TMX Alpha',
                'color'       => 'Black',
                'scheme_name' => 'Yellow',
                'toda_code'   => 'TODA-BRGY1',
                'ref'         => 'APP-2026-09995',
                'lat'         => 14.0760,
                'lng'         => 120.6335,
                'with_violations' => false,
            ],
        ];

        foreach ($driversData as $d) {
            $zone = $allZones->get($d['toda_code']) ?? $allZones->first();
            $scheme = $colorSchemes->get($d['scheme_name']) ?? $colorSchemes->first();

            $driverUser = User::updateOrCreate(
                ['email' => $d['email']],
                [
                    'name'           => $d['name'],
                    'contact_number' => $d['mobile'],
                    'password'       => Hash::make('TestDriver123!'),
                    'role'           => 'tricycle_driver',
                    'is_active'      => true,
                ]
            );

            $operator = Operator::updateOrCreate(
                ['license_number' => $d['license']],
                [
                    'user_id'                  => $driverUser->id,
                    'toda_id'                  => $zone?->id,
                    'first_name'               => $d['first_name'],
                    'last_name'                => $d['last_name'],
                    'contact_number'           => $d['mobile'],
                    'address'                  => "Test Address, {$zone?->name}, Nasugbu",
                    'barangay'                 => $zone?->name ?? 'Barangay 10',
                    'date_of_birth'            => '1990-01-01',
                    'license_expiry_date'      => now()->addYears(3)->toDateString(),
                    'license_restriction_code' => '1,2',
                ]
            );

            $tricycle = Tricycle::updateOrCreate(
                ['plate_number' => $d['plate']],
                [
                    'operator_id'          => $operator->id,
                    'toda_zone_id'         => $zone?->id,
                    'coding_scheme_number' => $d['franchise'],
                    'engine_number'        => $d['engine'],
                    'chassis_number'       => $d['chassis'],
                    'make'                 => $d['make'],
                    'model'                => $d['model'],
                    'year_model'           => (int) now()->format('Y'),
                    'body_color'           => $d['color'],
                    'body_type'            => 'Standard',
                    'status'               => 'active',
                    'tracking_capability'  => 'mobile_only',
                    'active_tracking_mode' => 'mobile_app',
                ]
            );

            Driver::updateOrCreate(
                ['user_id' => $driverUser->id],
                [
                    'operator_id'              => $operator->id,
                    'tricycle_id'              => $tricycle->id,
                    'license_number'           => $d['license'],
                    'mobile_number'            => $d['mobile'],
                    'is_online'                => true,
                    'is_available'             => true,
                    'current_lat'              => $d['lat'],
                    'current_lng'              => $d['lng'],
                    'last_location_updated_at' => now(),
                    'rating'                   => 5.00,
                    'total_trips'              => 12,
                    'today_earnings'           => 240.00,
                ]
            );

            TricycleLocation::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'latitude'    => $d['lat'],
                    'longitude'   => $d['lng'],
                    'speed_kmh'   => 0,
                    'heading_deg' => 0,
                    'accuracy_m'  => 5.0,
                    'source'      => 'mobile_app',
                    'recorded_at' => now(),
                ]
            );

            $app = Application::updateOrCreate(
                ['reference_number' => $d['ref']],
                [
                    'operator_id'      => $operator->id,
                    'tricycle_id'      => $tricycle->id,
                    'application_type' => 'new',
                    'current_step'     => 5,
                    'status'           => 'completed',
                    'sticker_number'   => $d['sticker'],
                    'submitted_at'     => now()->subMonths(2),
                    'completed_at'     => now()->subMonths(2),
                    'remarks'          => "All requirements verified. Active franchise {$d['franchise']} issued.",
                ]
            );

            $franchise = FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $scheme?->id,
                    'franchise_number'       => $d['franchise'],
                    'sticker_number'         => $d['sticker'],
                    'issued_by'              => $adminUser->id,
                    'issue_date'             => now()->subMonths(2)->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => true,
                    'status'                 => 'active',
                    'notes'                  => "Demo Driver App operational franchise {$d['franchise']}.",
                ]
            );

            // Canonical documents for the application
            foreach ($canonicalDocTypes as $docType) {
                ApplicationDocument::updateOrCreate(
                    [
                        'application_id' => $app->id,
                        'document_type'  => $docType,
                    ],
                    [
                        'file_name'        => Str::slug($docType) . '_sample.pdf',
                        'file_path'        => 'documents/' . $app->reference_number . '/' . Str::slug($docType) . '.pdf',
                        'file_size_kb'     => 250,
                        'mime_type'        => 'application/pdf',
                        'review_status'    => 'approved',
                        'reviewed_by'      => $adminUser->id,
                        'reviewed_at'      => now()->subMonths(2),
                        'rejection_reason' => null,
                    ]
                );
            }

            Inspection::updateOrCreate(
                ['application_id' => $app->id, 'attempt_number' => 1],
                [
                    'inspector_id'      => $adminUser->id,
                    'inspection_date'   => now()->subMonths(2)->toDateString(),
                    'inspection_time'   => '09:00:00',
                    'location_address'  => 'TMO Compound, Municipal Hall',
                    'result'            => 'passed',
                    'safety_equipment'  => true,
                    'brakes_steering'   => true,
                    'lights_reflectors' => true,
                    'tires_suspension'  => true,
                    'emissions_test'    => true,
                    'license_toda_docs' => true,
                    'inspector_notes'   => 'Vehicle cleared all roadworthiness and safety inspection requirements.',
                ]
            );

            $workflowSteps = [
                ['from' => null, 'to' => 'pending_review', 'step' => 1, 'notes' => 'Application submitted with all 9 required documents.', 'days' => 65],
                ['from' => 'pending_review', 'to' => 'pending_inspection', 'step' => 2, 'notes' => 'Requirements verified and approved by TMO.', 'days' => 64],
                ['from' => 'pending_inspection', 'to' => 'pending_bplo_release', 'step' => 3, 'notes' => 'Physical roadworthiness inspection passed.', 'days' => 62],
                ['from' => 'pending_bplo_release', 'to' => 'awaiting_tmo_confirmation', 'step' => 4, 'notes' => "Franchise Number {$d['franchise']} released by BPLO.", 'days' => 60],
                ['from' => 'awaiting_tmo_confirmation', 'to' => 'completed', 'step' => 5, 'notes' => 'TMO final confirmation completed. Telematics configured and active.', 'days' => 60],
            ];
            foreach ($workflowSteps as $st) {
                ApplicationStatusHistory::updateOrCreate(
                    [
                        'application_id' => $app->id,
                        'to_status'      => $st['to'],
                    ],
                    [
                        'changed_by'  => $adminUser->id,
                        'from_status' => $st['from'],
                        'from_step'   => $st['step'] > 1 ? $st['step'] - 1 : null,
                        'to_step'     => $st['step'],
                        'notes'       => $st['notes'],
                        'created_at'  => now()->subDays($st['days']),
                    ]
                );
            }

            // Demo Violations for Primary Demo Driver (TEST-0001)
            if (!empty($d['with_violations'])) {
                $pastPing = TricycleLocation::create([
                    'tricycle_id' => $tricycle->id,
                    'latitude'    => 14.0730,
                    'longitude'   => 120.6325,
                    'speed_kmh'   => 24.5,
                    'heading_deg' => 120,
                    'accuracy_m'  => 4.5,
                    'source'      => 'mobile_app',
                    'recorded_at' => now()->subDays(12)->setTime(10, 15, 0),
                ]);

                Violation::updateOrCreate(
                    [
                        'tricycle_id' => $tricycle->id,
                        'status'      => 'resolved',
                    ],
                    [
                        'franchise_scheme_id'    => $franchise->id,
                        'color_coding_scheme_id' => $scheme?->id,
                        'location_snapshot_id'   => $pastPing->id,
                        'detected_by'            => null,
                        'violation_type'         => 'color_coding',
                        'detected_at'            => now()->subDays(12)->setTime(10, 15, 0),
                        'day_of_week'            => 'Wednesday',
                        'detection_method'       => 'automated',
                        'status'                 => 'resolved',
                        'fine_amount'            => 500.00,
                        'fine_paid_at'           => now()->subDays(10)->setTime(14, 20, 0),
                        'notes'                  => 'Automated Telematics: Unit detected active within Poblacion corridor during Blue coding window. Fine settled at Municipal Treasurer\'s Office.',
                    ]
                );

                $recentPing = TricycleLocation::create([
                    'tricycle_id' => $tricycle->id,
                    'latitude'    => 14.0715,
                    'longitude'   => 120.6310,
                    'speed_kmh'   => 18.0,
                    'heading_deg' => 280,
                    'accuracy_m'  => 5.0,
                    'source'      => 'mobile_app',
                    'recorded_at' => now()->subDays(2)->setTime(15, 45, 0),
                ]);

                Violation::updateOrCreate(
                    [
                        'tricycle_id' => $tricycle->id,
                        'status'      => 'open',
                    ],
                    [
                        'franchise_scheme_id'    => $franchise->id,
                        'color_coding_scheme_id' => $scheme?->id,
                        'location_snapshot_id'   => $recentPing->id,
                        'detected_by'            => null,
                        'violation_type'         => 'color_coding',
                        'detected_at'            => now()->subDays(2)->setTime(15, 45, 0),
                        'day_of_week'            => 'Wednesday',
                        'detection_method'       => 'automated',
                        'status'                 => 'open',
                        'fine_amount'            => 500.00,
                        'fine_paid_at'           => null,
                        'notes'                  => 'Automated Telematics: Restricted day operation detected along JP Laurel St. Outstanding fine required.',
                    ]
                );
            }
        }

        $this->command->info('✔ Successfully seeded 5 Driver App accounts (09170001111 - 09170005555) and 5 Passenger accounts!');
    }
}
