<?php

namespace Tests\Feature;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the operator Live Tracking payload (routes/web.php /operator/tracking): the unit's
 * assigned TODA zone name is returned for the "Current Zone" stat (it used to be consumed by the
 * frontend but never provided), and the is_recent_ping freshness flag uses the configured Live
 * Monitoring no-signal threshold (fleet_signal_lost_seconds) instead of a hardcoded window.
 */
class OperatorLiveTrackingPayloadTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected TodaZone $toda;
    protected Tricycle $tricycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-LIVE-TRACK-TEST'],
            ['name' => 'Live Tracking Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $this->driverUser = User::create([
            'name' => 'Live Tracking Driver', 'email' => 'live.tracking.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id' => $this->driverUser->id, 'toda_id' => $this->toda->id,
            'first_name' => 'Live', 'last_name' => 'Tracking', 'contact_number' => '09170000062',
            'address' => 'Poblacion', 'barangay' => 'Poblacion', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-LIVE-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $this->toda->id,
            'plate_number' => 'LIV-0001', 'engine_number' => 'ENG-LIV-001', 'chassis_number' => 'CHS-LIV-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2022, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-LIV-001', 'cr_number' => 'CR-LIV-001', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);
    }

    private function ping(int $secondsAgo): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.07, 'longitude' => 120.63,
            'speed_kmh' => 10, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => now()->subSeconds($secondsAgo),
        ]);
    }

    #[Test]
    public function the_tracking_payload_includes_the_units_assigned_toda_zone_name(): void
    {
        $response = $this->actingAs($this->driverUser)->get(route('operator.tracking'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Operator/LiveTracking')
            ->where('tricycle.isFinalized', true)
            ->where('tricycle.zone', $this->toda->name)
        );
    }

    #[Test]
    public function is_recent_ping_uses_the_configured_fleet_signal_lost_threshold(): void
    {
        $threshold = (int) config('tracking.fleet_signal_lost_seconds', 60);

        $this->ping($threshold + 5);
        $this->actingAs($this->driverUser)->get(route('operator.tracking'))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('Operator/LiveTracking')
                ->where('tricycle.is_recent_ping', false)
            );

        $this->ping($threshold - 5);
        $this->actingAs($this->driverUser)->get(route('operator.tracking'))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('Operator/LiveTracking')
                ->where('tricycle.is_recent_ping', true)
            );
    }
}