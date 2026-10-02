<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NearbyPlacesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NearbyPlaceController extends Controller
{
    protected NearbyPlacesService $placesService;

    public function __construct(NearbyPlacesService $placesService)
    {
        $this->placesService = $placesService;
    }

    /**
     * Get nearby places around a geographic point filtered by category.
     *
     * GET /api/v1/places/nearby
     * Query parameters:
     * - latitude: float (-90 to 90)
     * - longitude: float (-180 to 180)
     * - radius: int (50 to 10000 meters, default 2000)
     * - category: string (one of supported category slugs, default 'all')
     */
    public function index(Request $request): JsonResponse
    {
        $allowedCategories = array_keys(NearbyPlacesService::CATEGORIES);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius' => ['nullable', 'numeric', 'min:50', 'max:10000'],
            'category' => ['nullable', 'string', Rule::in($allowedCategories)],
        ]);

        $lat = (float) $validated['latitude'];
        $lng = (float) $validated['longitude'];
        $radius = isset($validated['radius']) ? (int) $validated['radius'] : 2000;
        $category = $validated['category'] ?? 'all';

        $places = $this->placesService->fetchNearby($lat, $lng, $radius, $category);

        return response()->json([
            'status' => 'ok',
            'data' => $places,
            'meta' => [
                'center' => [
                    'latitude' => $lat,
                    'longitude' => $lng,
                ],
                'radius' => $radius,
                'category' => $category,
                'attribution' => '© OpenStreetMap contributors',
            ],
        ]);
    }
}
