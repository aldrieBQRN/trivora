<?php

namespace App\Services;

use App\Exceptions\QrRideException;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Manual Ride: the driver adds a walk-in passenger who has no Trivora app and doesn't scan a QR.
 * Stored as a Booking (booking_type = manual) with NO passenger — no identity is ever invented.
 *
 * A walk-in passenger joins the tricycle's ONE open ride session, exactly like a QR passenger:
 *
 *   quote (server pick-up from the driver's own fresh GPS + RouteDistanceService + FareService,
 *   signed) -> add (booking waiting in the tricycle's boarding session — created if none is open,
 *   so QR passengers can still join it) -> the session's Start Ride / Drop Off / Remove
 *   (QrRideService) handle every passenger, QR or walk-in, the same way.
 *
 * Seats are shared by the whole session and counted by party size. Adding takes the same tricycle
 * row lock as a QR join, so the two can never open two sessions or overbook a seat.
 *
 * complete()/cancel()/active() only exist for a legacy stand-alone Manual Ride (ride_session_id
 * NULL) started before mixed sessions, so such a trip can still be closed.
 */
class ManualRideService
{
    /** Same lifetime as a Scan to Ride quote. */
    public const QUOTE_TTL_SECONDS = 300;

    public function __construct(
        private readonly RouteDistanceService $routes,
        private readonly QrRideService $qrRides,
    ) {
    }

    /** Server pick-up (driver's fresh GPS), server distance and FareService fare, signed. */
    public function quote(User $user, array $input): array
    {
        $driver = $this->driverFor($user);
        $tricycle = $this->assertCanAdd($driver);
        $partySize = (int) $input['party_size'];
        [$capacity, $remaining] = $this->assertPartyFits($tricycle, $partySize);

        $pickup = $this->freshPosition($driver);
        if (!$pickup) {
            throw new QrRideException('gps_unavailable', 'Waiting for a GPS fix. Stay online with location on, then try again.');
        }

        try {
            $route = $this->routes->calculateDistance(
                (float) $pickup['lat'], (float) $pickup['lng'],
                (float) $input['dropoff_lat'], (float) $input['dropoff_lng'],
            );
        } catch (\InvalidArgumentException) {
            throw new QrRideException('invalid_coordinates', 'The destination location is invalid.', 422);
        }

        $farePerPassenger = FareService::perPassengerFare($route['distance_km'], $partySize);
        $fareAmount = FareService::calculate($route['distance_km'], $partySize);
        $expiresAt = now()->addSeconds(self::QUOTE_TTL_SECONDS);

        $payload = [
            'v' => 1,
            'kind' => 'manual',
            // One quote adds one passenger: a retried Add with the same quote is recognised.
            'quote_id' => (string) Str::uuid(),
            'driver_id' => $driver->id,
            'tricycle_id' => $tricycle->id,
            'party_size' => $partySize,
            'pickup_lat' => (float) $pickup['lat'],
            'pickup_lng' => (float) $pickup['lng'],
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
            'pickup' => ['lat' => $payload['pickup_lat'], 'lng' => $payload['pickup_lng'], 'source' => 'driver_gps'],
            'dropoff_name' => $payload['dropoff_name'],
            'distance_km' => $route['distance_km'],
            'distance_source' => $route['distance_source'],
            'estimated_duration_mins' => $route['duration_mins'],
            'fare_per_passenger' => $farePerPassenger,
            'fare_amount' => $fareAmount,
            'passenger_capacity' => $capacity,
            'seats_remaining' => $remaining,
        ];
    }

