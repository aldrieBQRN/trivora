<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Proves the ACTUAL end-to-end chain — real HTTP POST from a Sanctum-authenticated driver,
 * through the real DriverTelematicsController, into a real tricycle_locations row, read back by
 * the real TMO\DashboardController::index() ("/tmo/live") — not just that each piece exists in
 * isolation. Complements DriverTelematicsColorCodingTest.php (which already covers the dedup and
 * non-restricted-day cases) with the gaps that test file doesn't cover: the TMO-visibility leg,
 * the no-active-franchise-scheme guard, invalid-GPS rejection, and "next valid day" behavior.
 */
class GpsTelemetryChainTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Operator $operator;
    protected Tricycle $tricycle;
    protected TodaZone $toda;

    /** Tricycle Sticker Number ends in 2, which ColorCodingRuleService restricts on Mondays. */
    protected function setUp(): void
    {
        parent::setUp();

        $this->toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-GPSCHAIN-TEST'],
            ['name' => 'GPS Chain Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $this->driverUser = User::create([
            'name' => 'GPS Chain Driver', 'email' => 'gpschain.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $this->toda->id,
            'first_name' => 'Gps', 'last_name' => 'Chain',
            'contact_number' => '09170000030', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-GPSCHAIN-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $this->operator->id, 'toda_zone_id' => $this->toda->id,
            'coding_scheme_number' => '0002',
            'plate_number' => 'GPS-0002', 'engine_number' => 'ENG-GPS-002', 'chassis_number' => 'CHS-GPS-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-GPS-002', 'cr_number' => 'CR-GPS-002', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);
    }

    private function attachActiveFranchiseScheme(): FranchiseScheme
    {
        $colorScheme = ColorCodingScheme::create([
            'name' => 'GPS Chain Scheme ' . uniqid(), 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);
        $issuer = User::create([
            'name' => 'BPLO Issuer GpsChain', 'email' => 'bplo.gpschain.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        return FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-GPSCHAIN-002',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);
    }

    private function makeTmoUser(): User
    {
        return User::create([
            'name' => 'TMO Live Monitor', 'email' => 'tmo.gpschain.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Part 3 + Part 4: real telemetry -> tricycle_locations -> TMO /tmo/live
    // -------------------------------------------------------------------------

    #[Test]
    public function a_real_telemetry_post_is_stored_and_visible_to_tmo_live_monitoring_with_the_same_coordinates(): void
    {
        $this->attachActiveFranchiseScheme();
        $driver = Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-GPSCHAIN-001',
            'is_online' => true, 'is_available' => true,
        ]);

        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0); // not a restricted day for digit 2

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.071234, 'longitude' => 120.631234,
            'speed_kmh' => 18, 'heading_deg' => 45, 'accuracy_m' => 6.5,
            'recorded_at' => $tuesday->toISOString(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        $pingId = $response->json('ping_id');

        // ---- Database: the real row, with the fields the task asked to verify ----
        $this->assertDatabaseHas('tricycle_locations', [
            'id' => $pingId,
            'tricycle_id' => $this->tricycle->id,
            'source' => 'mobile_app',
        ]);
        $location = TricycleLocation::find($pingId);
        $this->assertEqualsWithDelta(14.071234, (float) $location->latitude, 0.00001);
        $this->assertEqualsWithDelta(120.631234, (float) $location->longitude, 0.00001);
        $this->assertEqualsWithDelta(18, (float) $location->speed_kmh, 0.01);
        $this->assertSame(45, $location->heading_deg);

        // ---- Driver's live-position cache updated in the same request ----
        $driver->refresh();
        $this->assertEqualsWithDelta(14.071234, $driver->current_lat, 0.00001);
        $this->assertEqualsWithDelta(120.631234, $driver->current_lng, 0.00001);
        $this->assertNotNull($driver->last_location_updated_at);

        // ---- TMO Live Monitoring (real controller: TMO\DashboardController::index(), "/tmo/live") ----
        // reads the SAME tricycle_locations row back — this is the actual backend data contract,
        // independent of whatever the React page does with it client-side (see report Part 6/11).
        $tmoUser = $this->makeTmoUser();
        $tmoResponse = $this->actingAs($tmoUser)->get(route('tmo.live'));
        $tmoResponse->assertOk();
        $tmoResponse->assertInertia(function ($page) use ($pingId) {
            $page->where('initialTricycles', function ($tricycles) use ($pingId) {
                $match = $tricycles->firstWhere('plate', 'GPS-0002');
                \PHPUnit\Framework\Assert::assertNotNull($match, 'TMO live endpoint must include the tricycle that just pinged.');
                \PHPUnit\Framework\Assert::assertTrue($match['hasRealGPS']);
                \PHPUnit\Framework\Assert::assertEqualsWithDelta(14.071234, $match['lat'], 0.0001);
                \PHPUnit\Framework\Assert::assertEqualsWithDelta(120.631234, $match['lng'], 0.0001);

                return true;
            });
        });
    }

    #[Test]
    public function a_tricycle_with_no_gps_ping_is_absent_from_tmo_live_monitoring_not_shown_at_a_fake_location(): void
    {
        // No telemetry ever sent for this tricycle — TMO\DashboardController::index() must exclude
        // it entirely (it does: `if (!$latestLoc) { return null; }`), never show it at a fabricated
        // default coordinate.
        $tmoUser = $this->makeTmoUser();
        $response = $this->actingAs($tmoUser)->get(route('tmo.live'));
        $response->assertOk();
        $response->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                \PHPUnit\Framework\Assert::assertNull(
                    $tricycles->firstWhere('plate', 'GPS-0002'),
                    'A tricycle with zero real GPS pings must not appear on the live map at all.'
                );

                return true;
            });
        });
    }

    // -------------------------------------------------------------------------
    // Part 6/8: no active franchise scheme -> no violation (ping still stored)
    // -------------------------------------------------------------------------

    #[Test]
    public function telemetry_on_a_restricted_day_with_no_active_franchise_scheme_creates_no_violation(): void
    {
        // Deliberately do NOT attach a FranchiseScheme — the tricycle exists and is "active" but
        // has no franchise record, which happens if data is inconsistent.
        Sanctum::actingAs($this->driverUser, ['*']);
        $monday = Carbon::parse('next Monday')->setTime(9, 0);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63,
            'recorded_at' => $monday->toISOString(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('violation.flagged', false);
        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
        // The ping itself is still recorded — the missing franchise scheme only skips the
        // violation-detection step, it never blocks the GPS write.
        $this->assertDatabaseHas('tricycle_locations', ['tricycle_id' => $this->tricycle->id]);
    }

    // -------------------------------------------------------------------------
    // Part 12: invalid GPS coordinates are rejected, no row written
    // -------------------------------------------------------------------------

    #[Test]
    public function out_of_range_latitude_is_rejected_with_no_row_written(): void
    {
        $this->attachActiveFranchiseScheme();
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 95.0, // > 90, invalid
            'longitude' => 120.63,
            'recorded_at' => now()->toISOString(),
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('success', false);
        $response->assertJsonValidationErrors('latitude');
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function missing_required_coordinates_are_rejected(): void
    {
        $this->attachActiveFranchiseScheme();
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'speed_kmh' => 10,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['latitude', 'longitude']);
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
    }

    // -------------------------------------------------------------------------
    // Part 9: the day AFTER a violation is a valid (non-restricted) operating day
    // -------------------------------------------------------------------------

    /** A pure north offset using the same spherical-Earth radius GeoService::haversineKm() uses,
     * so the resulting distance is exact relative to what the production code computes. */
    private function metersNorth(float $lat, float $meters): float
    {
        return $lat + rad2deg($meters / 6371000.0);
    }

    #[Test]
    public function the_day_after_a_coding_violation_the_same_tricycle_can_operate_without_flagging(): void
    {
        $this->attachActiveFranchiseScheme();
        Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-GPSCHAIN-001',
            'is_online' => true,
            'online_since' => now()->subDay(),
        ]);
        Sanctum::actingAs($this->driverUser, ['*']);

        // The 100-meter movement rule (see CodingViolationMovementRuleTest) needs an anchor,
        // candidate, and confirming reading before a violation fires.
        $monday = Carbon::parse('next Monday')->setTime(9, 0);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $monday->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 102), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(15)->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 107), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(30)->toISOString(),
        ])->assertJsonPath('violation.flagged', true);

        // Tuesday: digit 2 is not restricted (only Monday: 1,2 per ColorCodingRuleService).
        $tuesday = $monday->copy()->addDay()->setTime(9, 0);
        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.08, 'longitude' => 120.64, 'recorded_at' => $tuesday->toISOString(),
        ]);

        $response->assertJsonPath('violation.flagged', false);
        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count(), 'Only the Monday violation should exist.');

        // The FOLLOWING Monday is a new calendar date — dedup is per-date, so it flags again once
        // the movement rule is satisfied for that date too.
        $nextMonday = $monday->copy()->addWeek();
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $nextMonday->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 102), 'longitude' => 120.63,
            'recorded_at' => $nextMonday->copy()->addSeconds(15)->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 107), 'longitude' => 120.63,
            'recorded_at' => $nextMonday->copy()->addSeconds(30)->toISOString(),
        ])->assertJsonPath('violation.flagged', true);
        $this->assertSame(2, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    // -------------------------------------------------------------------------
    // recorded_at timezone handling: a real browser/mobile client sends
    // JS `Date.prototype.toISOString()`, which is always UTC ("...Z"), not the app's own
    // Asia/Manila offset (unlike Carbon::parse(...)->toISOString() used in the other tests
    // above, which already carries a +08:00 offset since PHP's default timezone is Manila).
    // -------------------------------------------------------------------------

    #[Test]
    public function a_real_utc_timestamped_ping_is_stored_in_the_apps_timezone_not_shifted_by_its_utc_offset(): void
    {
        $this->attachActiveFranchiseScheme();
        Sanctum::actingAs($this->driverUser, ['*']);

        // Genuine UTC ISO string, e.g. exactly what JS's toISOString() produces — Carbon::parse()
        // on a "Z"-suffixed string keeps the UTC offset unless explicitly converted.
        $utcInstant = Carbon::parse('2026-09-16 10:05:42', 'UTC');
        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63,
            'recorded_at' => $utcInstant->toIso8601ZuluString(),
        ]);

        $response->assertStatus(201);
        $pingId = $response->json('ping_id');
        $location = TricycleLocation::find($pingId);

        // Asia/Manila is UTC+8, so the correctly-converted wall-clock value is 18:05:42 — NOT the
        // raw UTC digits (10:05:42) mislabeled as local time.
        $this->assertSame('2026-09-16 18:05:42', $location->recorded_at->format('Y-m-d H:i:s'));
        $this->assertTrue($location->recorded_at->equalTo($utcInstant), 'Must represent the exact same real-world instant the client sent.');
    }
}
