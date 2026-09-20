<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Payment;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Gives the demo driver login (driver.pramos@trivora.ph / "Pedro Ramos") one MTOP
 * application per stage of the finalized franchise workflow, so the Driver ->
 * Franchise & Compliance -> MTOP Applications tracker and its detail page can be
 * demoed end-to-end without needing real applicants to walk through every step.
 *
 * Reuses the exact Application/ApplicationDocument/Inspection/Payment/FranchiseScheme/
 * ApplicationStatusHistory shapes and status values already established in
 * ApplicationsSeeder.php — no new statuses, columns, or workflow states are introduced.
 *
 * Pedro Ramos already has 4 applications seeded by ApplicationsSeeder covering:
 *   - APP-2026-00001  completed               -> Franchise Active / Completed
 *   - APP-2026-00007  pending_review          -> Document Review
 *   - APP-2026-00020  pending_inspection      -> Physical Inspection
 *   - APP-2026-00030  payment_verified        -> TMO Payment Verification (outcome) /
 *                                                 Awaiting BPLO Releasing
 * This seeder adds the 5 stages/exceptions that account has none of yet:
 *   - APP-2026-00031  rejected                -> Document Re-submission
 *   - APP-2026-00032  failed_inspection       -> Re-inspection
 *   - APP-2026-00033  pending_payment         -> Municipal Treasurer Payment (offline)
 *   - APP-2026-00034  payment_issue           -> Payment Issue / Return to TMO
 *   - APP-2026-00035  awaiting_tmo_confirmation -> TMO Final Confirmation & GPS Setup
 *
 * Note: the real system has no separate "TMO is verifying, not yet forwarded" status —
 * MTOPController::show() only ever sets phase 'bplo-release' the instant status becomes
 * 'payment_verified', which is also the moment BPLO's queue picks it up. So "TMO Payment
 * Verification" and "BPLO Releasing" render identically (same phase/ActionBox) and are
 * both represented by APP-2026-00030 rather than two visually-duplicate records.
 *
 * Idempotent: every record is looked up by its fixed reference_number via updateOrCreate,
 * so re-running this seeder never duplicates data.
 *
 * Not wired into DatabaseSeeder::run() — invoke explicitly after the main seeders:
 *   php artisan db:seed --class=Database\\Seeders\\DemoDriverMTOPApplicationsSeeder
 */
