<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\SavedPlace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedPlaceController extends Controller
{
    /**
     * Resolve (or lazily create) the Passenger row for the authenticated Sanctum user — same
     * defensive pattern as BookingController::requestBooking, since these routes sit behind
     * auth:sanctum and must never trust a client-supplied passenger id.
     */
    private function resolvePassenger(Request $request): Passenger
    {
        return Passenger::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['mobile_number' => '+63 900 000 0000', 'rating' => 5.00]
        );
    }

    /**
     * List the authenticated passenger's saved places, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $passenger = $this->resolvePassenger($request);

        $places = SavedPlace::where('passenger_id', $passenger->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['saved_places' => $places]);
    }

    /**
     * Create a saved place for the authenticated passenger. Coordinates are required and are
     * exactly what the passenger confirmed on the map — never re-geocoded here.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'required|string|max:100',
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $passenger = $this->resolvePassenger($request);

        $place = SavedPlace::create([
            'passenger_id' => $passenger->id,
            'label' => $validated['label'],
            'address' => $validated['address'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
        ]);

        return response()->json([
            'message' => 'Saved place created.',
            'saved_place' => $place,
        ], 201);
    }

    /**
     * Update a saved place owned by the authenticated passenger. If the location changed, the
     * address and coordinates are replaced together — never left mismatched.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'required|string|max:100',
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $passenger = $this->resolvePassenger($request);

        $place = SavedPlace::where('id', $id)->where('passenger_id', $passenger->id)->first();

        if (!$place) {
            return response()->json(['message' => 'Saved place not found.'], 404);
        }

        $place->update($validated);

        return response()->json([
            'message' => 'Saved place updated.',
            'saved_place' => $place,
        ]);
    }

    /**
     * Delete a saved place owned by the authenticated passenger.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $passenger = $this->resolvePassenger($request);

        $place = SavedPlace::where('id', $id)->where('passenger_id', $passenger->id)->first();

        if (!$place) {
            return response()->json(['message' => 'Saved place not found.'], 404);
        }

        $place->delete();

        return response()->json(['message' => 'Saved place deleted.']);
    }
}
