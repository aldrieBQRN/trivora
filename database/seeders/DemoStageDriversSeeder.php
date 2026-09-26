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
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * FIVE dedicated demo driver logins — exactly ONE per Application Tracker status — so
 * each stage of the 4-step franchise workflow can be demonstrated from a clean account
 * whose tracker and My Tricycles page show only that single application:
 *
 *   1. driver.review@trivora.ph      Alfredo Manalo            APP-2026-00043
 *      Requirement / Document Review        -> pending_review (step 1)
 *   2. driver.inspection@trivora.ph  Bernardo Lim              APP-2026-00044
 *      Physical Inspection                  -> pending_inspection (step 2)
 *   3. driver.bplo@trivora.ph        Cristina Villacorta       APP-2026-00045
 *      BPLO Release: Sticker & Plate        -> pending_bplo_release (step 3)
 *   4. driver.confirm@trivora.ph     Domingo Aquino            APP-2026-00046
 *      TMO Final Confirmation & GPS Setup   -> awaiting_tmo_confirmation (step 4)
 *   5. driver.expired@trivora.ph     Estrella Dimaculangan     APP-2026-00047
 *      Expired (completed + permit past expiry) -> completed (step 5), scheme expired
 *
 * All five share password `Driver@123` (same as the combined-stage demo driver
 * driver.pramos@trivora.ph) and are documented in account.md.
 *
 * Reuses the exact Application/ApplicationDocument/Inspection/FranchiseScheme/
 * ApplicationStatusHistory shapes and status values established in
 * ApplicationsSeeder.php — no new statuses, columns, or workflow states are introduced.
 * Every driver gets its own purpose-built unit (plates STG-0001..STG-0005, coding
 * #2101..2105), so no pre-existing demo fixture is re-homed or altered.
 *
 * Owner vs separate driver: BOTH scenarios are represented — APP-2026-00044
 * (inspection) has a separate tricycle driver (owner_is_driver = 0 + an
 * application_drivers row, shown as such on its TMO detail pages), while the other
 * four stay owner-is-driver (owner_is_driver = 1, no driver row), matching all
 * pre-existing applications.
 *
 * Idempotent: users/operators/tricycles/applications are updateOrCreate keyed on their
 * unique columns (email / license_number / plate_number / reference_number), and each
 * application's append-only status-history trail is rebuilt from scratch first, so stale
 * rows from earlier runs or manual UI testing can never contradict the application's
 * current status or the tracker's status-history-derived step dates. Deliberate
 * delete-and-recreate — these rows ARE the demo state for these five references.
 *
 * There is no online/in-system payment step anywhere in this workflow — the Municipal
 * Treasurer's Office payment is a real-world, offline process with no corresponding
 * application status or Payment row.
 *
 * Safe to re-run; wired into DatabaseSeeder after TestAccountsSeeder (needs TodaZones,
 * ColorCodingSchemes, and the TMO/BPLO reviewer users from UsersSeeder — all used with
 * null-safe fallbacks). Invoke explicitly with:
 *   php artisan db:seed --class=Database\\Seeders\\DemoStageDriversSeeder
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

            // 3. The driver's one purpose-built unit. Unregistered until (if ever) its
            //    application is completed — stage 5 flips it to 'active' below.
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
                    'status'               => 'unregistered',
                    'tracking_capability'  => 'mobile_only',
                    'active_tracking_mode' => 'mobile_app',
                ]
            );

            // 4. Mobile-app driver record — kept OFFLINE so these demo logins stay out of
            //    the live fleet map and booking dispatch (they exist for the tracker only).
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

            // 5. The one application that gives this login its tracker status
            $app = match ($stage['kind']) {
                'review'     => $this->seedReviewStage($stage, $op, $tri, $tmo),
                'inspection' => $this->seedInspectionStage($stage, $op, $tri, $tmo),
                'bplo'       => $this->seedBploStage($stage, $op, $tri, $tmo),
                'confirm'    => $this->seedConfirmStage($stage, $op, $tri, $tmo, $bplo),
                'expired'    => $this->seedExpiredStage($stage, $op, $tri, $tmo, $bplo),
            };

            // Owner vs separate tricycle driver — both scenarios represented in demo
            // data: the Physical Inspection stage's driver is a DIFFERENT person than
            // the tricycle owner (its TMO detail pages show the distinct driver block);
            // the other four stages are owner-is-driver. Deliberate repair on re-run —
            // a flipped flag or stale driver row from manual UI testing is reset so it
            // can never contradict the demo state (mirrors the status-history rebuild).
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
        }

        // No Payment rows for any of them — the retired in-system payment workflow must
        // never reappear in these fixtures (see ApplicationsSeeder's application-1 note).
        Payment::whereIn('application_id', $appIds)->delete();

        $this->command->info('✔ 5 demo driver logins seeded — one per Application Tracker status:');
        $this->command->table(
            ['Status', 'Email', 'Password', 'Application'],
            [
                ['Document Review (Requirement)', 'driver.review@trivora.ph',     'Driver@123', 'APP-2026-00043'],
                ['Physical Inspection',           'driver.inspection@trivora.ph', 'Driver@123', 'APP-2026-00044'],
                ['BPLO Release',                  'driver.bplo@trivora.ph',       'Driver@123', 'APP-2026-00045'],
                ['Final Confirmation',            'driver.confirm@trivora.ph',    'Driver@123', 'APP-2026-00046'],
                ['Expired',                       'driver.expired@trivora.ph',    'Driver@123', 'APP-2026-00047'],
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
