<?php

namespace App\Services;

use App\Exceptions\QrRideException;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * QR Ride / Walk-in Ride business rules.
 *
 * A passenger already at a tricycle scans its QR (tricycles.qr_token), gets a server-computed
 * quote (RouteDistanceService + FareService) and joins. Every walk-in passenger is a normal
 * Booking (booking_type = qr_walkin) under one RideSession — the physical ride — reusing the
 * existing statuses: accepted = joined/waiting, in_transit = ride started, completed = dropped
 * off, cancelled = left/removed.
 *
 * Locking order, used by every mutating operation so they serialize without deadlocking:
 * passenger row (join only) -> tricycle row -> ride session row -> booking row.
 *
 * Franchise authority (Driver::canOperate / FranchiseScheme) gates everything that STARTS
 * operating — opening a session, joining, starting the ride. Removing a waiting passenger,
 * dropping off passengers already aboard, and ending an empty session stay allowed after a
 * suspension/revocation so nobody is stranded (decision D6).
 */
class QrRideService
{
    /** A boarding session that has not started within this many minutes expires. */
    public const BOARDING_EXPIRY_MINUTES = 30;

    /** How long a signed quote stays valid. */
    public const QUOTE_TTL_SECONDS = 300;

    /** How long a normal 'pending' booking is still a live search (BookingController::getPendingRequests). */
    private const PENDING_SEARCH_WINDOW_MINUTES = 15;

    /** QR booking statuses that occupy seats in a session. */
    private const SEATED_STATUSES = ['accepted', 'in_transit'];

    public function __construct(private readonly RouteDistanceService $routes)
    {
    }

    // =========================================================================
    // Passenger
    // =========================================================================

    /** Scan: the tricycle behind a QR token and whether this passenger can join it now. */
    public function scan(User $user, string $token): array
    {
        $passenger = $this->passengerFor($user);
        $tricycle = $this->tricycleByToken($token);
        $driver = $this->assertCanOperateNow($tricycle);

        $session = $this->openSessionForTricycle($tricycle);
        $own = $this->activeBookingFor($passenger);

        if ($own && !($own->booking_type === Booking::TYPE_QR_WALKIN && $session && $own->ride_session_id === $session->id)) {
            throw new QrRideException('passenger_has_active_ride', 'You already have an active ride. Finish or cancel it before joining another tricycle.');
        }

        [$canJoin, $reason, $capacity, $used] = $this->joinability($tricycle, $session);
        if ($own) {
            [$canJoin, $reason] = [false, 'already_joined'];
        }

        return [
            'tricycle' => $this->tricyclePayload($tricycle),
            'driver' => $this->driverPayload($driver),
            'ride' => [
                'state' => $session ? $session->status : 'available',
                'passenger_capacity' => $capacity,
                'seats_used' => $used,
                'seats_available' => $capacity === null ? null : max(0, $capacity - $used),
                'can_join' => $canJoin,
                'reason' => $reason,
                'reason_message' => $reason ? $this->reasonMessage($reason) : null,
                'your_booking_code' => $own?->booking_code,
            ],
            'gps' => $this->gpsFreshness($driver),
        ];
    }

    /** Quote: server distance + FareService fare for this passenger's own destination and party. */
    public function quote(User $user, array $input): array
    {
        $passenger = $this->passengerFor($user);
        $tricycle = $this->tricycleByToken($input['token']);
        $driver = $this->assertCanOperateNow($tricycle);
        $session = $this->openSessionForTricycle($tricycle);

        if ($this->activeBookingFor($passenger)) {
            throw new QrRideException('passenger_has_active_ride', 'You already have an active ride. Finish or cancel it before joining another tricycle.');
        }

        $partySize = (int) ($input['party_size'] ?? 1);
        [$canJoin, $reason, $capacity, $used] = $this->joinability($tricycle, $session);
        if (!$canJoin) {
            throw new QrRideException($reason, $this->reasonMessage($reason));
        }
        $this->assertSeats($capacity, $used, $partySize);

        $pickup = $this->authoritativePickup($tricycle, $input);

        try {
            $route = $this->routes->calculateDistance(
                $pickup['lat'], $pickup['lng'],
                (float) $input['dropoff_lat'], (float) $input['dropoff_lng'],
            );
        } catch (\InvalidArgumentException) {
            throw new QrRideException('invalid_coordinates', 'The pick-up or destination location is invalid.', 422);
        }

        $farePerPassenger = FareService::perPassengerFare($route['distance_km'], $partySize);
        $fareAmount = FareService::calculate($route['distance_km'], $partySize);
        $expiresAt = now()->addSeconds(self::QUOTE_TTL_SECONDS);

        $payload = [
            'v' => 1,
            'passenger_id' => $passenger->id,
            'tricycle_id' => $tricycle->id,
            'token_hash' => hash('sha256', $tricycle->qr_token),
            'driver_id' => $driver->id,
            'party_size' => $partySize,
            'pickup_name' => $input['pickup_name'] ?? 'Walk-in pick-up (QR)',
            'pickup_lat' => $pickup['lat'],
            'pickup_lng' => $pickup['lng'],
            'dropoff_name' => $input['dropoff_name'],
            'dropoff_lat' => (float) $input['dropoff_lat'],
            'dropoff_lng' => (float) $input['dropoff_lng'],
            'distance_km' => $route['distance_km'],
            'distance_source' => $route['distance_source'],
            'duration_mins' => $route['duration_mins'],
            'fare_per_passenger' => $farePerPassenger,
            'fare_amount' => $fareAmount,
            'expires_at' => $expiresAt->timestamp,
        ];

        return [
            'quote' => Crypt::encrypt($payload),
            'expires_at' => $expiresAt->toIso8601String(),
            'party_size' => $partySize,
            'pickup_name' => $payload['pickup_name'],
            'pickup' => ['lat' => $pickup['lat'], 'lng' => $pickup['lng'], 'source' => $pickup['source']],
            'dropoff_name' => $payload['dropoff_name'],
            'distance_km' => $route['distance_km'],
            'distance_source' => $route['distance_source'],
            'estimated_duration_mins' => $route['duration_mins'],
            'fare_per_passenger' => $farePerPassenger,
            'fare_amount' => $fareAmount,
        ];
    }

