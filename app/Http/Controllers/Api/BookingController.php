<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDriverDecline;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\RideRating;
use App\Services\BookingDispatchService;
use App\Services\FareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    /**
     * Passenger requests a new ride booking.
     */
    public function requestBooking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pickup_name' => 'required|string|max:255',
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'dropoff_name' => 'required|string|max:255',
            'dropoff_lat' => 'required|numeric',
            'dropoff_lng' => 'required|numeric',
            'passenger_count' => 'required|integer|min:1',
            // The authoritative route distance for this trip — already computed by the Passenger
            // app from its real route (not a straight-line estimate) before confirmation. Required,
            // not defaulted: silently falling back to a fake distance would make the fare wrong
            // rather than honest about a missing value.
            'distance_km' => 'required|numeric|min:0',
            'estimated_duration_mins' => 'nullable|integer',
            'passenger_notes' => 'nullable|string',
            'payment_method' => 'nullable|string|in:cash,gcash,wallet',
            'toda_zone_id' => 'nullable|integer',
        ]);

        // This endpoint requires auth:sanctum (see routes/api.php), so $request->user() is
        // guaranteed here — the real booking flow must always belong to the authenticated
        // passenger, never a client-supplied id or an arbitrary fallback record.
        $passenger = Passenger::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['mobile_number' => $request->input('mobile_number', '+63 900 000 0000'), 'rating' => 5.00]
        );

        // Cancel any existing pending bookings for this passenger
        Booking::where('passenger_id', $passenger->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'Replaced by new booking request',
            ]);

        $bookingCode = 'BK-' . date('Ymd') . '-' . strtoupper(Str::random(4));

        // Fare is always server-computed from the route distance and passenger count via
        // FareService — never trust a client-supplied amount. The base fare depends on passenger
        // count (₱50 flat for 1, ₱25/passenger for 2+); the total is that per-passenger figure
        // charged once per rider (never a client-typed "fare per passenger" — the system derives
        // it automatically from distance and passenger count).
        $farePerPassenger = FareService::perPassengerFare((float) $validated['distance_km'], (int) $validated['passenger_count']);
        $totalFare = FareService::calculate((float) $validated['distance_km'], (int) $validated['passenger_count']);

        $booking = Booking::create([
            'booking_code' => $bookingCode,
            'passenger_id' => $passenger->id,
            'toda_zone_id' => null,
            'pickup_name' => $validated['pickup_name'],
            'pickup_lat' => $validated['pickup_lat'],
            'pickup_lng' => $validated['pickup_lng'],
            'dropoff_name' => $validated['dropoff_name'],
            'dropoff_lat' => $validated['dropoff_lat'],
            'dropoff_lng' => $validated['dropoff_lng'],
            'passenger_count' => $validated['passenger_count'],
            'fare_per_passenger' => $farePerPassenger,
            'fare_amount' => $totalFare,
            'distance_km' => $validated['distance_km'],
            'estimated_duration_mins' => $validated['estimated_duration_mins'] ?? 8,
            'passenger_notes' => $validated['passenger_notes'] ?? null,
            'payment_method' => $validated['payment_method'] ?? 'cash',
            'payment_status' => 'pending',
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // Immediately evaluate and target the nearest eligible driver sequentially
        BookingDispatchService::evaluateDispatch($booking);

        return response()->json([
            'message' => 'Booking request created successfully.',
            'booking' => $booking->fresh()->load(['passenger.user']),
        ], 201);
    }

    /**
     * Driver lists pending booking requests matching their TODA zone.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — the driver is always resolved
     * from the authenticated account, never a client-supplied driver_id/user_id query param
     * (previously trusted, which let any caller enumerate another driver's pending requests).
     */
    /**
     * Driver lists pending booking requests targeted to them sequentially by nearest distance.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — the driver is always resolved
     * from the authenticated account.
     */
    public function getPendingRequests(Request $request): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        // Only online and available drivers receive booking requests
        if (!$driver || !$driver->is_online || !$driver->is_available) {
            return response()->json([
                'requests' => [],
                'notice' => $driver ? 'Driver is offline or unavailable.' : 'Driver not found.',
            ]);
        }

        // Query active pending bookings created within the last 15 minutes that this driver has not declined
        $declinedBookingIds = BookingDriverDecline::where('driver_id', $driver->id)->pluck('booking_id');

        $pendingBookings = Booking::with(['passenger.user', 'tricycle'])
            ->where('status', 'pending')
            ->where('requested_at', '>=', now()->subMinutes(15))
            ->whereNotIn('id', $declinedBookingIds)
            ->orderBy('requested_at', 'asc')
            ->get();

        $myRequests = [];
        foreach ($pendingBookings as $booking) {
            // Evaluate sequential nearest-driver queue for this booking
            $targetedDriver = BookingDispatchService::evaluateDispatch($booking);
            if ($targetedDriver && $targetedDriver->id === $driver->id && $booking->status === 'pending') {
                $myRequests[] = $booking;
            }
        }

        return response()->json([
            'requests' => $myRequests,
        ]);
    }

    /**
     * Driver accepts a ride booking.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — acceptance is always tied to
     * the authenticated driver's own account, never a client-supplied id or an arbitrary
     * fallback record.
     */
    public function acceptBooking(Request $request, int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json(['message' => 'No driver profile found for this account.'], 403);
        }

        $booking = null;
        $conflict = false;
        $stale = false;

        DB::transaction(function () use ($id, $driver, &$booking, &$conflict, &$stale) {
            $locked = Booking::where('id', $id)->lockForUpdate()->first();

            if (!$locked) {
                return;
            }

            if ($locked->status !== 'pending') {
                $conflict = true;
                return;
            }

            // The sequential dispatch queue is only meaningful if acceptance is restricted to
            // whoever it currently targets — otherwise a driver holding a stale copy of a request
            // that has already moved on to the next nearest driver (or expired outright) could
            // still grab it out of turn. Both conditions are re-checked against the just-locked
            // row, never a cached value.
            $offerExpired = $locked->dispatched_at
                && $locked->dispatched_at->diffInSeconds(now()) >= BookingDispatchService::OFFER_TIMEOUT_SECONDS;

            if ($locked->dispatched_driver_id !== $driver->id || $offerExpired) {
                $stale = true;
                return;
            }

            $locked->update([
                'driver_id' => $driver->id,
                'tricycle_id' => $driver->tricycle_id,
                'dispatched_driver_id' => null,
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            $driver->update([
                'is_available' => false,
                'current_lat' => $driver->current_lat ?? 14.0685,
                'current_lng' => $driver->current_lng ?? 120.6285,
            ]);

            $booking = $locked;
        });

        if ($conflict) {
            return response()->json(['message' => 'This ride is no longer available.'], 409);
        }

        if ($stale) {
            return response()->json(['message' => 'This ride offer is no longer assigned to you or has expired.'], 409);
        }

        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        return response()->json([
            'message' => 'Booking accepted successfully.',
            'booking' => $booking->load(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Driver declines a pending ride request.
     *
     * Records that THIS driver passed on THIS booking and immediately advances the sequential
     * dispatch queue to the next nearest eligible driver.
     */
    public function declineBooking(Request $request, int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (! $driver) {
            return response()->json(['message' => 'No driver profile found for this account.'], 403);
        }

        $booking = Booking::where('id', $id)->first();
        if (! $booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        BookingDispatchService::handleDriverDecline($booking, $driver->id);

        return response()->json(['message' => 'Booking declined.']);
    }

    /**
     * Booking statuses reachable from each current status via this endpoint. 'pending' and
     * 'accepted' are the only statuses never *set* here (pending is the initial value from
     * requestBooking; accepted only comes from acceptBooking's own atomic transaction) — but
     * 'pending' must remain a valid *origin*, since cancelling a still-searching booking (before
     * any driver has accepted) goes through this same endpoint.
     */
    private const ALLOWED_STATUS_TRANSITIONS = [
        'pending' => ['cancelled'],
        'accepted' => ['arrived', 'cancelled'],
        'arrived' => ['in_transit', 'cancelled'],
        'in_transit' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    /**
     * Driver or Passenger updates ride status ('arrived', 'in_transit', 'completed', 'cancelled').
     *
     * This endpoint requires auth:sanctum (see routes/api.php) and is shared by both the driver
     * and passenger route groups. Ownership is verified inside the lock against the booking's own
     * `driver_id`/`passenger_id` (resolved from the authenticated account, never a client-supplied
     * id) — only the booking's assigned driver or its own passenger may transition it, so one
     * driver/passenger can never move another's booking.
     *
     * Locked and transitioned inside a transaction, the same pattern as acceptBooking, so a
     * status change can't race with a concurrent one (e.g. the driver marks the ride completed
     * at the same moment the passenger cancels it) — whichever request acquires the lock first
     * wins, and the second sees the now-current status and is rejected as an invalid transition
     * instead of silently overwriting it.
     *
     * Cancellation (from any non-terminal status) never touches earnings/trips/rating — those are
     * only ever incremented in the 'completed' branch below, so a booking cancelled before or
     * after driver acceptance is preserved for history/audit but can never count as a completed
     * ride, generate earnings, or be rated. Whether it was cancelled before acceptance (no driver
     * ever assigned — `driver_id` stays null) or after (an assigned driver was already en route)
     * is fully recoverable from the existing `driver_id` + `cancelled_by` fields, so no extra
     * status/column is needed to distinguish the two.
     *
     * Driver-initiated cancellation is further restricted to the pickup/en-route phase — i.e. the
     * booking must still be 'accepted' (a driver can only own a booking once it's past 'pending',
     * so 'accepted' is the earliest reachable state here). Once the driver has tapped "Arrived",
     * driver cancellation is rejected below even though 'arrived'/'in_transit' otherwise appear as
     * valid targets for 'cancelled' in ALLOWED_STATUS_TRANSITIONS — that table still permits the
     * *passenger* to cancel from those states (unchanged, pre-existing behavior), so the extra
     * check here is driver-specific rather than a change to the transition table itself.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:arrived,in_transit,completed,cancelled',
            'cancellation_reason' => 'nullable|string',
        ]);
        $newStatus = $validated['status'];
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();
        $passenger = Passenger::where('user_id', $user->id)->first();

        $booking = null;
        $invalidTransitionFrom = null;
        $forbidden = false;
        $driverCancelWindowClosed = false;

        DB::transaction(function () use ($id, $newStatus, $validated, $driver, $passenger, &$booking, &$invalidTransitionFrom, &$forbidden, &$driverCancelWindowClosed) {
            $locked = Booking::where('id', $id)->lockForUpdate()->first();

            if (! $locked) {
                return;
            }

            $ownsAsDriver = $driver && $locked->driver_id === $driver->id;
            $ownsAsPassenger = $passenger && $locked->passenger_id === $passenger->id;

            if (! $ownsAsDriver && ! $ownsAsPassenger) {
                $forbidden = true;
                return;
            }

            if ($newStatus === 'cancelled' && $ownsAsDriver && $locked->status !== 'accepted') {
                $driverCancelWindowClosed = true;
                return;
            }

            $allowedTargets = self::ALLOWED_STATUS_TRANSITIONS[$locked->status] ?? [];
            if (! in_array($newStatus, $allowedTargets, true)) {
                $invalidTransitionFrom = $locked->status;
                return;
            }

            $updateData = ['status' => $newStatus];

            if ($newStatus === 'arrived') {
                $updateData['arrived_at'] = now();
            } elseif ($newStatus === 'in_transit') {
                $updateData['started_at'] = now();
            } elseif ($newStatus === 'completed') {
                $updateData['completed_at'] = now();
                $updateData['payment_status'] = 'paid';

                if ($locked->driver) {
                    $locked->driver->increment('today_earnings', $locked->fare_amount);
                    $locked->driver->increment('total_trips');
                    $locked->driver->update(['is_available' => true]);
                }
                if ($locked->passenger) {
                    $locked->passenger->increment('total_rides');
                }
            } elseif ($newStatus === 'cancelled') {
                $updateData['cancelled_at'] = now();
                $updateData['cancelled_by'] = $ownsAsDriver ? 'driver' : 'passenger';
                $updateData['cancellation_reason'] = $validated['cancellation_reason'] ?? 'Cancelled by user';

                if ($locked->driver) {
                    $locked->driver->update(['is_available' => true]);
                }
            }

            $locked->update($updateData);
            $booking = $locked;
        });

        if ($forbidden) {
            return response()->json(['message' => 'You are not authorized to update this booking.'], 403);
        }

        if ($driverCancelWindowClosed) {
            return response()->json([
                'message' => 'This ride can no longer be cancelled by the driver — cancellation is only allowed before arrival.',
            ], 409);
        }

        if ($invalidTransitionFrom) {
            return response()->json([
                'message' => "Cannot change status from '{$invalidTransitionFrom}' to '{$newStatus}'.",
            ], 409);
        }

        if (! $booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        return response()->json([
            'message' => "Booking status updated to {$newStatus}.",
            'booking' => $booking->load(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Get active ride details strictly for the authenticated passenger or driver.
     *
     * This endpoint requires auth:sanctum (see routes/api.php). The passenger/driver is always
     * resolved from $request->user(), never a client-supplied passenger_id/driver_id/user_id —
     * and the `booking_id` direct-lookup path now verifies the resolved booking actually belongs
     * to the caller before returning it. Previously that lookup was `Booking::find($bookingId)`
     * with no ownership check at all — an IDOR letting any authenticated caller fetch any other
     * user's ride details by simply incrementing the id.
     */
    public function getActiveBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $bookingId = $request->query('booking_id');
        $isPassengerRoute = $request->is('*passenger*');

        $passenger = $isPassengerRoute ? Passenger::where('user_id', $user->id)->first() : null;
        $driver = $isPassengerRoute ? null : Driver::where('user_id', $user->id)->first();

        if ($bookingId) {
            $booking = Booking::with(['passenger.user', 'driver.user', 'tricycle'])
                ->find($bookingId);

            $owns = $booking && (
                ($passenger && $booking->passenger_id === $passenger->id) ||
                ($driver && $booking->driver_id === $driver->id)
            );

            if ($owns && $booking->driver) {
                $booking->driver->append('heading_deg');
            }

            return response()->json(['booking' => $owns ? $booking : null]);
        }

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle']);

        if ($isPassengerRoute) {
            $query->whereIn('status', ['pending', 'accepted', 'arrived', 'in_transit']);
            if ($passenger) {
                $query->where('passenger_id', $passenger->id);
            } else {
                $query->where('passenger_id', -1);
            }
            $booking = $query->latest('requested_at')->first();
            if ($booking && $booking->status === 'pending') {
                BookingDispatchService::evaluateDispatch($booking);
                $booking->refresh();
            }
        } else {
            // 1. Check if driver has an assigned active booking
            $assignedBooking = null;
            if ($driver) {
                $assignedBooking = (clone $query)
                    ->where('driver_id', $driver->id)
                    ->whereIn('status', ['accepted', 'arrived', 'in_transit'])
                    ->latest('requested_at')
                    ->first();
            }

            if ($assignedBooking) {
                $booking = $assignedBooking;
            } else {
                // 2. If no assigned active ride, return the pending request targeted to this driver IF online & available
                $booking = null;
                if ($driver && $driver->is_online && $driver->is_available) {
                    $pendingBooking = (clone $query)
                        ->where('status', 'pending')
                        ->where('dispatched_driver_id', $driver->id)
                        ->latest('requested_at')
                        ->first();

                    if ($pendingBooking) {
                        $target = BookingDispatchService::evaluateDispatch($pendingBooking);
                        if ($target && $target->id === $driver->id && $pendingBooking->status === 'pending') {
                            $booking = $pendingBooking;
                        }
                    }
                }
            }
        }

        if ($booking && $booking->driver) {
            $booking->driver->append('heading_deg');
        }

        return response()->json([
            'booking' => $booking,
        ]);
    }

    /**
     * Driver updates real-time GPS location.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — the driver whose location is
     * updated is always the authenticated account's own driver profile, never a client-supplied
     * driver_id/user_id, and never the "any active-ride driver, else the first driver in the
     * table" fallback this previously had (which could silently overwrite an unrelated driver's
     * GPS position).
     */
    public function updateDriverLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $driver = Driver::where('user_id', $request->user()->id)->first();

        if ($driver) {
            $driver->update([
                'current_lat' => $validated['latitude'],
                'current_lng' => $validated['longitude'],
                'last_location_updated_at' => now(),
            ]);

            $tricycleId = $driver->tricycle_id ?: ($driver->operator ? $driver->operator->tricycles()->value('id') : \App\Models\Tricycle::value('id'));

            if ($tricycleId) {
                try {
                    $source = ($driver->tricycle && $driver->tricycle->active_tracking_mode === 'iot_device') ? 'gps_device' : 'mobile_app';

                    \App\Models\TricycleLocation::create([
                        'tricycle_id'   => $tricycleId,
                        'latitude'      => $validated['latitude'],
                        'longitude'     => $validated['longitude'],
                        'speed_kmh'     => $request->input('speed_kmh', 22.5),
                        'heading_deg'   => (int) $request->input('heading_deg', 0),
                        'source'        => $source,
                        'recorded_at'   => now(),
                    ]);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('TricycleLocation log failed: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Driver location updated successfully.',
            'location' => [
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
            ],
        ]);
    }

    /**
     * Get booking history strictly for the authenticated passenger or driver.
     *
     * This endpoint requires auth:sanctum (see routes/api.php). The passenger/driver is always
     * resolved from $request->user() — this previously trusted a client-supplied passenger_id/
     * driver_id/user_id query param, and for drivers specifically fell back to a hardcoded
     * `driver.pramos@trivora.ph` account (or literally `Driver::first()`) whenever no id
     * resolved, which is the root cause of drivers seeing another driver's ride history.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $isPassengerRoute = $request->is('*passenger*');

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'rating']);

        if ($isPassengerRoute) {
            $passenger = Passenger::where('user_id', $user->id)->first();
            $query->where('passenger_id', $passenger ? $passenger->id : -1);
        } else {
            $driver = Driver::where('user_id', $user->id)->first();
            $query->where('driver_id', $driver ? $driver->id : -1);
        }

        $bookings = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'bookings' => $bookings,
            'history'  => $bookings,
        ]);
    }

    /**
     * Rate completed ride.
     */
    /**
     * Passenger rates the driver for a completed ride they actually took.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — the rating is always tied to
     * the authenticated passenger's own account, never a client-supplied id. It previously had
     * no auth requirement and fell back to a hardcoded `passenger_id => 1` whenever no id could
     * be resolved (which was always, since nothing ever sent one) — under real traffic this
     * either violated the `ride_ratings.passenger_id` foreign key outright, or silently
     * attributed the rating to whatever passenger happened to have id 1. The permissive
     * "closest completed booking" / "any booking at all" fallbacks are removed too: the booking
     * id given must genuinely belong to this passenger and be completed, or the request is
     * rejected — a rating must never attach to the wrong ride.
     */
    public function rateRide(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'score' => 'required|integer|min:1|max:5',
            'feedback_tags' => 'nullable|array',
            'comment' => 'nullable|string',
        ]);

        $passenger = Passenger::where('user_id', $request->user()->id)->first();

        if (! $passenger) {
            return response()->json(['message' => 'No passenger profile found for this account.'], 403);
        }

        $booking = Booking::where('id', $id)->where('passenger_id', $passenger->id)->first();

        if (! $booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        if ($booking->status !== 'completed') {
            return response()->json(['message' => 'Only completed rides can be rated.'], 409);
        }

        if (! $booking->driver_id) {
            return response()->json(['message' => 'This booking has no assigned driver to rate.'], 422);
        }

        // Idempotent — resubmitting (e.g. a double-tap on Submit) updates the same rating instead
        // of creating a second row for the same booking.
        $rating = RideRating::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'passenger_id' => $passenger->id,
                'driver_id' => $booking->driver_id,
                'score' => $validated['score'],
                'feedback_tags' => $validated['feedback_tags'] ?? [],
                'comment' => $validated['comment'] ?? null,
            ]
        );

        $avgScore = RideRating::where('driver_id', $booking->driver_id)->avg('score');
        Driver::whereKey($booking->driver_id)->update(['rating' => round($avgScore, 2)]);

        return response()->json([
            'message' => 'Rating submitted successfully and saved to database.',
            'rating' => $rating,
        ], 201);
    }
}
