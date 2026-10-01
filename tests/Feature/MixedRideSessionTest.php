<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Services\BookingDispatchService;
use App\Services\FareService;
use App\Services\QrRideService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * Mixed ride sessions: one physical tricycle ride = ONE ride_sessions row holding QR passengers
 * (booking_type qr_walkin) and walk-in passengers added by the driver (booking_type manual, no
 * passenger), in any order. Seats are shared and counted by party size; fares are independent;
 * Start Ride moves everyone aboard; drop-offs are individual and the last one completes it.
 */
class MixedRideSessionTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    private const WALK_IN_DEST = ['name' => 'Nasugbu Public Market', 'lat' => 14.0750, 'lng' => 120.6360];

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm(5400);
    }

    // ------------------------------------------------------------------ helpers

    private function walkInQuote(Driver $driver, int $party = 1): TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/quote', [
            'party_size' => $party,
            'dropoff_name' => self::WALK_IN_DEST['name'],
            'dropoff_lat' => self::WALK_IN_DEST['lat'],
            'dropoff_lng' => self::WALK_IN_DEST['lng'],
        ]);
    }

    private function addWalkIn(Driver $driver, string $quote): TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/manual-ride/add', ['quote' => $quote]);
    }

    /** Quote + add; returns the walk-in's booking code. */
    private function walkIn(Driver $driver, int $party = 1): string
    {
        $quote = $this->walkInQuote($driver, $party)->assertOk()->json('quote');

        return $this->addWalkIn($driver, $quote)->assertCreated()->json('booking.booking_code');
    }

    /** Quote + join; returns the QR passenger's booking code. */
    private function qr(Tricycle $tricycle, int $party = 1, array $dest = self::DEST_A): string
    {
        return $this->quoteAndJoin($this->makePassengerUser(), $tricycle, $dest, $party)->assertCreated()->json('booking.booking_code');
    }

    private function activeSession(Driver $driver): TestResponse
    {
        return $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->assertOk();
    }

    private function start(Driver $driver): TestResponse
    {
        return $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start');
    }

    private function dropOff(Driver $driver, string $code): TestResponse
    {
        return $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off");
    }

    private function openSessions(Tricycle $tricycle): int
    {
        return RideSession::where('tricycle_id', $tricycle->id)->open()->count();
    }

    private function landingStatus(Tricycle $tricycle): array
    {
        $status = null;
        $this->get('/ride/q/' . $tricycle->qr_token)->assertOk()->assertInertia(function ($page) use (&$status) {
            $status = $page->toArray()['props']['status'];
        });

        return $status;
    }

    private function sessionIdOf(string $code): ?int
    {
        return Booking::where('booking_code', $code)->value('ride_session_id');
    }

    // ------------------------------------------------------------------ SCENARIO 1: QR first

    #[Test]
    public function qr_first_then_walk_in_share_one_session_and_run_to_completion(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $qrCode = $this->qr($tricycle, 1);
        $walkIn = $this->walkIn($driver, 2);

        // One session, both sources, shared seats, independent fares.
        $this->assertSame($this->sessionIdOf($qrCode), $this->sessionIdOf($walkIn));
        $this->assertSame(1, $this->openSessions($tricycle));
        $ride = $this->activeSession($driver)
            ->assertJsonPath('ride.session.status', RideSession::STATUS_BOARDING)
            ->assertJsonPath('ride.session.seats_used', 3)
            ->assertJsonPath('ride.session.seats_remaining', 1)
            ->assertJsonCount(2, 'ride.passengers')
            ->json('ride');
        $bySource = collect($ride['passengers'])->keyBy('booking_code');
        $this->assertSame('qr', $bySource[$qrCode]['source']);
        $this->assertNotNull($bySource[$qrCode]['passenger_name']);
        $this->assertSame('walk_in', $bySource[$walkIn]['source']);
        $this->assertNull($bySource[$walkIn]['passenger_name']);
        $this->assertEquals(FareService::calculate(5.4, 1), $bySource[$qrCode]['fare_amount']);
        $this->assertEquals(FareService::calculate(5.4, 2), $bySource[$walkIn]['fare_amount']);
        $this->assertSame(self::WALK_IN_DEST['name'], $bySource[$walkIn]['dropoff']['name']);

        // Start Ride moves everyone aboard.
        $this->start($driver)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_IN_PROGRESS);
        $this->assertSame(['in_transit', 'in_transit'], Booking::whereIn('booking_code', [$qrCode, $walkIn])->pluck('status')->all());

        // Individual drop-offs; the last one completes the session
        $before = $driver->fresh();
        $this->dropOff($driver, $walkIn)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_IN_PROGRESS);
        $this->dropOff($driver, $walkIn)->assertOk(); // retry
        $this->dropOff($driver, $qrCode)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);
        $this->dropOff($driver, $qrCode)->assertOk(); // retry

        // Confirm cash payments for each booking independently
        $bWalkIn = Booking::where('booking_code', $walkIn)->firstOrFail();
        $bQr = Booking::where('booking_code', $qrCode)->firstOrFail();
        $this->assertSame('unpaid', $bWalkIn->payment_status);
        $this->assertSame('unpaid', $bQr->payment_status);

        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$bWalkIn->id}/payment/confirm-cash", [
            'amount_received' => $bWalkIn->fare_amount,
        ])->assertOk();

        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$bQr->id}/payment/confirm-cash", [
            'amount_received' => $bQr->fare_amount,
        ])->assertOk();

        $fresh = $driver->fresh();
        $total = FareService::calculate(5.4, 1) + FareService::calculate(5.4, 2);
        $this->assertEqualsWithDelta($before->today_earnings + $total, $fresh->today_earnings, 0.001);
        $this->assertSame($before->total_trips + 2, $fresh->total_trips);
        $this->assertTrue($fresh->is_available);
        $this->assertSame(0, $this->openSessions($tricycle));
    }

    // ------------------------------------------------------------------ SCENARIO 2: Manual first

    #[Test]
    public function manual_first_opens_a_boarding_session_that_qr_passengers_can_join(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $walkIn = $this->walkIn($driver, 1);

        // The QR still takes passengers, and says people are boarding.
        $passenger = $this->makePassengerUser();
        $this->scan($passenger, $tricycle)->assertOk()
            ->assertJsonPath('ride.state', RideSession::STATUS_BOARDING)
            ->assertJsonPath('ride.can_join', true)
            ->assertJsonPath('ride.seats_available', 3);
        $landing = $this->landingStatus($tricycle);
        $this->assertTrue($landing['available']);
        $this->assertSame(RideSession::STATUS_BOARDING, $landing['state']);
        $this->assertStringStartsWith('Passengers are currently boarding', $landing['message']);

        $qrCode = $this->quoteAndJoin($passenger, $tricycle, self::DEST_B, 2)->assertCreated()->json('booking.booking_code');
        $this->assertSame($this->sessionIdOf($walkIn), $this->sessionIdOf($qrCode));
        $this->assertSame(1, $this->openSessions($tricycle));

        $this->start($driver)->assertOk();
        $this->dropOff($driver, $qrCode)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_IN_PROGRESS);
        $this->dropOff($driver, $walkIn)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);

        // QR passenger's own history/active ride is unchanged by the walk-in.
        $this->as($passenger)->getJson("/api/v1/passenger/qr-rides/active?booking={$qrCode}")->assertOk()
            ->assertJsonPath('ride.booking.booking_code', $qrCode)
            ->assertJsonPath('ride.booking.status', 'completed')
            ->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);
    }

    #[Test]
    public function two_walk_ins_share_one_session(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $a = $this->walkIn($driver, 1);
        $b = $this->walkIn($driver, 3);

        $this->assertSame($this->sessionIdOf($a), $this->sessionIdOf($b));
        $this->activeSession($driver)->assertJsonPath('ride.session.seats_used', 4)->assertJsonPath('ride.session.seats_remaining', 0);
        $this->start($driver)->assertOk();
        $this->dropOff($driver, $a)->assertOk();
        $this->dropOff($driver, $b)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);
    }

    #[Test]
    public function qr_manual_qr_and_manual_qr_manual_orders_stay_in_one_session(): void
    {
        [$t1, $d1] = $this->makeUnit(capacity: 4);
        $codes1 = [$this->qr($t1), $this->walkIn($d1), $this->qr($t1, 1, self::DEST_B)];
        [$t2, $d2] = $this->makeUnit(capacity: 4);
        $codes2 = [$this->walkIn($d2), $this->qr($t2), $this->walkIn($d2, 2)];

        foreach ([[$t1, $d1, $codes1, 3], [$t2, $d2, $codes2, 4]] as [$tricycle, $driver, $codes, $seats]) {
            $this->assertCount(1, Booking::whereIn('booking_code', $codes)->pluck('ride_session_id')->unique());
            $this->assertSame(1, $this->openSessions($tricycle));
            $this->activeSession($driver)->assertJsonCount(3, 'ride.passengers')->assertJsonPath('ride.session.seats_used', $seats);
        }
        $this->assertSame(1, RideSession::where('tricycle_id', $t1->id)->count());
        $this->assertSame(1, RideSession::where('tricycle_id', $t2->id)->count());
    }

    // ------------------------------------------------------------------ CAPACITY

    #[Test]
    public function capacity_is_shared_and_counted_by_party_size(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $this->qr($tricycle, 2);

        $this->walkInQuote($driver, 3)->assertStatus(422)->assertJsonPath('code', 'not_enough_seats');
        $this->walkInQuote($driver, 2)->assertOk()->assertJsonPath('seats_remaining', 2);
        $this->walkIn($driver, 2);

        // Full: no more QR joins or walk-ins.
        $this->scan($this->makePassengerUser(), $tricycle)->assertOk()
            ->assertJsonPath('ride.can_join', false)->assertJsonPath('ride.reason', 'ride_full');
        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'ride_full');
        $this->walkInQuote($driver, 1)->assertStatus(422)->assertJsonPath('code', 'ride_full');
        $this->assertFalse($this->landingStatus($tricycle)['available']);
    }

    #[Test]
    public function a_qr_join_landing_between_a_walk_in_quote_and_its_add_is_rechecked_under_the_lock(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $this->qr($tricycle, 1);
        $walkInQuote = $this->walkInQuote($driver, 3)->assertOk()->json('quote'); // 3 seats free now

        // A QR passenger takes 2 seats first.
        $this->qr($tricycle, 2);

        $this->addWalkIn($driver, $walkInQuote)->assertStatus(422)->assertJsonPath('code', 'not_enough_seats');
        $this->activeSession($driver)->assertJsonPath('ride.session.seats_used', 3)->assertJsonCount(2, 'ride.passengers');

        // And the other way round: a walk-in first, then a QR quote taken earlier can't overbook.
        [$t2, $d2] = $this->makeUnit(capacity: 2);
        $p = $this->makePassengerUser();
        $qrQuote = $this->quote($p, $t2, self::DEST_A, 1)->assertOk()->json('quote');
        $this->walkIn($d2, 2);
        $this->join($p, $qrQuote)->assertStatus(409)->assertJsonPath('code', 'ride_full');
        $this->assertSame(1, $this->openSessions($t2));
    }

    #[Test]
    public function a_duplicate_qr_join_or_walk_in_retry_never_double_books(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $walkIn = $this->walkIn($driver);
        $p = $this->makePassengerUser();
        $quote = $this->quote($p, $tricycle)->assertOk()->json('quote');

        $code = $this->join($p, $quote)->assertCreated()->json('booking.booking_code');
        $this->join($p, $quote)->assertOk()->assertJsonPath('booking.booking_code', $code);
        $this->scan($p, $tricycle)->assertOk()->assertJsonPath('ride.reason', 'already_joined');

        $wq = $this->walkInQuote($driver)->json('quote');
        $second = $this->addWalkIn($driver, $wq)->assertCreated()->json('booking.booking_code');
        $this->addWalkIn($driver, $wq)->assertOk()->assertJsonPath('booking.booking_code', $second);

        $this->activeSession($driver)->assertJsonCount(3, 'ride.passengers')->assertJsonPath('ride.session.seats_used', 3);
        $this->assertNotSame($walkIn, $second);
    }

    // ------------------------------------------------------------------ START RULES

    #[Test]
    public function once_started_neither_qr_nor_walk_in_passengers_can_join(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $this->walkIn($driver);
        $this->qr($tricycle);
        $this->start($driver)->assertOk();

        $this->scan($this->makePassengerUser(), $tricycle)->assertOk()
            ->assertJsonPath('ride.can_join', false)
            ->assertJsonPath('ride.reason', 'ride_in_progress')
            ->assertJsonPath('ride.reason_message', fn ($m) => str_starts_with($m, 'This ride is currently in progress'));
        $this->walkInQuote($driver)->assertStatus(409)->assertJsonPath('code', 'ride_in_progress');

        $landing = $this->landingStatus($tricycle);
        $this->assertFalse($landing['available']);
        $this->assertSame('ride_in_progress', $landing['reason']);
        $this->assertSame(RideSession::STATUS_IN_PROGRESS, $landing['state']);
    }

    #[Test]
    public function start_is_refused_offline_or_suspended_and_nothing_moves(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->walkIn($driver);
        $b = $this->qr($tricycle);

        $driver->update(['is_online' => false]);
        $this->start($driver)->assertStatus(409)->assertJsonPath('code', 'driver_offline');
        $driver->update(['is_online' => true]);

        $tricycle->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);
        $this->start($driver)->assertForbidden();
        $this->assertSame(['accepted', 'accepted'], Booking::whereIn('booking_code', [$a, $b])->pluck('status')->all());

        // Waiting passengers can still be removed so nobody is stuck.
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$a}/remove")->assertOk();
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$b}/remove")->assertOk()
            ->assertJsonPath('ride.session.status', RideSession::STATUS_CANCELLED);
    }

    #[Test]
    public function a_suspension_mid_ride_still_lets_every_passenger_be_dropped_off(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->walkIn($driver);
        $b = $this->qr($tricycle);
        $this->start($driver)->assertOk();
        $tricycle->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);

        $this->dropOff($driver, $a)->assertOk();
        $this->dropOff($driver, $b)->assertOk()->assertJsonPath('ride.session.status', RideSession::STATUS_COMPLETED);
        $this->assertFalse($driver->fresh()->is_available, 'a suspended driver is not released into dispatch');
    }

    #[Test]
    public function an_unstarted_mixed_session_expires_and_cancels_walk_ins_too(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $a = $this->walkIn($driver);
        $b = $this->qr($tricycle);

        $this->travel(QrRideService::BOARDING_EXPIRY_MINUTES + 1)->minutes();
        $this->activeSession($driver)->assertJsonPath('ride', null);

        $this->assertSame(['cancelled', 'cancelled'], Booking::whereIn('booking_code', [$a, $b])->pluck('status')->all());
        $this->assertTrue($driver->fresh()->is_available);
        $this->assertSame(0, $this->openSessions($tricycle));
    }

    // ------------------------------------------------------------------ ISOLATION + MESSAGES

    #[Test]
    public function a_mixed_session_blocks_normal_bookings_and_dispatch(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $this->walkIn($driver);
        $this->qr($tricycle);
        $driver->update(['is_available' => true]); // even if availability drifted

        $pending = Booking::create([
            'booking_code' => 'BK-MIX-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'pickup_name' => 'A', 'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 50, 'status' => 'pending', 'requested_at' => now(),
        ]);
        $this->assertFalse(BookingDispatchService::getEligibleDrivers($pending)->contains('id', $driver->id));
        $pending->update(['dispatched_driver_id' => $driver->id, 'dispatched_at' => now()]);
        $this->as($driver->user)->postJson("/api/v1/driver/bookings/{$pending->id}/accept")->assertStatus(409);
    }

    #[Test]
    public function the_qr_says_available_boarding_in_progress_or_booked_ride(): void
    {
        // No session
        [$free] = $this->makeUnit();
        $status = $this->landingStatus($free);
        $this->assertTrue($status['available']);
        $this->assertSame('available', $status['state']);

        // On a normal booked ride only
        [$booked, $bookedDriver] = $this->makeUnit();
        Booking::create([
            'booking_code' => 'BK-MIX-' . uniqid(), 'passenger_id' => $this->passengerOf($this->makePassengerUser())->id,
            'driver_id' => $bookedDriver->id, 'pickup_name' => 'A', 'pickup_lat' => 14.07, 'pickup_lng' => 120.63,
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 50, 'status' => 'in_transit', 'requested_at' => now(),
        ]);
        $status = $this->landingStatus($booked);
        $this->assertFalse($status['available']);
        $this->assertSame('driver_busy', $status['reason']);
        $this->assertSame('The driver is on a booked ride.', $status['message']);
        $this->scan($this->makePassengerUser(), $booked)->assertStatus(409)->assertJsonPath('code', 'driver_busy');
    }

    #[Test]
    public function history_lists_each_passenger_not_the_session(): void
    {
        [$tricycle, $driver] = $this->makeUnit();
        $walkIn = $this->walkIn($driver);
        $qrCode = $this->qr($tricycle);
        $this->start($driver)->assertOk();
        $this->dropOff($driver, $walkIn)->assertOk();
        $this->dropOff($driver, $qrCode)->assertOk();

        $history = collect($this->as($driver->user)->getJson('/api/v1/driver/bookings/history')->assertOk()->json('bookings'));
        $mine = $history->whereIn('booking_code', [$walkIn, $qrCode])->keyBy('booking_code');
        $this->assertCount(2, $mine);
        $this->assertSame('manual', $mine[$walkIn]['booking_type']);
        $this->assertNull($mine[$walkIn]['passenger']);
        $this->assertSame('qr_walkin', $mine[$qrCode]['booking_type']);
        $this->assertSame(2, AuditLog::where('event', 'qr_ride.dropped_off')->whereIn('auditable_id', Booking::whereIn('booking_code', [$walkIn, $qrCode])->pluck('id'))->count());
    }
}
