<?php

namespace Tests\Feature;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers Tricycle::gpsStatus() — the real-telemetry-only status TMO's Final Confirmation page now
 * shows instead of the hardcoded fake GPS seed that used to make every freshly-activated tricycle
 * look "connected" regardless of whether anything had actually reported a location.
 */
class TricycleGpsStatusTest extends TestCase
{
    use DatabaseTransactions;

    protected Tricycle $tricycle;

    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-GPSSTATUS-TEST'],
            ['name' => 'GPS Status Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $operator = Operator::create([
            'toda_id' => $toda->id,
            'first_name' => 'Status', 'last_name' => 'Tester',
            'contact_number' => '09170000040', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-STATUS-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'GPS-0001', 'engine_number' => 'ENG-GPS-001', 'chassis_number' => 'CHS-GPS-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-GPS-001', 'cr_number' => 'CR-GPS-001', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);
    }

    #[Test]
    public function a_tricycle_with_no_pings_is_awaiting_first_signal(): void
    {
        $status = $this->tricycle->gpsStatus();

        $this->assertSame('awaiting', $status['status']);
        $this->assertNull($status['last_seen_at']);
    }

    #[Test]
    public function a_tricycle_with_a_fresh_ping_is_connected(): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.07, 'longitude' => 120.63,
            'speed_kmh' => 10, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app', 'recorded_at' => now(),
        ]);

        $status = $this->tricycle->gpsStatus();

        $this->assertSame('connected', $status['status']);
        $this->assertNotNull($status['last_seen_at']);
    }

    #[Test]
    public function a_tricycle_whose_last_ping_is_older_than_the_staleness_threshold_is_stale(): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.07, 'longitude' => 120.63,
            'speed_kmh' => 10, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => now()->subSeconds(config('tracking.staleness_seconds') + 60),
        ]);

        $status = $this->tricycle->gpsStatus();

        $this->assertSame('stale', $status['status']);
    }

    #[Test]
    public function gps_status_reflects_only_the_most_recent_ping(): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.07, 'longitude' => 120.63,
            'speed_kmh' => 10, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => now()->subSeconds(config('tracking.staleness_seconds') + 60),
        ]);
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.08, 'longitude' => 120.64,
            'speed_kmh' => 12, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app', 'recorded_at' => now(),
        ]);

        $status = $this->tricycle->fresh()->gpsStatus();

        $this->assertSame('connected', $status['status']);
    }
}
