<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Sample violation records for the driver.test@trivora.test account, covering all four
 * driver-facing states the mobile Violations screen needs to exercise: Resolved, Appeal Under
 * Review, Pending/Open, and Fine Payment Required (rejected appeal). Uses the driver's existing
 * tricycle/TODA relationship set up by TestAccountsSeeder — no new driver, operator, or tricycle
 * is created here.
 *
 * Idempotent: every violation is matched on its fixed (tricycle_id, detected_at) pair — both
 * hardcoded, not relative to now() — so re-running this seeder never duplicates records. Each
 * violation's appeal (where applicable) is matched on violation_id, which is already unique.
 *
 * Not wired into DatabaseSeeder::run(), same as TestAccountsSeeder — invoke explicitly:
 *   php artisan db:seed --class=Database\\Seeders\\TestDriverViolationsSeeder
 */
class TestDriverViolationsSeeder extends Seeder
{
    public function run(): void
    {
        $driverUser = User::where('email', 'driver.test@trivora.test')->first();
        if (! $driverUser) {
            $this->command->error('TestDriverViolationsSeeder: driver.test@trivora.test not found — run TestAccountsSeeder first.');
            return;
        }

        $driver = Driver::where('user_id', $driverUser->id)->first();
        if (! $driver || ! $driver->tricycle_id) {
            $this->command->error('TestDriverViolationsSeeder: test driver has no linked tricycle — run TestAccountsSeeder first.');
            return;
        }

        $tricycleId = $driver->tricycle_id;

        // The test tricycle (set up by TestAccountsSeeder) has no franchise scheme yet, but
        // violations.franchise_scheme_id is required — every real tricycle has one, so this
        // fills a genuine gap rather than fabricating throwaway data.
        $redScheme = ColorCodingScheme::where('name', 'Red')->first();
        $bplo = User::where('role', 'bplo_staff')->first();

        $franchise = FranchiseScheme::firstOrCreate(
            ['franchise_number' => 'FS-TEST-DRV-0001'],
            [
                'tricycle_id' => $tricycleId,
                'color_coding_scheme_id' => $redScheme?->id,
                'issued_by' => $bplo?->id,
                'issue_date' => '2025-01-15',
                'expiry_date' => '2030-01-15',
                'is_active' => true,
            ]
        );

        $tmoJuan = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $tmoMaria = User::where('email', 'tmo.msantos@trivora.gov.ph')->first();

        // ------------------------------------------------------------------
        // 1. RESOLVED — an old automated color-coding citation, fine already paid.
        // ------------------------------------------------------------------
        $this->seedResolved($tricycleId, $franchise->id, $redScheme?->id);

        // ------------------------------------------------------------------
        // 2. APPEAL UNDER REVIEW — a manually-filed route violation, appeal filed, awaiting decision.
        // ------------------------------------------------------------------
        $this->seedUnderReview($tricycleId, $franchise->id, $redScheme?->id, $driver->id);

        // ------------------------------------------------------------------
        // 3. PENDING / OPEN — a freshly issued citation, no appeal filed yet.
        // ------------------------------------------------------------------
        $this->seedPending($tricycleId, $franchise->id, $redScheme?->id);

        // ------------------------------------------------------------------
        // 4. FINE PAYMENT REQUIRED — appeal was filed and rejected.
        // ------------------------------------------------------------------
        $this->seedRejected($tricycleId, $franchise->id, $redScheme?->id, $driver->id, $tmoMaria?->id);

        $this->command->info('✔ Test driver violations seeded for driver.test@trivora.test (resolved, appeal under review, pending, fine payment required).');
    }

    private function seedResolved(int $tricycleId, int $franchiseId, ?int $colorSchemeId): void
    {
        $detectedAt = Carbon::parse('2026-08-20 09:15:00');

        if (Violation::where('tricycle_id', $tricycleId)->where('detected_at', $detectedAt)->exists()) {
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $tricycleId,
            'latitude' => 14.0705,
            'longitude' => 120.6341,
            'speed_kmh' => 24.0,
            'heading_deg' => 45,
            'accuracy_m' => 5.0,
            'source' => 'mobile_app',
            'recorded_at' => $detectedAt,
        ]);

