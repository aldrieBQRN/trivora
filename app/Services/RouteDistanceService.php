<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Server-side route distance for QR Ride fares — the backend twin of the Passenger app's
 * routingService.fetchRoute(), using the same public OSRM service and the same rules:
 *
 *   - uses a single OSRM /route request where OSRM performs road-snapping automatically
 *   - snapping farther than SNAP_MAX_METERS means "routing unavailable"
 *   - distance = origin access leg + OSRM road route + destination access leg
 *   - successful route-distance results are cached using deterministic coordinate keys
 *   - when routing is unavailable (timeout, HTTP error, no road, no route, same point) the result
 *     falls back to the app's own estimate: haversine x 1.35, floored at 0.8 km, 0.1 km precision
 *     (constants/todaRoutes.ts calculateDistance) — tagged source 'fallback', never cached
 *
 * Normal bookings do NOT use this: their distance is still the one the Passenger app sends.
 */
class RouteDistanceService
{
    public const SOURCE_OSRM = 'osrm';
    public const SOURCE_FALLBACK = 'fallback';

    private const OSRM_BASE_URL = 'https://router.project-osrm.org';

    /** Per-request timeout (seconds). */
    private const TIMEOUT_SECONDS = 4;

    /** Nearest-road snaps farther than this are "routing unavailable" (routingService.ts). */
    private const SNAP_MAX_METERS = 500;

    /** Origin and destination closer than this are the same point (routingService.ts). */
    private const SAME_POINT_METERS = 0.5;

    /** Access-leg speed used for the duration estimate: 20 km/h (routingService.ts). */
    private const ACCESS_SPEED_MPS = 20 / 3.6;

    /** Fallback road-distance factor and floor (todaRoutes.ts calculateDistance). */
    private const FALLBACK_ROAD_FACTOR = 1.35;
    private const FALLBACK_MIN_KM = 0.8;

    /** Cache TTL for successful OSRM route results (seconds, 24 hours). */
    public const CACHE_TTL_SECONDS = 86400;

    /** Coordinate precision for caching (~11 meters grid). */
    private const CACHE_COORDINATE_DECIMALS = 4;

    /**
     * Compute a deterministic cache key from origin and destination coordinates.
     */
    public function cacheKey(float $pickupLat, float $pickupLng, float $destinationLat, float $destinationLng): string
    {
        return sprintf(
            'route_distance:%.4f,%.4f:%.4f,%.4f',
            round($pickupLat, self::CACHE_COORDINATE_DECIMALS),
            round($pickupLng, self::CACHE_COORDINATE_DECIMALS),
            round($destinationLat, self::CACHE_COORDINATE_DECIMALS),
            round($destinationLng, self::CACHE_COORDINATE_DECIMALS)
        );
    }

    /**
     * @return array{distance_km: float, duration_mins: int, distance_source: string}
     *
     * @throws \InvalidArgumentException for out-of-range coordinates
     */
    public function calculateDistance(float $pickupLat, float $pickupLng, float $destinationLat, float $destinationLng): array
    {
        foreach ([[$pickupLat, $pickupLng], [$destinationLat, $destinationLng]] as [$lat, $lng]) {
            if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                throw new \InvalidArgumentException('Invalid coordinates.');
            }
        }

        if (GeoService::haversineKm($pickupLat, $pickupLng, $destinationLat, $destinationLng) * 1000 <= self::SAME_POINT_METERS) {
            return $this->fallback($pickupLat, $pickupLng, $destinationLat, $destinationLng);
        }

        $cacheKey = $this->cacheKey($pickupLat, $pickupLng, $destinationLat, $destinationLng);
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && isset($cached['distance_km'], $cached['duration_mins'], $cached['distance_source'])) {
            return $cached;
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)->get(sprintf(
                '%s/route/v1/driving/%s,%s;%s,%s',
                self::OSRM_BASE_URL,
                $pickupLng,
                $pickupLat,
                $destinationLng,
                $destinationLat
            ), ['overview' => 'false']);

            $data = $this->okJson($response);
            $waypoints = $data['waypoints'] ?? [];
            $originSnapM = isset($waypoints[0]['distance']) && is_numeric($waypoints[0]['distance'])
                ? (float) $waypoints[0]['distance']
                : 0.0;
            $destinationSnapM = isset($waypoints[1]['distance']) && is_numeric($waypoints[1]['distance'])
                ? (float) $waypoints[1]['distance']
                : 0.0;

            if ($originSnapM > self::SNAP_MAX_METERS || $destinationSnapM > self::SNAP_MAX_METERS) {
                throw new \RuntimeException('No routable road near an endpoint.');
            }

            $route = $data['routes'][0] ?? null;
            if (!is_array($route) || !is_numeric($route['distance'] ?? null) || !is_numeric($route['duration'] ?? null)) {
                throw new \RuntimeException('OSRM returned no route.');
            }

            $accessMeters = $originSnapM + $destinationSnapM;

            $result = [
                'distance_km' => round(((float) $route['distance'] + $accessMeters) / 1000, 2),
                'duration_mins' => max(1, (int) round(((float) $route['duration'] + $accessMeters / self::ACCESS_SPEED_MPS) / 60)),
                'distance_source' => self::SOURCE_OSRM,
            ];

            Cache::put($cacheKey, $result, now()->addSeconds(self::CACHE_TTL_SECONDS));

            return $result;
        } catch (\Throwable $e) {
            Log::warning('RouteDistanceService: OSRM routing unavailable, using fallback estimate.', ['error' => $e->getMessage()]);

            return $this->fallback($pickupLat, $pickupLng, $destinationLat, $destinationLng);
        }
    }

    private function okJson(Response $response): array
    {
        $data = $response->successful() ? $response->json() : null;
        if (!is_array($data) || ($data['code'] ?? null) !== 'Ok') {
            throw new \RuntimeException('OSRM HTTP ' . $response->status());
        }

        return $data;
    }

    /** The Passenger app's own estimate (todaRoutes.ts calculateDistance / calculateFare duration). */
    private function fallback(float $pickupLat, float $pickupLng, float $destinationLat, float $destinationLng): array
    {
        $raw = GeoService::haversineKm($pickupLat, $pickupLng, $destinationLat, $destinationLng);
        $distanceKm = round(max(self::FALLBACK_MIN_KM, $raw * self::FALLBACK_ROAD_FACTOR), 1);

        return [
            'distance_km' => $distanceKm,
            'duration_mins' => max(3, (int) round($distanceKm * 3.3)),
            'distance_source' => self::SOURCE_FALLBACK,
        ];
    }
}
