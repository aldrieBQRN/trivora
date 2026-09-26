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

        // Single completed Application for the primary demo driver (so the Application Tracker shows 1 active franchise)
        $testApp = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-09999'],
            [
                'operator_id'      => $testOperator->id,
                'tricycle_id'      => $testTricycle->id,
                'application_type' => 'new',
                'current_step'     => 5,
                'status'           => 'completed',
                'sticker_number'   => 'STK-2026-9999',
                'submitted_at'     => now()->subMonths(2),
                'completed_at'     => now()->subMonths(2),
                'remarks'          => 'All requirements verified. Active franchise 9999 issued.',
            ]
        );

        // Explicitly create or update the single active FranchiseScheme for the primary Driver App login unit
        $blueScheme = ColorCodingScheme::where('name', 'Blue')->first() ?? ColorCodingScheme::first();
        $adminUser = User::where('email', 'admin@trivora.gov.ph')->first() ?? $driverTestUser;

        FranchiseScheme::updateOrCreate(
            ['tricycle_id' => $testTricycle->id],
            [
                'application_id'         => $testApp->id,
                'color_coding_scheme_id' => $blueScheme?->id,
                'franchise_number'       => '9999',
                'sticker_number'         => 'STK-2026-9999',
                'issued_by'              => $adminUser->id,
                'issue_date'             => now()->subMonths(2)->toDateString(),
                'expiry_date'            => now()->addYears(3)->toDateString(),
                'is_active'              => true,
                'status'                 => 'active',
                'notes'                  => 'Primary Demo Driver App operational franchise.',
            ]
        );

        // ---------------------------------------------------------------------
        // 3. Application Documents, Inspection & Status History for APP-2026-09999
        // ---------------------------------------------------------------------
        // Ensures the Document Verification and Physical Inspection cards in the
        // Application Tracker display complete verified records.
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

        foreach ($canonicalDocTypes as $docType) {
            ApplicationDocument::updateOrCreate(
                [
                    'application_id' => $testApp->id,
                    'document_type'  => $docType,
                ],
                [
                    'file_name'        => Str::slug($docType) . '_sample.pdf',
                    'file_path'        => 'documents/' . $testApp->reference_number . '/' . Str::slug($docType) . '.pdf',
                    'file_size_kb'     => rand(120, 480),
                    'mime_type'        => 'application/pdf',
                    'review_status'    => 'approved',
                    'reviewed_by'      => $adminUser->id,
                    'reviewed_at'      => now()->subMonths(2),
                    'rejection_reason' => null,
                ]
            );
        }

        Inspection::updateOrCreate(
            ['application_id' => $testApp->id, 'attempt_number' => 1],
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
            ['from' => 'pending_bplo_release', 'to' => 'awaiting_tmo_confirmation', 'step' => 4, 'notes' => 'Franchise Number 9999 released by BPLO.', 'days' => 60],
            ['from' => 'awaiting_tmo_confirmation', 'to' => 'completed', 'step' => 5, 'notes' => 'TMO final confirmation completed. Telematics configured and active.', 'days' => 60],
        ];
        foreach ($workflowSteps as $st) {
            ApplicationStatusHistory::updateOrCreate(
                [
                    'application_id' => $testApp->id,
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

        // ---------------------------------------------------------------------
        // 4. Demo Violations for Primary Demo Driver (TEST-0001)
        // ---------------------------------------------------------------------
        // Provides 1 settled (resolved/paid) and 1 unpaid (open) violation for testing
        // the Driver App, Driver Portal, and TMO Violations page.
        $testFranchise = FranchiseScheme::where('tricycle_id', $testTricycle->id)->first();

        // 1. Settled Violation (Past resolved color-coding violation)
        $pastPing = TricycleLocation::create([
            'tricycle_id' => $testTricycle->id,
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
                'tricycle_id' => $testTricycle->id,
                'status'      => 'resolved',
            ],
            [
                'franchise_scheme_id'    => $testFranchise?->id,
                'color_coding_scheme_id' => $blueScheme?->id,
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

        // 2. Unpaid Violation (Recent open violation)
        $recentPing = TricycleLocation::create([
            'tricycle_id' => $testTricycle->id,
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
                'tricycle_id' => $testTricycle->id,
                'status'      => 'open',
            ],
            [
                'franchise_scheme_id'    => $testFranchise?->id,
                'color_coding_scheme_id' => $blueScheme?->id,
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

        $this->command->info('✔ Successfully seeded the primary Driver App demo login account (09170001111 / TEST-0001 / Unit 9999) with full documents and violations!');
    }
}
