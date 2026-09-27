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
 * TMO Live Monitoring status (DashboardController::index(), connection_status):
 *   drivers.is_online = false (Offline toggle or logout) -> 'offline', whatever the GPS age;
 *   drivers.is_online = true, latest GPS <= 60s old (fleet_signal_lost_seconds) -> 'online';
 *   drivers.is_online = true, latest GPS  > 60s old                            -> 'no_signal';
 *   a unit with no GPS history is not listed at all.
 * Plus the shared relative "Last update" label (last_update_label) from the real recorded_at.
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

    private function assertStatus(string $expected, string $message = ''): array
    {
        $unit = $this->unit();
        $this->assertNotNull($unit, 'unit must be listed');
        $this->assertSame($expected, $unit['connection_status'], $message);
        $this->assertSame($expected === 'online', $unit['is_online'], $message);
        return $unit;
    }

    #[Test]
    public function the_no_signal_threshold_is_60s_and_the_reporting_interval_is_5(): void
    {
        $this->assertSame(60, config('tracking.fleet_signal_lost_seconds'));
        $this->assertSame(5, config('tracking.gps_interval_seconds'));
        $this->assertNull(config('tracking.fleet_online_threshold_seconds'), 'the old 10s freshness key is removed');
    }

    #[Test]
    public function unit_with_no_gps_history_is_excluded(): void
    {
        $this->assertNull($this->unit(), 'Never sent GPS: not listed, never a fake position.');
        $this->driver->update(['is_online' => false]);
        $this->assertNull($this->unit());
    }

    #[Test]
    public function online_with_gps_5_seconds_old_is_online(): void
    {
        $this->ping(5);
        $unit = $this->assertStatus('online');
        $this->assertNotSame('offline', $unit['status']);
    }

    #[Test]
    public function online_with_gps_59_seconds_old_is_online(): void
    {
        $this->ping(59);
        $this->assertStatus('online');
    }

    #[Test]
    public function online_with_gps_exactly_60_seconds_old_is_online(): void
    {
        $this->ping(60);
        $this->assertStatus('online');
    }

    #[Test]
    public function online_with_gps_61_seconds_old_is_no_signal(): void
    {
        $this->ping(61);
        $unit = $this->assertStatus('no_signal');
        // Keeps its last real position (not dropped, not moved).
        $this->assertEqualsWithDelta(14.0712, $unit['lat'], 0.0001);
        $this->assertEqualsWithDelta(120.6312, $unit['lng'], 0.0001);
    }

    #[Test]
    public function online_with_gps_5_minutes_old_is_no_signal(): void
    {
        $this->ping(300);
        $this->assertStatus('no_signal');
    }

    #[Test]
    public function offline_with_fresh_gps_is_offline(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(5);
        $unit = $this->assertStatus('offline');
        $this->assertSame('offline', $unit['status']);
    }

    #[Test]
    public function offline_with_stale_gps_is_offline(): void
    {
        $this->driver->update(['is_online' => false]);
        $this->ping(300);
        $this->assertStatus('offline', 'Explicit Offline is Offline, never No Signal.');
    }

    #[Test]
    public function logout_sets_the_driver_offline_immediately_despite_fresh_gps(): void
    {
        $this->ping(0);
        $this->assertStatus('online');

        // Drop the TMO web session used by unit() so the API call authenticates by the driver's
        // real Sanctum token (the mobile app's path), not the session user.
        $this->app['auth']->forgetGuards();
        $token = $this->driverUser->createToken('test-driver')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/driver/logout')
            ->assertOk();

        $this->driver->refresh();
        $this->assertFalse($this->driver->is_online);
        $this->assertStatus('offline', 'Logout is an explicit Offline — no GPS timeout.');
    }

    #[Test]
    public function status_follows_gps_age_and_the_toggle_over_time(): void
    {
        $this->ping(0);
        $this->assertStatus('online');

        Carbon::setTestNow(now()->addSeconds(60));
        $this->assertStatus('online', 'Latest GPS exactly 60s old: Online.');

        Carbon::setTestNow(now()->addSeconds(1));
        $this->assertStatus('no_signal', 'Latest GPS 61s old: No Signal.');

        $this->ping(0); // a new real GPS record arrives
        $this->assertStatus('online');

        $this->driver->update(['is_online' => false]);
        $this->assertStatus('offline');

        $this->driver->update(['is_online' => true]);
        $this->assertStatus('online');
    }

    #[Test]
    public function last_update_label_is_relative_to_the_latest_real_recorded_at(): void
    {
        // Clock frozen at 2026-09-28 10:00:00 (app timezone) in setUp.
        $cases = [
            [5, '5 secs ago'],
            [1, '1 sec ago'],
            [32, '32 secs ago'],
            [60, '1 min ago'],
            [300, '5 mins ago'],
            [3600, '1 hr ago'],
            [7200, '2 hrs ago'],
            [11 * 3600, 'Yesterday'],       // 2026-09-27 23:00
            [3 * 86400, '3 days ago'],
            [20 * 86400, 'Sep 8'],
        ];
        foreach ($cases as [$secondsAgo, $expected]) {
            TricycleLocation::where('tricycle_id', $this->tricycle->id)->delete();
            $this->ping($secondsAgo + 30); // an older record must never be the one shown
            $this->ping($secondsAgo);

            $unit = $this->unit();
            $this->assertSame($expected, $unit['last_update_label'], "{$secondsAgo}s ago");
            $this->assertSame(now()->subSeconds($secondsAgo)->toIso8601String(), $unit['recorded_at']);
        }
    }

    #[Test]
    public function each_unit_gets_the_label_and_status_of_its_own_latest_gps_record(): void
    {
        $other = Tricycle::create([
            'operator_id' => $this->tricycle->operator_id, 'coding_scheme_number' => '0006',
            'plate_number' => 'LIV-0006', 'engine_number' => 'ENG-LIV-006', 'chassis_number' => 'CHS-LIV-006',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-LIV-006', 'cr_number' => 'CR-LIV-006', 'status' => 'active',
        ]);
        $this->ping(5);
        TricycleLocation::create([
            'tricycle_id' => $other->id, 'latitude' => 14.07, 'longitude' => 120.63,
            'speed_kmh' => 0, 'heading_deg' => 0, 'accuracy_m' => 5, 'source' => 'mobile_app',
            'recorded_at' => now()->subSeconds(120),
        ]);

        $units = null;
        $this->actingAs($this->tmoUser)->get(route('tmo.live'))->assertOk()
            ->assertInertia(function ($page) use (&$units) {
                $page->where('initialTricycles', function ($t) use (&$units) {
                    $units = collect($t);
                    return true;
                });
            });

        $this->assertSame('5 secs ago', $units->firstWhere('plate', 'LIV-0005')['last_update_label']);
        $this->assertSame('online', $units->firstWhere('plate', 'LIV-0005')['connection_status']);
        // No Driver row for LIV-0006: judged by GPS age alone -> 120s old = No Signal.
        $this->assertSame('2 mins ago', $units->firstWhere('plate', 'LIV-0006')['last_update_label']);
        $this->assertSame('no_signal', $units->firstWhere('plate', 'LIV-0006')['connection_status']);
    }
}
