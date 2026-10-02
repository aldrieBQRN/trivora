<?php

namespace Tests\Feature;

use App\Services\NearbyPlacesService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NearbyPlacesTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    /**
     * Test valid nearby POI request returns normalized items.
     */
    public function test_valid_nearby_poi_request_returns_normalized_data(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response([
                'elements' => [
                    [
                        'type' => 'node',
                        'id' => 101,
                        'lat' => 14.0725,
                        'lon' => 120.6312,
                        'tags' => [
                            'name' => 'Cafe De Lipa',
                            'amenity' => 'cafe',
                            'addr:street' => 'J.P. Laurel St',
                            'addr:city' => 'Nasugbu',
                        ],
                    ],
                    [
                        'type' => 'way',
                        'id' => 202,
                        'center' => [
                            'lat' => 14.0740,
                            'lon' => 120.6350,
                        ],
                        'tags' => [
                            'name' => 'Nasugbu Doctor\'s Hospital',
                            'amenity' => 'hospital',
                            'addr:barangay' => 'Brgy 3',
                            'addr:city' => 'Nasugbu',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&radius=2000&category=all');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'meta' => [
                    'radius' => 2000,
                    'category' => 'all',
                    'attribution' => '© OpenStreetMap contributors',
                ],
            ])
            ->assertJsonCount(2, 'data');

        $data = $response->json('data');
        $this->assertEquals('node/101', $data[0]['id']);
        $this->assertEquals('Cafe De Lipa', $data[0]['name']);
        $this->assertEquals('coffee', $data[0]['category']);
        $this->assertEquals('Coffee', $data[0]['category_label']);
        $this->assertEquals(14.0725, $data[0]['latitude']);
        $this->assertEquals(120.6312, $data[0]['longitude']);
        $this->assertStringContainsString('J.P. Laurel St', $data[0]['address']);

        $this->assertEquals('way/202', $data[1]['id']);
        $this->assertEquals('Nasugbu Doctor\'s Hospital', $data[1]['name']);
        $this->assertEquals('hospitals', $data[1]['category']);
        $this->assertEquals(14.074, $data[1]['latitude']);
        $this->assertEquals(120.635, $data[1]['longitude']);
    }

    /**
     * Test category filtering builds category-specific query.
     */
    public function test_category_filtering_accepts_valid_category(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response([
                'elements' => [
                    [
                        'type' => 'node',
                        'id' => 303,
                        'lat' => 14.0710,
                        'lon' => 120.6300,
                        'tags' => [
                            'name' => 'Kape Batangas',
                            'amenity' => 'cafe',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=coffee');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('coffee', $data[0]['category']);

        Http::assertSent(function ($request) {
            return str_contains($request['data'], 'cafe');
        });
    }

    /**
     * Test coordinate validation fails with invalid lat/lng.
     */
    public function test_coordinate_validation_fails_when_out_of_range(): void
    {
        $response = $this->getJson('/api/v1/places/nearby?latitude=95.0&longitude=120.6325');
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        $response2 = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=200.0');
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['longitude']);

        $response3 = $this->getJson('/api/v1/places/nearby');
        $response3->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude']);
    }

    /**
     * Test radius validation enforces bounds.
     */
    public function test_radius_validation_enforces_bounds(): void
    {
        $responseTooSmall = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&radius=10');
        $responseTooSmall->assertStatus(422)
            ->assertJsonValidationErrors(['radius']);

        $responseTooBig = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&radius=50000');
        $responseTooBig->assertStatus(422)
            ->assertJsonValidationErrors(['radius']);
    }

    /**
     * Test invalid category fails validation.
     */
    public function test_invalid_category_returns_validation_error(): void
    {
        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=non_existent_category');
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    /**
     * Test empty POI result returns empty array gracefully.
     */
    public function test_empty_poi_result_returns_empty_array(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response(['elements' => []], 200),
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=gas_stations');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'data' => [],
            ]);
    }

    /**
     * Test successful response is cached and second call hits cache without calling Overpass again.
     */
    public function test_response_is_cached_and_serves_subsequent_requests(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response([
                'elements' => [
                    [
                        'type' => 'node',
                        'id' => 555,
                        'lat' => 14.0718,
                        'lon' => 120.6325,
                        'tags' => ['name' => 'Petron Nasugbu', 'amenity' => 'fuel'],
                    ],
                ],
            ], 200),
        ]);

        // First call - queries Overpass
        $res1 = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=gas_stations');
        $res1->assertStatus(200);
        $this->assertCount(1, $res1->json('data'));

        // Second call with slightly different coordinate that rounds to the same grid
        $res2 = $this->getJson('/api/v1/places/nearby?latitude=14.07182&longitude=120.63251&category=gas_stations');
        $res2->assertStatus(200);
        $this->assertCount(1, $res2->json('data'));

        // Overpass HTTP endpoint should have been called only once
        Http::assertSentCount(1);
    }

    /**
     * Test Overpass failure (500 or 429) returns empty array gracefully without crashing.
     */
    public function test_overpass_server_failure_falls_back_gracefully(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response('Server Error', 500),
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=restaurants');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'data' => [],
            ]);
    }

    /**
     * Test timeout or network connection failure falls back gracefully.
     */
    public function test_timeout_falls_back_gracefully(): void
    {
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timed out');
            },
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=hotels');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'data' => [],
            ]);
    }

    /**
     * Test Overpass failure uses curated fallback landmarks when fallback is enabled.
     */
    public function test_overpass_failure_uses_curated_fallback_when_enabled(): void
    {
        config(['services.overpass.enable_fallback' => true]);
        $overpassUrl = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');

        Http::fake([
            $overpassUrl => Http::response('Gateway Timeout', 504),
        ]);

        $response = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=all');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'meta' => [
                    'category' => 'all',
                ],
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertGreaterThanOrEqual(10, count($data));

        // Test category filtering with fallback
        $cafeResponse = $this->getJson('/api/v1/places/nearby?latitude=14.0718&longitude=120.6325&category=coffee');
        $cafeResponse->assertStatus(200);
        $cafeData = $cafeResponse->json('data');
        $this->assertNotEmpty($cafeData);
        $this->assertEquals('coffee', $cafeData[0]['category']);
    }
}

