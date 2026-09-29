<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * QR Ride / Walk-in Ride — Phase 1 data foundation only: ride_sessions, the new bookings /
 * tricycles columns, the QR token backfill, and the model relationships. No QR workflow here.
 */
class QrRideFoundationTest extends TestCase
{
    use DatabaseTransactions;

    private function makeTricycle(array $overrides = []): Tricycle
    {
        $suffix = substr(uniqid(), -8) . rand(10, 99);
        $operator = Operator::create([
            'first_name' => 'Qr', 'last_name' => 'Foundation ' . $suffix,
            'contact_number' => '0917' . rand(1000000, 9999999),
            'address' => 'Nasugbu', 'barangay' => 'Brgy 8', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-QRF-' . $suffix, 'license_expiry_date' => '2028-01-01',
        ]);

        return Tricycle::create(array_merge([
            'operator_id' => $operator->id,
            'plate_number' => 'QRF-' . $suffix,
            'engine_number' => 'ENG-QRF-' . $suffix,
            'chassis_number' => 'CHS-QRF-' . $suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'status' => 'active',
        ], $overrides));
    }

    private function makeDriver(Tricycle $tricycle): Driver
    {
        $user = User::create([
            'name' => 'QR Foundation Driver',
            'email' => 'qrf.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);

        return Driver::create([
            'user_id' => $user->id,
            'operator_id' => $tricycle->operator_id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-QRF-DRV-' . uniqid(),
        ]);
    }

    private function makePassenger(): Passenger
    {
        $user = User::create([
            'name' => 'QR Foundation Passenger',
            'email' => 'qrf.passenger.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);

        return Passenger::create(['user_id' => $user->id, 'mobile_number' => '0918' . rand(1000000, 9999999)]);
    }

    private function makeSession(Tricycle $tricycle, Driver $driver): RideSession
    {
        return RideSession::create([
            'session_code' => 'RS-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6)),
            'tricycle_id' => $tricycle->id,
            'driver_id' => $driver->id,
            'status' => RideSession::STATUS_BOARDING,
        ]);
    }

    private function bookingAttributes(Passenger $passenger, array $overrides = []): array
    {
        return array_merge([
            'booking_code' => 'BK-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6)),
            'passenger_id' => $passenger->id,
            'pickup_name' => 'Nasugbu Public Market', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Nasugbu Town Plaza', 'dropoff_lat' => 14.0740, 'dropoff_lng' => 120.6350,
            'fare_amount' => 50.00,
            'distance_km' => 1.2,
            'status' => 'pending',
            'requested_at' => now(),
        ], $overrides);
    }

    #[Test]
    public function a_ride_session_belongs_to_its_tricycle_and_driver_and_has_many_bookings(): void
    {
        $tricycle = $this->makeTricycle();
        $driver = $this->makeDriver($tricycle);
        $session = $this->makeSession($tricycle, $driver);

        $this->assertDatabaseHas('ride_sessions', ['id' => $session->id, 'status' => 'boarding']);
        $this->assertTrue($session->fresh()->isOpen());
        $this->assertNull($session->fresh()->started_at);
        $this->assertTrue($session->tricycle->is($tricycle));
        $this->assertTrue($session->driver->is($driver));
        $this->assertTrue($tricycle->rideSessions()->first()->is($session));

        $a = Booking::create($this->bookingAttributes($this->makePassenger(), [
            'booking_type' => Booking::TYPE_QR_WALKIN, 'ride_session_id' => $session->id,
            'driver_id' => $driver->id, 'tricycle_id' => $tricycle->id, 'status' => 'accepted',
            'distance_source' => 'osrm',
        ]));
        $b = Booking::create($this->bookingAttributes($this->makePassenger(), [
            'booking_type' => Booking::TYPE_QR_WALKIN, 'ride_session_id' => $session->id,
            'driver_id' => $driver->id, 'tricycle_id' => $tricycle->id, 'status' => 'accepted',
            'distance_source' => 'fallback',
        ]));

        $this->assertEqualsCanonicalizing([$a->id, $b->id], $session->bookings()->pluck('id')->all());
        $this->assertTrue($a->rideSession->is($session));
        $this->assertSame('qr_walkin', $a->fresh()->booking_type);
        $this->assertSame('fallback', $b->fresh()->distance_source);
    }

    #[Test]
    public function open_scope_covers_only_boarding_and_in_progress(): void
    {
        $tricycle = $this->makeTricycle();
        $driver = $this->makeDriver($tricycle);
        $boarding = $this->makeSession($tricycle, $driver);
        $inProgress = $this->makeSession($tricycle, $driver);
        $inProgress->update(['status' => RideSession::STATUS_IN_PROGRESS, 'started_at' => now(), 'capacity_at_start' => 4]);
        $completed = $this->makeSession($tricycle, $driver);
        $completed->update([
            'status' => RideSession::STATUS_COMPLETED, 'ended_at' => now(),
            'end_reason' => RideSession::END_REASON_ALL_DROPPED, 'ended_by' => RideSession::ENDED_BY_SYSTEM,
        ]);

        $this->assertEqualsCanonicalizing(
            [$boarding->id, $inProgress->id],
            $tricycle->rideSessions()->open()->pluck('id')->all()
        );
        $this->assertSame(4, $inProgress->fresh()->capacity_at_start);
        $this->assertSame('all_dropped', $completed->fresh()->end_reason);
    }

    #[Test]
    public function a_normal_booking_defaults_to_type_booking_with_no_session_or_drop_off_position(): void
    {
        $booking = Booking::create($this->bookingAttributes($this->makePassenger()));
        $fresh = $booking->fresh();

        $this->assertSame(Booking::TYPE_BOOKING, $fresh->booking_type);
        $this->assertNull($fresh->ride_session_id);
        $this->assertNull($fresh->rideSession);
        $this->assertNull($fresh->distance_source);
        $this->assertNull($fresh->dropped_off_lat);
        $this->assertNull($fresh->dropped_off_lng);
        $this->assertSame('searching', $fresh->dispatch_state, 'existing appended attribute still works');
    }

    #[Test]
    public function drop_off_coordinates_keep_booking_coordinate_precision(): void
    {
        $booking = Booking::create($this->bookingAttributes($this->makePassenger(), [
            'dropped_off_lat' => 14.07412345, 'dropped_off_lng' => 120.63512345,
        ]));

        $this->assertSame(14.07412345, $booking->fresh()->dropped_off_lat);
        $this->assertSame(120.63512345, $booking->fresh()->dropped_off_lng);
    }

    #[Test]
    public function deleting_a_ride_session_never_deletes_its_bookings(): void
    {
        $tricycle = $this->makeTricycle();
        $session = $this->makeSession($tricycle, $this->makeDriver($tricycle));
        $booking = Booking::create($this->bookingAttributes($this->makePassenger(), [
            'booking_type' => Booking::TYPE_QR_WALKIN, 'ride_session_id' => $session->id,
        ]));

        $session->delete();

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'ride_session_id' => null, 'booking_type' => 'qr_walkin']);
    }

    #[Test]
    public function new_tricycles_get_a_random_unique_qr_token_that_is_not_serialized(): void
    {
        $a = $this->makeTricycle();
        $b = $this->makeTricycle();

        $this->assertSame(40, strlen($a->qr_token));
        $this->assertNotSame($a->qr_token, $b->qr_token);
        $this->assertArrayNotHasKey('qr_token', $a->toArray(), 'the token never rides along in booking/dashboard JSON');

        $explicit = $this->makeTricycle(['qr_token' => str_repeat('k', 40)]);
        $this->assertSame(str_repeat('k', 40), $explicit->fresh()->qr_token, 'a supplied token is kept');
    }

    #[Test]
    public function qr_token_is_unique_at_the_database_level(): void
    {
        $a = $this->makeTricycle();
        $b = $this->makeTricycle();

        $this->expectException(QueryException::class);
        DB::table('tricycles')->where('id', $b->id)->update(['qr_token' => $a->qr_token]);
    }

    #[Test]
    public function backfill_fills_only_null_tokens_and_touches_nothing_else(): void
    {
        $missing = $this->makeTricycle();
        $existing = $this->makeTricycle();
        DB::table('tricycles')->where('id', $missing->id)->update(['qr_token' => null]);
        $before = DB::table('tricycles')->whereIn('id', [$missing->id, $existing->id])->orderBy('id')->get()->keyBy('id');

        // Re-running the migration on an already-migrated schema only runs the NULL-token backfill.
        (require database_path('migrations/2026_09_28_000003_add_qr_token_and_passenger_capacity_to_tricycles_table.php'))->up();

        $after = DB::table('tricycles')->whereIn('id', [$missing->id, $existing->id])->orderBy('id')->get()->keyBy('id');

        $this->assertSame(40, strlen($after[$missing->id]->qr_token));
        $this->assertSame($before[$existing->id]->qr_token, $after[$existing->id]->qr_token, 'an existing token is never replaced');
        $this->assertNotSame($after[$missing->id]->qr_token, $after[$existing->id]->qr_token);
        foreach ([$missing->id, $existing->id] as $id) {
            $b = (array) $before[$id];
            $a = (array) $after[$id];
            unset($b['qr_token'], $a['qr_token']);
            $this->assertSame($b, $a, 'no other tricycle column (including updated_at) changes');
        }
        $this->assertSame(0, DB::table('tricycles')->whereNull('qr_token')->count());
    }

    #[Test]
    public function passenger_capacity_is_nullable_and_stores_integers(): void
    {
        $unset = $this->makeTricycle();
        $this->assertNull($unset->fresh()->passenger_capacity, 'no capacity is invented');

        $set = $this->makeTricycle(['passenger_capacity' => 4]);
        $this->assertSame(4, $set->fresh()->passenger_capacity);

        $set->update(['passenger_capacity' => null]);
        $this->assertNull($set->fresh()->passenger_capacity);
    }

    #[Test]
    public function the_booking_status_enum_is_unchanged(): void
    {
        $column = DB::selectOne("SHOW COLUMNS FROM bookings LIKE 'status'");

        $this->assertSame("enum('pending','accepted','arrived','in_transit','completed','cancelled')", $column->Type);
        $this->assertSame('pending', $column->Default);
    }
}
