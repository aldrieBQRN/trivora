<?php

namespace Tests\Feature;

use App\Models\FareConfiguration;
use App\Services\FareService;
use App\Services\GeoService;
use App\Services\RouteDistanceService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Measurement-only guard for the route-distance cache (optimization "B"). It documents why the
 * current 4-decimal pickup precision still misses the cache under realistic GPS jitter, what a
 * coarser 3-decimal pickup grid would gain, and bounds the fare error that coarsening the pickup
 * coordinate would introduce.
 *
 * It changes no production code path — RouteDistanceService::CACHE_COORDINATE_DECIMALS stays 4 and
 * the passenger/driver pickup coordinate is never rounded before it is sent.
 */
class RouteDistanceCacheTest extends TestCase
{
    /** Nasugbu town centre, on a ~11 m (4-decimal) coordinate boundary. */
    private const CENTER = ['lat' => 14.0715, 'lng' => 120.6330];

    private const DEST = ['lat' => 14.0900, 'lng' => 120.6500];

    /** The centre plus four points ~15 m away, roughly one 4-decimal cell apart. */
    private function jitteredPickups(): array
    {
        $meters = 15.0;
        $latDelta = $meters / 111320.0;
        $lngDelta = $meters / (111320.0 * cos(deg2rad(self::CENTER['lat'])));

        $points = [self::CENTER];
        foreach ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [$dLat, $dLng]) {
            $points[] = [
                'lat' => self::CENTER['lat'] + $dLat * $latDelta,
                'lng' => self::CENTER['lng'] + $dLng * $lngDelta,
            ];
        }

        return $points;
    }

    #[Test]
    public function a_15m_pickup_jitter_maps_to_distinct_four_decimal_cache_keys(): void
    {
        $service = new RouteDistanceService();

        $keys = array_map(
            fn (array $p) => $service->cacheKey($p['lat'], $p['lng'], self::DEST['lat'], self::DEST['lng']),
            $this->jitteredPickups()
        );

        $this->assertSame(
            count($keys),
            count(array_unique($keys)),
            'each ~15 m pickup shift is a fresh cache key at 4 decimals (a cache miss)'
        );
    }

    #[Test]
    public function a_coarser_three_decimal_pickup_grid_would_share_the_same_jitter(): void
    {
        $keys = array_map(
            fn (array $p) => sprintf('%.3f,%.3f', round($p['lat'], 3), round($p['lng'], 3)),
            $this->jitteredPickups()
        );

        $this->assertLessThan(
            count($keys),
            count(array_unique($keys)),
            'a 3-decimal grid would collapse the jitter into shared cache entries'
        );
    }

    #[Test]
    public function a_15m_pickup_shift_cannot_move_the_fare_beyond_the_continuous_km_rounding(): void
    {
        $config = new FareConfiguration([
            'base_fare' => 50.0,
            'base_fare_per_passenger' => 25.0,
            'included_distance_km' => 4.0,
            'rate_per_km' => 5.0,
        ]);

        $distanceKm = fn (array $p) => round(max(0.8, GeoService::haversineKm(
            $p['lat'], $p['lng'], self::DEST['lat'], self::DEST['lng']
        ) * 1.35), 1);

        $baselineFare = FareService::perPassengerFare($distanceKm(self::CENTER), 1, $config);

        foreach ($this->jitteredPickups() as $pickup) {
            // One 0.1 km bucket of rounding at ₱5/km bounds the whole effect at ₱0.50.
            $this->assertEqualsWithDelta(
                $baselineFare,
                FareService::perPassengerFare($distanceKm($pickup), 1, $config),
                0.50,
                'a 15 m pickup shift must stay inside one 0.1 km fare bucket'
            );
        }
    }
}
