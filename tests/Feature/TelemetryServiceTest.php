<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use App\Services\TelemetryService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers App\Services\TelemetryService directly — the Phase 3 refactor that extracted
 * DriverTelematicsController's location/coding-check processing into a shared pipeline so mobile
 * GPS and a future ST-901L IoT receiver both funnel through exactly one implementation.
 * DriverTelematicsColorCodingTest/DriverTelematicsBatchTest already prove the mobile HTTP path is
 * unchanged after this refactor; this file exercises the service's own contract in isolation,
 * including the parts a future non-HTTP IoT caller would rely on (defensive validation with no
 * Laravel FormRequest involved, and 'gps_device' as an already-supported source).
 */
class TelemetryServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected Tricycle $tricycle;
    protected TelemetryService $service;

    /** Tricycle body number ends in 2, which ColorCodingRuleService restricts on Mondays. */
    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(TelemetryService::class);

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-TELEMSVC-TEST'],
            ['name' => 'Telemetry Service Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Telemetry Service Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $driverUser = User::create([
            'name' => 'Telemetry Service Driver', 'email' => 'telemsvc.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id' => $driverUser->id,
            'toda_id' => $toda->id,
            'first_name' => 'TelemSvc', 'last_name' => 'Driver',
            'contact_number' => '09170000040', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TELEMSVC-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0002',
            'plate_number' => 'TSV-0002', 'engine_number' => 'ENG-TSV-002', 'chassis_number' => 'CHS-TSV-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-TSV-002', 'cr_number' => 'CR-TSV-002', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer TelemSvc', 'email' => 'bplo.telemsvc.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-TSV-002',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function process_persists_a_location_and_runs_the_color_coding_check_for_normalized_telemetry(): void
    {
        $monday = Carbon::parse('next Monday')->setTime(9, 0);

        $result = $this->service->process([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.07,
            'longitude'   => 120.63,
            'speed_kmh'   => 15,
            'heading_deg' => 90,
            'accuracy_m'  => 5,
            'source'      => 'mobile_app',
            'recorded_at' => $monday,
        ]);

        $this->assertInstanceOf(TricycleLocation::class, $result['location']);
        $this->assertTrue($result['violation']['flagged']);
        $this->assertSame('color_coding', $result['violation']['type']);
        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function recordlocation_accepts_gps_device_as_a_supported_source(): void
    {
        $location = $this->service->recordLocation([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.08,
            'longitude'   => 120.64,
            'source'      => 'gps_device',
            'recorded_at' => now(),
        ]);

        $this->assertSame('gps_device', $location->source);
        $this->assertSame($this->tricycle->id, $location->tricycle_id);
    }

    #[Test]
    public function recordlocation_needs_nothing_st901l_specific_the_documented_normalized_shape_is_enough(): void
    {
        // Exactly the shape a future IoT receiver's normalized telemetry would carry, per the
        // Phase 3 contract — no device/packet/protocol fields anywhere.
        $location = $this->service->recordLocation([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.09,
            'longitude'   => 120.65,
            'speed_kmh'   => null,
            'heading_deg' => null,
            'accuracy_m'  => null,
            'source'      => 'gps_device',
            'recorded_at' => now(),
        ]);

        $this->assertNotNull($location->id);
        // Nullable fields fall back to the same defaults the mobile path has always used.
        $this->assertEquals(0, (float) $location->speed_kmh);
        $this->assertEquals(0, $location->heading_deg);
        $this->assertEquals(5.0, (float) $location->accuracy_m);
    }

    #[Test]
    public function invalid_coordinates_are_rejected_and_never_create_a_location(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        try {
            $this->service->recordLocation([
                'tricycle_id' => $this->tricycle->id,
                'latitude'    => 999, // out of range
                'longitude'   => 120.63,
                'source'      => 'mobile_app',
                'recorded_at' => now(),
            ]);
        } finally {
            $this->assertSame(0, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
        }
    }

    #[Test]
    public function invalid_speed_is_rejected_and_never_creates_a_location(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        try {
            $this->service->recordLocation([
                'tricycle_id' => $this->tricycle->id,
                'latitude'    => 14.07,
                'longitude'   => 120.63,
                'speed_kmh'   => -5, // negative speed is impossible
                'source'      => 'mobile_app',
                'recorded_at' => now(),
            ]);
        } finally {
            $this->assertSame(0, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
        }
    }

    #[Test]
    public function an_unsupported_source_value_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->service->recordLocation([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.07,
            'longitude'   => 120.63,
            'source'      => 'not_a_real_source',
            'recorded_at' => now(),
        ]);
    }
}
