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
 * Gives the demo driver login (driver.pramos@trivora.ph / "Pedro Ramos") EXACTLY ONE
 * MTOP application per Application Tracker stage, so Driver -> Franchise & Compliance ->
 * MTOP Applications shows only the five states the demo walks through — nothing else:
 *
 *   - APP-2026-00001  completed                 -> Expired (issued permit past expiry)
 *   - APP-2026-00007  pending_review            -> Document Review (requirements)
 *   - APP-2026-00020  pending_inspection        -> Physical Inspection
 *   - APP-2026-00030  pending_bplo_release      -> BPLO Release: Sticker & Plate for Coding
 *   - APP-2026-00035  awaiting_tmo_confirmation -> TMO Final Confirmation & GPS Setup
 *       (the only application seeded right here)
 *
 * The first four are owned by ApplicationsSeeder.php. This seeder also RETIRES the
 * older exception/duplicate-stage fixtures it used to create — APP-2026-00031
 * (rejected), APP-2026-00032 (reinspection), APP-2026-00033 (duplicate BPLO) and
 * APP-2026-00034 (ready-for-reinspection) — together with the purpose-built
 * PLT-6001..6004 units that only existed to carry them, so the tracker never shows an
 * extra or repeated stage and My Tricycles, TMO queues, and the tracker all agree.
 *
 * There is no online/in-system payment step anywhere in this workflow — the Municipal
 * Treasurer's Office payment is a real-world, offline process with no corresponding
 * application status or Payment row.
 *
 * Reuses the exact Application/ApplicationDocument/Inspection/FranchiseScheme/
 * ApplicationStatusHistory shapes and status values already established in
 * ApplicationsSeeder.php — no new statuses, columns, or workflow states are introduced.
 *
 * Idempotent: every record is looked up by its fixed reference_number via updateOrCreate,
 * so re-running this seeder never duplicates data. APP-2026-00035's append-only
 * application_status_histories trail is rebuilt from scratch first (resetStatusHistory),
 * so stale rows from earlier runs or manual UI testing can never contradict the
 * application's current status or the Application Tracker's status-history-derived dates.
 *
 * Not wired into DatabaseSeeder::run() — invoke explicitly after the main seeders:
 *   php artisan db:seed --class=Database\\Seeders\\DemoDriverMTOPApplicationsSeeder
 * (ApplicationsSeeder first, since it owns APP-2026-00001/00007/00020/00030).
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

        $tmo  = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $bplo = User::where('email', 'bplo.areyes@trivora.gov.ph')->first();

        $todaBucana = TodaZone::where('code', 'TODA-BUCANA')->orWhere('name', 'TODA Bucana')->first();

        $redScheme = ColorCodingScheme::where('name', 'Red')->first();

        // -----------------------------------------------------------------
        // Retire the exception/duplicate-stage demo fixtures
        // -----------------------------------------------------------------
        // The tracker now shows exactly one application per stage (see the class
        // docblock). Remove the retired applications — their documents, status
        // histories, inspections, payments, and franchise schemes all cascade on
        // delete — and then the units that only existed to carry them. Those units
        // have no other references (no violations, GPS locations, or paired devices),
        // and whereDoesntHave() keeps the delete from ever touching a unit that has
        // gained an application since.
        foreach (['APP-2026-00031', 'APP-2026-00032', 'APP-2026-00033', 'APP-2026-00034'] as $retiredRef) {
            Application::where('reference_number', $retiredRef)->delete();
        }

        foreach (['PLT-6001', 'PLT-6002', 'PLT-6003', 'PLT-6004'] as $retiredPlate) {
            Tricycle::where('plate_number', $retiredPlate)
                ->whereDoesntHave('applications')
                ->delete();
        }

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

        $this->seedAwaitingConfirmationApp(
            'APP-2026-00035',
            $operator,
            $tri35,
            'new',
            $redScheme,
            $tmo,
            $bplo
        );

        $this->command->info('✔ Demo driver tracker stages for driver.pramos@trivora.ph: APP-2026-00001 expired, 00007 document review, 00020 physical inspection, 00030 BPLO release, 00035 final confirmation (retired 00031-00034 and PLT-6001..6004).');
    }

    // -------------------------------------------------------------------------
    // Helpers (mirrors ApplicationsSeeder.php's conventions)
    // -------------------------------------------------------------------------

    /**
     * Rebuild an application's append-only status-history trail before seeding the
     * canonical rows. This seeder IS the demo state for APP-2026-00035: stale rows
     * recorded by earlier runs or manual UI testing (legacy payment-step statuses, or a
     * stray transition contradicting the application's current status) must never survive
     * to contradict the tracker's real status or its status-history-derived step dates.
     */
    private function resetStatusHistory(Application $app): void
    {
        ApplicationStatusHistory::where('application_id', $app->id)->delete();
    }

    /**
     * Seeds the 9 mandatory items from the canonical franchise registration requirement list
     * (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS) using the SAME document_type
     * vocabulary the real registration workflow writes. The 2 conditional items
     * (delivery_receipt, authorization_letter) are situational and left unsubmitted by default.
     *
     * A renewal application additionally gets Prangkisa seeded, matching Operator\
     * MTOPController::store()'s real renewal-only requirement.
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

        if ($app->application_type === 'renewal') {
            $types[] = 'prangkisa';
        }

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

    private function seedAwaitingConfirmationApp(
        string $ref,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        ?ColorCodingScheme $colorScheme,
        ?User $tmo,
        ?User $bplo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $ref],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 4,
                'status'           => 'awaiting_tmo_confirmation',
                'tracking_method'  => null,
                'iot_device_id'    => null,
                'submitted_at'     => now()->subDays(11),
                'completed_at'     => null,
                'remarks'          => 'Franchise Number and coding plate released by BPLO. Returned to TMO for tracking setup and activation.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);

        $this->resetStatusHistory($app);

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
            ['application_id' => $app->id, 'to_status' => 'pending_bplo_release'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 2,
                'to_step'     => 3,
                'notes'       => "Tricycle passed physical roadworthiness inspection. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'  => now()->subDays(6),
            ]
        );
        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'awaiting_tmo_confirmation'],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_bplo_release',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Franchise Number released by BPLO. Driver instructed to return to TMO for GPS configuration and final activation.',
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

        // No Payment row — the system never records or verifies payment under the current
        // workflow; the applicant pays entirely offline at the Municipal Treasurer's Office.
        Payment::where('application_id', $app->id)->delete();

        $codingNumber = $tricycle->coding_scheme_number ?: '0715';

        // Franchise Number (STK-YYYY-NNNN): this application is already at TMO Final
        // Confirmation, so BPLO release has happened — which generates the serial once
        // (BPLOController::showReleaseForm), persists it to the application, then copies the
        // same serial onto the scheme (release()). Written here so the two rows can never
        // disagree, and never regenerated once issued.
        $franchiseNumber = $app->sticker_number
            ?: 'STK-' . now()->format('Y') . '-' . str_pad($codingNumber, 4, '0', STR_PAD_LEFT);
        if ($app->sticker_number !== $franchiseNumber) {
            $app->update(['sticker_number' => $franchiseNumber]);
        }

        if ($colorScheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $colorScheme->id,
                    'franchise_number'       => $codingNumber,
                    'sticker_number'         => $franchiseNumber,
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
