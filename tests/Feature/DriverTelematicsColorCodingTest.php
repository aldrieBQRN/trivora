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
 * Covers the fixed DriverTelematicsController::runColorCodingCheck() — previously broken
 * (invalid 'coding_no_operation' enum value, missing required FKs, an overspeeding check that
 * is out of this project's scope) as part of the real GPS/IoT tracking implementation.
 *
 * Since the coding/restricted-day 100-meter movement rule (see CodingViolationMovementRuleTest),
 * actually creating a violation now requires an online session (Driver::online_since) plus two
 * consecutive GPS readings at/beyond the movement threshold from that session's anchor — a single
 * ping is never enough on its own. Tests here that need a violation to fire drive a short,
 * realistic 3-ping sequence (anchor, candidate, confirming) rather than one ping.
 */
class DriverTelematicsColorCodingTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Tricycle $tricycle;
    protected Driver $driver;

    /** Tricycle Sticker Number ends in 2, which ColorCodingRuleService restricts on Mondays. */
    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-TELEM-TEST'],
            ['name' => 'Telematics Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Telematics Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Telematics Driver', 'email' => 'telem.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        // DriverTelematicsController::store() resolves the tricycle via $user->operator, so the
        // Operator here must be linked back to the driver's User (unlike the appeal-flow fixture,
        // which resolves via Driver::user_id instead).
        $operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $toda->id,
            'first_name' => 'Telem', 'last_name' => 'Driver',
            'contact_number' => '09170000020', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TELEM-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0002',
            'plate_number' => 'TEL-0002', 'engine_number' => 'ENG-TEL-002', 'chassis_number' => 'CHS-TEL-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-TEL-002', 'cr_number' => 'CR-TEL-002', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer Telem', 'email' => 'bplo.telem.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-TEL-002',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        $this->driver = Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-TELEM-001',
            'is_online' => false, 'is_available' => false,
        ]);
    }

    /** A pure north offset using the same spherical-Earth radius GeoService::haversineKm() uses,
     * so the resulting distance is exact relative to what the production code computes. */
    private function metersNorth(float $lat, float $meters): float
    {
        return $lat + rad2deg($meters / 6371000.0);
    }

    #[Test]
    public function a_restricted_day_ping_creates_exactly_one_valid_color_coding_violation(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $this->postJson('/api/v1/driver/status', ['is_online' => true])->assertOk();
        $monday = Carbon::parse('next Monday')->setTime(9, 0);

        // Anchor, then a candidate reading, then a confirming reading (both >=100m from the
        // anchor) — the movement rule requires this sequence before a violation can fire.
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $monday->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 102), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(15)->toISOString(),
        ])->assertJsonPath('violation.flagged', false);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 107), 'longitude' => 120.63,
            'speed_kmh' => 15, 'heading_deg' => 90, 'accuracy_m' => 5,
            'recorded_at' => $monday->copy()->addSeconds(30)->toISOString(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('violation.flagged', true);
        $response->assertJsonPath('violation.type', 'color_coding');

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
        $violation = Violation::where('tricycle_id', $this->tricycle->id)->first();
        $this->assertSame('color_coding', $violation->violation_type);
        $this->assertSame('open', $violation->status);
        $this->assertSame('automated', $violation->detection_method);
        $this->assertSame('Monday', $violation->day_of_week);
        $this->assertNotNull($violation->franchise_scheme_id);
        $this->assertNotNull($violation->color_coding_scheme_id);
        $this->assertNotNull($violation->location_snapshot_id);
    }

    #[Test]
    public function a_second_ping_the_same_restricted_day_does_not_duplicate(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $this->postJson('/api/v1/driver/status', ['is_online' => true])->assertOk();
        $monday = Carbon::parse('next Monday')->setTime(9, 0);

        // Confirm a violation first (anchor + candidate + confirming reading).
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $monday->toISOString(),
        ])->assertStatus(201);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 102), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(15)->toISOString(),
        ])->assertStatus(201);
        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 107), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(30)->toISOString(),
        ])->assertJsonPath('violation.flagged', true);

        // A further ping the same restricted day, still well beyond the threshold, must never
        // create a second row for the same date.
        $second = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 150), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addMinutes(5)->toISOString(),
        ]);

        $second->assertStatus(201);
        $second->assertJsonPath('violation.flagged', false);
        $second->assertJsonPath('violation.already_recorded_today', true);
        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function a_non_restricted_day_never_flags(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $tuesday->toISOString(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('violation.flagged', false);
        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function overspeeding_never_creates_a_violation(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0);

        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'speed_kmh' => 90,
            'recorded_at' => $tuesday->toISOString(),
        ])->assertStatus(201);

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
        $this->assertSame(0, Violation::where('violation_type', 'overspeeding')->count());
    }

    #[Test]
    public function a_ping_updates_the_drivers_live_position_in_the_same_request(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0);

        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.09, 'longitude' => 120.65, 'recorded_at' => $tuesday->toISOString(),
        ])->assertStatus(201);

        $driver = $this->driver->refresh();
        $this->assertEquals(14.09, $driver->current_lat);
        $this->assertEquals(120.65, $driver->current_lng);
    }

    /**
     * The shared TelemetryService (Phase 3) is explicitly designed to trust whatever tricycle_id
     * the caller resolves and passes in — it never re-derives ownership itself. That security
     * boundary lives entirely in the controller, which resolves the tricycle from the
     * authenticated driver's own operator and never reads a client-supplied identifier at all.
     * This proves a client cannot redirect its own ping onto an arbitrary other tricycle by
     * smuggling a tricycle_id into the request body.
     */
    #[Test]
    public function a_client_supplied_tricycle_id_in_the_request_body_is_ignored(): void
    {
        $otherOperatorUser = User::create([
            'name' => 'Other Operator', 'email' => 'other.operator.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);
        $otherOperator = Operator::create([
            'user_id' => $otherOperatorUser->id,
            'toda_id' => $this->tricycle->toda_zone_id,
            'first_name' => 'Other', 'last_name' => 'Operator',
            'contact_number' => '09170000099', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-OTHER-001', 'license_expiry_date' => '2028-01-01',
        ]);
        $otherTricycle = Tricycle::create([
            'operator_id' => $otherOperator->id, 'toda_zone_id' => $this->tricycle->toda_zone_id,
            'plate_number' => 'OTH-0001', 'engine_number' => 'ENG-OTH-001', 'chassis_number' => 'CHS-OTH-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-OTH-001', 'cr_number' => 'CR-OTH-001', 'status' => 'active',
        ]);

        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(9, 0);

        $this->postJson('/api/v1/driver/telematics', [
            'tricycle_id' => $otherTricycle->id,
            'latitude'    => 14.10, 'longitude' => 120.66,
            'recorded_at' => $tuesday->toISOString(),
        ])->assertStatus(201);

        $this->assertSame(1, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $otherTricycle->id)->count());
    }
}
