<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Passenger;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Resolve the passenger making the request from an explicit passenger_id
     * / user_id, falling back to the authenticated Sanctum user if present —
     * same resolution pattern BookingController uses for passenger routes.
     */
    private function resolvePassenger(Request $request): ?Passenger
    {
        $user = $request->user();
        $rawId = $request->input('passenger_id')
            ?: $request->query('passenger_id')
            ?: $request->input('user_id')
            ?: $request->query('user_id')
            ?: ($user ? $user->id : null);

        $cleanId = $rawId ? (int) preg_replace('/[^0-9]/', '', (string) $rawId) : null;

        if (!$cleanId) {
            return null;
        }

        return Passenger::where('id', $cleanId)->orWhere('user_id', $cleanId)->first();
    }

    /**
     * List the requesting passenger's submitted reports, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $passenger = $this->resolvePassenger($request);

        $reports = Report::with('booking:id,pickup_name,dropoff_name,requested_at')
            ->where('passenger_id', $passenger ? $passenger->id : -1)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['reports' => $reports]);
    }

    /**
     * Submit a new concern/report.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|in:driver,vehicle,fare,booking,pickup_dropoff,other',
            'description' => 'required|string|min:10|max:2000',
            'booking_id' => 'nullable|integer|exists:bookings,id',
        ]);

        $passenger = $this->resolvePassenger($request);

        if (!$passenger) {
            return response()->json(['message' => 'Passenger account not found.'], 404);
        }

        if (!empty($validated['booking_id'])) {
            $ownsBooking = Booking::where('id', $validated['booking_id'])
                ->where('passenger_id', $passenger->id)
                ->exists();

            if (!$ownsBooking) {
                return response()->json(['message' => 'Invalid booking reference.'], 422);
            }
        }

        $report = Report::create([
            'passenger_id' => $passenger->id,
            'booking_id' => $validated['booking_id'] ?? null,
            'category' => $validated['category'],
            'description' => $validated['description'],
            'status' => 'submitted',
        ]);

        return response()->json([
            'message' => 'Concern submitted successfully.',
            'report' => $report->load('booking:id,pickup_name,dropoff_name,requested_at'),
        ], 201);
    }

    /**
     * Show a single report belonging to the requesting passenger.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $passenger = $this->resolvePassenger($request);

        $report = Report::with('booking:id,pickup_name,dropoff_name,requested_at')
            ->where('id', $id)
            ->where('passenger_id', $passenger ? $passenger->id : -1)
            ->first();

        if (!$report) {
            return response()->json(['message' => 'Report not found.'], 404);
        }

        return response()->json(['report' => $report]);
    }
}
