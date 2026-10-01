<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ManualRideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Driver side of Manual Ride — a trip recorded by the driver for a walk-in passenger with no app.
 * Every rule lives in ManualRideService; the driver is always resolved from $request->user() and
 * rides are addressed by booking_code. Rejections render as `{ message, code }`.
 */
class DriverManualRideController extends Controller
{
    public function __construct(private readonly ManualRideService $manualRides)
    {
    }

    /** POST /driver/manual-ride/quote — pick-up is never taken from the client. */
    public function quote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'party_size' => 'required|integer|min:1|max:20',
            'dropoff_name' => 'required|string|max:255',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
        ]);

        return response()->json($this->manualRides->quote($request->user(), $validated));
    }

    /**
     * POST /driver/manual-ride/add (alias: /start) — the signed quote exactly as the server issued
     * it. Adds the walk-in passenger to the tricycle's one open ride session (QR passengers may be
     * in it too) and returns that session; the session's Start Ride moves everyone aboard.
     */
    public function add(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'quote' => 'required|string',
            'payment_method' => 'nullable|string|in:cash,gcash',
        ]);
        [$booking, $created] = $this->manualRides->add(
            $request->user(),
            $validated['quote'],
            $validated['payment_method'] ?? 'cash'
        );

        return response()->json([
            'message' => $created ? 'Walk-in passenger added.' : 'This walk-in passenger was already added.',
            'booking' => ManualRideService::payload($booking),
            // Same shape as the qr-session endpoints: { session, passengers }.
            'ride' => $this->manualRides->sessionPayloadFor($booking),
        ], $created ? 201 : 200);
    }

    /** GET /driver/manual-ride/active — a legacy stand-alone ride to resume after reopening. */
    public function active(Request $request): JsonResponse
    {
        $booking = $this->manualRides->active($request->user());

        return response()->json(['ride' => $booking ? ManualRideService::payload($booking) : null]);
    }

    /** POST /driver/manual-ride/{booking}/complete — retry-safe. */
    public function complete(Request $request, string $booking): JsonResponse
    {
        $ride = $this->manualRides->complete($request->user(), $booking);

        return response()->json(['message' => 'Manual Ride completed.', 'ride' => ManualRideService::payload($ride)]);
    }

    /** POST /driver/manual-ride/{booking}/cancel — nothing is credited. */
    public function cancel(Request $request, string $booking): JsonResponse
    {
        $validated = $request->validate(['reason' => 'nullable|string|max:255']);
        $ride = $this->manualRides->cancel($request->user(), $booking, $validated['reason'] ?? null);

        return response()->json(['message' => 'Manual Ride cancelled.', 'ride' => ManualRideService::payload($ride)]);
    }
}
