<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QrRideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Driver side of QR Ride / Walk-in Ride. Every rule lives in QrRideService; the driver is always
 * resolved from $request->user() and can only act on their own session's passengers. Rejections
 * are rendered as `{ message, code }` by QrRideException.
 */
class DriverQrSessionController extends Controller
{
    public function __construct(private readonly QrRideService $qrRides)
    {
    }

    /** GET /driver/qr-session/active — the open session and its passengers, or null. */
    public function active(Request $request): JsonResponse
    {
        return response()->json(['ride' => $this->qrRides->driverActiveSession($request->user())]);
    }

    /** POST /driver/qr-session/start — Start Ride. */
    public function start(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Ride started.', 'ride' => $this->qrRides->start($request->user())]);
    }

    /** POST /driver/qr-session/passengers/{booking}/drop-off — drop off one passenger (retry-safe). */
    public function dropOff(Request $request, string $booking): JsonResponse
    {
        return response()->json(['message' => 'Passenger dropped off.'] + $this->qrRides->dropOff($request->user(), $booking));
    }

    /** POST /driver/qr-session/passengers/{booking}/remove — remove a waiting passenger before the start. */
    public function remove(Request $request, string $booking): JsonResponse
    {
        return response()->json(['message' => 'Passenger removed.'] + $this->qrRides->removePassenger($request->user(), $booking));
    }

    /** POST /driver/qr-session/end — close the session once nobody is waiting or aboard. */
    public function end(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Ride ended.', 'ride' => $this->qrRides->end($request->user())]);
    }
}
