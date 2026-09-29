<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QrRideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Passenger side of QR Ride / Walk-in Ride. Every rule lives in QrRideService; the passenger is
 * always resolved from $request->user(), never a client-supplied id. Rejections are rendered as
 * `{ message, code }` by QrRideException.
 */
class PassengerQrRideController extends Controller
{
    public function __construct(private readonly QrRideService $qrRides)
    {
    }

    /** GET /passenger/qr-rides/tricycle/{token} — the scanned tricycle and whether it can be joined. */
    public function tricycle(Request $request, string $token): JsonResponse
    {
        return response()->json($this->qrRides->scan($request->user(), $token));
    }

    /** POST /passenger/qr-rides/quote — server distance + fare, returned with a signed quote. */
    public function quote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:100',
            'party_size' => 'nullable|integer|min:1|max:20',
            'pickup_name' => 'nullable|string|max:255',
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_name' => 'required|string|max:255',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
        ]);

        return response()->json($this->qrRides->quote($request->user(), $validated));
    }

    /** POST /passenger/qr-rides/join — join with the signed quote (retry-safe). */
    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate(['quote' => 'required|string']);

        [$booking, $created] = $this->qrRides->join($request->user(), $validated['quote']);

        return response()->json(
            ['message' => $created ? 'You joined the ride.' : "You've already joined this ride."]
                + $this->qrRides->passengerActive($request->user(), $booking->booking_code),
            $created ? 201 : 200
        );
    }

    /** GET /passenger/qr-rides/active[?booking=CODE] — the current QR ride (shared driver GPS included). */
    public function active(Request $request): JsonResponse
    {
        $code = $request->query('booking');

        return response()->json([
            'ride' => $this->qrRides->passengerActive($request->user(), is_string($code) ? $code : null),
        ]);
    }

    /** POST /passenger/qr-rides/{booking}/leave — leave before the ride starts. */
    public function leave(Request $request, string $booking): JsonResponse
    {
        $this->qrRides->leave($request->user(), $booking);

        return response()->json([
            'message' => 'You left the ride.',
            'ride' => $this->qrRides->passengerActive($request->user(), $booking),
        ]);
    }
}
