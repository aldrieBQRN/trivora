<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationDriver;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Payment;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Dedicated demo workflow driver records — demonstrating the 8 TMO/BPLO franchise workflow scenarios:
 *
 *   1. driver.expired@trivora.ph      Estrella Dimaculangan     APP-2026-00047
 *      Expired Franchise                    -> completed (step 5), permit expired
 *   2. driver.review@trivora.ph       Alfredo Manalo            APP-2026-00043
 *      Under Document Review                -> pending_review (step 1)
 *   3. driver.resubmit@trivora.ph     Geronimo Pascual          APP-2026-00051
 *      Resubmission Required                -> rejected (step 1), requirements need correction
 *   4. driver.inspection@trivora.ph   Bernardo Lim              APP-2026-00044
 *      Under Physical Inspection            -> pending_inspection (step 2)
 *   5. driver.reinspection@trivora.ph Hernando Cortez           APP-2026-00052
 *      Reinspection Required                -> failed_inspection (step 2), defects need repair
 *   6. driver.bplo@trivora.ph         Cristina Villacorta       APP-2026-00045
 *      Under Releasing                      -> pending_bplo_release (step 3)
 *   7. driver.confirm@trivora.ph      Domingo Aquino            APP-2026-00046
 *      Under Final Confirmation             -> awaiting_tmo_confirmation (step 4)
 *   8. driver.renewed@trivora.ph      Ignacio Morales           APP-2026-00054 (prev APP-2023-00010)
 *      Renewed Expired Franchise            -> expired permit + active renewal in progress (step 3)
 *
 * All demo workflow accounts share password `Driver@123` and are documented in account.md
 * under `## Demo Workflow Accounts`. They are for demonstrating the TMO/BPLO franchise
 * workflow only — they are NOT the primary Driver App login account.
 *
 * Safe to re-run; wired into DatabaseSeeder after TestAccountsSeeder.
 */
