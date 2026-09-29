<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Services\BookingDispatchService;
use App\Services\FareService;
use App\Services\ManualRideService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * Manual Ride: the driver adds a walk-in passenger with no app and no QR scan. A Booking
 * (booking_type = manual) with no passenger, waiting in the tricycle's one open ride session —
 * server pick-up from the driver's fresh GPS, RouteDistanceService distance, FareService fare,
 * signed quote. The session's Start / Drop Off / Remove run it (see MixedRideSessionTest for QR +
 * walk-in passengers together).
 */
class ManualRideTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    private const DEST = ['name' => 'Nasugbu Town Plaza', 'lat' => 14.0900, 'lng' => 120.6500];

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm(5400); // 5.4 km road route
    }

    private function mrQuote(Driver $driver, int $party = 1, array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/quote', array_merge([
            'party_size' => $party,
            'dropoff_name' => self::DEST['name'],
            'dropoff_lat' => self::DEST['lat'],
            'dropoff_lng' => self::DEST['lng'],
        ], $extra));
    }

    private function mrAdd(Driver $driver, string $quote): \Illuminate\Testing\TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/add', ['quote' => $quote]);
    }

    /** Quote + add; returns the walk-in's booking code (waiting in the boarding session). */
    private function addWalkIn(Driver $driver, int $party = 1): string
    {
        $quote = $this->mrQuote($driver, $party)->assertOk()->json('quote');

        return $this->mrAdd($driver, $quote)->assertCreated()->json('booking.booking_code');
    }

    private function startRide(Driver $driver): \Illuminate\Testing\TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start');
    }

    private function dropOff(Driver $driver, string $code): \Illuminate\Testing\TestResponse
    {
        return $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off");
    }

    /** A stand-alone in-progress Manual Ride as created before mixed sessions existed. */
    private function legacyRide(Driver $driver): string
    {
        $code = 'MR-LEGACY-' . strtoupper(uniqid());
        Booking::create([
            'booking_code' => $code, 'booking_type' => Booking::TYPE_MANUAL, 'passenger_id' => null,
            'ride_session_id' => null, 'driver_id' => $driver->id, 'tricycle_id' => $driver->tricycle_id,
            'pickup_name' => 'Manual ride pick-up (driver GPS)', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => self::DEST['name'], 'dropoff_lat' => self::DEST['lat'], 'dropoff_lng' => self::DEST['lng'],
            'passenger_count' => 1, 'fare_amount' => 60, 'fare_per_passenger' => 60, 'payment_method' => 'cash',
            'payment_status' => 'pending', 'status' => 'in_transit',
            'requested_at' => now(), 'accepted_at' => now(), 'started_at' => now(),
        ]);
        $driver->update(['is_available' => false]);

        return $code;
    }

    private function suspend(Tricycle $tricycle, string $to = 'suspended'): void
    {
        $tricycle->franchiseScheme->transitionStatus($to, 'Test', $this->qrIssuer()->id);
    }

    // ------------------------------------------------------------------ QUOTE

    #[Test]
    public function the_quote_uses_the_drivers_server_side_gps_as_pickup_and_ignores_client_pickup(): void
    {
        [, $driver] = $this->makeUnit();
        $driver->update(['current_lat' => 14.0731234, 'current_lng' => 120.6341234, 'last_location_updated_at' => now()]);

        $this->mrQuote($driver, 1, ['pickup_lat' => 10.0, 'pickup_lng' => 100.0, 'fare_amount' => 1, 'distance_km' => 0.1])
            ->assertOk()
            ->assertJsonPath('pickup.source', 'driver_gps')
            ->assertJsonPath('pickup.lat', 14.0731234)
            ->assertJsonPath('pickup.lng', 120.6341234);
    }

    #[Test]
    public function the_quote_uses_route_distance_service_and_fare_service(): void
    {
        [, $driver] = $this->makeUnit();

        $this->mrQuote($driver, 1)->assertOk()
            ->assertJsonPath('distance_km', 5.4)
            ->assertJsonPath('distance_source', 'osrm')
            ->assertJsonPath('fare_per_passenger', fn ($v) => $v == FareService::perPassengerFare(5.4, 1))
            ->assertJsonPath('fare_amount', fn ($v) => $v == FareService::calculate(5.4, 1))
            ->assertJsonPath('passenger_capacity', 4)
            ->assertJsonPath('seats_remaining', 4);

        $this->mrQuote($driver, 3)->assertOk()
            ->assertJsonPath('fare_amount', fn ($v) => $v == FareService::calculate(5.4, 3));

        $this->fakeOsrmDown();
        $this->mrQuote($driver, 1)->assertOk()->assertJsonPath('distance_source', 'fallback');
    }

    #[Test]
    public function stale_or_missing_gps_blocks_the_quote(): void
    {
        [, $stale] = $this->makeUnit();
        $stale->update(['last_location_updated_at' => now()->subMinutes(5)]);
        [, $none] = $this->makeUnit();
        $none->update(['current_lat' => null, 'current_lng' => null, 'last_location_updated_at' => null]);

        foreach ([$stale, $none] as $driver) {
            $this->mrQuote($driver)->assertStatus(409)
                ->assertJsonPath('code', 'gps_unavailable')
                ->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Waiting for a GPS fix'));
        }
    }

    #[Test]
    public function missing_capacity_blocks_quote_and_add(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $quote = $this->mrQuote($driver)->assertOk()->json('quote');
        $tricycle->update(['passenger_capacity' => null]);

        $this->mrQuote($driver)->assertStatus(409)->assertJsonPath('code', 'capacity_not_configured');
        $this->mrAdd($driver, $quote)->assertStatus(409)->assertJsonPath('code', 'capacity_not_configured');
        $this->assertSame(0, Booking::where('booking_type', 'manual')->where('driver_id', $driver->id)->count());
        $this->assertSame(0, RideSession::where('tricycle_id', $tricycle->id)->count());
    }

    #[Test]
    public function party_size_cannot_exceed_capacity_or_be_below_one(): void
    {
        [, $driver] = $this->makeUnit(capacity: 3);

        $this->mrQuote($driver, 4)->assertStatus(422)->assertJsonPath('code', 'capacity_exceeded');
        $this->mrQuote($driver, 0)->assertUnprocessable()->assertJsonValidationErrors(['party_size']);
        $this->mrQuote($driver, 3)->assertOk();
    }

    #[Test]
    public function the_destination_must_have_a_name_and_valid_coordinates(): void
    {
        [, $driver] = $this->makeUnit();

        $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/quote', ['party_size' => 1, 'dropoff_lat' => 95, 'dropoff_lng' => 200])
            ->assertUnprocessable()->assertJsonValidationErrors(['dropoff_name', 'dropoff_lat', 'dropoff_lng']);
    }

    // ------------------------------------------------------------------ ADD

    #[Test]
    public function a_valid_quote_adds_a_walk_in_waiting_in_a_new_boarding_session(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $quote = $this->mrQuote($driver, 2)->assertOk()->json('quote');

        $response = $this->mrAdd($driver, $quote)->assertCreated()
            ->assertJsonPath('ride.session.status', RideSession::STATUS_BOARDING)
            ->assertJsonPath('ride.session.seats_used', 2)
            ->assertJsonPath('ride.session.seats_remaining', 2)
            ->assertJsonPath('ride.passengers.0.source', 'walk_in')
            ->assertJsonPath('ride.passengers.0.passenger_name', null);
        $code = $response->json('booking.booking_code');

        $booking = Booking::where('booking_code', $code)->firstOrFail();
        $this->assertSame(Booking::TYPE_MANUAL, $booking->booking_type);
        $this->assertNull($booking->passenger_id);
        $this->assertNotNull($booking->ride_session_id);
        $this->assertSame($tricycle->id, $booking->rideSession->tricycle_id);
        $this->assertSame('accepted', $booking->status, 'waiting until Start Ride');
        $this->assertNull($booking->started_at);
        $this->assertSame($driver->id, $booking->driver_id);
        $this->assertSame(2, $booking->passenger_count);
        $this->assertSame(5.4, $booking->distance_km);
        $this->assertSame('osrm', $booking->distance_source);
        $this->assertSame(FareService::calculate(5.4, 2), $booking->fare_amount);
        $this->assertSame('cash', $booking->payment_method);
        $this->assertStringStartsWith('MR-', $code);
        $this->assertFalse($driver->fresh()->is_available);
        $this->assertTrue(AuditLog::where('event', 'manual_ride.added')->where('auditable_id', $booking->id)->exists());

        // The driver's one session shows the walk-in.
        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertOk()
            ->assertJsonPath('ride.passengers.0.booking_code', $code)
            ->assertJsonPath('ride.passengers.0.source', 'walk_in');
        // No legacy stand-alone ride exists.
        $this->as($driver->user)->getJson('/api/v1/driver/manual-ride/active')->assertJsonPath('ride', null);
    }

    #[Test]
    public function the_old_start_route_is_an_alias_of_add(): void
    {
        [, $driver] = $this->makeUnit();
        $quote = $this->mrQuote($driver)->json('quote');

        $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/start', ['quote' => $quote])->assertCreated()
            ->assertJsonPath('ride.session.status', RideSession::STATUS_BOARDING);
    }

    #[Test]
    public function altered_foreign_or_expired_quotes_are_rejected(): void
    {
        [, $driver] = $this->makeUnit();
        [, $other] = $this->makeUnit();
        $quote = $this->mrQuote($driver)->json('quote');

        $this->mrAdd($driver, substr($quote, 0, -4) . 'AAAA')->assertStatus(422)->assertJsonPath('code', 'invalid_quote');

        // A quote that isn't a Manual Ride quote (e.g. a Scan to Ride one) can't be replayed here.
        $payload = Crypt::decrypt($quote);
        $this->mrAdd($driver, Crypt::encrypt(['kind' => 'qr'] + $payload))->assertStatus(422)->assertJsonPath('code', 'invalid_quote');

        // Another driver can't use this driver's quote.
        $this->mrAdd($other, $quote)->assertStatus(422)->assertJsonPath('code', 'invalid_quote');

        // The untouched quote works, and the stored fare is exactly the signed one.
        $this->mrAdd($driver, $quote)->assertCreated();
        $booking = Booking::where('driver_id', $driver->id)->where('booking_type', 'manual')->latest('id')->first();
        $this->assertSame((float) $payload['fare_amount'], $booking->fare_amount);

        [, $late] = $this->makeUnit();
        $lateQuote = $this->mrQuote($late)->json('quote');
        $this->travel(ManualRideService::QUOTE_TTL_SECONDS + 5)->seconds();
        $late->update(['last_location_updated_at' => now()]);
        $this->mrAdd($late, $lateQuote)->assertStatus(422)->assertJsonPath('code', 'quote_expired');
    }

    #[Test]
    public function retrying_add_with_the_same_quote_never_adds_a_second_passenger(): void
    {
        [, $driver] = $this->makeUnit();
        $quote = $this->mrQuote($driver, 2)->json('quote');

        $first = $this->mrAdd($driver, $quote)->assertCreated()->json('booking.booking_code');
        $this->mrAdd($driver, $quote)->assertOk()
            ->assertJsonPath('booking.booking_code', $first)
            ->assertJsonPath('ride.session.seats_used', 2);

        $this->assertSame(1, Booking::where('booking_type', 'manual')->where('driver_id', $driver->id)->count());
    }

    #[Test]
    public function an_offline_driver_cannot_quote_or_add(): void
    {
        [, $driver] = $this->makeUnit();
        $quote = $this->mrQuote($driver)->json('quote');
        $driver->update(['is_online' => false]);

        $this->mrQuote($driver)->assertStatus(409)->assertJsonPath('code', 'driver_offline');
        $this->mrAdd($driver, $quote)->assertStatus(409)->assertJsonPath('code', 'driver_offline');
    }

    #[Test]
    public function suspended_and_revoked_franchises_cannot_add_a_walk_in(): void
    {
        [$suspended, $d1] = $this->makeUnit();
        $q1 = $this->mrQuote($d1)->json('quote');
        $this->suspend($suspended);
        [$revoked, $d2] = $this->makeUnit();
        $q2 = $this->mrQuote($d2)->json('quote');
        $this->suspend($revoked, 'revoked');

        foreach ([[$d1, $q1], [$d2, $q2]] as [$driver, $quote]) {
            $this->mrQuote($driver)->assertForbidden();
            $this->mrAdd($driver, $quote)->assertForbidden();
        }
        $this->assertSame(0, Booking::where('booking_type', 'manual')->whereIn('driver_id', [$d1->id, $d2->id])->count());
    }

    #[Test]
    public function an_inactive_tricycle_cannot_add_a_walk_in(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $quote = $this->mrQuote($driver)->json('quote');
        DB::table('tricycles')->where('id', $tricycle->id)->update(['status' => 'suspended']);

        $this->mrAdd($driver, $quote)->assertStatus(403)->assertJsonPath('code', 'tricycle_not_active');
    }

    #[Test]
    public function a_booked_ride_a_ride_in_progress_or_a_legacy_manual_ride_blocks_adding(): void
    {
        // Booked ride
        [, $booked] = $this->makeUnit();
        Booking::create([
            'booking_code' => 'BK-MR-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'driver_id' => $booked->id, 'pickup_name' => 'A', 'pickup_lat' => 14.07, 'pickup_lng' => 120.63,
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 50, 'status' => 'accepted', 'requested_at' => now(),
        ]);
        $this->mrQuote($booked)->assertStatus(409)->assertJsonPath('code', 'driver_busy');

        // The session already started: new passengers wait for the next trip.
        [, $driver] = $this->makeUnit();
        $late = $this->mrQuote($driver)->json('quote');
        $this->addWalkIn($driver);
        $this->startRide($driver)->assertOk();
        $this->mrQuote($driver)->assertStatus(409)->assertJsonPath('code', 'ride_in_progress');
        $this->mrAdd($driver, $late)->assertStatus(409)->assertJsonPath('code', 'ride_in_progress');
        $this->assertSame(1, Booking::where('booking_type', 'manual')->where('driver_id', $driver->id)->count());

        // A legacy stand-alone Manual Ride still in progress
        [, $legacy] = $this->makeUnit();
        $this->legacyRide($legacy);
        $this->mrQuote($legacy)->assertStatus(409)->assertJsonPath('code', 'manual_ride_active');
    }

    // ------------------------------------------------------------------ ISOLATION

    #[Test]
    public function a_walk_in_session_blocks_booked_ride_acceptance_and_dispatch(): void
    {
        [, $driver] = $this->makeUnit();
        $this->addWalkIn($driver);
        $driver->update(['is_available' => true]); // even if availability drifted

        $pending = Booking::create([
            'booking_code' => 'BK-MR-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'pickup_name' => 'A', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 50, 'status' => 'pending', 'requested_at' => now(),
        ]);
        $this->assertFalse(BookingDispatchService::getEligibleDrivers($pending)->contains('id', $driver->id));

        // Acceptance is refused even if the offer targets this driver
        $pending->update(['dispatched_driver_id' => $driver->id, 'dispatched_at' => now()]);
        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$pending->id}/accept")->assertStatus(409);
        $this->assertSame('pending', $pending->fresh()->status);
    }

    #[Test]
    public function a_legacy_manual_ride_still_blocks_qr_joins(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $this->legacyRide($driver);

        $this->scan($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'driver_busy');
    }

    #[Test]
    public function manual_rides_never_enter_the_normal_booking_flow(): void
    {
        [, $driver] = $this->makeUnit();
        $code = $this->addWalkIn($driver);
        $booking = Booking::where('booking_code', $code)->first();

        $this->as($driver->user)->getJson('/api/v1/driver/bookings/active')->assertOk()->assertJsonPath('booking', null);
        $this->as($driver->user)->getJson('/api/v1/driver/bookings/pending')->assertOk()->assertJsonCount(0, 'requests');
        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'completed'])
            ->assertStatus(409)->assertJsonPath('code', 'manual_ride_booking');
        $this->assertSame('accepted', $booking->fresh()->status);
    }

    #[Test]
    public function driver_status_updates_keep_the_driver_unavailable_during_a_walk_in_session(): void
    {
        [, $driver] = $this->makeUnit();
        $this->addWalkIn($driver);

        $this->as($driver->user)->postJson('/api/v1/driver/status', ['is_online' => true, 'is_available' => true])->assertOk();
        $this->assertFalse($driver->fresh()->is_available);
    }

    // ------------------------------------------------------------------ START / DROP OFF / REMOVE

    #[Test]
    public function dropping_off_stores_the_fresh_dropoff_gps_and_credits_the_driver_once(): void
    {
        [, $driver] = $this->makeUnit();
        $code = $this->addWalkIn($driver);
        $this->startRide($driver)->assertOk()->assertJsonPath('ride.passengers.0.status', 'in_transit');
        $before = $driver->fresh();
        $driver->update(['current_lat' => 14.09001234, 'current_lng' => 120.65005678, 'last_location_updated_at' => now()]);

        $this->dropOff($driver, $code)->assertOk()
            ->assertJsonPath('booking.status', 'completed')
            ->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);

        $booking = Booking::where('booking_code', $code)->first();
        $this->assertSame(14.09001234, $booking->dropped_off_lat);
        $this->assertSame(120.65005678, $booking->dropped_off_lng);
        $this->assertSame('paid', $booking->payment_status);
        $this->assertNotNull($booking->completed_at);

        // Retry changes nothing.
        $this->dropOff($driver, $code)->assertOk();
        $fresh = $driver->fresh();
        $this->assertEqualsWithDelta($before->today_earnings + $booking->fare_amount, $fresh->today_earnings, 0.001);
        $this->assertSame($before->total_trips + 1, $fresh->total_trips);
        $this->assertTrue($fresh->is_available, 'released back to dispatch');
        $this->assertSame(1, AuditLog::where('event', 'qr_ride.dropped_off')->where('auditable_id', $booking->id)->count());
        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertJsonPath('ride', null);

        // Appears in the driver's normal history, with no passenger attached.
        $this->as($driver->user)->getJson('/api/v1/driver/bookings/history')->assertOk()
            ->assertJsonPath('bookings.0.booking_code', $code)
            ->assertJsonPath('bookings.0.booking_type', 'manual')
            ->assertJsonPath('bookings.0.passenger', null);
    }

    #[Test]
    public function dropping_off_with_stale_gps_is_allowed_but_records_no_dropoff_position(): void
    {
        [, $driver] = $this->makeUnit();
        $code = $this->addWalkIn($driver);
        $this->startRide($driver)->assertOk();
        $driver->update(['last_location_updated_at' => now()->subMinutes(10)]);

        $this->dropOff($driver, $code)->assertOk();

        $booking = Booking::where('booking_code', $code)->first();
        $this->assertSame('completed', $booking->status);
        $this->assertNull($booking->dropped_off_lat);
        $this->assertNull($booking->dropped_off_lng);
    }

    #[Test]
    public function only_the_sessions_own_driver_can_drop_off_or_remove_a_walk_in(): void
    {
        [, $driver] = $this->makeUnit();
        [, $other] = $this->makeUnit();
        $code = $this->addWalkIn($driver);

        $this->as($other->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/remove")->assertNotFound();
        $this->startRide($driver)->assertOk();
        $this->dropOff($other, $code)->assertNotFound();
        $this->assertSame('in_transit', Booking::where('booking_code', $code)->value('status'));
    }

    #[Test]
    public function removing_the_only_walk_in_credits_nothing_and_releases_the_driver(): void
    {
        [, $driver] = $this->makeUnit();
        $code = $this->addWalkIn($driver);
        $before = $driver->fresh();

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/remove")->assertOk()
            ->assertJsonPath('booking.status', 'cancelled')
            ->assertJsonPath('ride.session.status', RideSession::STATUS_CANCELLED);

        $booking = Booking::where('booking_code', $code)->first();
        $this->assertSame('driver', $booking->cancelled_by);
        $fresh = $driver->fresh();
        $this->assertEqualsWithDelta($before->today_earnings, $fresh->today_earnings, 0.001);
        $this->assertSame($before->total_trips, $fresh->total_trips);
        $this->assertTrue($fresh->is_available);
    }

    // ------------------------------------------------------------------ LEGACY STAND-ALONE RIDE

    #[Test]
    public function a_legacy_ride_can_still_be_resumed_completed_once_and_even_after_a_suspension(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $code = $this->legacyRide($driver);
        $before = $driver->fresh();
        $this->suspend($tricycle);

        $this->as($driver->user)->getJson('/api/v1/driver/manual-ride/active')->assertJsonPath('ride.booking_code', $code);
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$code}/complete")->assertOk()
            ->assertJsonPath('ride.status', 'completed')
            ->assertJsonPath('ride.dropped_off_recorded', true);
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$code}/complete")->assertOk();

        $fresh = $driver->fresh();
        $this->assertEqualsWithDelta($before->today_earnings + 60, $fresh->today_earnings, 0.001);
        $this->assertSame($before->total_trips + 1, $fresh->total_trips);
        $this->assertFalse($fresh->is_available, 'a suspended driver is not released into dispatch');
    }

    #[Test]
    public function a_legacy_ride_can_be_cancelled_only_by_its_driver_and_session_walk_ins_are_not_legacy_rides(): void
    {
        [, $driver] = $this->makeUnit();
        [, $other] = $this->makeUnit();
        $code = $this->legacyRide($driver);

        $this->as($other->user)->postJson("/api/v1/driver/manual-ride/{$code}/cancel")->assertNotFound();
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$code}/cancel", ['reason' => 'Passenger changed their mind'])
            ->assertOk()->assertJsonPath('ride.status', 'cancelled');
        $this->assertTrue($driver->fresh()->is_available);
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$code}/complete")->assertStatus(409);
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$code}/cancel")->assertOk();

        // A walk-in inside a session is run by the session, not by the legacy endpoints.
        $walkIn = $this->addWalkIn($driver);
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$walkIn}/complete")->assertNotFound();
        $this->as($driver->user)->postJson("/api/v1/driver/manual-ride/{$walkIn}/cancel")->assertNotFound();
    }

    // ------------------------------------------------------------------ DATA

    #[Test]
    public function passenger_id_is_nullable_and_keeps_its_cascading_foreign_key(): void
    {
        $column = collect(DB::select("SHOW COLUMNS FROM bookings LIKE 'passenger_id'"))->first();
        $this->assertSame('YES', $column->Null);

        $rule = DB::selectOne(
            "SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'bookings_passenger_id_foreign'"
        );
        $this->assertSame('CASCADE', $rule->DELETE_RULE);
    }
}