        Violation::create([
            'tricycle_id' => $tricycleId,
            'franchise_scheme_id' => $franchiseId,
            'color_coding_scheme_id' => $colorSchemeId,
            'location_snapshot_id' => $location->id,
            'detected_by' => null,
            'violation_type' => 'color_coding',
            'detected_at' => $detectedAt,
            'day_of_week' => $detectedAt->format('l'),
            'detection_method' => 'automated',
            'status' => 'resolved',
            'fine_amount' => 500.00,
            'fine_paid_at' => Carbon::parse('2026-08-22 10:30:00'),
            'notes' => 'System detected Red-coded tricycle (TEST-0001) operating near Nasugbu Public Market, Poblacion on a restricted Thursday. Fine settled at the Municipal Treasurer\'s Office.',
        ]);
    }

    private function seedUnderReview(int $tricycleId, int $franchiseId, ?int $colorSchemeId, int $driverId): void
    {
        $detectedAt = Carbon::parse('2026-09-03 14:30:00');

        $violation = Violation::firstOrCreate(
            ['tricycle_id' => $tricycleId, 'detected_at' => $detectedAt],
            [
                'franchise_scheme_id' => $franchiseId,
                'color_coding_scheme_id' => $colorSchemeId,
                'location_snapshot_id' => null,
                'detected_by' => User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->value('id'),
                'violation_type' => 'route_violation',
                'detected_at' => $detectedAt,
                'day_of_week' => $detectedAt->format('l'),
                'detection_method' => 'manual',
                'status' => 'contested',
                'fine_amount' => 350.00,
                'fine_paid_at' => null,
                'notes' => 'Tricycle observed operating past Wawa Port & Baywalk, Barangay 4 — outside the assigned TODA Bucana route boundary. Manually filed by TMO Officer.',
            ]
        );

        ViolationAppeal::firstOrCreate(
            ['violation_id' => $violation->id],
            [
                'driver_id' => $driverId,
                'reason' => 'I was rerouted through Barangay 4 by barangay tanod due to a temporary road closure on National Highway for a fiesta procession that afternoon. I did not deviate from my route voluntarily.',
                'evidence_path' => null,
                'status' => 'under_review',
                'submitted_at' => Carbon::parse('2026-09-04 10:00:00'),
                'reviewed_at' => null,
                'reviewed_by' => null,
                'review_notes' => null,
            ]
        );
    }

    private function seedPending(int $tricycleId, int $franchiseId, ?int $colorSchemeId): void
    {
        $detectedAt = Carbon::parse('2026-09-07 07:45:00');

        if (Violation::where('tricycle_id', $tricycleId)->where('detected_at', $detectedAt)->exists()) {
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $tricycleId,
            'latitude' => 14.0718,
            'longitude' => 120.6325,
            'speed_kmh' => 19.5,
            'heading_deg' => 120,
            'accuracy_m' => 4.0,
            'source' => 'mobile_app',
            'recorded_at' => $detectedAt,
        ]);

        Violation::create([
            'tricycle_id' => $tricycleId,
            'franchise_scheme_id' => $franchiseId,
            'color_coding_scheme_id' => $colorSchemeId,
            'location_snapshot_id' => $location->id,
            'detected_by' => null,
            'violation_type' => 'color_coding',
            'detected_at' => $detectedAt,
            'day_of_week' => $detectedAt->format('l'),
            'detection_method' => 'automated',
            'status' => 'open',
            'fine_amount' => 450.00,
            'fine_paid_at' => null,
            'notes' => 'System detected Red-coded tricycle (TEST-0001) operating near Nasugbu Municipal Hall, J.P. Rizal St., Poblacion on a restricted Monday.',
        ]);
    }

    private function seedRejected(int $tricycleId, int $franchiseId, ?int $colorSchemeId, int $driverId, ?int $reviewerId): void
    {
        $detectedAt = Carbon::parse('2026-08-24 11:00:00');

        $violation = Violation::firstOrCreate(
            ['tricycle_id' => $tricycleId, 'detected_at' => $detectedAt],
            [
                'franchise_scheme_id' => $franchiseId,
                'color_coding_scheme_id' => $colorSchemeId,
                'location_snapshot_id' => null,
                'detected_by' => $reviewerId,
                'violation_type' => 'route_violation',
                'detected_at' => $detectedAt,
                'day_of_week' => $detectedAt->format('l'),
                'detection_method' => 'manual',
                // Rejected-appeal convention: reverts to 'open' (same as a fresh, unappealed
                // violation) — the driver-facing "Fine Payment Required" label comes from the
                // appeal's own rejected status, not a separate violation status value.
                'status' => 'open',
                'fine_amount' => 750.00,
                'fine_paid_at' => null,
                'notes' => 'Tricycle cited operating outside authorized boundary near SM Savemore Nasugbu, National Highway, Barangay 10 — repeat offense.',
            ]
        );

        ViolationAppeal::firstOrCreate(
            ['violation_id' => $violation->id],
            [
                'driver_id' => $driverId,
                'reason' => 'The GPS/route boundary reading was inaccurate at the time — I was still within the TODA Bucana coverage area based on my own tracking.',
                'evidence_path' => null,
                'status' => 'rejected',
                'submitted_at' => Carbon::parse('2026-08-26 09:00:00'),
                'reviewed_at' => Carbon::parse('2026-08-30 16:00:00'),
                'reviewed_by' => $reviewerId,
                'review_notes' => 'GPS log and manual officer report both confirm the tricycle was operating well outside the TODA Bucana boundary. Appeal denied — fine stands.',
            ]
        );
    }
}