class DemoStageDriversSeeder extends Seeder
{
    public function run(): void
    {
        $zones = TodaZone::where('is_active', true)->get()->keyBy('code');

        if ($zones->isEmpty()) {
            $this->command->error('DemoStageDriversSeeder: no active TODA zones found — run TodaZonesSeeder first.');
            return;
        }

        $tmo  = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $bplo = User::where('email', 'bplo.areyes@trivora.gov.ph')->first();

        $stages = [
            [
                'kind'    => 'expired',
                'ref'     => 'APP-2026-00047',
                'email'   => 'driver.expired@trivora.ph',
                'name'    => 'Estrella Dimaculangan',
                'first'   => 'Estrella',
                'middle'  => 'Pascual',
                'last'    => 'Dimaculangan',
                'license' => 'N01-26-700005',
                'phone'   => '09171234605',
                'dob'     => '1994-09-17',
                'zone'    => 'TODA-BRGY5',
                'plate'   => 'STG-0005',
                'coding'  => '2105',
                'make'    => 'Suzuki',
                'model'   => 'GD110',
                'year'    => 2019,
                'color'   => 'Yellow',
                'body'    => 'Standard',
            ],
            [
                'kind'    => 'review',
                'ref'     => 'APP-2026-00043',
                'email'   => 'driver.review@trivora.ph',
                'name'    => 'Alfredo Manalo',
                'first'   => 'Alfredo',
                'middle'  => 'Santos',
                'last'    => 'Manalo',
                'license' => 'N01-26-700001',
                'phone'   => '09171234601',
                'dob'     => '1986-02-14',
                'zone'    => 'TODA-BRGY1',
                'plate'   => 'STG-0001',
                'coding'  => '2101',
                'make'    => 'Honda',
                'model'   => 'TMX 125',
                'year'    => 2022,
                'color'   => 'Blue',
                'body'    => 'Standard Side Car',
            ],
            [
                'kind'    => 'resubmit',
                'ref'     => 'APP-2026-00051',
                'email'   => 'driver.resubmit@trivora.ph',
                'name'    => 'Geronimo Pascual',
                'first'   => 'Geronimo',
                'middle'  => 'Torres',
                'last'    => 'Pascual',
                'license' => 'N01-26-700006',
                'phone'   => '09171234606',
                'dob'     => '1985-05-20',
                'zone'    => 'TODA-BRGY6',
                'plate'   => 'STG-0006',
                'coding'  => '2106',
                'make'    => 'Honda',
                'model'   => 'TMX 125',
                'year'    => 2021,
                'color'   => 'Green',
                'body'    => 'Standard Side Car',
            ],
            [
                'kind'    => 'inspection',
                'ref'     => 'APP-2026-00044',
                'email'   => 'driver.inspection@trivora.ph',
                'name'    => 'Bernardo Lim',
                'first'   => 'Bernardo',
                'middle'  => 'Castro',
                'last'    => 'Lim',
                'license' => 'N01-26-700002',
                'phone'   => '09171234602',
                'dob'     => '1979-07-23',
                'zone'    => 'TODA-BRGY2',
                'plate'   => 'STG-0002',
                'coding'  => '2102',
                'make'    => 'Yamaha',
                'model'   => 'STX 125',
                'year'    => 2021,
                'color'   => 'Red',
                'body'    => 'Standard',
            ],
            [
                'kind'    => 'reinspection',
                'ref'     => 'APP-2026-00052',
                'email'   => 'driver.reinspection@trivora.ph',
                'name'    => 'Hernando Cortez',
                'first'   => 'Hernando',
                'middle'  => 'Valdez',
                'last'    => 'Cortez',
                'license' => 'N01-26-700007',
                'phone'   => '09171234607',
                'dob'     => '1982-10-12',
                'zone'    => 'TODA-BRGY7',
                'plate'   => 'STG-0007',
                'coding'  => '2107',
                'make'    => 'Kawasaki',
                'model'   => 'Barako II',
                'year'    => 2020,
                'color'   => 'Orange',
                'body'    => 'Standard Side Car',
            ],
            [
                'kind'    => 'bplo',
                'ref'     => 'APP-2026-00045',
                'email'   => 'driver.bplo@trivora.ph',
                'name'    => 'Cristina Villacorta',
                'first'   => 'Cristina',
                'middle'  => 'Reyes',
                'last'    => 'Villacorta',
                'license' => 'N01-26-700003',
                'phone'   => '09171234603',
                'dob'     => '1992-11-08',
                'zone'    => 'TODA-BRGY3',
                'plate'   => 'STG-0003',
                'coding'  => '2103',
                'make'    => 'Kawasaki',
                'model'   => 'Barako 175',
                'year'    => 2023,
                'color'   => 'White',
                'body'    => 'Pass-Thru Sidecar',
            ],
            [
                'kind'    => 'confirm',
                'ref'     => 'APP-2026-00046',
                'email'   => 'driver.confirm@trivora.ph',
                'name'    => 'Domingo Aquino',
                'first'   => 'Domingo',
                'middle'  => 'Padilla',
                'last'    => 'Aquino',
                'license' => 'N01-26-700004',
                'phone'   => '09171234604',
                'dob'     => '1968-04-30',
                'zone'    => 'TODA-BRGY4',
                'plate'   => 'STG-0004',
                'coding'  => '2104',
                'make'    => 'Honda',
                'model'   => 'TMX Alpha',
                'year'    => 2020,
                'color'   => 'Black',
                'body'    => 'Standard Side Car',
            ],
            [
                'kind'     => 'renewed_expired',
                'ref'      => 'APP-2026-00054',
                'orig_ref' => 'APP-2023-00010',
                'email'    => 'driver.renewed@trivora.ph',
                'name'     => 'Ignacio Morales',
                'first'    => 'Ignacio',
                'middle'   => 'Dela Cruz',
                'last'     => 'Morales',
                'license'  => 'N01-26-700008',
                'phone'    => '09171234608',
                'dob'      => '1975-08-25',
                'zone'     => 'TODA-BRGY8',
                'plate'    => 'STG-0008',
                'coding'   => '2108',
                'make'     => 'Yamaha',
                'model'    => 'YTX 125',
                'year'     => 2021,
                'color'    => 'Violet',
                'body'     => 'Standard',
            ],
        ];

        $appIds = [];

        foreach ($stages as $stage) {
            $zone = $zones->get($stage['zone']);
            if (! $zone) {
                $this->command->warn("DemoStageDriversSeeder: {$stage['zone']} not found — skipping {$stage['email']}.");
                continue;
            }

            // 1. Login account (role tricycle_driver logs into the operator dashboard)
            $user = User::updateOrCreate(
                ['email' => $stage['email']],
                [
                    'name'      => $stage['name'],
                    'password'  => Hash::make('Driver@123'),
                    'role'      => 'tricycle_driver',
                    'is_active' => true,
                ]
            );

            // 2. Operator profile
            $op = Operator::updateOrCreate(
                ['license_number' => $stage['license']],
                [
                    'user_id'                  => $user->id,
                    'toda_id'                  => $zone->id,
                    'first_name'               => $stage['first'],
                    'middle_name'              => $stage['middle'],
                    'last_name'                => $stage['last'],
                    'contact_number'           => $stage['phone'],
                    'address'                  => $zone->name . ' Terminal Area, ' . $zone->barangay . ', Nasugbu',
                    'barangay'                 => $zone->barangay,
                    'date_of_birth'            => $stage['dob'],
                    'license_expiry_date'      => now()->addYears(3)->toDateString(),
                    'license_restriction_code' => '1,2',
                ]
            );

            // 3. The driver's one purpose-built unit. Unregistered until its
            //    application is completed or previously active.
            $initialStatus = in_array($stage['kind'], ['expired', 'renewed_expired']) ? 'active' : 'unregistered';
            $tri = Tricycle::updateOrCreate(
                ['plate_number' => $stage['plate']],
                [
                    'operator_id'          => $op->id,
                    'toda_zone_id'         => $zone->id,
                    'coding_scheme_number' => $stage['coding'],
                    'engine_number'        => 'ENG-' . $stage['plate'],
                    'chassis_number'       => 'CHS-' . $stage['plate'],
                    'or_number'            => 'OR-' . $stage['plate'],
                    'cr_number'            => 'CR-' . $stage['plate'],
                    'make'                 => $stage['make'],
                    'model'                => $stage['model'],
                    'year_model'           => $stage['year'],
                    'body_color'           => $stage['color'],
                    'body_type'            => $stage['body'],
                    'status'               => $initialStatus,
                    'tracking_capability'  => 'mobile_only',
                    'active_tracking_mode' => 'mobile_app',
                ]
            );

            // 4. Mobile-app driver record — kept OFFLINE so these demo logins stay out of
            //    the live fleet map and booking dispatch (they exist for the workflow demo only).
            Driver::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'operator_id'    => $op->id,
                    'tricycle_id'    => $tri->id,
                    'license_number' => $op->license_number,
                    'mobile_number'  => $stage['phone'],
                    'is_online'      => false,
                    'is_available'   => false,
                    'rating'         => 5.00,
                    'total_trips'    => 0,
                ]
            );