    /**
     * Add the walk-in passenger from a signed quote to the tricycle's open boarding session
     * (creating it if none is open). Every rule is re-checked under the tricycle lock. Retrying
     * with the same quote returns the passenger already added instead of adding a second one.
     *
     * @return array{0: Booking, 1: bool} [booking, created]
     */
    public function add(User $user, string $signedQuote, string $paymentMethod = 'cash'): array
    {
        $driver = $this->driverFor($user);
        $quote = $this->decodeQuote($signedQuote, $driver);

        return DB::transaction(function () use ($user, $driver, $quote, $paymentMethod) {
            // Lock order shared with QR joins: tricycle -> session -> booking/driver.
            $tricycle = Tricycle::whereKey($quote['tricycle_id'])->lockForUpdate()->first();
            $driver = $driver->fresh();
            if (!$tricycle || $driver->tricycle_id !== $tricycle->id) {
                throw new QrRideException('invalid_quote', 'This fare quote is invalid. Please get a new quote.', 422);
            }

            $existing = $this->bookingForQuote($quote['quote_id'] ?? null);
            if ($existing) {
                return [$existing, false];
            }

            if ($paymentMethod === Booking::PAYMENT_METHOD_GCASH && !$driver->hasGcashConfigured()) {
                throw new QrRideException('gcash_not_configured', 'You must configure your GCash QR code in Settings before accepting GCash payments.', 422);
            }

            $this->assertCanAdd($driver, $tricycle);
            $this->assertPartyFits($tricycle, (int) $quote['party_size']);
            $session = $this->qrRides->boardingSessionForNewPassenger($tricycle, $driver, (int) $quote['party_size']);
            $driver = Driver::whereKey($driver->id)->lockForUpdate()->first();

            $method = in_array($paymentMethod, [Booking::PAYMENT_METHOD_CASH, Booking::PAYMENT_METHOD_GCASH], true)
                ? $paymentMethod
                : Booking::PAYMENT_METHOD_CASH;

            $now = now();
            $booking = Booking::create([
                'booking_code' => $this->uniqueCode(),
                'booking_type' => Booking::TYPE_MANUAL,
                'passenger_id' => null,
                'ride_session_id' => $session->id,
                'driver_id' => $driver->id,
                'tricycle_id' => $tricycle->id,
                'pickup_name' => 'Manual ride pick-up (driver GPS)',
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
                'payment_method' => $method,
                'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
                // Waiting in the session, like a QR passenger; Start Ride moves everyone aboard.
                'status' => 'accepted',
                'requested_at' => $now,
                'accepted_at' => $now,
            ]);

            $driver->update(['is_available' => false]);

            $this->audit('manual_ride.added', $booking, $user, [
                'quote_id' => $quote['quote_id'] ?? null,
                'session_code' => $session->session_code,
                'party_size' => $booking->passenger_count,
                'distance_km' => $booking->distance_km,
                'distance_source' => $booking->distance_source,
                'fare_amount' => $booking->fare_amount,
            ]);

            return [$booking, true];
        });
    }

    /** The session payload (every passenger, QR and walk-in) the added booking belongs to. */
    public function sessionPayloadFor(Booking $booking): array
    {
        return $this->qrRides->driverSessionPayload($booking->rideSession()->first());
    }

    /** The driver's legacy stand-alone Manual Ride in progress, if any. */
    public function active(User $user): ?Booking
    {
        return self::activeRideFor($this->driverFor($user));
    }

    /**
     * Complete a legacy stand-alone ride: fresh GPS drop-off (or NULL — never invented), paid,
     * earnings/trips credited once. A retry on an already-completed ride changes nothing. Allowed
     * even after the franchise is suspended mid-ride, so the trip already in progress can be closed.
     */
    public function complete(User $user, string $bookingCode): Booking
    {
        $driver = $this->driverFor($user);
        $found = $this->driverRide($driver, $bookingCode);

        DB::transaction(function () use ($user, $found) {
            if ($found->tricycle_id) {
                Tricycle::whereKey($found->tricycle_id)->lockForUpdate()->first();
            }
            $booking = Booking::whereKey($found->id)->lockForUpdate()->first();
            if ($booking->status === 'completed') {
                return;
            }
            if ($booking->status !== 'in_transit') {
                throw new QrRideException('ride_not_active', 'This ride is no longer in progress.');
            }

            $driver = Driver::whereKey($booking->driver_id)->lockForUpdate()->first();
            $position = $this->freshPosition($driver);

            $booking->update([
                'status' => 'completed',
                'completed_at' => now(),
                'payment_status' => ($booking->payment_status === Booking::PAYMENT_STATUS_PAID) ? Booking::PAYMENT_STATUS_PAID : Booking::PAYMENT_STATUS_UNPAID,
                'dropped_off_lat' => $position['lat'] ?? null,
                'dropped_off_lng' => $position['lng'] ?? null,
            ]);

            // Release driver once trip finishes. Earnings credited on payment confirmation.
            $this->releaseDriver($driver);

            $this->audit('manual_ride.completed', $booking, $user, [
                'fare_amount' => $booking->fare_amount,
                'gps_recorded' => $position !== null,
            ]);
        });

        return $found->fresh();
    }

