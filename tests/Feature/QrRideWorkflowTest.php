<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\RideSession;
use App\Services\FareService;
use App\Services\GeoService;
use App\Services\QrRideService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * QR Ride / Walk-in Ride backend workflow: scan -> quote -> join -> start -> individual drop-off
 * -> session completion, plus leave / remove / end, franchise suspension (D6), capacity (D1),
 * fares (D2), trip counts (D4), routing fallback (D5) and boarding expiry.
 */
class QrRideWorkflowTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm(5400); // 5.4 km road route
    }

    // ------------------------------------------------------------------ SCAN

    #[Test]
    public function scan_rejects_an_unknown_qr_token(): void
    {
        $this->as($this->makePassengerUser())
            ->getJson('/api/v1/passenger/qr-rides/tricycle/not-a-real-token')
            ->assertNotFound()->assertJsonPath('code', 'invalid_qr');
    }

    #[Test]
    public function scan_rejects_an_inactive_tricycle(): void
    {
        [$tricycle] = $this->makeUnit(tricycleStatus: 'unregistered');

        $this->scan($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'tricycle_not_active');
    }

    #[Test]
    public function scan_rejects_suspended_and_revoked_franchises(): void
    {
        [$suspended] = $this->makeUnit();
        $suspended->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);
        [$revoked] = $this->makeUnit();
        $revoked->franchiseScheme->transitionStatus('revoked', 'Test', $this->qrIssuer()->id);
        $passenger = $this->makePassengerUser();

        $this->scan($passenger, $suspended)->assertStatus(409)->assertJsonPath('code', 'franchise_suspended');
        $this->scan($passenger, $revoked)->assertStatus(409)->assertJsonPath('code', 'franchise_revoked');
    }

    #[Test]
    public function scan_rejects_a_tricycle_with_no_driver_or_an_offline_driver(): void
    {
        [$noDriver, $driver] = $this->makeUnit();
        $driver->update(['tricycle_id' => null]);
        [$offline] = $this->makeUnit(online: false);
        $passenger = $this->makePassengerUser();

        $this->scan($passenger, $noDriver)->assertStatus(409)->assertJsonPath('code', 'no_driver');
        $this->scan($passenger, $offline)->assertStatus(409)->assertJsonPath('code', 'driver_offline');
    }

    #[Test]
    public function scan_rejects_a_passenger_already_in_a_normal_booking_or_another_qr_ride(): void
    {
        [$tricycle] = $this->makeUnit();
        [$other] = $this->makeUnit();
        $booked = $this->makePassengerUser();
        Booking::create([
            'booking_code' => 'BK-QRTEST-' . uniqid(), 'passenger_id' => $this->passengerOf($booked)->id,
            'pickup_name' => 'A', 'pickup_lat' => 14.07, 'pickup_lng' => 120.63,
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 50, 'status' => 'pending', 'requested_at' => now(),
        ]);
        $this->scan($booked, $tricycle)->assertStatus(409)->assertJsonPath('code', 'passenger_has_active_ride');

        $rider = $this->makePassengerUser();
        $this->quoteAndJoin($rider, $other)->assertCreated();
        $this->scan($rider, $tricycle)->assertStatus(409)->assertJsonPath('code', 'passenger_has_active_ride');
        $this->scan($rider, $other)->assertOk()
            ->assertJsonPath('ride.can_join', false)->assertJsonPath('ride.reason', 'already_joined');
    }

    #[Test]
    public function scan_returns_only_public_safe_details_and_the_boarding_state(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, party: 2)->assertCreated();

        $response = $this->scan($this->makePassengerUser(), $tricycle)->assertOk()
            ->assertJsonPath('tricycle.plate_number', $tricycle->plate_number)
            ->assertJsonPath('tricycle.sticker_number', $tricycle->coding_scheme_number)
            ->assertJsonPath('driver.first_name', 'Pedro')
            ->assertJsonPath('ride.state', 'boarding')
            ->assertJsonPath('ride.passenger_capacity', 4)
            ->assertJsonPath('ride.seats_used', 2)
            ->assertJsonPath('ride.seats_available', 2)
            ->assertJsonPath('ride.can_join', true)
            ->assertJsonPath('gps.is_fresh', true);

        $body = $response->getContent();
        $this->assertStringNotContainsString($tricycle->qr_token, $body);
        $this->assertStringNotContainsString('09171112222', $body, 'no phone numbers');
        $this->assertArrayNotHasKey('id', $response->json('tricycle'));
        $this->assertArrayNotHasKey('id', $response->json('driver'));
    }

    #[Test]
    public function scan_reports_a_full_ride_an_in_progress_ride_and_a_missing_capacity(): void
    {
        [$full] = $this->makeUnit(capacity: 2);
        $this->quoteAndJoin($this->makePassengerUser(), $full, party: 2)->assertCreated();
        $this->scan($this->makePassengerUser(), $full)->assertOk()
            ->assertJsonPath('ride.can_join', false)->assertJsonPath('ride.reason', 'ride_full');

        [$started, $driver] = $this->makeUnit();
        $this->quoteAndJoin($this->makePassengerUser(), $started)->assertCreated();
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->scan($this->makePassengerUser(), $started)->assertOk()
            ->assertJsonPath('ride.state', 'in_progress')->assertJsonPath('ride.reason', 'ride_in_progress');

        [$noCapacity] = $this->makeUnit(capacity: null);
        $this->scan($this->makePassengerUser(), $noCapacity)->assertOk()
            ->assertJsonPath('ride.can_join', false)->assertJsonPath('ride.reason', 'capacity_not_configured');
    }

    // ------------------------------------------------------------------ QUOTE

    #[Test]
    public function quote_uses_the_server_route_distance_and_fare_service(): void
    {
        [$tricycle] = $this->makeUnit();

        $this->quote($this->makePassengerUser(), $tricycle, party: 1)->assertOk()
            ->assertJsonPath('distance_km', 5.4)
            ->assertJsonPath('distance_source', 'osrm')
            ->assertJsonPath('estimated_duration_mins', 15)
            ->assertJsonPath('fare_per_passenger', fn ($v) => $v == FareService::perPassengerFare(5.4, 1))
            ->assertJsonPath('fare_amount', 57);

        $this->quote($this->makePassengerUser(), $tricycle, party: 2)->assertOk()
            ->assertJsonPath('fare_per_passenger', 32)
            ->assertJsonPath('fare_amount', fn ($v) => $v == FareService::calculate(5.4, 2));
    }

    #[Test]
    public function quote_ignores_any_client_supplied_distance_or_fare(): void
    {
        [$tricycle] = $this->makeUnit();

        $this->as($this->makePassengerUser())->postJson('/api/v1/passenger/qr-rides/quote', [
            'token' => $tricycle->qr_token,
            'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'X', 'dropoff_lat' => self::DEST_A['lat'], 'dropoff_lng' => self::DEST_A['lng'],
            'distance_km' => 0.1, 'fare_amount' => 1,
        ])->assertOk()->assertJsonPath('distance_km', 5.4)->assertJsonPath('fare_amount', 57);
    }

    #[Test]
    public function quote_falls_back_to_the_apps_straight_line_estimate_when_osrm_is_down(): void
    {
        $this->fakeOsrmDown();
        [$tricycle] = $this->makeUnit();
        $expectedKm = round(max(0.8, GeoService::haversineKm(self::PICKUP['lat'], self::PICKUP['lng'], self::DEST_A['lat'], self::DEST_A['lng']) * 1.35), 1);

        $this->quote($this->makePassengerUser(), $tricycle)->assertOk()
            ->assertJsonPath('distance_source', 'fallback')
            ->assertJsonPath('distance_km', fn ($v) => $v == $expectedKm)
            ->assertJsonPath('fare_amount', fn ($v) => $v == FareService::calculate($expectedKm, 1));
    }

    #[Test]
    public function quote_validates_coordinates_and_party_size(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 3);
        $passenger = $this->makePassengerUser();

        $this->as($passenger)->postJson('/api/v1/passenger/qr-rides/quote', [
            'token' => $tricycle->qr_token, 'pickup_lat' => 95, 'pickup_lng' => 120.6,
            'dropoff_name' => 'X', 'dropoff_lat' => 14.09, 'dropoff_lng' => 200,
        ])->assertUnprocessable()->assertJsonValidationErrors(['pickup_lat', 'dropoff_lng']);

        $this->quote($passenger, $tricycle, party: 0)->assertUnprocessable()->assertJsonValidationErrors(['party_size']);
        $this->quote($passenger, $tricycle, party: 4)->assertStatus(409)->assertJsonPath('code', 'not_enough_seats');
    }

    #[Test]
    public function a_tampered_or_foreign_or_expired_quote_is_rejected(): void
    {
        [$tricycle] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $quote = $this->quote($passenger, $tricycle)->json('quote');

        $this->join($passenger, substr($quote, 0, -4) . 'AAAA')->assertStatus(422)->assertJsonPath('code', 'invalid_quote');

        // The quote is opaque (encrypted with the app key): its fare can't even be read, let
        // alone edited, by the client.
        $this->assertStringNotContainsString('fare_amount', base64_decode($quote));
        $this->assertSame(57.0, Crypt::decrypt($quote)['fare_amount']);

        $other = $this->makePassengerUser();
        $this->join($other, $quote)->assertStatus(422)->assertJsonPath('code', 'invalid_quote');

        $late = $this->makePassengerUser();
        $lateQuote = $this->quote($late, $tricycle)->json('quote');
        $this->travel(QrRideService::QUOTE_TTL_SECONDS + 5)->seconds();
        $this->join($late, $lateQuote)->assertStatus(422)->assertJsonPath('code', 'quote_expired');
    }

    // ------------------------------------------------------------------ JOIN

    #[Test]
    public function joining_opens_a_boarding_session_and_records_the_qr_booking(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $passenger = $this->makePassengerUser();

        $this->quoteAndJoin($passenger, $tricycle, party: 2)->assertCreated()
            ->assertJsonPath('booking.status', 'accepted')
            ->assertJsonPath('booking.party_size', 2)
            ->assertJsonPath('session.status', 'boarding');

        $booking = Booking::where('passenger_id', $this->passengerOf($passenger)->id)->firstOrFail();
        $session = RideSession::findOrFail($booking->ride_session_id);

        $this->assertSame(Booking::TYPE_QR_WALKIN, $booking->booking_type);
        $this->assertSame('osrm', $booking->distance_source);
        $this->assertSame(5.4, $booking->distance_km);
        $this->assertSame(64.0, $booking->fare_amount);
        $this->assertSame(32.0, $booking->fare_per_passenger);
        $this->assertSame($driver->id, $booking->driver_id);
        $this->assertSame($tricycle->id, $booking->tricycle_id);
        $this->assertStringStartsWith('QR-', $booking->booking_code);
        $this->assertSame(4, $session->capacity_at_start);
        $this->assertStringStartsWith('RS-', $session->session_code);
        $this->assertFalse($driver->fresh()->is_available, 'driver leaves normal dispatch');
        $this->assertTrue(AuditLog::where('event', 'qr_ride.joined')->where('auditable_id', $booking->id)->exists());
    }

    #[Test]
    public function several_passengers_join_one_session_with_independent_destinations_and_fares(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 4);
        $a = $this->makePassengerUser();
        $b = $this->makePassengerUser();

        $this->quoteAndJoin($a, $tricycle, self::DEST_A, 1)->assertCreated();
        $this->fakeOsrm(9000); // B's route is longer
        $this->quoteAndJoin($b, $tricycle, self::DEST_B, 2)->assertCreated();

        $bookingA = Booking::where('passenger_id', $this->passengerOf($a)->id)->first();
        $bookingB = Booking::where('passenger_id', $this->passengerOf($b)->id)->first();

        $this->assertSame($bookingA->ride_session_id, $bookingB->ride_session_id);
        $this->assertSame(1, RideSession::where('tricycle_id', $tricycle->id)->count());
        $this->assertSame(self::DEST_B['name'], $bookingB->dropoff_name);
        $this->assertSame(57.0, $bookingA->fresh()->fare_amount, "A's fare is fixed at join time");
        $this->assertSame(FareService::calculate(9.0, 2), $bookingB->fare_amount);
    }

    #[Test]
    public function capacity_counts_party_size_not_scans(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 4);
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, party: 2)->assertCreated();
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, party: 1)->assertCreated();
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, party: 1)->assertCreated();

        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'ride_full');
    }

    #[Test]
    public function the_ride_filling_up_between_quote_and_join_rejects_the_join(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 2);
        $late = $this->makePassengerUser();
        $lateQuote = $this->quote($late, $tricycle, party: 1)->json('quote');

        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, party: 2)->assertCreated();

        $this->join($late, $lateQuote)->assertStatus(409)->assertJsonPath('code', 'ride_full');
        $this->assertSame(0, Booking::where('passenger_id', $this->passengerOf($late)->id)->count());
    }

    #[Test]
    public function a_missing_capacity_blocks_joining(): void
    {
        [$tricycle] = $this->makeUnit(capacity: null);

        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'capacity_not_configured');
        $this->assertSame(0, RideSession::where('tricycle_id', $tricycle->id)->count());
    }

    #[Test]
    public function submitting_the_same_join_twice_does_not_create_a_second_booking(): void
    {
        [$tricycle] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $quote = $this->quote($passenger, $tricycle)->json('quote');

        $first = $this->join($passenger, $quote)->assertCreated()->json('booking.booking_code');
        $second = $this->join($passenger, $quote)->assertOk()->json('booking.booking_code');

        $this->assertSame($first, $second);
        $this->assertSame(1, Booking::where('passenger_id', $this->passengerOf($passenger)->id)->count());
        $this->assertSame(1, AuditLog::where('event', 'qr_ride.joined')->where('user_id', $passenger->id)->count());
    }

    #[Test]
    public function joining_after_the_ride_started_is_rejected(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $late = $this->makePassengerUser();
        $lateQuote = $this->quote($late, $tricycle)->json('quote');
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->assertCreated();
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();

        $this->join($late, $lateQuote)->assertStatus(409)->assertJsonPath('code', 'ride_in_progress');
    }

    #[Test]
    public function passenger_active_ride_shares_the_drivers_real_gps(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
        $driver->update(['current_lat' => 14.0801, 'current_lng' => 120.6402, 'last_location_updated_at' => now()]);

        $this->as($passenger)->getJson('/api/v1/passenger/qr-rides/active')->assertOk()
            ->assertJsonPath('ride.booking.status', 'accepted')
            ->assertJsonPath('ride.driver_location.lat', 14.0801)
            ->assertJsonPath('ride.driver_location.lng', 120.6402)
            ->assertJsonPath('ride.driver_location.is_fresh', true);

        $driver->update(['last_location_updated_at' => now()->subMinutes(5)]);
        $this->as($passenger)->getJson('/api/v1/passenger/qr-rides/active')
            ->assertJsonPath('ride.driver_location.is_fresh', false)
            ->assertJsonPath('ride.driver_location.lat', 14.0801);

        $this->as($this->makePassengerUser())->getJson('/api/v1/passenger/qr-rides/active')->assertOk()->assertJsonPath('ride', null);
    }

    // ------------------------------------------------------------------ LEAVE

    #[Test]
    public function a_passenger_can_leave_before_the_start_and_the_last_one_leaving_closes_the_session(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->makePassengerUser();
        $b = $this->makePassengerUser();
        $codeA = $this->quoteAndJoin($a, $tricycle)->json('booking.booking_code');
        $codeB = $this->quoteAndJoin($b, $tricycle)->json('booking.booking_code');

        $this->as($a)->postJson("/api/v1/passenger/qr-rides/{$codeA}/leave")->assertOk()
            ->assertJsonPath('ride.booking.status', 'cancelled')->assertJsonPath('ride.booking.cancelled_by', 'passenger');
        $session = RideSession::where('tricycle_id', $tricycle->id)->first();
        $this->assertSame('boarding', $session->status);
        $this->assertFalse($driver->fresh()->is_available);

        $this->as($b)->postJson("/api/v1/passenger/qr-rides/{$codeB}/leave")->assertOk();
        $session->refresh();
        $this->assertSame('cancelled', $session->status);
        $this->assertSame('no_passengers', $session->end_reason);
        $this->assertSame('passenger', $session->ended_by);
        $this->assertTrue($driver->fresh()->is_available, 'availability restored');
        $this->assertSame(2, AuditLog::where('event', 'qr_ride.left')->whereIn('user_id', [$a->id, $b->id])->count());
        $this->assertTrue(AuditLog::where('event', 'qr_session.ended')->where('auditable_id', $session->id)->exists());
    }

    #[Test]
    public function a_passenger_cannot_leave_after_the_start_or_leave_someone_elses_ride(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $code = $this->quoteAndJoin($passenger, $tricycle)->json('booking.booking_code');

        $this->as($this->makePassengerUser())->postJson("/api/v1/passenger/qr-rides/{$code}/leave")->assertNotFound();

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->as($passenger)->postJson("/api/v1/passenger/qr-rides/{$code}/leave")
            ->assertStatus(409)->assertJsonPath('code', 'ride_already_started');
    }

    // ------------------------------------------------------------------ REMOVE

    #[Test]
    public function the_driver_can_remove_a_waiting_passenger_but_not_another_drivers_or_after_the_start(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        [, $otherDriver] = $this->makeUnit();
        $a = $this->makePassengerUser();
        $codeA = $this->quoteAndJoin($a, $tricycle)->json('booking.booking_code');
        $codeB = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');

        $this->as($otherDriver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeA}/remove")->assertNotFound();

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeA}/remove")->assertOk()
            ->assertJsonPath('booking.status', 'cancelled')->assertJsonPath('booking.cancelled_by', 'driver');
        $this->assertTrue(AuditLog::where('event', 'qr_ride.removed_by_driver')->where('user_id', $driver->user_id)->exists());

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeB}/remove")
            ->assertStatus(409)->assertJsonPath('code', 'ride_already_started');
    }

    #[Test]
    public function removing_the_only_passenger_cancels_the_session_and_releases_the_driver(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/remove")->assertOk()
            ->assertJsonPath('ride.session.status', 'cancelled');
        $this->assertTrue($driver->fresh()->is_available);
        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertJsonPath('ride', null);
    }

    // ------------------------------------------------------------------ DRIVER SESSION + START

    #[Test]
    public function the_driver_sees_the_session_with_every_passengers_destination_and_fare(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, self::DEST_A, 1);
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle, self::DEST_B, 2);

        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertOk()
            ->assertJsonPath('ride.session.status', 'boarding')
            ->assertJsonPath('ride.session.capacity', 4)
            ->assertJsonPath('ride.session.seats_used', 3)
            ->assertJsonPath('ride.session.seats_remaining', 1)
            ->assertJsonCount(2, 'ride.passengers')
            ->assertJsonPath('ride.passengers.0.dropoff.name', self::DEST_A['name'])
            ->assertJsonPath('ride.passengers.1.dropoff.name', self::DEST_B['name'])
            ->assertJsonPath('ride.passengers.1.party_size', 2)
            ->assertJsonPath('ride.passengers.1.fare_amount', 64)
            ->assertJsonPath('ride.passengers.0.status', 'accepted');
    }

    #[Test]
    public function start_requires_a_waiting_passenger(): void
    {
        [, $driver] = $this->makeUnit();

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertNotFound()->assertJsonPath('code', 'no_active_session');
    }

    #[Test]
    public function start_moves_the_session_and_every_waiting_passenger_into_the_ride(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $codeA = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $codeB = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $left = $this->makePassengerUser();
        $codeLeft = $this->quoteAndJoin($left, $tricycle)->json('booking.booking_code');
        $this->as($left)->postJson("/api/v1/passenger/qr-rides/{$codeLeft}/leave")->assertOk();

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk()
            ->assertJsonPath('ride.session.status', 'in_progress');

        $session = RideSession::where('tricycle_id', $tricycle->id)->first();
        $this->assertNotNull($session->started_at);
        foreach ([$codeA, $codeB] as $code) {
            $booking = Booking::where('booking_code', $code)->first();
            $this->assertSame('in_transit', $booking->status);
            $this->assertNotNull($booking->started_at);
        }
        $this->assertSame('cancelled', Booking::where('booking_code', $codeLeft)->value('status'));
        $this->assertFalse($driver->fresh()->is_available);
        $this->assertTrue(AuditLog::where('event', 'qr_session.started')->where('auditable_id', $session->id)->exists());

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertStatus(409)->assertJsonPath('code', 'ride_already_started');
    }

    // ------------------------------------------------------------------ DROP-OFF + END

    #[Test]
    public function each_drop_off_completes_one_trip_with_the_real_gps_and_the_last_one_completes_the_session(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->makePassengerUser();
        $b = $this->makePassengerUser();
        $codeA = $this->quoteAndJoin($a, $tricycle, self::DEST_A, 1)->json('booking.booking_code'); // 57.00
        $codeB = $this->quoteAndJoin($b, $tricycle, self::DEST_B, 2)->json('booking.booking_code'); // 64.00
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $driver->update(['current_lat' => 14.09001234, 'current_lng' => 120.65005678, 'last_location_updated_at' => now()]);
        $before = $driver->fresh();

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeA}/drop-off")->assertOk()
            ->assertJsonPath('booking.status', 'completed')
            ->assertJsonPath('ride.session.status', 'in_progress');

        $bookingA = Booking::where('booking_code', $codeA)->first();
        $this->assertSame(14.09001234, $bookingA->dropped_off_lat);
        $this->assertSame(120.65005678, $bookingA->dropped_off_lng);
        $this->assertSame('paid', $bookingA->payment_status);
        $this->assertNotNull($bookingA->completed_at);
        $this->assertSame('in_transit', Booking::where('booking_code', $codeB)->value('status'), 'B still aboard');
        $this->assertSame($before->total_trips + 1, $driver->fresh()->total_trips);
        $this->assertSame(1, $this->passengerOf($a)->fresh()->total_rides);

        // Retrying A's drop-off changes nothing.
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeA}/drop-off")->assertOk();
        $this->assertSame($before->total_trips + 1, $driver->fresh()->total_trips);
        $this->assertEqualsWithDelta($before->today_earnings + 57, $driver->fresh()->today_earnings, 0.001);
        $this->assertSame(1, $this->passengerOf($a)->fresh()->total_rides);
        $this->assertSame(1, AuditLog::where('event', 'qr_ride.dropped_off')->where('auditable_id', $bookingA->id)->count());

        // Last passenger -> the session completes and the driver is released.
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeB}/drop-off")->assertOk()
            ->assertJsonPath('ride.session.status', 'completed')
            ->assertJsonPath('ride.session.end_reason', 'all_dropped');
        $fresh = $driver->fresh();
        $this->assertSame($before->total_trips + 2, $fresh->total_trips, 'one trip per completed passenger (D4)');
        $this->assertEqualsWithDelta($before->today_earnings + 57 + 64, $fresh->today_earnings, 0.001);
        $this->assertTrue($fresh->is_available);
        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertJsonPath('ride', null);

        // Both trips appear in the normal history endpoints.
        $this->as($driver->user)->getJson('/api/v1/driver/bookings/history')->assertOk()->assertJsonCount(2, 'bookings');
        $this->as($a)->getJson('/api/v1/passenger/bookings/history')->assertJsonPath('bookings.0.booking_type', 'qr_walkin');
    }

    #[Test]
    public function drop_off_never_invents_a_position_when_gps_is_stale(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $driver->update(['last_location_updated_at' => now()->subMinutes(10)]);

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off")->assertOk();

        $booking = Booking::where('booking_code', $code)->first();
        $this->assertSame('completed', $booking->status);
        $this->assertNull($booking->dropped_off_lat);
        $this->assertNull($booking->dropped_off_lng);
        $this->assertFalse(AuditLog::where('event', 'qr_ride.dropped_off')->where('auditable_id', $booking->id)->value('new_values')['gps_recorded']);
    }

    #[Test]
    public function drop_off_is_limited_to_the_drivers_own_started_ride(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        [, $otherDriver] = $this->makeUnit();
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');

        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off")
            ->assertStatus(409)->assertJsonPath('code', 'ride_not_started');

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->as($otherDriver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off")->assertNotFound();
        $this->assertSame('in_transit', Booking::where('booking_code', $code)->value('status'));
    }

    #[Test]
    public function the_driver_cannot_end_a_ride_with_passengers_still_waiting_or_aboard(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/end')->assertStatus(409)->assertJsonPath('code', 'passengers_still_aboard');
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/end')->assertStatus(409)->assertJsonPath('code', 'passengers_still_aboard');
        $this->assertSame('in_transit', Booking::where('booking_code', $code)->value('status'), 'no trip is completed by ending');
    }

    #[Test]
    public function the_driver_can_end_a_session_once_nobody_is_aboard(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $session = RideSession::where('tricycle_id', $tricycle->id)->first();
        // A session left open with nobody seated (e.g. data from an interrupted request).
        Booking::where('booking_code', $code)->update(['status' => 'cancelled', 'cancelled_by' => 'system']);

        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/end')->assertOk()
            ->assertJsonPath('ride.session.status', 'cancelled')
            ->assertJsonPath('ride.session.end_reason', 'driver_ended');
        $this->assertSame('driver', $session->fresh()->ended_by);
        $this->assertTrue($driver->fresh()->is_available);
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/end')->assertNotFound();
    }

    // ------------------------------------------------------------------ FRANCHISE (D6)

    #[Test]
    public function a_suspension_during_boarding_blocks_new_joins_and_the_start_but_allows_removal(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $late = $this->makePassengerUser();
        $lateQuote = $this->quote($late, $tricycle)->json('quote');
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');

        $tricycle->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);

        $this->join($late, $lateQuote)->assertStatus(409)->assertJsonPath('code', 'franchise_suspended');
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertForbidden();
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/remove")->assertOk()
            ->assertJsonPath('ride.session.status', 'cancelled');
        $this->assertFalse($driver->fresh()->is_available, 'a suspended driver is not released into dispatch');
    }

    #[Test]
    public function a_suspension_during_the_ride_still_lets_passengers_aboard_be_dropped_off(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->makePassengerUser();
        $codeA = $this->quoteAndJoin($a, $tricycle)->json('booking.booking_code');
        $codeB = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();

        $tricycle->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);

        $this->scan($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'franchise_suspended');
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeA}/drop-off")->assertOk();
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$codeB}/drop-off")->assertOk()
            ->assertJsonPath('ride.session.status', 'completed');

        $this->assertSame('completed', Booking::where('booking_code', $codeA)->value('status'));
        $this->assertSame('suspended', $tricycle->franchiseScheme()->first()->status, 'franchise status untouched');
        $this->assertFalse($driver->fresh()->is_available);
        $this->assertFalse($driver->fresh()->is_online);

        // No new session can begin.
        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'franchise_suspended');
    }

    // ------------------------------------------------------------------ EXPIRY

    #[Test]
    public function an_unstarted_boarding_session_expires_after_30_minutes(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $passenger = $this->makePassengerUser();
        $code = $this->quoteAndJoin($passenger, $tricycle)->json('booking.booking_code');
        $session = RideSession::where('tricycle_id', $tricycle->id)->first();

        $this->travel(QrRideService::BOARDING_EXPIRY_MINUTES + 1)->minutes();
        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertOk()->assertJsonPath('ride', null);

        $session->refresh();
        $this->assertSame('cancelled', $session->status);
        $this->assertSame('expired', $session->end_reason);
        $this->assertSame('system', $session->ended_by);
        $booking = Booking::where('booking_code', $code)->first();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('system', $booking->cancelled_by);
        $this->assertTrue($driver->fresh()->is_available);
        $this->assertTrue(AuditLog::where('event', 'qr_session.ended')->where('auditable_id', $session->id)->whereNull('user_id')->exists());

        // The tricycle is free for a new walk-in ride.
        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
    }

    #[Test]
    public function an_in_progress_session_never_expires(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $this->quoteAndJoin($this->makePassengerUser(), $tricycle);
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();

        $this->travel(3)->hours();

        $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertOk()
            ->assertJsonPath('ride.session.status', 'in_progress')
            ->assertJsonPath('ride.passengers.0.status', 'in_transit');
    }
}