            // 5. The application(s) that establish this login's workflow scenario
            $app = match ($stage['kind']) {
                'expired'         => $this->seedExpiredStage($stage, $op, $tri, $tmo, $bplo),
                'review'          => $this->seedReviewStage($stage, $op, $tri, $tmo),
                'resubmit'        => $this->seedResubmitStage($stage, $op, $tri, $tmo),
                'inspection'      => $this->seedInspectionStage($stage, $op, $tri, $tmo),
                'reinspection'    => $this->seedReinspectionStage($stage, $op, $tri, $tmo),
                'bplo'            => $this->seedBploStage($stage, $op, $tri, $tmo),
                'confirm'         => $this->seedConfirmStage($stage, $op, $tri, $tmo, $bplo),
                'renewed_expired' => $this->seedRenewedExpiredStage($stage, $op, $tri, $tmo, $bplo),
            };

            // Owner vs separate tricycle driver — APP-2026-00044 (inspection) has a separate driver
            if ($stage['kind'] === 'inspection') {
                $app->update(['owner_is_driver' => false]);
                ApplicationDriver::updateOrCreate(
                    ['application_id' => $app->id],
                    [
                        'first_name'     => 'Elmer',
                        'last_name'      => 'Dizon',
                        'date_of_birth'  => '1990-03-05',
                        'contact_number' => '09171234644',
                        'barangay'       => $zone->barangay ?: 'Bucana',
                    ]
                );
            } else {
                $app->update(['owner_is_driver' => true]);
                ApplicationDriver::where('application_id', $app->id)->delete();
            }

