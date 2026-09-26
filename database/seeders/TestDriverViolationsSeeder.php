<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\TricycleLocation;
use App\Models\Tricycle;
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

        // Franchise Number (STK-YYYY-NNNN): no application backs this fixture scheme (it
        // exists only because violations.franchise_scheme_id is required), so the serial is
        // built from the unit's Sticker Number the way BPLOController::showReleaseForm()
        // builds one — and never regenerated once issued.
        if (! $franchise->sticker_number) {
            $testCoding = (string) (Tricycle::whereKey($tricycleId)->value('coding_scheme_number') ?: '9999');
            $franchise->update([
                'sticker_number' => 'STK-' . now()->format('Y') . '-' . str_pad($testCoding, 4, '0', STR_PAD_LEFT),
            ]);
        }

        $tmoJuan = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $tmoMaria = User::where('email', 'tmo.msantos@trivora.gov.ph')->first();

        // ------------------------------------------------------------------
        // 1. RESOLVED — an old automated color-coding citation, fine already paid.
        // ------------------------------------------------------------------
        $this->seedResolved($tricycleId, $franchise->id, $redScheme?->id);

        // ------------------------------------------------------------------
        // 2. APPEAL UNDER REVIEW — a color-coding citation filed by an officer, appeal filed, awaiting decision.
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

        $existing = Violation::where('tricycle_id', $tricycleId)->where('detected_at', $detectedAt)->first();
        if ($existing) {
            // Re-running must also heal a record that lost its GPS ping, so the resolved/fine-paid
            // scenario always keeps a real Detection Method source.
            $this->ensureGpsSnapshot($existing, $detectedAt, 14.0705, 120.6341);
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $tricycleId,
            'latitude' => 14.0705,
            'longitude' => 120.6341,
            'speed_kmh' => 24.0,
            'heading_deg' => 45,
            'accuracy_m' => 5.0,
            'source' => self::pingSource($tricycleId),
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
                'violation_type' => 'color_coding',
                'detected_at' => $detectedAt,
                'day_of_week' => $detectedAt->format('l'),
                'detection_method' => 'manual',
                'status' => 'contested',
                'fine_amount' => 350.00,
                'fine_paid_at' => null,
                'notes' => 'Red-coded tricycle (TEST-0001) observed operating near Wawa Port & Baywalk, Barangay 4 on a restricted day. Filed by TMO Officer.',
            ]
        );

        // Same landmark coordinates the project already uses for Wawa Port & Baywalk.
        $this->ensureGpsSnapshot($violation, $detectedAt, 14.0642, 120.6350);

        ViolationAppeal::firstOrCreate(
            ['violation_id' => $violation->id],
            [
                'driver_id' => $driverId,
                'reason' => 'I was responding to a genuine emergency that afternoon and had no alternative route available, so I did not knowingly operate during the restricted window.',
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

        $existing = Violation::where('tricycle_id', $tricycleId)->where('detected_at', $detectedAt)->first();
        if ($existing) {
            // Re-running must also heal a record that lost its GPS ping, so the pending/open
            // scenario always keeps a real Detection Method source.
            $this->ensureGpsSnapshot($existing, $detectedAt, 14.0718, 120.6325);
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $tricycleId,
            'latitude' => 14.0718,
            'longitude' => 120.6325,
            'speed_kmh' => 19.5,
            'heading_deg' => 120,
            'accuracy_m' => 4.0,
            'source' => self::pingSource($tricycleId),
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
                'violation_type' => 'color_coding',
                'detected_at' => $detectedAt,
                'day_of_week' => $detectedAt->format('l'),
                'detection_method' => 'manual',
                // Rejected-appeal convention: reverts to 'open' (same as a fresh, unappealed
                // violation) — the driver-facing "Fine Payment Required" label comes from the
                // appeal's own rejected status, not a separate violation status value.
                'status' => 'open',
                'fine_amount' => 750.00,
                'fine_paid_at' => null,
                'notes' => 'Red-coded tricycle cited operating near SM Savemore Nasugbu, National Highway, Barangay 10 on a restricted day — repeat offense.',
            ]
        );

        // Same landmark coordinates the project already uses for Brgy. 10 / National Highway.
        $this->ensureGpsSnapshot($violation, $detectedAt, 14.0728, 120.6319);

        ViolationAppeal::firstOrCreate(
            ['violation_id' => $violation->id],
            [
                'driver_id' => $driverId,
                'reason' => 'The color-coding reading was inaccurate at the time — the unit was not in service during the restricted window according to my own logs.',
                'evidence_path' => null,
                'status' => 'rejected',
                'submitted_at' => Carbon::parse('2026-08-26 09:00:00'),
                'reviewed_at' => Carbon::parse('2026-08-30 16:00:00'),
                'reviewed_by' => $reviewerId,
                'review_notes' => 'GPS log and the officer report both confirm the tricycle operated during the restricted color-coding window. Appeal denied — fine stands.',
            ]
        );
    }

    /**
     * Guarantee a seeded violation carries a real tricycle_locations ping.
     *
     * The active violation UI resolves Detection Method from tricycle_locations.source, never
     * from detection_method — a record with no ping would otherwise have no GPS source at all.
     * Creates the ping at the violation's own detected_at (so it is that record's true position,
     * not a stray ping from another time) and records how the unit actually reports.
     */
    private function ensureGpsSnapshot(Violation $violation, Carbon $detectedAt, float $lat, float $lng): void
    {
        if ($violation->location_snapshot_id) {
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $violation->tricycle_id,
            'latitude' => $lat,
            'longitude' => $lng,
            'speed_kmh' => 21.0,
            'heading_deg' => 90,
            'accuracy_m' => 5.0,
            'source' => self::pingSource($violation->tricycle_id),
            'recorded_at' => $detectedAt,
        ]);

        $violation->forceFill(['location_snapshot_id' => $location->id])->save();
    }

    /**
     * The project's canonical ping source — the same rule MobileAppDataSeeder already applies:
     * a unit fitted with an IoT tracker reports from its gps_device, any other unit reports from
     * the driver's phone. Both are real GPS sources, so no record has to fall back on
     * detection_method to produce a Detection Method label.
     */
    private static function pingSource(int $tricycleId): string
    {
        $mode = Tricycle::whereKey($tricycleId)->value('active_tracking_mode');

        return $mode === 'iot_device' ? 'gps_device' : 'mobile_app';
    }
}