class DemoDriverMTOPApplicationsSeeder extends Seeder
{
    public function run(): void
    {
        $operator = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();

        if (! $operator) {
            $this->command->error('DemoDriverMTOPApplicationsSeeder: driver.pramos@trivora.ph operator not found — run UsersSeeder first.');
            return;
        }

        $tmo   = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $bplo  = User::where('email', 'bplo.areyes@trivora.gov.ph')->first();
        $admin = User::where('role', 'admin')->first();

        $todaBucana = TodaZone::where('code', 'TODA-BUCANA')->orWhere('name', 'TODA Bucana')->first();
        $todaBrgy10 = TodaZone::where('code', 'TODA-BRGY10')->orWhere('name', 'TODA Brgy. 10')->first();
        $todaBrgy8  = TodaZone::where('code', 'TODA-BRGY8')->orWhere('name', 'TODA Brgy. 8')->first();
        $todaBrgy4  = TodaZone::where('code', 'TODA-BRGY4')->orWhere('name', 'TODA Brgy. 4')->first();

        $redScheme = ColorCodingScheme::where('name', 'Red')->first();

        // -----------------------------------------------------------------
        // APP-2026-00031 — Document Re-submission (rejected)
        // -----------------------------------------------------------------
        $tri31 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-6001'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaBucana?->id,
                'make'           => 'Honda',
                'model'          => 'TMX 125',
                'year_model'     => 2024,
                'body_color'     => 'Red/White',
                'body_type'      => 'Pass-Thru Sidecar',
                'engine_number'  => 'ENG-DEMO-60011',
                'chassis_number' => 'CHS-DEMO-60011',
                'or_number'      => 'OR-2026-60011',
                'cr_number'      => 'CR-2026-60011',
                'status'         => 'unregistered',
            ]
        );

        $app31 = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-00031'],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tri31->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'rejected',
                'submitted_at'     => now()->subDays(4),
                'completed_at'     => null,
                'remarks'          => "Requirements rejected. Driver's License copy is blurry.",
            ]
        );

        Payment::where('application_id', $app31->id)->delete();
        Inspection::where('application_id', $app31->id)->delete();

        $this->seedDocuments($app31, 'approved', $tmo);
        $licenseDoc = $app31->documents()->where('document_type', 'drivers_license')->first();
        if ($licenseDoc) {
            $licenseDoc->update([
                'review_status'    => 'rejected',
                'rejection_reason' => "The uploaded Driver's License photo is blurry and illegible. Please upload a clear, high-resolution scan.",
            ]);
        }

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app31->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
                'created_at'  => now()->subDays(4),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app31->id, 'to_status' => 'rejected'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 1,
                'notes'       => "Driver's License document rejected due to blurriness.",
                'created_at'  => now()->subDays(2),
            ]
        );

        // -----------------------------------------------------------------
        // APP-2026-00032 — Re-inspection (failed_inspection)
        // -----------------------------------------------------------------
        $tri32 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-6002'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaBrgy10?->id,
                'make'           => 'Kawasaki',
                'model'          => 'Barako 175',
                'year_model'     => 2023,
                'body_color'     => 'Blue/Silver',
                'body_type'      => 'Pass-Thru Sidecar',
                'engine_number'  => 'ENG-DEMO-60022',
                'chassis_number' => 'CHS-DEMO-60022',
                'or_number'      => 'OR-2026-60022',
                'cr_number'      => 'CR-2026-60022',
                'status'         => 'unregistered',
            ]
        );

        $app32 = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-00032'],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tri32->id,
                'application_type' => 'renewal',
                'current_step'     => 3,
                'status'           => 'failed_inspection',
                'submitted_at'     => now()->subDays(9),
                'completed_at'     => null,
                'remarks'          => 'Physical inspection failed. Safety defects detected.',
            ]
        );

        Payment::where('application_id', $app32->id)->delete();
        $this->seedDocuments($app32, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app32->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
                'created_at'  => now()->subDays(9),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app32->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays(7),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app32->id, 'to_status' => 'failed_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 3,
                'notes'       => 'Physical inspection failed: side mirror and horn defects.',
                'created_at'  => now()->subDays(4),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app32->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(4)->toDateString(),
                'inspection_time'   => '10:15:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'failed',
                'safety_equipment'  => false,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => json_encode([
                    'statuses' => [
                        'headlights' => 'passed',
                        'taillights' => 'passed',
                        'signals'    => 'passed',
                        'horn'       => 'failed',
                        'mirrors'    => 'failed',
                        'brakes'     => 'passed',
                        'plate'      => 'passed',
                        'sidecar'    => 'passed',
                    ],
                    'defects' => [
                        'mirrors' => 'Missing right-side mirror.',
                        'horn'    => 'Horn is not working.',
                    ],
                ]),
            ]
        );

        // -----------------------------------------------------------------
        // APP-2026-00033 — Municipal Treasurer Payment (pending_payment, offline)
        // -----------------------------------------------------------------
        $tri33 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-6003'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaBrgy8?->id,
                'make'           => 'Yamaha',
                'model'          => 'STX 125',
                'year_model'     => 2024,
                'body_color'     => 'Black/Red',
                'body_type'      => 'Pass-Thru Sidecar',
                'engine_number'  => 'ENG-DEMO-60033',
                'chassis_number' => 'CHS-DEMO-60033',
                'or_number'      => 'OR-2026-60033',
                'cr_number'      => 'CR-2026-60033',
                'status'         => 'unregistered',
            ]
        );

        $app33 = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-00033'],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tri33->id,
                'application_type' => 'new',
                'current_step'     => 4,
                'status'           => 'pending_payment',
                'submitted_at'     => now()->subDays(6),
                'completed_at'     => null,
                'remarks'          => null,
            ]
        );

        Payment::where('application_id', $app33->id)->delete();
        $this->seedDocuments($app33, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app33->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
                'created_at'  => now()->subDays(6),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app33->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays(4),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app33->id, 'to_status' => 'pending_payment'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Tricycle passed physical inspection. Payment Ticket issued for payment at the Municipal Treasurer\'s Office.',
                'created_at'  => now()->subDays(2),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app33->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(2)->toDateString(),
                'inspection_time'   => '09:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Vehicle passed all roadworthiness checks.',
            ]
        );

        // -----------------------------------------------------------------
        // APP-2026-00034 — Payment Issue / Return to TMO (payment_issue)
        // -----------------------------------------------------------------
        $tri34 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-6004'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaBrgy4?->id,
                'make'           => 'Suzuki',
                'model'          => 'Raider J',
                'year_model'     => 2023,
                'body_color'     => 'Yellow/Black',
                'body_type'      => 'Pass-Thru Sidecar',
                'engine_number'  => 'ENG-DEMO-60044',
                'chassis_number' => 'CHS-DEMO-60044',
                'or_number'      => 'OR-2026-60044',
                'cr_number'      => 'CR-2026-60044',
                'status'         => 'unregistered',
            ]
        );

        $app34 = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-00034'],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tri34->id,
                'application_type' => 'renewal',
                'current_step'     => 4,
                'status'           => 'payment_issue',
                'submitted_at'     => now()->subDays(8),
                'completed_at'     => null,
                'remarks'          => 'TMO flagged an issue with the presented Official Receipt.',
            ]
        );

        // No Payment record yet — TMO::PaymentVerificationController::verify()'s
        // flag_issue branch never creates one, it only records the status change.
        Payment::where('application_id', $app34->id)->delete();
        $this->seedDocuments($app34, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app34->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
                'created_at'  => now()->subDays(8),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app34->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays(6),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app34->id, 'to_status' => 'pending_payment'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Tricycle passed physical inspection. Payment Ticket issued.',
                'created_at'  => now()->subDays(4),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app34->id, 'to_status' => 'payment_issue'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_payment',
                'from_step'   => 4,
                'to_step'     => 4,
                'notes'       => "TMO flagged issue with payment documents: Official Receipt number does not match Municipal Treasurer records.",
                'created_at'  => now()->subDays(1),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app34->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(4)->toDateString(),
                'inspection_time'   => '13:30:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Vehicle passed all roadworthiness checks.',
            ]
        );

        // -----------------------------------------------------------------
        // APP-2026-00035 — TMO Final Confirmation & GPS Setup (awaiting_tmo_confirmation)
        // -----------------------------------------------------------------
        $tri35 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-6005'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaBucana?->id,
                'make'           => 'Honda',
                'model'          => 'TMX Alpha',
                'year_model'     => 2024,
                'body_color'     => 'Green/White',
                'body_type'      => 'Pass-Thru Sidecar',
                'engine_number'  => 'ENG-DEMO-60055',
                'chassis_number' => 'CHS-DEMO-60055',
                'or_number'      => 'OR-2026-60055',
                'cr_number'      => 'CR-2026-60055',
                'coding_scheme_number' => '0715',
                'status'         => 'unregistered',
            ]
        );

        $app35 = $this->seedAwaitingConfirmationApp(
            'APP-2026-00035',
            $operator,
            $tri35,
            'new',
            $redScheme,
            $tmo,
            $bplo,
            $admin
        );
        $app35->update(['sticker_number' => 'STK-2026-0715']);

        $this->command->info('✔ Demo driver MTOP applications seeded for driver.pramos@trivora.ph (APP-2026-00031 to 00035, plus existing 00001/00007/00020/00030 covering the remaining stages).');
    }

    // -------------------------------------------------------------------------
    // Helpers (mirrors ApplicationsSeeder.php's conventions)
    // -------------------------------------------------------------------------

    private function seedDocuments(Application $app, string $reviewStatus, ?User $reviewer): void
    {
        $types = [
            'drivers_license',
            'or_cr',
            'proof_of_residence',
            'toda_clearance',
            'photo_id',
        ];

        foreach ($types as $type) {
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
                    'review_status'    => $reviewStatus,
                    'reviewed_by'      => $reviewStatus !== 'pending' ? $reviewer?->id : null,
                    'reviewed_at'      => $reviewStatus !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                    'rejection_reason' => null,
                ]
            );
        }
    }

    private function seedAwaitingConfirmationApp(
        string $ref,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        ?ColorCodingScheme $colorScheme,
        ?User $tmo,
        ?User $bplo,
        ?User $admin
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $ref],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 5,
                'status'           => 'awaiting_tmo_confirmation',
                'tracking_method'  => null,
                'iot_device_id'    => null,
                'submitted_at'     => now()->subDays(11),
                'completed_at'     => null,
                'remarks'          => 'Franchise sticker and coding plate released by BPLO. Returned to TMO for tracking setup and activation.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator with complete requirements.',
                'created_at'  => now()->subDays(11),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays(9),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_payment'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Tricycle passed physical roadworthiness inspection. Payment Ticket issued.',
                'created_at'  => now()->subDays(6),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'payment_verified'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_payment',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => 'Municipal Treasurer Official Receipt verified by TMO. Forwarded to BPLO for sticker release.',
                'created_at'  => now()->subDays(3),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'awaiting_tmo_confirmation'],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'payment_verified',
                'from_step'   => 5,
                'to_step'     => 5,
                'notes'       => 'Franchise sticker released by BPLO. Driver instructed to return to TMO for GPS configuration and final activation.',
                'created_at'  => now()->subDays(1),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(6)->toDateString(),
                'inspection_time'   => '10:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Vehicle cleared all roadworthiness inspection requirements.',
            ]
        );

        Payment::updateOrCreate(
            ['application_id' => $app->id],
            [
                'processed_by'            => $tmo?->id ?? $admin?->id,
                'official_receipt_number' => 'OR-2026-060715',
                'amount'                  => 750.00,
                'payment_method'          => 'cash',
                'payment_date'            => now()->subDays(3)->toDateString(),
                'payment_time'            => '11:00:00',
                'is_verified'             => true,
                'verified_at'             => now()->subDays(3),
                'notes'                   => 'Municipal Treasurer Official Receipt verified by TMO.',
            ]
        );

        $codingNumber = $tricycle->coding_scheme_number ?: '0715';

        if ($colorScheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $colorScheme->id,
                    'franchise_number'       => $codingNumber,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => now()->subDays(1)->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => false,
                    'notes'                  => "Coding #{$codingNumber} assigned by BPLO. Awaiting TMO Final Confirmation & GPS configuration.",
                ]
            );
        }

        return $app;
    }
}
