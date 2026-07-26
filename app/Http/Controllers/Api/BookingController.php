<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\RideRating;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    /**
     * Passenger requests a new ride booking.
     */
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
            'fare_amount' => 'required|numeric|min:0',
            'distance_km' => 'nullable|numeric',
            'estimated_duration_mins' => 'nullable|integer',
            'passenger_notes' => 'nullable|string',
            'payment_method' => 'nullable|string|in:cash,gcash,wallet',
            'toda_zone_id' => 'nullable|exists:toda_zones,id',
        ]);

        $user = $request->user();
        $passenger = Passenger::firstOrCreate(
            ['user_id' => $user ? $user->id : 16],
            ['mobile_number' => '+63 900 000 0000', 'rating' => 5.00]
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

        // Determine nearest TODA zone if not specified
        $todaZoneId = $validated['toda_zone_id'] ?? null;
        if (!$todaZoneId) {
            $todaZones = \Illuminate\Support\Facades\DB::table('toda_zones')
                ->where('is_active', true)
                ->whereNotNull('center_lat')
                ->get();

            $minDist = null;
            foreach ($todaZones as $zone) {
                // Haversine distance formula
                $cLat = (float) $zone->center_lat;
                $cLng = (float) $zone->center_lng;
                $dLat = deg2rad($cLat - $pickupLat);
                $dLng = deg2rad($cLng - $pickupLng);
                $a = sin($dLat / 2) * sin($dLat / 2) +
                    cos(deg2rad($pickupLat)) * cos(deg2rad($cLat)) *
                    sin($dLng / 2) * sin($dLng / 2);
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                $distKm = 6371 * $c;

                if ($minDist === null || $distKm < $minDist) {
                    $minDist = $distKm;
                    $todaZoneId = $zone->id;
                }
            }
        }

        // Fallback default TODA zone if none calculated
        if (!$todaZoneId) {
            $todaZoneId = 3; // Default to TODA Brgy. 8
        }

        $bookingCode = 'BK-' . date('Ymd') . '-' . strtoupper(Str::random(4));

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
            'fare_amount' => $validated['fare_amount'],
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
     */
    public function getPendingRequests(Request $request): JsonResponse
    {
        $user = $request->user();
        $driverTodaZoneId = null;

        if ($user) {
            $driver = Driver::where('user_id', $user->id)->first();
            if ($driver && $driver->tricycle_id) {
                $tricycle = \App\Models\Tricycle::find($driver->tricycle_id);
                if ($tricycle) {
                    $driverTodaZoneId = $tricycle->toda_zone_id;
                }
            }
            if (!$driverTodaZoneId && $driver && $driver->operator_id) {
                $operator = \App\Models\Operator::find($driver->operator_id);
                if ($operator) {
                    $driverTodaZoneId = $operator->toda_id;
                }
            }
        }

        // Default to TODA Brgy. 8 (ID 3) if driver query is unauthenticated
        if (!$driverTodaZoneId) {
            $driverTodaZoneId = 3;
        }

        $query = Booking::with(['passenger.user', 'todaZone'])
            ->where('status', 'pending')
            ->where('requested_at', '>=', now()->subMinutes(15));

        if ($driverTodaZoneId) {
            $query->where('toda_zone_id', $driverTodaZoneId);
        }

        $requests = $query->orderBy('requested_at', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'driver_toda_zone_id' => $driverTodaZoneId,
            'requests' => $requests,
        ]);
    }

    /**
     * Driver accepts a ride booking.
     */
    public function acceptBooking(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $driver = $user ? Driver::where('user_id', $user->id)->first() : Driver::where('user_id', 20)->first();
        if (!$driver) {
            $driver = Driver::first();
        }

        $booking = Booking::findOrFail($id);

        $booking->update([
            'driver_id' => $driver->id,
            'tricycle_id' => $driver->tricycle_id,
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        if ($driver) {
            $todaZone = $booking->todaZone;
            $driver->update([
                'is_available' => false,
                'current_lat' => $driver->current_lat ?? ($todaZone ? $todaZone->center_lat : 14.0685),
                'current_lng' => $driver->current_lng ?? ($todaZone ? $todaZone->center_lng : 120.6285),
            ]);
        }

        return response()->json([
            'message' => 'Booking accepted successfully.',
            'booking' => $booking->load(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Driver or Passenger updates ride status ('arrived', 'in_transit', 'completed', 'cancelled').
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:arrived,in_transit,completed,cancelled',
            'cancellation_reason' => 'nullable|string',
        ]);

        $booking = Booking::findOrFail($id);
        $newStatus = $validated['status'];

        $updateData = ['status' => $newStatus];

        if ($newStatus === 'arrived') {
            $updateData['arrived_at'] = now();
        } elseif ($newStatus === 'in_transit') {
            $updateData['started_at'] = now();
        } elseif ($newStatus === 'completed') {
            $updateData['completed_at'] = now();
            $updateData['payment_status'] = 'paid';

            if ($booking->driver) {
                $booking->driver->increment('today_earnings', $booking->fare_amount);
                $booking->driver->increment('total_trips');
                $booking->driver->update(['is_available' => true]);
            }
            if ($booking->passenger) {
                $booking->passenger->increment('total_rides');
            }
        } elseif ($newStatus === 'cancelled') {
            $user = $request->user();
            $updateData['cancelled_at'] = now();
            $updateData['cancelled_by'] = ($user && $user->role === 'tricycle_driver') ? 'driver' : 'passenger';
            $updateData['cancellation_reason'] = $validated['cancellation_reason'] ?? 'Cancelled by user';

            if ($booking->driver) {
                $booking->driver->update(['is_available' => true]);
            }
        }

        $booking->update($updateData);

        return response()->json([
            'message' => "Booking status updated to {$newStatus}.",
            'booking' => $booking->load(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Get active ride details for passenger or driver.
     */
    public function getActiveBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $passenger = $user ? Passenger::where('user_id', $user->id)->first() : Passenger::first();
        $driver = $user ? Driver::where('user_id', $user->id)->first() : null;

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone'])
            ->whereIn('status', ['pending', 'accepted', 'arrived', 'in_transit', 'completed']);

        if ($user) {
            $query->where(function ($q) use ($passenger, $driver) {
                if ($passenger) {
                    $q->orWhere('passenger_id', $passenger->id);
                }
                if ($driver) {
                    $q->orWhere('driver_id', $driver->id);
                }
            });
        } elseif ($passenger) {
            $query->where('passenger_id', $passenger->id);
        }

        $booking = $query->latest('requested_at')->first();

        return response()->json([
            'booking' => $booking,
        ]);
    }

    /**
     * Driver updates real-time GPS location.
     */
    public function updateDriverLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $user = $request->user();
        $driver = $user ? Driver::where('user_id', $user->id)->first() : Driver::where('user_id', 20)->first();

        if (!$driver) {
            $driver = Driver::first();
        }

        if ($driver) {
            $driver->update([
                'current_lat' => $validated['latitude'],
                'current_lng' => $validated['longitude'],
                'last_location_updated_at' => now(),
            ]);
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
     * Get booking history for current user.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        $passenger = $user ? Passenger::where('user_id', $user->id)->first() : Passenger::first();
        $driver = $user ? Driver::where('user_id', $user->id)->first() : Driver::first();

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle']);

        if ($user) {
            $query->where(function ($q) use ($passenger, $driver) {
                if ($passenger) {
                    $q->orWhere('passenger_id', $passenger->id);
                }
                if ($driver) {
                    $q->orWhere('driver_id', $driver->id);
                }
            });
        } elseif ($passenger || $driver) {
            $query->where(function ($q) use ($passenger, $driver) {
                if ($passenger) {
                    $q->orWhere('passenger_id', $passenger->id);
                }
                if ($driver) {
                    $q->orWhere('driver_id', $driver->id);
                }
            });
        }

        $bookings = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'bookings' => $bookings,
            'history' => $bookings,
        ]);
    }

    /**
     * Rate completed ride.
     */
    public function rateRide(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'score' => 'required|integer|min:1|max:5',
            'feedback_tags' => 'nullable|array',
            'comment' => 'nullable|string',
        ]);

        $booking = Booking::findOrFail($id);
        $user = $request->user();
        $passenger = Passenger::where('user_id', $user->id)->first();

        if (!$passenger) {
            return response()->json(['message' => 'Passenger profile not found.'], 404);
        }

        $rating = RideRating::create([
            'booking_id' => $booking->id,
            'passenger_id' => $passenger->id,
            'driver_id' => $booking->driver_id,
            'score' => $validated['score'],
            'feedback_tags' => $validated['feedback_tags'] ?? [],
            'comment' => $validated['comment'] ?? null,
        ]);

        // Update driver average rating
        if ($booking->driver) {
            $avgScore = RideRating::where('driver_id', $booking->driver_id)->avg('score');
            $booking->driver->update(['rating' => round($avgScore, 2)]);
        }

        return response()->json([
            'message' => 'Rating submitted successfully.',
            'rating' => $rating,
        ]);
    }
}
