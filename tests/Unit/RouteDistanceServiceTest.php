<?php

namespace Tests\Unit;

use App\Services\RouteDistanceService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RouteDistanceServiceTest extends TestCase
{
    private RouteDistanceService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RouteDistanceService();
        Cache::flush();
    }

    public function test_single_osrm_route_request_calculates_distance_correctly(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'waypoints' => [
                    ['location' => [120.6300, 14.0750], 'distance' => 10.0],
                    ['location' => [120.6500, 14.0900], 'distance' => 20.0],
                ],
                'routes' => [
                    [
                        'distance' => 5000.0,
                        'duration' => 600.0,
                    ],
                ],
            ]),
        ]);

        $res = $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);

        // 5000m route + 10m + 20m = 5030m = 5.03 km
        $this->assertSame(5.03, $res['distance_km']);
        $this->assertSame(RouteDistanceService::SOURCE_OSRM, $res['distance_source']);
        $this->assertGreaterThan(0, $res['duration_mins']);

        // Assert exactly ONE HTTP request was sent (not 3)
        Http::assertSentCount(1);
    }

    public function test_successful_route_result_is_cached_and_repeated_calls_hit_cache(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'waypoints' => [
                    ['location' => [120.6300, 14.0750], 'distance' => 0.0],
                    ['location' => [120.6500, 14.0900], 'distance' => 0.0],
                ],
                'routes' => [
                    [
                        'distance' => 3500.0,
                        'duration' => 450.0,
                    ],
                ],
            ]),
        ]);

        $first = $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);
        $this->assertSame(3.5, $first['distance_km']);
        $this->assertSame(RouteDistanceService::SOURCE_OSRM, $first['distance_source']);
        Http::assertSentCount(1);

        // Call again with same coordinates
        $second = $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);
        $this->assertSame($first, $second);

        // HTTP request count remains 1 because cache was hit
        Http::assertSentCount(1);

        // Call with coordinates with tiny jitter (< 5m variation)
        $third = $this->service->calculateDistance(14.07501, 120.63002, 14.09001, 120.65002);
        $this->assertSame($first, $third);
        Http::assertSentCount(1);
    }

    public function test_failed_osrm_request_falls_back_and_is_not_cached(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response('Server Error', 500),
        ]);

        $res = $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);

        $this->assertSame(RouteDistanceService::SOURCE_FALLBACK, $res['distance_source']);
        $this->assertGreaterThanOrEqual(0.8, $res['distance_km']);
        Http::assertSentCount(1);

        // Verify it was NOT cached
        $key = $this->service->cacheKey(14.0750, 120.6300, 14.0900, 120.6500);
        $this->assertNull(Cache::get($key));

        // Subsequent call triggers a new HTTP attempt because failure was not cached
        $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);
        Http::assertSentCount(2);
    }

    public function test_snap_exceeding_snap_max_meters_triggers_fallback(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'waypoints' => [
                    ['location' => [120.6300, 14.0750], 'distance' => 501.0], // > 500m
                    ['location' => [120.6500, 14.0900], 'distance' => 10.0],
                ],
                'routes' => [
                    ['distance' => 4000.0, 'duration' => 500.0],
                ],
            ]),
        ]);

        $res = $this->service->calculateDistance(14.0750, 120.6300, 14.0900, 120.6500);

        $this->assertSame(RouteDistanceService::SOURCE_FALLBACK, $res['distance_source']);
    }

    public function test_same_point_returns_fallback_without_network_call(): void
    {
        Http::fake();

        $res = $this->service->calculateDistance(14.0750, 120.6300, 14.0750, 120.6300);

        $this->assertSame(RouteDistanceService::SOURCE_FALLBACK, $res['distance_source']);
        $this->assertSame(0.8, $res['distance_km']);
        Http::assertSentCount(0);
    }
}