    /**
     * Join with a signed quote. Idempotent: re-submitting while already in this tricycle's open
     * session returns the existing booking instead of creating a second one.
     *
     * @return array{0: Booking, 1: bool} [booking, created]
     */
    public function join(User $user, string $signedQuote): array
    {
        $passenger = $this->passengerFor($user);
        $quote = $this->decodeQuote($signedQuote, $passenger);

        return DB::transaction(function () use ($user, $passenger, $quote) {
            Passenger::whereKey($passenger->id)->lockForUpdate()->first();
            $tricycle = Tricycle::whereKey($quote['tricycle_id'])->lockForUpdate()->first();
            if (!$tricycle || !hash_equals($quote['token_hash'], hash('sha256', (string) $tricycle->qr_token))) {
                throw new QrRideException('invalid_qr', 'This QR code is no longer valid.', 404);
            }

            $session = $this->openSessionForTricycle($tricycle, lock: true);

            $own = $this->activeBookingFor($passenger);
            if ($own) {
                if ($own->booking_type === Booking::TYPE_QR_WALKIN && $session && $own->ride_session_id === $session->id) {
                    return [$own, false];
                }
                throw new QrRideException('passenger_has_active_ride', 'You already have an active ride. Finish or cancel it before joining another tricycle.');
            }

            $driver = $this->assertCanOperateNow($tricycle);
            if ($driver->id !== $quote['driver_id'] || ($session && $session->driver_id !== $driver->id)) {
                throw new QrRideException('driver_changed', 'The driver of this tricycle changed. Please scan the QR code again.');
            }

            [$canJoin, $reason, $capacity, $used] = $this->joinability($tricycle, $session);
            if (!$canJoin) {
                throw new QrRideException($reason, $this->reasonMessage($reason));
            }
            $this->assertSeats($capacity, $used, $quote['party_size']);

            $session ??= $this->createBoardingSession($tricycle, $driver, $capacity);

            $booking = Booking::create([
                'booking_code' => $this->uniqueCode(Booking::class, 'booking_code', 'QR'),
                'booking_type' => Booking::TYPE_QR_WALKIN,
                'ride_session_id' => $session->id,
                'passenger_id' => $passenger->id,
                'driver_id' => $driver->id,
                'tricycle_id' => $tricycle->id,
                'pickup_name' => $quote['pickup_name'],
                'pickup_lat' => $quote['pickup_lat'],
                'pickup_lng' => $quote['pickup_lng'],
                'dropoff_name' => $quote['dropoff_name'],
                'dropoff_lat' => $quote['dropoff_lat'],
                'dropoff_lng' => $quote['dropoff_lng'],
                'passenger_count' => $quote['party_size'],
                'fare_per_passenger' => $quote['fare_per_passenger'],
                'fare_amount' => $quote['fare_amount'],
                'distance_km' => $quote['distance_km'],
                'distance_source' => $quote['distance_source'],
                'estimated_duration_mins' => $quote['duration_mins'],
                'payment_method' => 'cash',
                'payment_status' => 'pending',
                'status' => 'accepted',
                'requested_at' => now(),
                'accepted_at' => now(),
            ]);

            $driver->update(['is_available' => false]);

            $this->audit('qr_ride.joined', $booking, $user, [
                'session_code' => $session->session_code,
                'party_size' => $booking->passenger_count,
                'distance_km' => $booking->distance_km,
                'distance_source' => $booking->distance_source,
                'fare_amount' => $booking->fare_amount,
            ]);

            return [$booking, true];
        });
    }

    /** The passenger's current QR ride, or one of their own QR bookings by code. */
    public function passengerActive(User $user, ?string $bookingCode = null): ?array
    {
        $passenger = $this->passengerFor($user);
        $query = Booking::where('passenger_id', $passenger->id)->where('booking_type', Booking::TYPE_QR_WALKIN);

        $booking = $bookingCode
            ? $query->where('booking_code', $bookingCode)->first()
            : $query->whereIn('status', self::SEATED_STATUSES)->latest('id')->first();

        if (!$booking) {
            return null;
        }

        $session = $booking->rideSession;
        if ($session && $this->expireIfStale($session)) {
            $booking->refresh();
            $session->refresh();
        }

        $driver = $booking->driver;

        return [
            'booking' => $this->bookingPayload($booking) + ['booking_id' => $booking->id],
            'session' => $session ? [
                'session_code' => $session->session_code,
                'status' => $session->status,
                'started_at' => $session->started_at?->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String(),
            ] : null,
            'tricycle' => $booking->tricycle ? $this->tricyclePayload($booking->tricycle) : null,
            'driver' => $driver ? $this->driverPayload($driver) : null,
            'driver_location' => $driver ? $this->driverLocation($driver) : null,
        ];
    }

