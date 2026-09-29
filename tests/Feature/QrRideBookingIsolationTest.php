<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Services\BookingDispatchService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * QR walk-in trips must never leak into the normal "Book a Tricycle" flow, and a driver / passenger
 * can never be in a QR ride and a normal booking at the same time.
 */
class QrRideBookingIsolationTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm();
    }

    private function normalBookingPayload(): array
    {
        return [
            'pickup_name' => 'Nasugbu Public Market', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'Nasugbu Town Plaza', 'dropoff_lat' => self::DEST_A['lat'], 'dropoff_lng' => self::DEST_A['lng'],
            'passenger_count' => 1, 'distance_km' => 2.5,
        ];
    }

    #[Test]
    public function a_normal_booking_is_still_created_as_a_normal_dispatch_booking(): void
    {
        $passenger = $this->makePassengerUser();

        $this->as($passenger)->postJson('/api/v1/passenger/bookings/request', $this->normalBookingPayload())
            ->assertCreated()
            ->assertJsonPath('booking.booking_type', 'booking')
            ->assertJsonPath('booking.ride_session_id', null)
            ->assertJsonPath('booking.fare_amount', 50);
    }

    #[Test]
    public function qr_bookings_never_show_up_as_normal_active_bookings(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
        $qr = Booking::where('passenger_id', $this->passengerOf($passenger)->id)->first();

        $this->as($passenger)->getJson('/api/v1/passenger/bookings/active')->assertOk()->assertJsonPath('booking', null);
        $this->as($passenger)->getJson('/api/v1/passenger/bookings/active?booking_id=' . $qr->id)->assertJsonPath('booking', null);
        $this->as($driver->user)->getJson('/api/v1/driver/bookings/active')->assertOk()->assertJsonPath('booking', null);
        $this->as($driver->user)->getJson('/api/v1/driver/bookings/pending')->assertOk()->assertJsonPath('requests', []);
    }

    #[Test]
    public function the_normal_status_endpoint_refuses_qr_bookings(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
        $qr = Booking::where('passenger_id', $this->passengerOf($passenger)->id)->first();

        $this->as($passenger)->postJson("/api/v1/passenger/bookings/{$qr->id}/cancel", ['status' => 'cancelled'])
            ->assertStatus(409)->assertJsonPath('code', 'qr_ride_booking');
        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$qr->id}/status", ['status' => 'arrived'])
            ->assertStatus(409)->assertJsonPath('code', 'qr_ride_booking');
        $this->assertSame('accepted', $qr->fresh()->status);
    }

    #[Test]
    public function a_passenger_in_a_qr_ride_cannot_book_a_tricycle(): void
    {
        [$tricycle] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();

        $this->as($passenger)->postJson('/api/v1/passenger/bookings/request', $this->normalBookingPayload())
            ->assertStatus(409)->assertJsonPath('code', 'passenger_has_active_ride');
        $this->assertSame(1, Booking::where('passenger_id', $this->passengerOf($passenger)->id)->count());
    }

    #[Test]
    public function an_abandoned_normal_search_does_not_block_scan_to_ride_but_a_live_one_does(): void
    {
        [$tricycle] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $booking = Booking::create([
            'booking_code' => 'BK-ISO-' . uniqid(), 'passenger_id' => $this->passengerOf($passenger)->id,
            'pickup_name' => 'A', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'B', 'dropoff_lat' => self::DEST_A['lat'], 'dropoff_lng' => self::DEST_A['lng'],
            'fare_amount' => 50, 'status' => 'pending', 'requested_at' => now(),
        ]);

        // Still inside dispatch's 15-minute search window -> a live ride.
        $this->scan($passenger, $tricycle)->assertStatus(409)->assertJsonPath('code', 'passenger_has_active_ride');

        // Left 'pending' long after dispatch stopped offering it (app closed mid-search).
        $booking->update(['requested_at' => now()->subHours(2)]);
        $this->scan($passenger, $tricycle)->assertOk()->assertJsonPath('ride.can_join', true);
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
        $this->assertSame('pending', $booking->fresh()->status, 'the old record itself is never rewritten');
    }

    #[Test]
    public function a_driver_with_an_open_qr_session_is_never_dispatched_or_allowed_to_accept(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->assertCreated();
        $driver->update(['is_available' => true]); // even if availability drifted

        $booking = Booking::create([
            'booking_code' => 'BK-ISO-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'pickup_name' => 'A', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'B', 'dropoff_lat' => self::DEST_A['lat'], 'dropoff_lng' => self::DEST_A['lng'],
            'fare_amount' => 50, 'status' => 'pending', 'requested_at' => now(),
        ]);

        $this->assertNotContains($driver->id, BookingDispatchService::getEligibleDrivers($booking)->pluck('id')->all());

        // Even a stale offer targeted at this driver can't be accepted while the session is open.
        $booking->update(['dispatched_driver_id' => $driver->id, 'dispatched_at' => now()]);
        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertStatus(409);
        $this->assertSame('pending', $booking->fresh()->status);
    }

    #[Test]
    public function a_qr_session_cannot_open_while_the_driver_is_on_a_normal_booking(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        Booking::create([
            'booking_code' => 'BK-ISO-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'driver_id' => $driver->id, 'tricycle_id' => $tricycle->id,
            'pickup_name' => 'A', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'B', 'dropoff_lat' => self::DEST_A['lat'], 'dropoff_lng' => self::DEST_A['lng'],
            'fare_amount' => 50, 'status' => 'accepted', 'requested_at' => now(), 'accepted_at' => now(),
        ]);

        $this->scan($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'driver_busy');
        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'driver_busy');
    }

    #[Test]
    public function going_online_during_a_qr_session_keeps_the_driver_out_of_dispatch(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->assertCreated();

        $this->as($driver->user)->postJson('/api/v1/driver/status', ['is_online' => false])->assertOk()
            ->assertJsonPath('is_online', false);
        $this->as($driver->user)->postJson('/api/v1/driver/status', ['is_online' => true, 'is_available' => true])->assertOk()
            ->assertJsonPath('is_online', true)
            ->assertJsonPath('is_available', false);
    }

    #[Test]
    public function the_online_toggle_is_unchanged_for_a_driver_without_a_qr_session(): void
    {
        [, $driver] = $this->makeUnit(online: false);

        $this->as($driver->user)->postJson('/api/v1/driver/status', ['is_online' => true, 'is_available' => true])->assertOk()
            ->assertJsonPath('is_online', true)->assertJsonPath('is_available', true);
        $this->as($driver->user)->postJson('/api/v1/driver/status', ['is_online' => false])->assertOk()
            ->assertJsonPath('is_online', false)->assertJsonPath('is_available', false);
    }
}
