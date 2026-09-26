<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the coding/restricted-day 100-meter movement rule
 * (TelemetryService::hasConfirmedMovementSinceOnline()):
 *
 *   - Going Online alone never creates a violation.
 *   - The tricycle's first valid GPS reading after going Online becomes the session's movement
 *     anchor (never the TODA zone center).
 *   - Movement is measured as Haversine distance from that anchor via the shared GeoService
 *     primitive.
 *   - A single reading at/beyond the configured threshold (100m) is only a candidate — the next
 *     valid reading must also be at/beyond it before a violation is created.
 *   - Going Offline clears the session (Driver::online_since); the next Online starts a new one
 *     with a brand-new anchor.
 *
 * Coordinates are generated with metersNorth(), a pure north/south offset using the exact same
 * spherical-Earth constant (6371 km) GeoService::haversineKm() itself uses, so the distances this
 * test asserts against (50m, 99m, 100m, ...) are mathematically exact relative to what the
 * production code will compute — not an approximation that could drift near a boundary.
 */
class CodingViolationMovementRuleTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Tricycle $tricycle;
    protected float $anchorLat = 14.0700;
    protected float $anchorLng = 120.6300;

    /** Tricycle Sticker Number ends in 2, which ColorCodingRuleService restricts on Mondays. */
    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-MOVEMENT-TEST'],
            ['name' => 'Movement Rule Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Movement Rule Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Movement Rule Driver', 'email' => 'movement.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $toda->id,
            'first_name' => 'Movement', 'last_name' => 'Driver',
            'contact_number' => '09170000050', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-MOVEMENT-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0002',
            'plate_number' => 'MOV-0002', 'engine_number' => 'ENG-MOV-002', 'chassis_number' => 'CHS-MOV-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-MOV-002', 'cr_number' => 'CR-MOV-002', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-MOVEMENT-001',
            'is_online' => false, 'is_available' => false,
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer Movement', 'email' => 'bplo.movement.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-MOV-002',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->driverUser, ['*']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** A pure north/south offset, computed with the exact same spherical-Earth radius (6371 km)
     * GeoService::haversineKm() uses internally, so the resulting distance is mathematically exact
     * (not an approximation) relative to what the production code will compute. */
    private function metersNorth(float $lat, float $meters): float
    {
        $earthRadiusM = 6371000.0;

        return $lat + rad2deg($meters / $earthRadiusM);
    }

    private function goOnline(): void
    {
        $this->postJson('/api/v1/driver/status', ['is_online' => true])->assertOk();
    }

    private function goOffline(): void
    {
        $this->postJson('/api/v1/driver/status', ['is_online' => false])->assertOk();
    }

    private function ping(float $lat, float $lng, Carbon $recordedAt): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $lat,
            'longitude' => $lng,
            'recorded_at' => $recordedAt->toISOString(),
        ]);
    }

    #[Test]
    public function going_online_alone_never_creates_a_violation(): void
    {
        $this->goOnline();

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function the_first_valid_gps_after_going_online_on_a_restricted_day_becomes_the_anchor_not_a_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $response = $this->ping($this->anchorLat, $this->anchorLng, $monday);

        $response->assertStatus(201);
        $response->assertJsonPath('violation.flagged', false);
        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function movement_of_50_meters_does_not_create_a_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday)->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 50), $this->anchorLng, $monday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false);

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function movement_of_99_meters_does_not_create_a_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday)->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 99), $this->anchorLng, $monday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false);

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function exactly_100_meters_is_only_a_candidate_and_does_not_yet_create_a_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday)->assertJsonPath('violation.flagged', false);
        // Previous reading (the anchor itself) is 0m -- a lone reading crossing the threshold is
        // never enough on its own, regardless of how far past the threshold it lands.
        $this->ping($this->metersNorth($this->anchorLat, 100), $this->anchorLng, $monday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false);

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function a_second_consecutive_reading_at_or_beyond_the_threshold_confirms_and_creates_the_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday)
            ->assertJsonPath('violation.flagged', false); // anchor
        // 102m/107m (not exactly 100/105) so decimal(10,7) column rounding (~1cm) can never
        // accidentally land either reading on the wrong side of the threshold.
        $this->ping($this->metersNorth($this->anchorLat, 102), $this->anchorLng, $monday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false); // candidate
        $confirming = $this->ping($this->metersNorth($this->anchorLat, 107), $this->anchorLng, $monday->copy()->addSeconds(30));

        $confirming->assertStatus(201);
        $confirming->assertJsonPath('violation.flagged', true);
        $confirming->assertJsonPath('violation.type', 'color_coding');

        $violation = Violation::where('tricycle_id', $this->tricycle->id)->first();
        $this->assertNotNull($violation);
        $this->assertSame('color_coding', $violation->violation_type);
        $this->assertSame('open', $violation->status);
        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function a_gps_jump_to_beyond_threshold_followed_by_a_return_below_it_never_creates_a_violation(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday)
            ->assertJsonPath('violation.flagged', false); // anchor
        $this->ping($this->metersNorth($this->anchorLat, 200), $this->anchorLng, $monday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false); // single jump -- only a candidate
        $this->ping($this->metersNorth($this->anchorLat, 30), $this->anchorLng, $monday->copy()->addSeconds(30))
            ->assertJsonPath('violation.flagged', false); // dropped back below threshold

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function once_confirmed_repeated_gps_updates_never_create_duplicate_violations(): void
    {
        $this->goOnline();
        $monday = Carbon::parse('next Monday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $monday);
        $this->ping($this->metersNorth($this->anchorLat, 102), $this->anchorLng, $monday->copy()->addSeconds(15));
        $this->ping($this->metersNorth($this->anchorLat, 107), $this->anchorLng, $monday->copy()->addSeconds(30))
            ->assertJsonPath('violation.flagged', true);

        // Two more pings, still comfortably beyond the threshold -- must never create a 2nd row.
        $repeat1 = $this->ping($this->metersNorth($this->anchorLat, 110), $this->anchorLng, $monday->copy()->addSeconds(45));
        $repeat2 = $this->ping($this->metersNorth($this->anchorLat, 120), $this->anchorLng, $monday->copy()->addSeconds(60));

        $repeat1->assertJsonPath('violation.flagged', false);
        $repeat1->assertJsonPath('violation.already_recorded_today', true);
        $repeat2->assertJsonPath('violation.flagged', false);
        $repeat2->assertJsonPath('violation.already_recorded_today', true);

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function going_offline_and_online_again_establishes_a_brand_new_anchor(): void
    {
        $monday = Carbon::parse('next Monday')->setTime(0, 0, 0);

        // --- First online session: anchor at 09:00, some nearby movement, no confirmation yet ---
        Carbon::setTestNow($monday->copy()->setTime(9, 0, 0));
        $this->goOnline();
        $this->ping($this->anchorLat, $this->anchorLng, $monday->copy()->setTime(9, 0, 5))
            ->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 40), $this->anchorLng, $monday->copy()->setTime(9, 0, 20))
            ->assertJsonPath('violation.flagged', false);

        // --- Go offline: session ends ---
        Carbon::setTestNow($monday->copy()->setTime(9, 5, 0));
        $this->goOffline();
        $this->assertNull(Driver::where('tricycle_id', $this->tricycle->id)->first()->online_since);

        // --- Go online again: brand-new session/anchor, well after the old session's pings ---
        Carbon::setTestNow($monday->copy()->setTime(9, 10, 0));
        $this->goOnline();

        // The very first reading of the NEW session is the new anchor -- even though it lands
        // exactly where the OLD anchor was, it must not be treated as already-confirmed movement
        // from the old session's history.
        $this->ping($this->anchorLat, $this->anchorLng, $monday->copy()->setTime(9, 10, 5))
            ->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 102), $this->anchorLng, $monday->copy()->setTime(9, 10, 20))
            ->assertJsonPath('violation.flagged', false);
        $confirming = $this->ping($this->metersNorth($this->anchorLat, 107), $this->anchorLng, $monday->copy()->setTime(9, 10, 35));

        $confirming->assertJsonPath('violation.flagged', true);
        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function non_restricted_days_never_activate_the_movement_rule_even_with_real_movement(): void
    {
        $this->goOnline();
        // Digit 2 is restricted only on Monday per this test's ColorCodingScheme fixture.
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0, 0);

        $this->ping($this->anchorLat, $this->anchorLng, $tuesday)->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 100), $this->anchorLng, $tuesday->copy()->addSeconds(15))
            ->assertJsonPath('violation.flagged', false);
        $this->ping($this->metersNorth($this->anchorLat, 200), $this->anchorLng, $tuesday->copy()->addSeconds(30))
            ->assertJsonPath('violation.flagged', false);

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }
}