    /** Leave before the ride starts. Leaving twice is a no-op. */
    public function leave(User $user, string $bookingCode): Booking
    {
        $passenger = $this->passengerFor($user);
        $found = Booking::where('booking_code', $bookingCode)
            ->where('passenger_id', $passenger->id)
            ->where('booking_type', Booking::TYPE_QR_WALKIN)
            ->first();
        if (!$found) {
            throw new QrRideException('booking_not_found', 'Ride not found.', 404);
        }

        return DB::transaction(function () use ($user, $found) {
            [$session, $booking] = $this->lockSessionAndBooking($found);

            if ($booking->status === 'cancelled') {
                return $booking;
            }
            if ($booking->status !== 'accepted' || $session->status !== RideSession::STATUS_BOARDING) {
                throw new QrRideException('ride_already_started', 'The ride has already started. Ask the driver to drop you off.');
            }

            $booking->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => 'passenger',
                'cancellation_reason' => 'Left the QR ride before it started',
            ]);
            $this->audit('qr_ride.left', $booking, $user, ['session_code' => $session->session_code]);
            $this->closeIfEmpty($session, RideSession::ENDED_BY_PASSENGER, $user);

            return $booking;
        });
    }

    // =========================================================================
    // Driver
    // =========================================================================

    /** The driver's open QR session with its passengers, or null. */
    public function driverActiveSession(User $user): ?array
    {
        $driver = $this->driverFor($user);
        $session = $this->openSessionForDriver($driver);

        return $session ? $this->sessionPayload($session) : null;
    }

    /** Start the physical ride: boarding -> in_progress, every waiting passenger -> in_transit. */
    public function start(User $user): array
    {
        $driver = $this->driverFor($user);
        if (!$driver->canOperate()) {
            throw new QrRideException('franchise_not_operational', 'Your franchise is not authorized to operate, so a new ride cannot start.', 403);
        }
        if (!$driver->is_online) {
            throw new QrRideException('driver_offline', 'Go online before starting the ride.');
        }

        $found = $this->openSessionForDriver($driver);
        if (!$found) {
            throw new QrRideException('no_active_session', 'You have no walk-in passengers waiting.', 404);
        }

        $session = DB::transaction(function () use ($user, $found) {
            Tricycle::whereKey($found->tricycle_id)->lockForUpdate()->first();
            $session = RideSession::whereKey($found->id)->lockForUpdate()->first();

            if ($session->status === RideSession::STATUS_IN_PROGRESS) {
                throw new QrRideException('ride_already_started', 'This ride has already started.');
            }
            if ($session->status !== RideSession::STATUS_BOARDING) {
                throw new QrRideException('no_active_session', 'This ride is no longer open.', 404);
            }

            $waiting = $session->bookings()->where('status', 'accepted')->lockForUpdate()->get();
            if ($waiting->isEmpty()) {
                throw new QrRideException('no_passengers', 'There are no passengers to start the ride with.');
            }

            $startedAt = now();
            $session->update(['status' => RideSession::STATUS_IN_PROGRESS, 'started_at' => $startedAt]);
            $session->bookings()->whereIn('id', $waiting->pluck('id'))->update(['status' => 'in_transit', 'started_at' => $startedAt]);

            $this->audit('qr_session.started', $session, $user, [
                'passengers' => $waiting->count(),
                'seats_used' => (int) $waiting->sum('passenger_count'),
            ]);

            return $session;
        });

        return $this->sessionPayload($session->fresh());
    }

    /** Remove a waiting passenger before the ride starts. Removing twice is a no-op. */
    public function removePassenger(User $user, string $bookingCode): array
    {
        $driver = $this->driverFor($user);
        $found = $this->driverBooking($driver, $bookingCode);

        DB::transaction(function () use ($user, $driver, $found) {
            [$session, $booking] = $this->lockSessionAndBooking($found);
            if ($session->driver_id !== $driver->id) {
                throw new QrRideException('booking_not_found', 'Passenger not found in your ride.', 404);
            }
            if ($booking->status === 'cancelled') {
                return;
            }
            if ($booking->status !== 'accepted' || $session->status !== RideSession::STATUS_BOARDING) {
                throw new QrRideException('ride_already_started', 'Passengers can only be removed before the ride starts.');
            }

            $booking->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => 'driver',
                'cancellation_reason' => 'Removed by the driver before the ride started',
            ]);
            $this->audit('qr_ride.removed_by_driver', $booking, $user, ['session_code' => $session->session_code]);
            $this->closeIfEmpty($session, RideSession::ENDED_BY_DRIVER, $user);
        });

        return ['booking' => $this->bookingPayload($found->fresh()), 'ride' => $this->sessionPayload($found->rideSession->fresh())];
    }

    /**
     * Drop off one passenger. Records the tricycle's real, fresh GPS position (or none — never a
     * made-up one), completes that passenger's booking, and credits earnings / trip counts exactly
     * once. Completes the session after the last passenger. A retry on an already-completed
     * booking changes nothing.
     */
    public function dropOff(User $user, string $bookingCode): array
    {
        $driver = $this->driverFor($user);
        $found = $this->driverBooking($driver, $bookingCode);

        DB::transaction(function () use ($user, $driver, $found) {
            [$session, $booking] = $this->lockSessionAndBooking($found);
            if ($session->driver_id !== $driver->id) {
                throw new QrRideException('booking_not_found', 'Passenger not found in your ride.', 404);
            }
            if ($booking->status === 'completed') {
                return;
            }
            if ($session->status !== RideSession::STATUS_IN_PROGRESS) {
                throw new QrRideException('ride_not_started', 'Start the ride before dropping off passengers.');
            }
            if ($booking->status !== 'in_transit') {
                throw new QrRideException('passenger_not_aboard', 'This passenger is not on board.');
            }

            $driver = Driver::whereKey($driver->id)->lockForUpdate()->first();
            $position = $this->freshPosition($driver);

            $booking->update([
                'status' => 'completed',
                'completed_at' => now(),
                'payment_status' => 'paid',
                'dropped_off_lat' => $position['lat'] ?? null,
                'dropped_off_lng' => $position['lng'] ?? null,
            ]);

            // Same completion bookkeeping as a normal booking (BookingController::updateStatus):
            // one completed passenger = one trip (decision D4).
            $driver->increment('today_earnings', $booking->fare_amount);
            $driver->increment('total_trips');
            $booking->passenger?->increment('total_rides');

            $this->audit('qr_ride.dropped_off', $booking, $user, [
                'session_code' => $session->session_code,
                'fare_amount' => $booking->fare_amount,
                'gps_recorded' => $position !== null,
            ]);

            if (!$session->bookings()->whereIn('status', self::SEATED_STATUSES)->exists()) {
                $this->closeSession($session, RideSession::STATUS_COMPLETED, RideSession::END_REASON_ALL_DROPPED, RideSession::ENDED_BY_DRIVER, $user);
            }
        });

        $found->refresh();

        return ['booking' => $this->bookingPayload($found), 'ride' => $this->sessionPayload($found->rideSession->fresh())];
    }

    /** Close the driver's session — only once nobody is waiting or aboard. */
    public function end(User $user): array
    {
        $driver = $this->driverFor($user);
        $found = $this->openSessionForDriver($driver);
        if (!$found) {
            throw new QrRideException('no_active_session', 'You have no open walk-in ride.', 404);
        }

        $session = DB::transaction(function () use ($user, $found) {
            Tricycle::whereKey($found->tricycle_id)->lockForUpdate()->first();
            $session = RideSession::whereKey($found->id)->lockForUpdate()->first();
            if (!$session->isOpen()) {
                return $session;
            }

            if ($session->bookings()->whereIn('status', self::SEATED_STATUSES)->exists()) {
                throw new QrRideException(
                    'passengers_still_aboard',
                    $session->status === RideSession::STATUS_BOARDING
                        ? 'Passengers are still waiting. Start the ride or remove them first.'
                        : 'Drop off every passenger before ending the ride.'
                );
            }

            $completed = $session->bookings()->where('status', 'completed')->exists();
            $this->closeSession(
                $session,
                $completed ? RideSession::STATUS_COMPLETED : RideSession::STATUS_CANCELLED,
                RideSession::END_REASON_DRIVER_ENDED,
                RideSession::ENDED_BY_DRIVER,
                $user
            );

            return $session;
        });

        return $this->sessionPayload($session->fresh());
    }

    // =========================================================================
    // Shared session rules — used by QR joins and by Manual Ride (walk-in passengers added by
    // the driver), so one physical tricycle ride is always ONE session, whatever mix of QR and
    // walk-in passengers it carries.
    // =========================================================================

    /**
     * The session a new passenger of `$partySize` joins: the tricycle's open BOARDING session, or
     * a new one. Must be called inside a transaction that already holds the tricycle row lock (the
     * same lock QR joins take), so a QR join and a Manual Ride add can never open two sessions.
     * Seats are shared by every passenger in the session, QR or walk-in.
     */
    public function boardingSessionForNewPassenger(Tricycle $tricycle, Driver $driver, int $partySize): RideSession
    {
        $session = $this->openSessionForTricycle($tricycle, lock: true);
        if ($session && $session->driver_id !== $driver->id) {
            throw new QrRideException('driver_changed', 'This tricycle has an open ride with a different driver.');
        }

        [$canJoin, $reason, $capacity, $used] = $this->joinability($tricycle, $session);
        if (!$canJoin) {
            throw new QrRideException($reason, $this->reasonMessage($reason));
        }
        $this->assertSeats($capacity, $used, $partySize);

        return $session ?? $this->createBoardingSession($tricycle, $driver, $capacity);
    }

    /** Seats and state of the tricycle's open session (for quotes): [status|null, capacity, used]. */
    public function seatsFor(Tricycle $tricycle): array
    {
        $session = $this->openSessionForTricycle($tricycle);
        [, , $capacity, $used] = $this->joinability($tricycle, $session);

        return [$session?->status, $capacity, $used];
    }

    /** The driver-facing session payload (passengers with their source, seats, fares). */
    public function driverSessionPayload(RideSession $session): array
    {
        return $this->sessionPayload($session);
    }

    private function createBoardingSession(Tricycle $tricycle, Driver $driver, ?int $capacity): RideSession
    {
        return RideSession::create([
            'session_code' => $this->uniqueCode(RideSession::class, 'session_code', 'RS'),
            'tricycle_id' => $tricycle->id,
            'driver_id' => $driver->id,
            'status' => RideSession::STATUS_BOARDING,
            'capacity_at_start' => $capacity,
        ]);
    }

    // =========================================================================
    // Shared checks used by the normal booking flow
    // =========================================================================

    /** Whether the driver currently has an open (boarding / in-progress) QR session. */
    public static function driverHasOpenSession(Driver $driver): bool
    {
        return RideSession::where('driver_id', $driver->id)->open()->exists();
    }

    /** Whether the passenger is currently waiting in, or riding, a QR session. */
    public static function passengerHasActiveQrRide(Passenger $passenger): bool
    {
        return Booking::where('passenger_id', $passenger->id)
            ->where('booking_type', Booking::TYPE_QR_WALKIN)
            ->whereIn('status', self::SEATED_STATUSES)
            ->exists();
    }

    // =========================================================================
    // Public QR landing page + TMO QR management
    // =========================================================================

    /**
     * The public URL encoded in a tricycle's printed QR — built from the configured APP_URL
     * (never the incoming request host, never a hardcoded domain). Null when no token exists.
     */
    public static function publicUrl(Tricycle $tricycle): ?string
    {
        return $tricycle->qr_token
            ? rtrim((string) config('app.url'), '/') . '/ride/q/' . $tricycle->qr_token
            : null;
    }

    /**
     * What the public /ride/q/{token} page may show: the same checks as a passenger scan, minus
     * anything about a particular passenger, and no driver details, ids or token.
     */
    public function publicStatus(string $token): array
    {
        try {
            $tricycle = $this->tricycleByToken($token);
        } catch (QrRideException $e) {
            return ['valid' => false, 'available' => false, 'reason' => $e->errorCode, 'message' => $e->getMessage(), 'tricycle' => null];
        }

        $status = ['valid' => true, 'available' => false, 'reason' => null, 'message' => null, 'tricycle' => $this->tricyclePayload($tricycle)];

        try {
            $this->assertCanOperateNow($tricycle);
        } catch (QrRideException $e) {
            return array_merge($status, ['reason' => $e->errorCode, 'message' => $e->getMessage()]);
        }

        $session = $this->openSessionForTricycle($tricycle);
        [$canJoin, $reason, $capacity, $used] = $this->joinability($tricycle, $session);
        $boarding = $session && $session->status === RideSession::STATUS_BOARDING;

        return array_merge($status, [
            'available' => $canJoin,
            'reason' => $reason,
            // no session | boarding (QR, walk-in or mixed) | in progress — never an internal detail
            'state' => $session ? $session->status : 'available',
            'seats_available' => $capacity === null ? null : max(0, $capacity - $used),
            'message' => $canJoin
                ? ($boarding
                    ? 'Passengers are currently boarding. Open the Trivora Passenger app to enter your destination and join this ride.'
                    : 'This tricycle is taking walk-in passengers. Open the Trivora Passenger app to enter your destination and join the ride.')
                : $this->reasonMessage($reason),
        ]);
    }

    /**
     * QR Ride configuration readiness for the TMO Tricycle Details page. "Ready" means the unit is
     * configured for walk-in passengers (QR assigned, capacity set, unit and franchise authorized);
     * whether a driver is online right now is a live condition, not configuration.
     */
    public static function tmoSummary(Tricycle $tricycle): array
    {
        $franchise = $tricycle->franchiseScheme;
        $operational = $tricycle->status === 'active' && $franchise?->canOperate();

        [$status, $note] = match (true) {
            !$tricycle->qr_token => ['not_ready', 'No QR code is assigned to this unit. Regenerate one to enable QR Ride.'],
            !$franchise => ['not_ready', 'This unit has no active franchise, so it cannot take walk-in passengers.'],
            $franchise->isSuspended() => ['not_ready', 'The franchise is suspended. The QR will not accept passengers until it is reinstated.'],
            $franchise->isRevoked() => ['not_ready', 'The franchise is revoked. The QR will not accept passengers.'],
            !$operational => ['not_ready', 'This unit is not active in the registry, so it cannot take walk-in passengers.'],
            $tricycle->passenger_capacity === null => ['capacity_required', 'Set the passenger capacity before this QR can accept walk-in passengers.'],
            default => ['ready', 'Walk-in passengers can join whenever the driver is online.'],
        };

        return [
            'status' => $status,
            'note' => $note,
            'passenger_capacity' => $tricycle->passenger_capacity,
            'has_qr' => (bool) $tricycle->qr_token,
            'qr_url' => self::publicUrl($tricycle),
        ];
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * The QR ride's pick-up point, decided by the server: the tricycle's own latest GPS position
     * when it is fresh (the passenger is standing at the tricycle), otherwise the passenger's
     * phone location. The passenger never picks an arbitrary pick-up point.
     *
     * @return array{lat: float, lng: float, source: string}
     */
    private function authoritativePickup(Tricycle $tricycle, array $input): array
    {
        $latest = TricycleLocation::where('tricycle_id', $tricycle->id)->latest('recorded_at')->first();

        if ($latest && $latest->recorded_at->diffInSeconds(now()) <= config('tracking.fleet_signal_lost_seconds', 60)) {
            return ['lat' => (float) $latest->latitude, 'lng' => (float) $latest->longitude, 'source' => 'tricycle_gps'];
        }

        return ['lat' => (float) $input['pickup_lat'], 'lng' => (float) $input['pickup_lng'], 'source' => 'passenger_gps'];
    }

    private function passengerFor(User $user): Passenger
    {
        $passenger = Passenger::where('user_id', $user->id)->first();
        if (!$passenger) {
            throw new QrRideException('no_passenger_profile', 'No passenger profile found for this account.', 403);
        }

        return $passenger;
    }

    private function driverFor(User $user): Driver
    {
        $driver = Driver::where('user_id', $user->id)->first();
        if (!$driver) {
            throw new QrRideException('no_driver_profile', 'No driver profile found for this account.', 403);
        }

        return $driver;
    }

    private function tricycleByToken(string $token): Tricycle
    {
        $tricycle = $token !== '' ? Tricycle::where('qr_token', $token)->first() : null;
        if (!$tricycle) {
            throw new QrRideException('invalid_qr', "This QR code isn't a valid Trivora tricycle code.", 404);
        }

        return $tricycle;
    }

    /**
     * The tricycle may take a NEW walk-in passenger right now: franchise authorized, unit active,
     * its one driver account online and not busy with a normal booking. Returns that driver.
     */
    private function assertCanOperateNow(Tricycle $tricycle): Driver
    {
        $franchise = $tricycle->franchiseScheme()->first();
        if (!$franchise || !$franchise->canOperate()) {
            [$code, $message] = match (true) {
                $franchise?->isSuspended() => ['franchise_suspended', "This tricycle's franchise is suspended. It cannot take passengers."],
                $franchise?->isRevoked() => ['franchise_revoked', "This tricycle's franchise has been revoked. It cannot take passengers."],
                default => ['franchise_inactive', "This tricycle doesn't have an active franchise. It cannot take passengers."],
            };
            throw new QrRideException($code, $message);
        }
        if ($tricycle->status !== 'active') {
            throw new QrRideException('tricycle_not_active', "This tricycle isn't authorized to operate.");
        }

        // One franchise = one driver account (drivers.tricycle_id), resolved at scan time — the QR
        // identifies the vehicle, never a driver.
        $driver = Driver::where('tricycle_id', $tricycle->id)->orderByDesc('is_online')->first();
        if (!$driver) {
            throw new QrRideException('no_driver', 'No driver is registered for this tricycle.');
        }
        if (!$driver->is_online) {
            throw new QrRideException('driver_offline', "The driver isn't on duty. Ask the driver to go online in the Trivora Driver app.");
        }
        if ($this->driverHasActiveNormalBooking($driver)) {
            throw new QrRideException('driver_busy', 'The driver is on a booked ride.');
        }

        return $driver;
    }

    /**
     * A normal booked ride (or a legacy stand-alone Manual Ride with no session) keeps the tricycle
     * from taking walk-ins. Walk-in passengers added to the session itself do NOT — they share it.
     */
    private function driverHasActiveNormalBooking(Driver $driver): bool
    {
        return Booking::where('driver_id', $driver->id)
            ->whereIn('status', ['accepted', 'arrived', 'in_transit'])
            ->where(function ($q) {
                $q->where('booking_type', Booking::TYPE_BOOKING)
                    ->orWhere(fn ($m) => $m->where('booking_type', Booking::TYPE_MANUAL)->whereNull('ride_session_id'));
            })
            ->exists();
    }

    /** The passenger's current ride of any kind (normal or QR), if any. */
    private function activeBookingFor(Passenger $passenger): ?Booking
    {
        return Booking::where('passenger_id', $passenger->id)
            ->where(function ($q) {
                // A still-searching normal booking only counts while dispatch still considers it
                // (BookingController::getPendingRequests: requested within the last 15 minutes);
                // an abandoned search left 'pending' must not lock the passenger out forever.
                $q->whereIn('status', ['accepted', 'arrived', 'in_transit'])
                    ->orWhere(fn ($p) => $p->where('status', 'pending')
                        ->where('requested_at', '>=', now()->subMinutes(self::PENDING_SEARCH_WINDOW_MINUTES)));
            })
            ->latest('id')
            ->first();
    }

    /** @return array{0: bool, 1: ?string, 2: ?int, 3: int} [canJoin, reason, capacity, seatsUsed] */
    private function joinability(Tricycle $tricycle, ?RideSession $session): array
    {
        $capacity = $session ? $session->capacity_at_start : $tricycle->passenger_capacity;
        $used = $session ? $this->seatsUsed($session) : 0;

        if ($session && $session->status === RideSession::STATUS_IN_PROGRESS) {
            return [false, 'ride_in_progress', $capacity, $used];
        }
        if ($capacity === null || $capacity < 1) {
            return [false, 'capacity_not_configured', null, $used];
        }
        if ($used >= $capacity) {
            return [false, 'ride_full', $capacity, $used];
        }

        return [true, null, $capacity, $used];
    }

    private function assertSeats(?int $capacity, int $used, int $partySize): void
    {
        if ($capacity !== null && $used + $partySize > $capacity) {
            $left = max(0, $capacity - $used);
            throw new QrRideException(
                $left === 0 ? 'ride_full' : 'not_enough_seats',
                $left === 0 ? $this->reasonMessage('ride_full') : "Only {$left} seat" . ($left === 1 ? '' : 's') . ' left in this tricycle.'
            );
        }
    }

    private function reasonMessage(string $reason): string
    {
        return match ($reason) {
            'ride_in_progress' => 'This ride is currently in progress. Wait for the next trip.',
            'capacity_not_configured' => "This tricycle's passenger capacity hasn't been set by the Municipal Tricycle Office yet, so it can't take walk-in passengers.",
            'ride_full' => 'This tricycle is full.',
            'already_joined' => "You've already joined this ride.",
            default => 'This ride is not available.',
        };
    }

    private function seatsUsed(RideSession $session): int
    {
        return (int) $session->bookings()->whereIn('status', self::SEATED_STATUSES)->sum('passenger_count');
    }

    private function openSessionForTricycle(Tricycle $tricycle, bool $lock = false): ?RideSession
    {
        $query = RideSession::where('tricycle_id', $tricycle->id)->open()->latest('id');
        $session = $lock ? $query->lockForUpdate()->first() : $query->first();

        return $session && !$this->expireIfStale($session) ? $session : null;
    }

    private function openSessionForDriver(Driver $driver): ?RideSession
    {
        $session = RideSession::where('driver_id', $driver->id)->open()->latest('id')->first();

        return $session && !$this->expireIfStale($session) ? $session : null;
    }

    /**
     * Expires a boarding session left unstarted for BOARDING_EXPIRY_MINUTES: waiting passengers
     * are cancelled by the system and the driver is released. In-progress sessions never expire.
     * Checked whenever a session is read (no scheduler needed). Returns true when it expired.
     */
    private function expireIfStale(RideSession $session): bool
    {
        if ($session->status !== RideSession::STATUS_BOARDING
            || $session->created_at->gt(now()->subMinutes(self::BOARDING_EXPIRY_MINUTES))) {
            return false;
        }

        return DB::transaction(function () use ($session) {
            $locked = RideSession::whereKey($session->id)->lockForUpdate()->first();
            if ($locked->status !== RideSession::STATUS_BOARDING) {
                return !$locked->isOpen();
            }

            $locked->bookings()->where('status', 'accepted')->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => 'system',
                'cancellation_reason' => 'The QR ride expired before it started',
            ]);
            $this->closeSession($locked, RideSession::STATUS_CANCELLED, RideSession::END_REASON_EXPIRED, RideSession::ENDED_BY_SYSTEM, null);
            $session->setRawAttributes($locked->getAttributes(), true);

            return true;
        });
    }

    /** Cancels a boarding session nobody is waiting in any more. */
    private function closeIfEmpty(RideSession $session, string $endedBy, User $actor): void
    {
        if ($session->status === RideSession::STATUS_BOARDING
            && !$session->bookings()->whereIn('status', self::SEATED_STATUSES)->exists()) {
            $this->closeSession($session, RideSession::STATUS_CANCELLED, RideSession::END_REASON_NO_PASSENGERS, $endedBy, $actor);
        }
    }

    private function closeSession(RideSession $session, string $status, string $reason, string $endedBy, ?User $actor): void
    {
        $session->update([
            'status' => $status,
            'end_reason' => $reason,
            'ended_by' => $endedBy,
            'ended_at' => now(),
        ]);

        // Back to normal dispatch only if the driver is still online and allowed to operate — a
        // suspended/offline driver stays unavailable.
        $driver = $session->driver_id ? Driver::whereKey($session->driver_id)->lockForUpdate()->first() : null;
        if ($driver) {
            $driver->update(['is_available' => $driver->is_online && $driver->canOperate()]);
        }

        $this->audit('qr_session.ended', $session, $actor, [
            'status' => $status,
            'end_reason' => $reason,
            'ended_by' => $endedBy,
        ]);
    }

    /** @return array{0: RideSession, 1: Booking} both locked, in the standard order */
    private function lockSessionAndBooking(Booking $found): array
    {
        if ($found->tricycle_id) {
            Tricycle::whereKey($found->tricycle_id)->lockForUpdate()->first();
        }
        $session = $found->ride_session_id ? RideSession::whereKey($found->ride_session_id)->lockForUpdate()->first() : null;
        if (!$session) {
            throw new QrRideException('booking_not_found', 'Ride not found.', 404);
        }

        return [$session, Booking::whereKey($found->id)->lockForUpdate()->first()];
    }

    /** A passenger of the driver's session — QR or walk-in (Manual Ride) — by booking code. */
    private function driverBooking(Driver $driver, string $bookingCode): Booking
    {
        $booking = Booking::where('booking_code', $bookingCode)
            ->whereIn('booking_type', [Booking::TYPE_QR_WALKIN, Booking::TYPE_MANUAL])
            ->whereNotNull('ride_session_id')
            ->where('driver_id', $driver->id)
            ->first();
        if (!$booking) {
            throw new QrRideException('booking_not_found', 'Passenger not found in your ride.', 404);
        }

        return $booking;
    }

    private function decodeQuote(string $signedQuote, Passenger $passenger): array
    {
        try {
            $quote = Crypt::decrypt($signedQuote);
        } catch (DecryptException) {
            throw new QrRideException('invalid_quote', 'This fare quote is invalid. Please get a new quote.', 422);
        }

        if (!is_array($quote) || ($quote['v'] ?? null) !== 1 || ($quote['passenger_id'] ?? null) !== $passenger->id) {
            throw new QrRideException('invalid_quote', 'This fare quote is invalid. Please get a new quote.', 422);
        }
        if (($quote['expires_at'] ?? 0) < now()->timestamp) {
            throw new QrRideException('quote_expired', 'This fare quote has expired. Please get a new quote.', 422);
        }

        return $quote;
    }

    /** The driver's last reported position if it is recent enough to be "now"; never invented. */
    private function freshPosition(Driver $driver): ?array
    {
        if ($driver->current_lat === null || $driver->current_lng === null || !$driver->last_location_updated_at) {
            return null;
        }
        if ($driver->last_location_updated_at->diffInSeconds(now()) > config('tracking.fleet_signal_lost_seconds', 60)) {
            return null;
        }

        return ['lat' => $driver->current_lat, 'lng' => $driver->current_lng];
    }

    private function uniqueCode(string $model, string $column, string $prefix): string
    {
        do {
            $code = $prefix . '-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while ($model::where($column, $code)->exists());

        return $code;
    }

    private function audit(string $event, Model $subject, ?User $actor, array $values): void
    {
        AuditLog::create([
            'user_id' => $actor?->id,
            'event' => $event,
            'auditable_type' => $subject::class,
            'auditable_id' => $subject->getKey(),
            'new_values' => $values,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }

    // =========================================================================
    // Serialization — public-safe fields only (no QR token, phone numbers or internal ids)
    // =========================================================================

    private function tricyclePayload(Tricycle $tricycle): array
    {
        return [
            'plate_number' => $tricycle->plate_number,
            'sticker_number' => $tricycle->coding_scheme_number,
            'make' => $tricycle->make,
            'model' => $tricycle->model,
            'body_color' => $tricycle->body_color,
        ];
    }

    private function driverPayload(Driver $driver): array
    {
        $user = $driver->user;

        return [
            'first_name' => $user ? Str::of($user->name)->trim()->explode(' ')->first() : null,
            'profile_photo_url' => $user?->profile_photo_url,
            'rating' => $driver->rating,
        ];
    }

    private function gpsFreshness(Driver $driver): array
    {
        $at = $driver->last_location_updated_at;

        return [
            'last_updated_at' => $at?->toIso8601String(),
            'is_fresh' => $at !== null && $at->diffInSeconds(now()) <= config('tracking.fleet_signal_lost_seconds', 60),
        ];
    }

    /** The shared GPS stream every passenger in the session reads — the driver's real position. */
    private function driverLocation(Driver $driver): ?array
    {
        if ($driver->current_lat === null || $driver->current_lng === null || !$driver->last_location_updated_at) {
            return null;
        }

        return [
            'lat' => $driver->current_lat,
            'lng' => $driver->current_lng,
            'heading_deg' => $driver->heading_deg,
        ] + $this->gpsFreshness($driver);
    }

    private function bookingPayload(Booking $booking): array
    {
        return [
            'booking_code' => $booking->booking_code,
            'status' => $booking->status,
            'party_size' => $booking->passenger_count,
            'pickup' => ['name' => $booking->pickup_name, 'lat' => $booking->pickup_lat, 'lng' => $booking->pickup_lng],
            'dropoff' => ['name' => $booking->dropoff_name, 'lat' => $booking->dropoff_lat, 'lng' => $booking->dropoff_lng],
            'distance_km' => $booking->distance_km,
            'distance_source' => $booking->distance_source,
            'estimated_duration_mins' => $booking->estimated_duration_mins,
            'fare_per_passenger' => $booking->fare_per_passenger,
            'fare_amount' => $booking->fare_amount,
            'payment_method' => $booking->payment_method,
            'payment_status' => $booking->payment_status,
            'joined_at' => $booking->accepted_at?->toIso8601String(),
            'started_at' => $booking->started_at?->toIso8601String(),
            'completed_at' => $booking->completed_at?->toIso8601String(),
            'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
            'cancelled_by' => $booking->cancelled_by,
        ];
    }

    private function sessionPayload(RideSession $session): array
    {
        $bookings = $session->bookings()->with('passenger.user')
            ->whereIn('status', ['accepted', 'in_transit', 'completed'])
            ->orderBy('id')
            ->get();
        $used = (int) $bookings->whereIn('status', self::SEATED_STATUSES)->sum('passenger_count');
        $capacity = $session->capacity_at_start;

        return [
            'session' => [
                'session_code' => $session->session_code,
                'status' => $session->status,
                'capacity' => $capacity,
                'seats_used' => $used,
                'seats_remaining' => $capacity === null ? null : max(0, $capacity - $used),
                'opened_at' => $session->created_at?->toIso8601String(),
                'expires_at' => $session->status === RideSession::STATUS_BOARDING
                    ? $session->created_at?->copy()->addMinutes(self::BOARDING_EXPIRY_MINUTES)->toIso8601String()
                    : null,
                'started_at' => $session->started_at?->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String(),
                'end_reason' => $session->end_reason,
                'total_fare' => round((float) $bookings->sum('fare_amount'), 2),
            ],
            'passengers' => $bookings->map(fn (Booking $b) => $this->bookingPayload($b) + [
                // 'qr' = joined with the Passenger app; 'walk_in' = added by the driver (no account).
                'source' => $b->booking_type === Booking::TYPE_MANUAL ? 'walk_in' : 'qr',
                'passenger_name' => $b->passenger?->user?->name,
            ])->values()->all(),
        ];
    }
}
