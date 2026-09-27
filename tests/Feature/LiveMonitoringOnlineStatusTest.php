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
 *   drivers.is_online = false (Offline toggle or logout) -> Offline immediately, whatever the GPS age;
 *   drivers.is_online = true -> GPS freshness is separate from Online/Offline:
 *     age <= 10s (fleet_online_threshold_seconds) -> Online + gps_freshness 'fresh'
 *     age <= 60s (fleet_signal_lost_seconds)      -> Online + gps_freshness 'delayed'
 *     older                                       -> Offline / Signal Lost ('stale')
 */
class LiveMonitoringOnlineStatusTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected Tricycle $tricycle;
    protected Driver $driver;
    protected User $driverUser;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-09-28 10:00:00'));

        $this->tmoUser = User::create([
            'name' => 'TMO Live Officer', 'email' => 'tmo.live.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
        $driverUser = $this->driverUser = User::create([
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
    public function the_thresholds_are_10s_fresh_60s_signal_lost_and_the_reporting_interval_is_5(): void
    {
        $this->assertSame(10, config('tracking.fleet_online_threshold_seconds'));
        $this->assertSame(60, config('tracking.fleet_signal_lost_seconds'));
        $this->assertSame(5, config('tracking.gps_interval_seconds'));
    }

    #[Test]
    public function offline_driver_with_gps_5_seconds_old_is_offline_immediately(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(5);

        $unit = $this->unit();
        $this->assertFalse($unit['is_online']);
        $this->assertSame('offline', $unit['status']);
        // Explicit Offline is plain Offline, not a GPS signal problem.
        $this->assertNull($unit['gps_freshness']);
    }

    #[Test]
    public function offline_driver_with_gps_1_second_old_is_offline_immediately(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(1);

        $this->assertFalse($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_0_seconds_old_is_online(): void
    {
        $this->ping(0);
        $this->assertTrue($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_5_seconds_old_is_online(): void
    {
        $this->ping(5);
        $this->assertTrue($this->unit()['is_online']);
    }

    #[Test]
    public function online_driver_with_gps_exactly_10_seconds_old_is_online_and_fresh(): void
    {
        $this->ping(10);
        $unit = $this->unit();
        $this->assertTrue($unit['is_online']);
        $this->assertSame('fresh', $unit['gps_freshness']);
    }

    #[Test]
    public function online_driver_with_gps_11_seconds_old_stays_online_with_gps_delayed(): void
    {
        $this->ping(11);

        $unit = $this->unit();
        $this->assertTrue($unit['is_online'], 'One late coordinate must not flip an Online driver to Offline.');
        $this->assertSame('delayed', $unit['gps_freshness']);
        $this->assertNotSame('offline', $unit['status']);
    }

    #[Test]
    public function online_driver_with_gps_exactly_60_seconds_old_is_still_online_delayed(): void
    {
        $this->ping(60);
        $unit = $this->unit();
        $this->assertTrue($unit['is_online']);
        $this->assertSame('delayed', $unit['gps_freshness']);
    }

    #[Test]
    public function online_driver_with_gps_older_than_60_seconds_is_offline_signal_lost(): void
    {
        $this->ping(61);

        $unit = $this->unit();
        $this->assertFalse($unit['is_online']);
        $this->assertSame('offline', $unit['status']);
        $this->assertSame('stale', $unit['gps_freshness']);
        // The stale marker is still shown at its last known position, not dropped from the map.
        $this->assertEqualsWithDelta(14.0712, $unit['lat'], 0.0001);
    }

    #[Test]
    public function logout_sets_the_driver_offline_immediately_despite_fresh_gps(): void
    {
        $this->ping(0);
        $this->assertTrue($this->unit()['is_online']);

        // Drop the TMO web session used by unit() so the API call authenticates by the driver's
        // real Sanctum token (the mobile app's path), not the session user.
        $this->app['auth']->forgetGuards();
        $token = $this->driverUser->createToken('test-driver')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/driver/logout')
            ->assertOk();

        $this->driver->refresh();
        $this->assertFalse($this->driver->is_online);
        $this->assertNull($this->driver->online_since);
        $this->assertFalse($this->driver->is_available);

        $unit = $this->unit();
        $this->assertFalse($unit['is_online'], 'Logout is an explicit Offline — no GPS timeout.');
        $this->assertNull($unit['gps_freshness']);
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

    #[Test]
    public function pings_every_5_seconds_are_fresh_then_delayed_then_signal_lost(): void
    {
        // GPS at 12:00:00, 12:00:05, 12:00:10, then nothing (clock frozen in setUp at 10:00:00,
        // so pings are placed relative to "now" and time is advanced after the last one).
        $this->ping(10);
        $this->ping(5);
        $this->ping(0);

        Carbon::setTestNow(now()->addSeconds(10));
        $this->assertSame('fresh', $this->unit()['gps_freshness'], 'Latest GPS exactly 10s old: Fresh.');

        Carbon::setTestNow(now()->addSeconds(1));
        $unit = $this->unit();
        $this->assertTrue($unit['is_online'], 'Latest GPS 11s old: still Online.');
        $this->assertSame('delayed', $unit['gps_freshness']);

        Carbon::setTestNow(now()->addSeconds(50));
        $unit = $this->unit();
        $this->assertFalse($unit['is_online'], 'Latest GPS 61s old: Offline / Signal Lost.');
        $this->assertSame('stale', $unit['gps_freshness']);
    }
}
