<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * One open violation record per cross-TODA demo driver (driver.brgy10, driver.brgy8,
 * driver.brgy4@trivora.test), so every demo driver account — not just driver.test — has
 * something to show on the mobile Violations screen. Uses each driver's existing
 * tricycle/franchise-scheme relationship set up when the account was created; no new driver,
 * operator, or tricycle is created here.
 *
 * Idempotent: each violation is matched on its fixed (tricycle_id, detected_at) pair — both
 * hardcoded, not relative to now() — so re-running this seeder never duplicates records.
 *
 * Not wired into DatabaseSeeder::run(), same as TestDriverViolationsSeeder — invoke explicitly:
 *   php artisan db:seed --class=Database\\Seeders\\DemoDriverViolationsSeeder
 */
class DemoDriverViolationsSeeder extends Seeder
{
    /** @var array<string, array{email: string, detected_at: string, lat: float, lng: float, note: string}> */
    private const DEMO_DRIVERS = [
        'driver.brgy10@trivora.test' => [
            'detected_at' => '2026-09-05 08:20:00',
            'lat' => 14.0728,
            'lng' => 120.6319,
            'note' => 'System detected Red-coded tricycle (DEMO-0001) operating near Brgy. 10 Public Market on a restricted Friday.',
        ],
        'driver.brgy8@trivora.test' => [
            'detected_at' => '2026-09-06 16:40:00',
            'lat' => 14.0689,
            'lng' => 120.6274,
            'note' => 'System detected Red-coded tricycle (DEMO-0002) operating near Brgy. 8 Public Market on a restricted Saturday.',
        ],
        'driver.brgy4@trivora.test' => [
            'detected_at' => '2026-09-08 11:05:00',
            'lat' => 14.0642,
            'lng' => 120.6350,
            'note' => 'System detected Red-coded tricycle (DEMO-0003) operating near Wawa Port & Baywalk, Barangay 4 on a restricted Tuesday.',
        ],
    ];

    public function run(): void
    {
        foreach (self::DEMO_DRIVERS as $email => $data) {
            $this->seedFor($email, $data);
        }
    }

    /**
     * @param array{detected_at: string, lat: float, lng: float, note: string} $data
     */
    private function seedFor(string $email, array $data): void
    {
        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->command->error("DemoDriverViolationsSeeder: {$email} not found — skipping.");
            return;
        }

        $driver = Driver::where('user_id', $user->id)->first();
        if (! $driver || ! $driver->tricycle_id) {
            $this->command->error("DemoDriverViolationsSeeder: {$email} has no linked tricycle — skipping.");
            return;
        }

        $tricycleId = $driver->tricycle_id;
        $tricycle = Tricycle::find($tricycleId);

        $franchise = FranchiseScheme::where('tricycle_id', $tricycleId)->first();
        if (! $franchise) {
            $this->command->error("DemoDriverViolationsSeeder: {$email}'s tricycle has no franchise scheme — skipping.");
            return;
        }

        $detectedAt = Carbon::parse($data['detected_at']);

        $existing = Violation::where('tricycle_id', $tricycleId)->where('detected_at', $detectedAt)->first();
        if ($existing) {
            // Re-running must also heal a record that lost its GPS ping, so every demo driver's
            // open-violation scenario always keeps a real Detection Method source.
            $this->ensureGpsSnapshot($existing, $detectedAt, $data['lat'], $data['lng']);
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $tricycleId,
            'latitude' => $data['lat'],
            'longitude' => $data['lng'],
            'speed_kmh' => 22.0,
            'heading_deg' => 90,
            'accuracy_m' => 5.0,
            'source' => self::pingSource($tricycleId),
            'recorded_at' => $detectedAt,
        ]);

        Violation::create([
            'tricycle_id' => $tricycleId,
            'franchise_scheme_id' => $franchise->id,
            'color_coding_scheme_id' => $franchise->color_coding_scheme_id,
            'location_snapshot_id' => $location->id,
            'detected_by' => null,
            'violation_type' => 'color_coding',
            'detected_at' => $detectedAt,
            'day_of_week' => $detectedAt->format('l'),
            'detection_method' => 'automated',
            'status' => 'open',
            'fine_amount' => 500.00,
            'fine_paid_at' => null,
            'notes' => $data['note'],
        ]);

        $this->command->info("✔ Violation seeded for {$email} (tricycle {$tricycle?->plate_number}).");
    }

    /**
     * Attach a real tricycle_locations ping to a record that has none, recorded at the
     * violation's own detected_at so it is that record's true position rather than a stray ping
     * from another time.
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
            'speed_kmh' => 22.0,
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
