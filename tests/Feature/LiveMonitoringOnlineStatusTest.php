<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * TMO Live Monitoring Online/Offline determination (DashboardController::index()):
 *   drivers.is_online = false -> Offline immediately (never waits for the GPS threshold);
 *   drivers.is_online = true  -> Online only while the latest GPS is <= fleet_online_threshold_seconds (20s).
 */
class LiveMonitoringOnlineStatusTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected Tricycle $tricycle;
    protected Driver $driver;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-09-28 10:00:00'));

        $this->tmoUser = User::create([
            'name' => 'TMO Live Officer', 'email' => 'tmo.live.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
        $driverUser = User::create([
            'name' => 'Live Driver', 'email' => 'live.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        $operator = Operator::create([
            'user_id' => $driverUser->id, 'first_name' => 'Live', 'last_name' => 'Driver',
            'contact_number' => '09170000081', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-LIVE-001', 'license_expiry_date' => '2028-01-01',
        ]);
        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'coding_scheme_number' => '0005',
            'plate_number' => 'LIV-0005', 'engine_number' => 'ENG-LIV-005', 'chassis_number' => 'CHS-LIV-005',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-LIV-005', 'cr_number' => 'CR-LIV-005', 'status' => 'active',
        ]);
        $this->driver = Driver::create([
            'user_id' => $driverUser->id, 'operator_id' => $operator->id, 'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-LIVE-001', 'mobile_number' => '09170000081',
            'is_online' => true, 'is_available' => true,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function ping(int $secondsAgo): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.0712, 'longitude' => 120.6312,
            'speed_kmh' => 0, 'heading_deg' => 0, 'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => now()->subSeconds($secondsAgo),
        ]);
    }

    private function unit(): ?array
    {
        $unit = null;
        $this->actingAs($this->tmoUser)->get(route('tmo.live'))->assertOk()
            ->assertInertia(function ($page) use (&$unit) {
                $page->where('initialTricycles', function ($tricycles) use (&$unit) {
                    $unit = $tricycles->firstWhere('plate', 'LIV-0005');
                    return true;
                });
            });

        return $unit;
    }

    #[Test]
    public function the_threshold_is_20_seconds_and_the_reporting_interval_stays_15(): void
    {
        $this->assertSame(20, config('tracking.fleet_online_threshold_seconds'));
        $this->assertSame(15, config('tracking.gps_interval_seconds'));
    }

    #[Test]
    public function offline_driver_with_gps_5_seconds_old_is_offline_immediately(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(5);

        $this->assertFalse($this->unit()['is_online']);
        $this->assertSame('offline', $this->unit()['status']);
    }

    #[Test]
    public function offline_driver_with_gps_1_second_old_is_offline_immediately(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(1);

        $this->assertFalse($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_10_seconds_old_is_online(): void
    {
        $this->ping(10);
        $this->assertTrue($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_15_seconds_old_is_online(): void
    {
        $this->ping(15);
        $this->assertTrue($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_exactly_20_seconds_old_is_still_online(): void
    {
        $this->ping(20);
        $this->assertTrue($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_older_than_20_seconds_is_offline_stale(): void
    {
        $this->ping(21);

        $unit = $this->unit();
        $this->assertFalse($unit['is_online']);
        $this->assertSame('offline', $unit['status']);
        // The stale marker is still shown at its last known position, not dropped from the map.
        $this->assertEqualsWithDelta(14.0712, $unit['lat'], 0.0001);
    }

    #[Test]
    public function online_driver_with_no_gps_history_is_not_shown_as_online(): void
    {
        $this->assertNull($this->unit(), 'A unit with no GPS history is absent from Live Monitoring, never Online.');
    }

    #[Test]
    public function going_offline_changes_live_monitoring_on_the_next_refresh_and_going_online_with_fresh_gps_restores_it(): void
    {
        $this->ping(5);
        $this->assertTrue($this->unit()['is_online']);

        $this->driver->update(['is_online' => false]);
        $this->assertFalse($this->unit()['is_online']);

        $this->driver->update(['is_online' => true]);
        $this->ping(0);
        $this->assertTrue($this->unit()['is_online']);
    }
}
