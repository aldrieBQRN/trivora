<?php

namespace Tests\Feature;

use App\Console\Commands\AutoOfflineStaleDriversCommand;
use App\Models\Booking;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Services\BookingDispatchService;
use App\Services\TelemetryService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DriverOnlineTelemetryTimeoutTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected User $passengerUser;
    protected Passenger $passenger;
    protected User $driverUser;
    protected Operator $operator;
    protected Tricycle $tricycle;
    protected Driver $driver;
    protected FranchiseScheme $franchiseScheme;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-09-28 10:00:00')); // Monday

        $this->tmoUser = User::create([
            'name' => 'TMO Monitor',
            'email' => 'tmo.timeout.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->passengerUser = User::create([
            'name' => 'Test Passenger',
            'email' => 'passenger.timeout.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
            'is_active' => true,
        ]);

        $this->passenger = Passenger::create([
            'user_id' => $this->passengerUser->id,
            'mobile_number' => '0917' . rand(1000000, 9999999),
        ]);

        $this->driverUser = User::create([
            'name' => 'Timeout Driver',
            'email' => 'driver.timeout.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'first_name' => 'Timeout',
            'last_name' => 'Driver',
            'contact_number' => '09170000099',
            'address' => 'Poblacion',
            'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TO-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Red Test'],
            [
                'color_hex' => '#EF4444',
                'restricted_days' => ['Monday'],
                'restricted_digits' => [1, 2],
                'is_active' => true,
            ]
        );

        $this->tricycle = Tricycle::create([
            'operator_id' => $this->operator->id,
            'coding_scheme_number' => '0001', // ends in 1 -> restricted on Monday
            'plate_number' => 'TO-0001',
            'engine_number' => 'ENG-TO-001',
            'chassis_number' => 'CHS-TO-001',
            'make' => 'Honda',
            'model' => 'TMX',
            'year_model' => 2021,
            'body_color' => 'Red',
            'body_type' => 'Standard',
            'or_number' => 'OR-TO-001',
            'cr_number' => 'CR-TO-001',
            'status' => 'active',
        ]);

        $this->franchiseScheme = FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $this->tmoUser->id,
            'franchise_number' => 'FRAN-TO-' . uniqid(),
            'issue_date' => '2024-01-01',
            'expiry_date' => '2029-01-01',
            'scheme_code' => 'RED-TO-001',
            'status' => FranchiseScheme::STATUS_ACTIVE,
            'is_active' => true,
        ]);

        $this->driver = Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-TO-001',
            'mobile_number' => '09170000099',
            'is_online' => true,
            'is_available' => true,
            'online_since' => now(),
            'current_lat' => 14.0712,
            'current_lng' => 120.6312,
            'last_location_updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function ping(int $secondsAgo): void
    {
        $time = now()->subSeconds($secondsAgo);

        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.0712,
            'longitude' => 120.6312,
            'speed_kmh' => 0,
            'heading_deg' => 0,
            'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => $time,
        ]);

        $this->driver->update([
            'last_location_updated_at' => $time,
        ]);
    }

    private function getTmoUnit(): ?array
    {
        $unit = null;
        $this->actingAs($this->tmoUser)->get(route('tmo.live'))->assertOk()
            ->assertInertia(function ($page) use (&$unit) {
                $page->where('initialTricycles', function ($tricycles) use (&$unit) {
                    $unit = collect($tricycles)->firstWhere('plate', 'TO-0001');
                    return true;
                });
            });

        return $unit;
    }

    // =========================================================================
    // A. EFFECTIVE-ONLINE PROTECTION
    // =========================================================================

    #[Test]
    public function test_a_effective_online_guard_blocks_dispatch_when_telemetry_is_11_minutes_old_without_scheduler(): void
    {
        // Setup: is_online = true, but last_location_updated_at is 11 minutes old.
        // Scheduler has NOT run.
        $this->driver->update([
            'is_online' => true,
            'is_available' => true,
            'last_location_updated_at' => now()->subMinutes(11),
        ]);

        // In DB, is_online is still true (scheduler hasn't persisted offline yet)
        $this->assertTrue($this->driver->fresh()->is_online);

        // Effective online check must report false
        $this->assertFalse($this->driver->isEffectivelyOnline());

        // Scope effectivelyOnline must exclude this driver
        $this->assertFalse(Driver::effectivelyOnline()->where('id', $this->driver->id)->exists());

        $booking = Booking::create([
            'booking_code' => 'BK-' . uniqid(),
            'passenger_id' => $this->passenger->id,
            'pickup_lat' => 14.0710,
            'pickup_lng' => 120.6310,
            'pickup_name' => 'Test Pickup',
            'dropoff_lat' => 14.0750,
            'dropoff_lng' => 120.6350,
            'dropoff_name' => 'Test Dropoff',
            'fare_amount' => 50.00,
            'status' => 'pending',
            'booking_type' => Booking::TYPE_BOOKING,
            'payment_method' => Booking::PAYMENT_METHOD_CASH,
        ]);

        $eligibleDrivers = BookingDispatchService::getEligibleDrivers($booking);
        $this->assertFalse($eligibleDrivers->contains('id', $this->driver->id));

        // When the driver polls pending requests, effective online guard blocks them
        $token = $this->driverUser->createToken('driver-test')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/driver/bookings/pending');

        $response->assertOk();
        $this->assertEmpty($response->json('data'));
    }

    // =========================================================================
    // B. PERSISTENT AUTO-OFFLINE
    // =========================================================================

    #[Test]
    public function test_b_persistent_auto_offline_command_clears_online_state_for_stale_drivers(): void
    {
        // Stale driver: reaches 10 minutes (10 mins + 5 seconds)
        $this->driver->update([
            'is_online' => true,
            'is_available' => true,
            'online_since' => now()->subMinutes(15),
            'last_location_updated_at' => now()->subSeconds(605),
        ]);

        // Fresh driver: active 30s ago
        $freshDriverUser = User::create([
            'name' => 'Fresh Driver',
            'email' => 'driver.fresh.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        $freshDriver = Driver::create([
            'user_id' => $freshDriverUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-FRESH-001',
            'mobile_number' => '09170000088',
            'is_online' => true,
            'is_available' => true,
            'online_since' => now()->subMinutes(5),
            'last_location_updated_at' => now()->subSeconds(30),
        ]);

        // Run scheduled command: drivers:auto-offline-stale
        $this->artisan('drivers:auto-offline-stale')
            ->assertSuccessful();

        // Stale driver must have all online fields reset
        $this->driver->refresh();
        $this->assertFalse($this->driver->is_online);
        $this->assertFalse($this->driver->is_available);
        $this->assertNull($this->driver->online_since);

        // Fresh driver must remain untouched
        $freshDriver->refresh();
        $this->assertTrue($freshDriver->is_online);
        $this->assertTrue($freshDriver->is_available);
        $this->assertNotNull($freshDriver->online_since);
    }

    // =========================================================================
    // C. BOUNDARY TESTS
    // =========================================================================

    #[Test]
    public function test_c_boundary_59_seconds_is_online(): void
    {
        $this->ping(59);

        $this->assertTrue($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('online', $unit['connection_status']);
    }

    #[Test]
    public function test_c_boundary_60_seconds_is_online(): void
    {
        $this->ping(60);

        $this->assertTrue($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('online', $unit['connection_status']);
    }

    #[Test]
    public function test_c_boundary_61_seconds_is_no_signal(): void
    {
        $this->ping(61);

        // Still within 600s, so operationally effectively online, but UI/TMO is No Signal
        $this->assertTrue($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('no_signal', $unit['connection_status']);
    }

    #[Test]
    public function test_c_boundary_599_seconds_is_no_signal(): void
    {
        $this->ping(599);

        $this->assertTrue($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('no_signal', $unit['connection_status']);
    }

    #[Test]
    public function test_c_boundary_600_seconds_is_offline(): void
    {
        $this->ping(600);

        // At exactly 600s, timeout is reached -> Offline
        $this->assertFalse($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('offline', $unit['connection_status']);
    }

    #[Test]
    public function test_c_boundary_601_seconds_is_offline(): void
    {
        $this->ping(601);

        $this->assertFalse($this->driver->isEffectivelyOnline());
        $unit = $this->getTmoUnit();
        $this->assertSame('offline', $unit['connection_status']);
    }

    // =========================================================================
    // D. NEW SESSION AFTER TIMEOUT
    // =========================================================================

    #[Test]
    public function test_d_new_session_after_timeout_resets_anchor_and_starts_fresh_movement_session(): void
    {
        $telemetryService = app(TelemetryService::class);

        // Initial session: Driver went online at 10:00:00
        $this->driver->update([
            'is_online' => true,
            'is_available' => true,
            'online_since' => Carbon::parse('2026-09-28 10:00:00'),
            'last_location_updated_at' => Carbon::parse('2026-09-28 10:00:05'),
        ]);

        // First GPS reading in old session (Anchor: 14.070000, 120.630000)
        $telemetryService->process([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.070000,
            'longitude' => 120.630000,
            'source' => 'mobile_app',
            'recorded_at' => Carbon::parse('2026-09-28 10:00:05'),
        ]);

        // Second GPS reading 150m away (lat 14.071500)
        $telemetryService->process([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.071500,
            'longitude' => 120.630000,
            'source' => 'mobile_app',
            'recorded_at' => Carbon::parse('2026-09-28 10:01:00'),
        ]);

        // Advance time by 15 minutes without any new telemetry
        Carbon::setTestNow(Carbon::parse('2026-09-28 10:16:00'));

        // Run auto-offline command
        $this->artisan('drivers:auto-offline-stale');

        $this->driver->refresh();
        $this->assertFalse($this->driver->is_online);
        $this->assertFalse($this->driver->is_available);
        $this->assertNull($this->driver->online_since);

        // Now driver manually goes Online again via API
        $token = $this->driverUser->createToken('driver-reconnect')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/driver/status', ['is_online' => true]);

        $response->assertOk();
        $this->driver->refresh();
        $this->assertTrue($this->driver->is_online);
        $this->assertNotNull($this->driver->online_since);
        $this->assertSame('2026-09-28 10:16:00', $this->driver->online_since->toDateTimeString());

        // First reading in NEW session: becomes the NEW anchor (at 14.080000, 120.640000)
        $newAnchorResult = $telemetryService->process([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.080000,
            'longitude' => 120.640000,
            'source' => 'mobile_app',
            'recorded_at' => Carbon::parse('2026-09-28 10:16:05'),
        ]);
        $this->assertFalse($newAnchorResult['violation']['flagged'], 'New anchor itself cannot be a violation');

        // Reading 30 meters from new anchor (lat 14.080270, lng 120.640000):
        // Note: From the old anchor (14.070000, 120.630000) it would be > 1.5 km away!
        // But relative to the NEW anchor (14.080000, 120.640000), it has only moved ~30 meters (< 100m threshold).
        $subsequentResult = $telemetryService->process([
            'tricycle_id' => $this->tricycle->id,
            'latitude' => 14.080270,
            'longitude' => 120.640000,
            'source' => 'mobile_app',
            'recorded_at' => Carbon::parse('2026-09-28 10:16:30'),
        ]);

        $this->assertFalse(
            $subsequentResult['violation']['flagged'],
            'Movement under 100m from NEW anchor does not flag violation, proving old session was cleared'
        );
    }
}
