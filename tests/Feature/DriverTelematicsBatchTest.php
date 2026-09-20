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
 * Covers DriverTelematicsController::batchStore() — offline-flush ingestion, which the driver
 * app's 1-slot pending-ping buffer uses to catch up after a dropped send. Confirms the
 * color-coding check runs once per distinct calendar date in the batch, not once per ping.
 */
class DriverTelematicsBatchTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Tricycle $tricycle;

    /** Tricycle body number ends in 2, which ColorCodingRuleService restricts on Mondays. */
    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-BATCH-TEST'],
            ['name' => 'Batch Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Batch Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Batch Driver', 'email' => 'batch.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $toda->id,
            'first_name' => 'Batch', 'last_name' => 'Driver',
            'contact_number' => '09170000030', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-BATCH-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0002',
            'plate_number' => 'BAT-0002', 'engine_number' => 'ENG-BAT-002', 'chassis_number' => 'CHS-BAT-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-BAT-002', 'cr_number' => 'CR-BAT-002', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer Batch', 'email' => 'bplo.batch.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-BAT-002',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function a_batch_spanning_two_restricted_mondays_creates_one_violation_per_date(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);

        $monday1 = Carbon::parse('next Monday')->setTime(9, 0);
        $monday2 = $monday1->copy()->addWeek();

        $response = $this->postJson('/api/v1/driver/telematics/batch', [
            'pings' => [
                ['latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $monday1->toISOString()],
                ['latitude' => 14.0701, 'longitude' => 120.6301, 'recorded_at' => $monday1->copy()->addMinutes(5)->toISOString()],
                ['latitude' => 14.0702, 'longitude' => 120.6302, 'recorded_at' => $monday2->toISOString()],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('processed_count', 3);

        // 3 pings inserted, but only 2 distinct restricted calendar dates -> exactly 2 violations,
        // never one per ping (the whole point of grouping by date before running the check).
        $this->assertSame(3, \App\Models\TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
        $this->assertSame(2, Violation::where('tricycle_id', $this->tricycle->id)->where('violation_type', 'color_coding')->count());
    }

    #[Test]
    public function batch_flush_updates_the_drivers_current_position_from_the_latest_ping(): void
    {
        $driver = Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $this->tricycle->operator_id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-BATCH-001',
            'is_online' => true, 'is_available' => true,
        ]);

        Sanctum::actingAs($this->driverUser, ['*']);

        $earlier = Carbon::parse('next Tuesday')->setTime(8, 0);
        $later = $earlier->copy()->addMinutes(10);

        $this->postJson('/api/v1/driver/telematics/batch', [
            'pings' => [
                ['latitude' => 14.01, 'longitude' => 120.01, 'recorded_at' => $earlier->toISOString()],
                ['latitude' => 14.02, 'longitude' => 120.02, 'recorded_at' => $later->toISOString()],
            ],
        ])->assertStatus(200);

        $driver->refresh();
        $this->assertEquals(14.02, $driver->current_lat);
        $this->assertEquals(120.02, $driver->current_lng);
    }

    #[Test]
    public function pings_in_a_batch_are_stamped_with_the_correct_gps_source(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $tuesday = Carbon::parse('next Tuesday')->setTime(8, 0);

        $this->postJson('/api/v1/driver/telematics/batch', [
            'pings' => [
                ['latitude' => 14.01, 'longitude' => 120.01, 'recorded_at' => $tuesday->toISOString()],
            ],
        ])->assertStatus(200);

        $location = \App\Models\TricycleLocation::where('tricycle_id', $this->tricycle->id)->first();
        $this->assertSame('mobile_app', $location->source);
    }
}