            $appIds[] = $app->id;
            if (isset($stage['orig_ref'])) {
                $origApp = Application::where('reference_number', $stage['orig_ref'])->first();
                if ($origApp) {
                    $appIds[] = $origApp->id;
                }
            }
        }

        // No Payment rows for any of them — offline payment workflow
        Payment::whereIn('application_id', $appIds)->delete();

        // -----------------------------------------------------------------
        // Seed demo violations (settled & unpaid) for demo workflow drivers
        // -----------------------------------------------------------------
        $triExpired = Tricycle::where('plate_number', 'STG-0005')->first();
        $triRenewed = Tricycle::where('plate_number', 'STG-0008')->first();
        $redScheme  = ColorCodingScheme::where('name', 'Red')->first();

        if ($triExpired) {
            $fsExpired = FranchiseScheme::where('tricycle_id', $triExpired->id)->first();
            $ping1 = TricycleLocation::create([
                'tricycle_id' => $triExpired->id,
                'latitude'    => 14.0722,
                'longitude'   => 120.6315,
                'speed_kmh'   => 21.0,
                'heading_deg' => 45,
                'accuracy_m'  => 5.0,
                'source'      => 'mobile_app',
                'recorded_at' => now()->subDays(20)->setTime(9, 30, 0),
            ]);
            Violation::updateOrCreate(
                ['tricycle_id' => $triExpired->id, 'status' => 'resolved'],
                [
                    'franchise_scheme_id'    => $fsExpired?->id,
                    'color_coding_scheme_id' => $redScheme?->id,
                    'location_snapshot_id'   => $ping1->id,
                    'detected_by'            => null,
                    'violation_type'         => 'color_coding',
                    'detected_at'            => now()->subDays(20)->setTime(9, 30, 0),
                    'day_of_week'            => 'Monday',
                    'detection_method'       => 'automated',
                    'status'                 => 'resolved',
                    'fine_amount'            => 500.00,
                    'fine_paid_at'           => now()->subDays(18),
                    'notes'                  => 'Automated Telematics: Red coding restricted day violation. Paid at Municipal Treasurer.',
                ]
            );

            $ping2 = TricycleLocation::create([
                'tricycle_id' => $triExpired->id,
                'latitude'    => 14.0735,
                'longitude'   => 120.6320,
                'speed_kmh'   => 19.5,
                'heading_deg' => 180,
                'accuracy_m'  => 4.0,
                'source'      => 'mobile_app',
                'recorded_at' => now()->subDays(3)->setTime(11, 15, 0),
            ]);
            Violation::updateOrCreate(
                ['tricycle_id' => $triExpired->id, 'status' => 'open'],
                [
                    'franchise_scheme_id'    => $fsExpired?->id,
                    'color_coding_scheme_id' => $redScheme?->id,
                    'location_snapshot_id'   => $ping2->id,
                    'detected_by'            => null,
                    'violation_type'         => 'color_coding',
                    'detected_at'            => now()->subDays(3)->setTime(11, 15, 0),
                    'day_of_week'            => 'Monday',
                    'detection_method'       => 'automated',
                    'status'                 => 'open',
                    'fine_amount'            => 500.00,
                    'fine_paid_at'           => null,
                    'notes'                  => 'Automated Telematics: Operating unit with expired franchise and Monday coding restriction.',
                ]
            );
        }

        if ($triRenewed) {
            $fsRenewed = FranchiseScheme::where('tricycle_id', $triRenewed->id)->first();
            $ping3 = TricycleLocation::create([
                'tricycle_id' => $triRenewed->id,
                'latitude'    => 14.0705,
                'longitude'   => 120.6305,
                'speed_kmh'   => 23.0,
                'heading_deg' => 270,
                'accuracy_m'  => 5.0,
                'source'      => 'mobile_app',
                'recorded_at' => now()->subDays(15)->setTime(14, 0, 0),
            ]);
            Violation::updateOrCreate(
                ['tricycle_id' => $triRenewed->id, 'status' => 'resolved'],
                [
                    'franchise_scheme_id'    => $fsRenewed?->id,
                    'color_coding_scheme_id' => $redScheme?->id,
                    'location_snapshot_id'   => $ping3->id,
                    'detected_by'            => null,
                    'violation_type'         => 'color_coding',
                    'detected_at'            => now()->subDays(15)->setTime(14, 0, 0),
                    'day_of_week'            => 'Monday',
                    'detection_method'       => 'automated',
                    'status'                 => 'resolved',
                    'fine_amount'            => 500.00,
                    'fine_paid_at'           => now()->subDays(13),
                    'notes'                  => 'Automated Telematics: Color coding restriction violation. Settled.',
                ]
            );

            $ping4 = TricycleLocation::create([
                'tricycle_id' => $triRenewed->id,
                'latitude'    => 14.0718,
                'longitude'   => 120.6322,
                'speed_kmh'   => 20.0,
                'heading_deg' => 90,
                'accuracy_m'  => 4.5,
                'source'      => 'mobile_app',
                'recorded_at' => now()->subDays(1)->setTime(16, 20, 0),
            ]);
            Violation::updateOrCreate(
                ['tricycle_id' => $triRenewed->id, 'status' => 'open'],
                [
                    'franchise_scheme_id'    => $fsRenewed?->id,
                    'color_coding_scheme_id' => $redScheme?->id,
                    'location_snapshot_id'   => $ping4->id,
                    'detected_by'            => null,
                    'violation_type'         => 'color_coding',
                    'detected_at'            => now()->subDays(1)->setTime(16, 20, 0),
                    'day_of_week'            => 'Monday',
                    'detection_method'       => 'automated',
                    'status'                 => 'open',
                    'fine_amount'            => 500.00,
                    'fine_paid_at'           => null,
                    'notes'                  => 'Automated Telematics: Monday coding restricted corridor operation detected.',
                ]
            );
        }

        $this->command->info('✔ 8 demo workflow records seeded:');
        $this->command->table(
            ['Scenario', 'Email', 'Mobile (Login)', 'Password', 'Plate', 'Coding', 'Application(s)'],
            [
                ['1. Expired Franchise',           'driver.expired@trivora.ph',      '09171234605', 'Driver@123', 'STG-0005', '2105', 'APP-2026-00047 (Expired)'],
                ['2. Under Document Review',       'driver.review@trivora.ph',       '09171234601', 'Driver@123', 'STG-0001', '2101', 'APP-2026-00043 (Step 1: pending_review)'],
                ['3. Resubmission Required',       'driver.resubmit@trivora.ph',     '09171234606', 'Driver@123', 'STG-0006', '2106', 'APP-2026-00051 (Step 1: rejected)'],
                ['4. Under Physical Inspection',   'driver.inspection@trivora.ph',   '09171234602', 'Driver@123', 'STG-0002', '2102', 'APP-2026-00044 (Step 2: pending_inspection)'],
                ['5. Reinspection Required',       'driver.reinspection@trivora.ph', '09171234607', 'Driver@123', 'STG-0007', '2107', 'APP-2026-00052 (Step 2: failed_inspection)'],
                ['6. Under Releasing',             'driver.bplo@trivora.ph',         '09171234603', 'Driver@123', 'STG-0003', '2103', 'APP-2026-00045 (Step 3: pending_bplo_release)'],
                ['7. Under Final Confirmation',    'driver.confirm@trivora.ph',      '09171234604', 'Driver@123', 'STG-0004', '2104', 'APP-2026-00046 (Step 4: awaiting_tmo_confirmation)'],
                ['8. Renewed Expired Franchise',   'driver.renewed@trivora.ph',      '09171234608', 'Driver@123', 'STG-0008', '2108', 'APP-2023-00010 (Exp) + APP-2026-00054 (Step 3: Renewal)'],
            ]
        );
    }

    // -------------------------------------------------------------------------
    // Stage recipes — mirrors ApplicationsSeeder's shapes and status vocabulary
    // -------------------------------------------------------------------------

    /** Requirement / Document Review: submitted, TMO has not reviewed yet. */
    private function seedReviewStage(array $s, Operator $op, Tricycle $tri, ?User $tmo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'pending_review',
                'submitted_at'     => now()->subDays(2),
                'completed_at'     => null,
                'remarks'          => null,
            ]
        );

        $this->seedDocuments($app, 'pending', null);
        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator. Awaiting TMO document review.',
            now()->subDays(2)
        );

        return $app;
    }

    /** Resubmission Required: documents reviewed and rejected by TMO. */
    private function seedResubmitStage(array $s, Operator $op, Tricycle $tri, ?User $tmo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'rejected',
                'submitted_at'     => now()->subDays(5),
                'completed_at'     => null,
                'remarks'          => 'Online application rejected due to document verification issues. Correction and resubmission required.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo, [
            'barangay_clearance' => 'rejected',
            'police_clearance'   => 'rejected',
        ]);

        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with uploaded requirements.',
            now()->subDays(5)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'rejected', 1, 1,
            'Online application rejected due to document verification issues (barangay clearance and police clearance unclear or invalid). Correction and resubmission required.',
            now()->subDays(2)
        );

        return $app;
    }

    /** Physical Inspection: documents approved, unit not yet inspected. */
    private function seedInspectionStage(array $s, Operator $op, Tricycle $tri, ?User $tmo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 2,
                'status'           => 'pending_inspection',
                'submitted_at'     => now()->subDays(6),
                'completed_at'     => null,
                'remarks'          => null,
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);
        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with complete requirements.',
            now()->subDays(6)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subDays(4)
        );

        return $app;
    }

    /** Reinspection Required: documents approved, but physical inspection failed due to safety defects. */
    private function seedReinspectionStage(array $s, Operator $op, Tricycle $tri, ?User $tmo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 2,
                'status'           => 'failed_inspection',
                'submitted_at'     => now()->subDays(7),
                'completed_at'     => null,
                'remarks'          => 'Inspection found issues — re-inspection required.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);

        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(2)->toDateString(),
                'inspection_time'   => '14:30:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'failed',
                'safety_equipment'  => true,
                'brakes_steering'   => false,
                'lights_reflectors' => false,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Failed physical inspection: Defective brake light and loose steering column. Re-inspection required after repairs.',
            ]
        );

        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with complete requirements.',
            now()->subDays(7)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subDays(5)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_inspection', 'failed_inspection', 2, 2,
            'Failed physical tricycle inspection attempt #1. Reason: Defective brake light and loose steering column.',
            now()->subDays(2)
        );

        return $app;
    }

    /** BPLO Release: inspection passed, waiting on BPLO sticker/plate release. */
    private function seedBploStage(array $s, Operator $op, Tricycle $tri, ?User $tmo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 3,
                'status'           => 'pending_bplo_release',
                'submitted_at'     => now()->subDays(9),
                'completed_at'     => null,
                'remarks'          => "Passed physical inspection. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);
        $this->seedPassedInspection($app, $tmo, now()->subDays(3), 'Passed all technical and safety inspections. Certified roadworthy.');

        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with complete requirements.',
            now()->subDays(9)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subDays(7)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_inspection', 'pending_bplo_release', 2, 3,
            'Tricycle passed physical inspection. Driver instructed to pay at the Municipal Treasurer\'s Office, then proceed to BPLO for sticker/plate release.',
            now()->subDays(3)
        );

        // Pending issuance: this unit must not carry an active franchise scheme yet.
        FranchiseScheme::where('tricycle_id', $tri->id)->delete();

        return $app;
    }

    /** TMO Final Confirmation: sticker released by BPLO, scheme issued but not yet activated. */
    private function seedConfirmStage(array $s, Operator $op, Tricycle $tri, ?User $tmo, ?User $bplo): Application
    {
        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 4,
                'status'           => 'awaiting_tmo_confirmation',
                'sticker_number'   => 'STK-' . now()->format('Y') . '-' . $s['coding'],
                'submitted_at'     => now()->subDays(11),
                'completed_at'     => null,
                'remarks'          => 'Franchise Number and coding plate released by BPLO. Returned to TMO for tracking setup and activation.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);
        $this->seedPassedInspection($app, $tmo, now()->subDays(6), 'Vehicle cleared all roadworthiness inspection requirements.');

        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with complete requirements.',
            now()->subDays(11)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subDays(9)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_inspection', 'pending_bplo_release', 2, 3,
            'Tricycle passed physical roadworthiness inspection. Driver instructed to pay at the Municipal Treasurer\'s Office, then proceed to BPLO for sticker/plate release.',
            now()->subDays(6)
        );
        $this->historyRow(
            $app, $bplo?->id, 'pending_bplo_release', 'awaiting_tmo_confirmation', 3, 4,
            'Franchise Number and coding plate released by BPLO. Endorsed to TMO for GPS configuration and final activation.',
            now()->subDays(1)
        );

        // Scheme issued but NOT yet active — TMO final confirmation activates it.
        $scheme = ColorCodingScheme::where('name', 'Blue')->first();
        if ($scheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tri->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $scheme->id,
                    'franchise_number'       => $s['coding'],
                    'sticker_number'         => $app->sticker_number,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => now()->subDays(1)->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => false,
                    'notes'                  => "Coding #{$s['coding']} assigned by BPLO. Awaiting TMO Final Confirmation & GPS configuration.",
                ]
            );
        }

        return $app;
    }

    /**
     * Expired: fully completed application whose franchise permit lapsed 45 days ago.
     * The whole timeline sits exactly 3 years back (submitted -> completed/issued ->
     * permit expiry = issue + 3 years = 45 days ago), mirroring APP-2026-00001's
     * expired-permit fixture so the tracker shows the Expired card and My Tricycles
     * shows the unit registered with an Expired badge.
     */
    private function seedExpiredStage(array $s, Operator $op, Tricycle $tri, ?User $tmo, ?User $bplo): Application
    {
        $issuedAt = now()->subYears(3)->subDays(45);

        $app = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 5,
                'status'           => 'completed',
                'sticker_number'   => 'STK-' . $issuedAt->format('Y') . '-' . $s['coding'],
                'submitted_at'     => now()->subYears(3)->subDays(75),
                'completed_at'     => $issuedAt,
                'remarks'          => 'All requirements complete. Franchise Number released.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);
        $this->seedPassedInspection($app, $tmo, now()->subYears(3)->subDays(65), 'Vehicle in excellent condition. All systems operational.');

        $this->resetStatusHistory($app);
        $this->historyRow(
            $app, $op->user_id, null, 'pending_review', null, 1,
            'Application submitted by operator with uploaded requirements.',
            now()->subYears(3)->subDays(75)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subYears(3)->subDays(70)
        );
        $this->historyRow(
            $app, $tmo?->id, 'pending_inspection', 'pending_bplo_release', 2, 3,
            'Physical inspection passed. Driver instructed to pay at the Municipal Treasurer\'s Office, then proceed to BPLO for sticker/plate release.',
            now()->subYears(3)->subDays(60)
        );
        $this->historyRow(
            $app, $bplo?->id, 'pending_bplo_release', 'awaiting_tmo_confirmation', 3, 4,
            'Franchise Number and coding plate released by BPLO. Endorsed to TMO for final confirmation.',
            now()->subYears(3)->subDays(50)
        );
        $this->historyRow(
            $app, $tmo?->id, 'awaiting_tmo_confirmation', 'completed', 4, 5,
            'Physical roadworthiness and requirements verified by TMO. Mobile GPS configured and franchise permit activated.',
            $issuedAt
        );

        // Expired permit: active record (is_active = true) already past its expiry date,
        // issue date exactly 3 years before expiry — same shape as APP-2026-00001.
        $scheme = ColorCodingScheme::where('name', 'Red')->first();
        if ($scheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tri->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $scheme->id,
                    'franchise_number'       => $s['coding'],
                    'sticker_number'         => $app->sticker_number,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => $issuedAt->toDateString(),
                    'expiry_date'            => now()->subDays(45)->toDateString(),
                    'is_active'              => true, // Active permit record that is now past expiry date
                    'notes'                  => "Franchise permit issued in {$issuedAt->format('Y')} (Expired 45 days ago).",
                ]
            );

            $tri->update(['status' => 'active']);
        }

        return $app;
    }

    /**
     * Renewed Expired Franchise:
     * - Tricycle previously had an MTOP application that completed 3 years ago
     * - Initial FranchiseScheme issued 3 years ago and expired 30 days ago (is_active = true, past expiry_date)
     * - Tricycle status is 'active'
     * - A Renewal Application is now filed and actively progressing through the workflow (Step 3: pending_bplo_release)
     * - Carries all 10 canonical documents (including the renewal-only Prangkisa document)
     * - Carries passed physical inspection record
     */
    private function seedRenewedExpiredStage(array $s, Operator $op, Tricycle $tri, ?User $tmo, ?User $bplo): Application
    {
        $issuedAt = now()->subYears(3)->subDays(60);
        $expiredAt = now()->subDays(30);

        // 1. Original completed application from 3 years ago
        $origApp = Application::updateOrCreate(
            ['reference_number' => $s['orig_ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'new',
                'current_step'     => 5,
                'status'           => 'completed',
                'sticker_number'   => 'STK-' . $issuedAt->format('Y') . '-' . $s['coding'],
                'submitted_at'     => $issuedAt->copy()->subDays(15),
                'completed_at'     => $issuedAt,
                'remarks'          => 'Initial franchise permit released in ' . $issuedAt->format('Y') . '.',
            ]
        );

        $this->seedDocuments($origApp, 'approved', $tmo);
        $this->seedPassedInspection($origApp, $tmo, $issuedAt->copy()->subDays(5), 'Initial roadworthiness inspection passed.');

        $this->resetStatusHistory($origApp);
        $this->historyRow(
            $origApp, $op->user_id, null, 'pending_review', null, 1,
            'Original application submitted by operator.',
            $issuedAt->copy()->subDays(15)
        );
        $this->historyRow(
            $origApp, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Requirements approved. Endorsed for inspection.',
            $issuedAt->copy()->subDays(10)
        );
        $this->historyRow(
            $origApp, $tmo?->id, 'pending_inspection', 'pending_bplo_release', 2, 3,
            'Inspection passed. Endorsed to BPLO.',
            $issuedAt->copy()->subDays(5)
        );
        $this->historyRow(
            $origApp, $bplo?->id, 'pending_bplo_release', 'awaiting_tmo_confirmation', 3, 4,
            'Sticker released by BPLO.',
            $issuedAt->copy()->subDays(2)
        );
        $this->historyRow(
            $origApp, $tmo?->id, 'awaiting_tmo_confirmation', 'completed', 4, 5,
            'Franchise permit activated.',
            $issuedAt
        );

        // 2. Initial FranchiseScheme that is now EXPIRED
        $scheme = ColorCodingScheme::where('name', 'Violet')->first() ?? ColorCodingScheme::first();
        if ($scheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tri->id],
                [
                    'application_id'         => $origApp->id,
                    'color_coding_scheme_id' => $scheme->id,
                    'franchise_number'       => $s['coding'],
                    'sticker_number'         => $origApp->sticker_number,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => $issuedAt->toDateString(),
                    'expiry_date'            => $expiredAt->toDateString(),
                    'is_active'              => true,
                    'notes'                  => "Initial franchise permit (expired {$expiredAt->diffForHumans()}). Renewal in progress.",
                ]
            );
        }

        $tri->update(['status' => 'active']);

        // 3. Current Renewal Application progressing through the workflow (Step 3: pending_bplo_release)
        $renewalApp = Application::updateOrCreate(
            ['reference_number' => $s['ref']],
            [
                'operator_id'      => $op->id,
                'tricycle_id'      => $tri->id,
                'application_type' => 'renewal',
                'current_step'     => 3,
                'status'           => 'pending_bplo_release',
                'submitted_at'     => now()->subDays(6),
                'completed_at'     => null,
                'remarks'          => 'Franchise renewal application. Passed physical inspection; endorsed for BPLO sticker/plate release.',
            ]
        );

        // Seed documents including renewal-only prangkisa
        $this->seedDocuments($renewalApp, 'approved', $tmo);
        ApplicationDocument::updateOrCreate(
            [
                'application_id' => $renewalApp->id,
                'document_type'  => 'prangkisa',
            ],
            [
                'file_name'     => 'prangkisa_sample.pdf',
                'file_path'     => 'documents/' . $renewalApp->reference_number . '/prangkisa.pdf',
                'file_size_kb'  => 210,
                'mime_type'     => 'application/pdf',
                'review_status' => 'approved',
                'reviewed_by'   => $tmo?->id,
                'reviewed_at'   => now()->subDays(3),
            ]
        );

        // Passed inspection for renewal
        $this->seedPassedInspection($renewalApp, $tmo, now()->subDays(2), 'Renewal physical inspection passed. Unit maintained in roadworthy condition.');

        // Status history for renewal
        $this->resetStatusHistory($renewalApp);
        $this->historyRow(
            $renewalApp, $op->user_id, null, 'pending_review', null, 1,
            'Franchise renewal application submitted by operator with required documents including previous prangkisa.',
            now()->subDays(6)
        );
        $this->historyRow(
            $renewalApp, $tmo?->id, 'pending_review', 'pending_inspection', 1, 2,
            'Renewal requirements verified and approved. Endorsed for tricycle inspection.',
            now()->subDays(4)
        );
        $this->historyRow(
            $renewalApp, $tmo?->id, 'pending_inspection', 'pending_bplo_release', 2, 3,
            'Tricycle passed renewal physical inspection. Driver instructed to proceed to BPLO for sticker/plate release.',
            now()->subDays(2)
        );

        return $renewalApp;
    }

    // -------------------------------------------------------------------------
    // Shared helpers (same conventions as ApplicationsSeeder.php)
    // -------------------------------------------------------------------------

    /**
     * Rebuild an application's append-only status-history trail before seeding the
     * canonical rows. These five applications ARE the demo state: stale rows recorded by
     * earlier runs or manual UI testing must never survive to contradict the current
     * status or the tracker's status-history-derived step dates.
     */
    private function resetStatusHistory(Application $app): void
    {
        ApplicationStatusHistory::where('application_id', $app->id)->delete();
    }

    private function historyRow(
        Application $app,
        ?int $changedBy,
        ?string $fromStatus,
        string $toStatus,
        ?int $fromStep,
        int $toStep,
        string $notes,
        Carbon $at
    ): void {
        ApplicationStatusHistory::create([
            'application_id' => $app->id,
            'changed_by'     => $changedBy,
            'from_status'    => $fromStatus,
            'to_status'      => $toStatus,
            'from_step'      => $fromStep,
            'to_step'        => $toStep,
            'notes'          => $notes,
            'created_at'     => $at,
        ]);
    }

    /**
     * The 9 mandatory items from the canonical franchise registration requirement list
     * (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS) using the SAME
     * document_type vocabulary the real registration workflow writes. The 2 conditional
     * items (delivery_receipt, authorization_letter) are situational and left
     * unsubmitted by default — identical to ApplicationsSeeder's seedDocuments().
     */
    private function seedDocuments(Application $app, string $reviewStatus, ?User $reviewer, array $statusOverrides = []): void
    {
        $types = [
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

        foreach ($types as $type) {
            $status = $statusOverrides[$type] ?? $reviewStatus;

            ApplicationDocument::updateOrCreate(
                [
                    'application_id' => $app->id,
                    'document_type'  => $type,
                ],
                [
                    'file_name'        => Str::slug($type) . '_sample.pdf',
                    'file_path'        => 'documents/' . $app->reference_number . '/' . Str::slug($type) . '.pdf',
                    'file_size_kb'     => rand(80, 500),
                    'mime_type'        => 'application/pdf',
                    'review_status'    => $status,
                    'reviewed_by'      => $status !== 'pending' ? $reviewer?->id : null,
                    'reviewed_at'      => $status !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                    'rejection_reason' => $status === 'rejected' ? 'Document image is unclear or invalid; please resubmit a clearer copy.' : null,
                ]
            );
        }
    }

    private function seedPassedInspection(Application $app, ?User $tmo, Carbon $at, string $notes): void
    {
        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => $at->toDateString(),
                'inspection_time'   => '10:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => $notes,
            ]
        );
    }
}
