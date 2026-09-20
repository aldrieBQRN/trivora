<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDriverDecline;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\RideRating;
use App\Services\TodaRouteMatcher;
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
            'fare_per_passenger' => 'required|numeric|min:0.01',
            'distance_km' => 'nullable|numeric',
            'estimated_duration_mins' => 'nullable|integer',
            'passenger_notes' => 'nullable|string',
            'payment_method' => 'nullable|string|in:cash,gcash,wallet',
            // Accepted for consistency with whatever TODA the passenger app displays, but never
            // trusted for zone assignment below — the app's zone ids are its own local reference
            // data and don't necessarily match this table's ids, so `exists:toda_zones,id` here
            // would 422 on a perfectly valid request. Pickup coordinates are authoritative.
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

        $pickupLat = (float) $validated['pickup_lat'];
        $pickupLng = (float) $validated['pickup_lng'];

        // Pickup coordinates are the authoritative source for TODA zone assignment — always
        // recomputed here as the nearest active TODA pin (haversine distance from pickup to
        // each TODA's own latitude/longitude), regardless of whatever toda_zone_id the client
        // sent. The client value is never used. TodaRouteMatcher itself falls back to any one
        // active zone if literally none have coordinates, so this is never left null while at
        // least one active TODA exists.
        $matchedZone = TodaRouteMatcher::matchRoute($pickupLat, $pickupLng);
        $todaZoneId = $matchedZone->id ?? null;

        $bookingCode = 'BK-' . date('Ymd') . '-' . strtoupper(Str::random(4));

        // Total fare is always server-computed from passenger_count * fare_per_passenger —
        // never trust a client-supplied total.
        $totalFare = round($validated['passenger_count'] * $validated['fare_per_passenger'], 2);

        $booking = Booking::create([
            'booking_code' => $bookingCode,
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $todaZoneId,
            'pickup_name' => $validated['pickup_name'],
            'pickup_lat' => $validated['pickup_lat'],
            'pickup_lng' => $validated['pickup_lng'],
            'dropoff_name' => $validated['dropoff_name'],
            'dropoff_lat' => $validated['dropoff_lat'],
            'dropoff_lng' => $validated['dropoff_lng'],
            'passenger_count' => $validated['passenger_count'],
            'fare_per_passenger' => $validated['fare_per_passenger'],
            'fare_amount' => $totalFare,
            'distance_km' => $validated['distance_km'] ?? 2.5,
            'estimated_duration_mins' => $validated['estimated_duration_mins'] ?? 8,
            'passenger_notes' => $validated['passenger_notes'] ?? null,
            'payment_method' => $validated['payment_method'] ?? 'cash',
            'payment_status' => 'pending',
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        return response()->json([
            'message' => 'Booking request created successfully.',
            'booking' => $booking->load(['passenger.user', 'todaZone']),
        ], 201);
    }

    /**
     * Driver lists pending booking requests matching their TODA zone.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — the driver is always resolved
     * from the authenticated account, never a client-supplied driver_id/user_id query param
     * (previously trusted, which let any caller enumerate another driver's pending requests).
     */
    public function getPendingRequests(Request $request): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        // Only online and available drivers receive booking requests
        if (!$driver || !$driver->is_online || !$driver->is_available) {
            return response()->json([
                'driver_toda_zone_id' => $driver ? $driver->getTodaZoneId() : null,
                'requests' => [],
                'notice' => $driver ? 'Driver is offline or unavailable.' : 'Driver not found.',
            ]);
        }

        $driverTodaZoneId = $driver->getTodaZoneId();

        if (!$driverTodaZoneId) {
            return response()->json([
                'driver_toda_zone_id' => null,
                'requests' => [],
                'notice' => 'Driver has no assigned TODA route.',
            ]);
        }

        // Query pending requests for driver's assigned TODA route only — excluding any this
        // specific driver has already declined (see declineBooking()), so a decline is permanent
        // for that driver for the life of this booking search without affecting whether other
        // eligible drivers in the same zone still receive it.
        $declinedBookingIds = BookingDriverDecline::where('driver_id', $driver->id)->pluck('booking_id');

        $requests = Booking::with(['passenger.user', 'todaZone'])
            ->where('status', 'pending')
            ->where('toda_zone_id', $driverTodaZoneId)
            ->where('requested_at', '>=', now()->subMinutes(15))
            ->whereNotIn('id', $declinedBookingIds)
            ->orderBy('requested_at', 'desc')
            ->take(10)
            ->get();

        // Filter out bookings outside driver's service area coverage (max 3.0 km)
        if ($driver->current_lat !== null && $driver->current_lng !== null) {
            $requests = $requests->filter(function ($booking) use ($driver) {
                return $driver->isWithinCoverage((float) $booking->pickup_lat, (float) $booking->pickup_lng, 3.0);
            })->values();
        }

        return response()->json([
            'driver_toda_zone_id' => $driverTodaZoneId,
            'requests' => $requests,
        ]);
    }

    /**
     * Driver accepts a ride booking.
     *
     * This endpoint requires auth:sanctum (see routes/api.php) — acceptance is always tied to
     * the authenticated driver's own account, never a client-supplied id or an arbitrary
     * fallback record.
     *
     * Atomicity: two drivers can call this for the same booking at nearly the same instant.
     * The row is locked (`lockForUpdate`) inside a transaction and the status is re-checked
     * after acquiring the lock, so only the first request to reach the lock can transition the
     * booking out of 'pending' — a second request sees the already-updated status and is
     * rejected with 409 instead of silently overwriting the first driver's assignment.
     */
    public function acceptBooking(Request $request, int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json(['message' => 'No driver profile found for this account.'], 403);
        }

        $booking = null;
        $conflict = false;

        DB::transaction(function () use ($id, $driver, &$booking, &$conflict) {
            $locked = Booking::where('id', $id)->lockForUpdate()->first();

            if (!$locked) {
                return;
            }

            if ($locked->status !== 'pending') {
                $conflict = true;
                return;
            }

            $locked->update([
                'driver_id' => $driver->id,
                'tricycle_id' => $driver->tricycle_id,
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            $todaZone = $locked->todaZone;
            $driver->update([
                'is_available' => false,
                'current_lat' => $driver->current_lat ?? ($todaZone ? $todaZone->center_lat : 14.0685),
                'current_lng' => $driver->current_lng ?? ($todaZone ? $todaZone->center_lng : 120.6285),
            ]);

            $booking = $locked;
        });

        if ($conflict) {
            return response()->json(['message' => 'This ride is no longer available.'], 409);
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
     * This does NOT touch the booking itself (it stays 'pending' for every other eligible driver
     * in the zone) — it only records that THIS driver passed on THIS booking, so
     * getPendingRequests() can exclude it for them going forward. `firstOrCreate` makes a retried/
     * duplicate decline a no-op instead of an error (also enforced at the DB level by the
     * booking_driver_declines unique(booking_id, driver_id) constraint).
     */
    public function declineBooking(Request $request, int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (! $driver) {
            return response()->json(['message' => 'No driver profile found for this account.'], 403);
        }

        if (! Booking::where('id', $id)->exists()) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        BookingDriverDecline::firstOrCreate([
            'booking_id' => $id,
            'driver_id' => $driver->id,
        ]);

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
            $booking = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone'])
                ->find($bookingId);

            $owns = $booking && (
                ($passenger && $booking->passenger_id === $passenger->id) ||
                ($driver && $booking->driver_id === $driver->id)
            );

            return response()->json(['booking' => $owns ? $booking : null]);
        }

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone']);

        if ($isPassengerRoute) {
            $query->whereIn('status', ['pending', 'accepted', 'arrived', 'in_transit']);
            if ($passenger) {
                $query->where('passenger_id', $passenger->id);
            } else {
                $query->where('passenger_id', -1);
            }
            $booking = $query->latest('requested_at')->first();
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
                // 2. If no assigned active ride, return the latest pending request for this driver's TODA zone IF online & available
                $booking = null;
                if ($driver && $driver->is_online && $driver->is_available) {
                    $driverTodaZoneId = $driver->getTodaZoneId();
                    if ($driverTodaZoneId) {
                        $pendingBooking = (clone $query)
                            ->where('status', 'pending')
                            ->where('toda_zone_id', $driverTodaZoneId)
                            ->latest('requested_at')
                            ->first();

                        if ($pendingBooking && $driver->isWithinCoverage((float)$pendingBooking->pickup_lat, (float)$pendingBooking->pickup_lng, 3.0)) {
                            $booking = $pendingBooking;
                        }
                    }
                }
            }
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

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone', 'rating']);

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
