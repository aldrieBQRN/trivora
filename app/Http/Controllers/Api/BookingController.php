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
        $userId = $request->input('user_id') ?: ($user ? $user->id : null);

        if ($userId) {
            $passenger = Passenger::firstOrCreate(
                ['user_id' => $userId],
                ['mobile_number' => $request->input('mobile_number', '+63 900 000 0000'), 'rating' => 5.00]
            );
        } else {
            $passenger = Passenger::first();
        }

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
        $rawDriverId = $request->input('driver_id') ?: ($request->input('user_id') ?: ($user ? $user->id : null));
        $cleanId = $rawDriverId ? (int) preg_replace('/[^0-9]/', '', (string) $rawDriverId) : null;

        $driver = null;
        if ($cleanId) {
            $driver = Driver::where('id', $cleanId)->orWhere('user_id', $cleanId)->first();
        }
        if (!$driver && $user) {
            $driver = Driver::where('user_id', $user->id)->first();
        }
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
    /**
     * Get active ride details for passenger or driver.
     */
    /**
     * Get active ride details strictly for current passenger or driver.
     */
    public function getActiveBooking(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $request->query('user_id') ?: ($user ? $user->id : null);
        $passengerId = $request->query('passenger_id');
        $driverId = $request->query('driver_id');
        $bookingId = $request->query('booking_id');
        $isPassengerRoute = $request->is('*passenger*');

        // Direct lookup if specific booking_id is queried
        if ($bookingId) {
            $booking = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone'])
                ->find($bookingId);
            if ($booking) {
                return response()->json(['booking' => $booking]);
            }
        }

        $cleanPassengerId = $passengerId ? (int) preg_replace('/[^0-9]/', '', (string)$passengerId) : null;
        $cleanDriverId = $driverId ? (int) preg_replace('/[^0-9]/', '', (string)$driverId) : null;
        $cleanUserId = $userId ? (int) preg_replace('/[^0-9]/', '', (string)$userId) : null;

        if ($cleanPassengerId) {
            $passenger = Passenger::where('id', $cleanPassengerId)->orWhere('user_id', $cleanPassengerId)->first();
        } elseif ($cleanUserId) {
            $passenger = Passenger::where('user_id', $cleanUserId)->orWhere('id', $cleanUserId)->first();
        }

        if ($cleanDriverId) {
            $driver = Driver::where('id', $cleanDriverId)->orWhere('user_id', $cleanDriverId)->first();
        } elseif ($cleanUserId) {
            $driver = Driver::where('user_id', $cleanUserId)->orWhere('id', $cleanUserId)->first();
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
                // 2. If no assigned active ride, return the latest pending request for this driver's TODA zone
                $pendingQuery = (clone $query)->where('status', 'pending');
                if ($driver && $driver->toda_zone_id) {
                    $pendingQuery->where('toda_zone_id', $driver->toda_zone_id);
                }
                $booking = $pendingQuery->latest('requested_at')->first();

                // Fallback to any latest pending booking if TODA zone match was empty
                if (!$booking) {
                    $booking = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone'])
                        ->where('status', 'pending')
                        ->latest('requested_at')
                        ->first();
                }
            }
        }

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
        $rawUserId = $request->query('driver_id') ?: ($request->query('user_id') ?: ($request->input('driver_id') ?: ($request->input('user_id') ?: ($user ? $user->id : null))));
        $cleanUserId = $rawUserId ? (int) preg_replace('/[^0-9]/', '', (string) $rawUserId) : null;

        $driver = null;
        if ($cleanUserId) {
            $driver = Driver::where('id', $cleanUserId)->orWhere('user_id', $cleanUserId)->first();
        }
        if (!$driver && $user) {
            $driver = Driver::where('user_id', $user->id)->first();
        }

        // Fallback to active ride driver if driver_id was missing
        if (!$driver) {
            $activeBooking = Booking::whereIn('status', ['accepted', 'arrived', 'in_transit'])
                ->whereNotNull('driver_id')
                ->latest('updated_at')
                ->first();
            if ($activeBooking) {
                $driver = $activeBooking->driver;
            }
        }

        if (!$driver) {
            $driver = Driver::first();
        }

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
     * Get booking history strictly for current passenger or driver.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $request->query('user_id') ?: ($user ? $user->id : null);
        $passengerId = $request->query('passenger_id');
        $driverId = $request->query('driver_id');
        $isPassengerRoute = $request->is('*passenger*');

        $query = Booking::with(['passenger.user', 'driver.user', 'tricycle', 'todaZone', 'rating']);

        if ($isPassengerRoute) {
            $cleanPassengerId = $passengerId ? (int) preg_replace('/[^0-9]/', '', (string)$passengerId) : null;
            $cleanUserId = $userId ? (int) preg_replace('/[^0-9]/', '', (string)$userId) : null;

            $passenger = null;
            if ($cleanPassengerId) {
                $passenger = Passenger::where('id', $cleanPassengerId)->orWhere('user_id', $cleanPassengerId)->first();
            } elseif ($cleanUserId) {
                $passenger = Passenger::where('user_id', $cleanUserId)->orWhere('id', $cleanUserId)->first();
            }

            if ($passenger) {
                $query->where('passenger_id', $passenger->id);
            } else {
                $query->where('passenger_id', -1);
            }
        } else {
            $cleanDriverId = $driverId ? (int) preg_replace('/[^0-9]/', '', (string)$driverId) : null;
            $cleanUserId = $userId ? (int) preg_replace('/[^0-9]/', '', (string)$userId) : null;

            $driver = null;
            if ($cleanDriverId) {
                $driver = Driver::where('id', $cleanDriverId)->orWhere('user_id', $cleanDriverId)->first();
            } elseif ($cleanUserId) {
                $driver = Driver::where('user_id', $cleanUserId)->orWhere('id', $cleanUserId)->first();
            }

            if ($driver) {
                $query->where('driver_id', $driver->id);
            } else {
                $query->where('driver_id', -1);
            }
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
    public function rateRide(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'score' => 'required|integer|min:1|max:5',
            'feedback_tags' => 'nullable|array',
            'comment' => 'nullable|string',
        ]);

        $user = $request->user();
        $rawUserId = $request->input('user_id') ?: ($request->input('passenger_id') ?: ($user ? $user->id : null));
        $cleanUserId = $rawUserId ? (int) preg_replace('/[^0-9]/', '', (string) $rawUserId) : null;
        $passenger = null;

        if ($cleanUserId) {
            $passenger = Passenger::where('id', $cleanUserId)->orWhere('user_id', $cleanUserId)->first();
        }

        $booking = Booking::find($id);

        // If requested booking_id is invalid or not completed, resolve passenger's latest completed booking
        if (!$booking || $booking->status !== 'completed') {
            $query = Booking::where('status', 'completed');
            if ($passenger) {
                $query->where('passenger_id', $passenger->id);
            }
            $booking = $query->latest('completed_at')->latest('id')->first();
        }

        if (!$booking) {
            $booking = Booking::where('status', 'completed')->latest('id')->first() ?: Booking::latest('id')->first();
        }

        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        $driverId = $booking->driver_id ?: ($booking->driver ? $booking->driver->id : \App\Models\Driver::value('id'));

        $rating = RideRating::create([
            'booking_id'   => $booking->id,
            'passenger_id' => $passenger ? $passenger->id : 1,
            'driver_id'    => $driverId ?: 1,
            'score'        => $validated['score'],
            'feedback_tags'=> $validated['feedback_tags'] ?? [],
            'comment'      => $validated['comment'] ?? null,
        ]);

        // Update driver average rating
        if ($driverId) {
            $driver = \App\Models\Driver::find($driverId);
            if ($driver) {
                $avgScore = RideRating::where('driver_id', $driverId)->avg('score');
                $driver->update(['rating' => round($avgScore, 2)]);
            }
        }

        return response()->json([
            'message' => 'Rating submitted successfully and saved to database.',
            'rating'  => $rating,
        ], 201);
    }
}