    /** Cancel a legacy stand-alone ride: nothing credited, driver released. Cancelling twice is a no-op. */
    public function cancel(User $user, string $bookingCode, ?string $reason = null): Booking
    {
        $driver = $this->driverFor($user);
        $found = $this->driverRide($driver, $bookingCode);

        DB::transaction(function () use ($user, $found, $reason) {
            if ($found->tricycle_id) {
                Tricycle::whereKey($found->tricycle_id)->lockForUpdate()->first();
            }
            $booking = Booking::whereKey($found->id)->lockForUpdate()->first();
            if ($booking->status === 'cancelled') {
                return;
            }
            if ($booking->status !== 'in_transit') {
                throw new QrRideException('ride_not_active', 'This ride is no longer in progress.');
            }

            $booking->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => 'driver',
                'cancellation_reason' => $reason ?: 'Manual ride cancelled by the driver',
            ]);

            $this->releaseDriver(Driver::whereKey($booking->driver_id)->lockForUpdate()->first());
            $this->audit('manual_ride.cancelled', $booking, $user, ['reason' => $booking->cancellation_reason]);
        });

        return $found->fresh();
    }

    // =========================================================================
    // Shared check used by the normal booking and QR flows
    // =========================================================================

    /** A legacy stand-alone Manual Ride (no session) still in progress. */
    public static function activeRideFor(Driver $driver): ?Booking
    {
        return Booking::where('driver_id', $driver->id)
            ->where('booking_type', Booking::TYPE_MANUAL)
            ->whereNull('ride_session_id')
            ->where('status', 'in_transit')
            ->latest('id')
            ->first();
    }

    public static function driverHasActiveManualRide(Driver $driver): bool
    {
        return self::activeRideFor($driver) !== null;
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function driverFor(User $user): Driver
    {
        $driver = Driver::where('user_id', $user->id)->first();
        if (!$driver) {
            throw new QrRideException('no_driver_profile', 'No driver profile found for this account.', 403);
        }

        return $driver;
    }

    /**
     * The driver may add a walk-in passenger now: online, franchise authorized, unit active, not on
     * a booked ride, and the tricycle's open session (if any) still boarding — QR passengers
     * waiting in it are fine, they share the ride.
     */
    private function assertCanAdd(Driver $driver, ?Tricycle $tricycle = null): Tricycle
    {
        $tricycle ??= $driver->tricycle;
        if (!$tricycle) {
            throw new QrRideException('no_tricycle', 'No tricycle is assigned to your account.');
        }
        if (!$driver->is_online) {
            throw new QrRideException('driver_offline', 'Go online before adding a walk-in passenger.');
        }

        $franchise = $tricycle->franchiseScheme()->first();
        if (!$franchise || !$franchise->canOperate()) {
            [$code, $message] = match (true) {
                $franchise?->isSuspended() => ['franchise_suspended', 'Your franchise is suspended, so you cannot start a new ride.'],
                $franchise?->isRevoked() => ['franchise_revoked', 'Your franchise has been revoked, so you cannot start a new ride.'],
                default => ['franchise_inactive', "Your tricycle doesn't have an active franchise."],
            };
            throw new QrRideException($code, $message, 403);
        }
        if ($tricycle->status !== 'active') {
            throw new QrRideException('tricycle_not_active', "Your tricycle isn't authorized to operate.", 403);
        }

        if (Booking::where('driver_id', $driver->id)->where('booking_type', Booking::TYPE_BOOKING)
            ->whereIn('status', ['accepted', 'arrived', 'in_transit'])->exists()) {
            throw new QrRideException('driver_busy', 'Finish your current booked ride first.');
        }
        if (self::driverHasActiveManualRide($driver)) {
            throw new QrRideException('manual_ride_active', 'You already have a Manual Ride in progress.');
        }
        if (RideSession::where('tricycle_id', $tricycle->id)->where('status', RideSession::STATUS_IN_PROGRESS)->exists()) {
            throw new QrRideException('ride_in_progress', 'Your ride is already in progress. Drop off your passengers before adding new ones.');
        }

        return $tricycle;
    }

    /**
     * The party fits the tricycle's remaining seats — shared with everyone already in the open
     * session, QR or walk-in. Returns [capacity, seats remaining before this party].
     *
     * @return array{0: int, 1: int}
     */
    private function assertPartyFits(Tricycle $tricycle, int $partySize): array
    {
        [, $capacity, $used] = $this->qrRides->seatsFor($tricycle);
        if ($capacity === null || $capacity < 1) {
            throw new QrRideException(
                'capacity_not_configured',
                "Your tricycle's passenger capacity hasn't been set by the Municipal Tricycle Office yet, so Manual Rides aren't available."
            );
        }

        $remaining = max(0, $capacity - $used);
        if ($partySize < 1 || $partySize > $capacity) {
            throw new QrRideException('capacity_exceeded', "Your tricycle can carry up to {$capacity} passenger" . ($capacity === 1 ? '' : 's') . '.', 422);
        }
        if ($partySize > $remaining) {
            throw new QrRideException(
                $remaining === 0 ? 'ride_full' : 'not_enough_seats',
                $remaining === 0 ? 'Your tricycle is full.' : "Only {$remaining} seat" . ($remaining === 1 ? '' : 's') . ' left in your tricycle.',
                422
            );
        }

        return [$capacity, $remaining];
    }

    private function decodeQuote(string $signedQuote, Driver $driver): array
    {
        try {
            $quote = Crypt::decrypt($signedQuote);
        } catch (DecryptException) {
            throw new QrRideException('invalid_quote', 'This fare quote is invalid. Please get a new quote.', 422);
        }

        if (!is_array($quote) || ($quote['v'] ?? null) !== 1 || ($quote['kind'] ?? null) !== 'manual'
            || ($quote['driver_id'] ?? null) !== $driver->id) {
            throw new QrRideException('invalid_quote', 'This fare quote is invalid. Please get a new quote.', 422);
        }
        if (($quote['expires_at'] ?? 0) < now()->timestamp) {
            throw new QrRideException('quote_expired', 'This fare quote has expired. Please get a new quote.', 422);
        }

        return $quote;
    }

    /** The walk-in passenger an earlier Add with this same quote created, if any (retry-safe). */
    private function bookingForQuote(?string $quoteId): ?Booking
    {
        if (!$quoteId) {
            return null;
        }

        $log = AuditLog::where('event', 'manual_ride.added')
            ->where('new_values->quote_id', $quoteId)
            ->latest('id')
            ->first();

        return $log ? Booking::find($log->auditable_id) : null;
    }

    private function driverRide(Driver $driver, string $bookingCode): Booking
    {
        $booking = Booking::where('booking_code', $bookingCode)
            ->where('booking_type', Booking::TYPE_MANUAL)
            ->whereNull('ride_session_id')
            ->where('driver_id', $driver->id)
            ->first();
        if (!$booking) {
            throw new QrRideException('ride_not_found', 'Manual Ride not found.', 404);
        }

        return $booking;
    }

    /** Back to normal dispatch only if still online and allowed to operate (same rule as QR). */
    private function releaseDriver(?Driver $driver): void
    {
        $driver?->update(['is_available' => $driver->is_online && $driver->canOperate()]);
    }

    /** Same "fresh = the tracker's signal-lost window" rule as QR Ride; never a guessed position. */
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

    private function uniqueCode(): string
    {
        do {
            $code = 'MR-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while (Booking::where('booking_code', $code)->exists());

        return $code;
    }

    private function audit(string $event, Booking $booking, User $actor, array $values): void
    {
        AuditLog::create([
            'user_id' => $actor->id,
            'event' => $event,
            'auditable_type' => Booking::class,
            'auditable_id' => $booking->id,
            'new_values' => $values + ['booking_code' => $booking->booking_code],
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }

    /** Driver-facing ride payload — the driver's own trip; no passenger identity exists. */
    public static function payload(Booking $booking): array
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
            'payment_reference' => $booking->payment_reference,
            'payment_amount_received' => $booking->payment_amount_received,
            'payment_change_amount' => $booking->payment_change_amount,
            'paid_at' => $booking->paid_at?->toIso8601String(),
            'started_at' => $booking->started_at?->toIso8601String(),
            'completed_at' => $booking->completed_at?->toIso8601String(),
            'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
            'dropped_off_recorded' => $booking->dropped_off_lat !== null,
        ];
    }
}
