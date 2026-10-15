<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use App\Services\FareService;
use App\Services\GeoService;
use App\Services\RouteDistanceService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingFareValidationTest extends TestCase
{
    use DatabaseTransactions;

    private User $passengerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->passengerUser = User::create([
            'name' => 'Validation Test Passenger',
            'email' => 'booking.val.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($this->passengerUser, ['*']);
    }

    private function basePayload(): array
    {
        return [
            'pickup_name' => 'Nasugbu Poblacion',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Barangay Wawa',
            'dropoff_lat' => 14.0850,
            'dropoff_lng' => 120.6250,
            'passenger_count' => 1,
            'distance_km' => 2.5,
        ];
    }

    #[Test]
    public function manipulated_implausibly_low_distance_is_safely_corrected_to_authoritative_road_distance(): void
    {
        // Pickup and dropoff have Haversine straight-line distance of ~1.73 km.
        // A client attempts to cheat the fare by sending distance_km = 0.1 km.
        $payload = array_merge($this->basePayload(), [
            'distance_km' => 0.1, // Far below straight-line distance (~1.73 km)
            'passenger_count' => 1,
        ]);

        // Fake OSRM to return a known 2.2 km route
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'waypoints' => [
                    ['location' => [120.6330, 14.0715], 'distance' => 0.0],
                    ['location' => [120.6250, 14.0850], 'distance' => 0.0],
                ],
                'routes' => [
                    [
                        'distance' => 2200.0,
                        'duration' => 300.0,
                    ],
                ],
            ]),
        ]);

        $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        // The stored distance must NOT be the manipulated 0.1 km!
        $this->assertNotEquals(0.1, (float) $booking->distance_km);
        $this->assertEquals(2.2, (float) $booking->distance_km);

        // Fare is calculated from the authoritative 2.2 km distance (base fare for 1 pax <= 4 km is 50.0)
        $this->assertEquals(50.0, (float) $booking->fare_amount);
    }

    #[Test]
    public function negative_or_zero_distance_is_rejected(): void
    {
        foreach ([0, -1, -5.5] as $invalidDist) {
            $payload = array_merge($this->basePayload(), [
                'distance_km' => $invalidDist,
            ]);

            $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);
            $response->assertStatus(422);
            $response->assertJsonValidationErrors('distance_km');
        }
    }

    #[Test]
    public function coordinates_outside_valid_lat_lng_ranges_are_rejected(): void
    {
        // Invalid latitude (> 90)
        $payload1 = array_merge($this->basePayload(), ['pickup_lat' => 95.0]);
        $this->postJson('/api/v1/passenger/bookings/request', $payload1)
            ->assertStatus(422)
            ->assertJsonValidationErrors('pickup_lat');

        // Invalid latitude (< -90)
        $payload2 = array_merge($this->basePayload(), ['dropoff_lat' => -95.0]);
        $this->postJson('/api/v1/passenger/bookings/request', $payload2)
            ->assertStatus(422)
            ->assertJsonValidationErrors('dropoff_lat');

        // Invalid longitude (> 180)
        $payload3 = array_merge($this->basePayload(), ['pickup_lng' => 185.0]);
        $this->postJson('/api/v1/passenger/bookings/request', $payload3)
            ->assertStatus(422)
            ->assertJsonValidationErrors('pickup_lng');

        // Invalid longitude (< -180)
        $payload4 = array_merge($this->basePayload(), ['dropoff_lng' => -185.0]);
        $this->postJson('/api/v1/passenger/bookings/request', $payload4)
            ->assertStatus(422)
            ->assertJsonValidationErrors('dropoff_lng');
    }

    #[Test]
    public function trip_exceeding_municipal_service_area_bounds_is_rejected(): void
    {
        // Trip from Nasugbu to Manila/Baguio (> 50 km straight-line)
        $payload = array_merge($this->basePayload(), [
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_lat' => 16.4023, // Baguio City
            'dropoff_lng' => 120.5960,
            'distance_km' => 260.0,
        ]);

        $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors('dropoff_name');
    }

    #[Test]
    public function legitimate_trip_uses_submitted_distance_when_plausible_and_computes_exact_fare(): void
    {
        // Straight line distance is ~1.73 km. Client submitted 2.5 km (plausible road route).
        $payload = array_merge($this->basePayload(), [
            'distance_km' => 2.5,
            'passenger_count' => 1,
        ]);

        $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        $this->assertEquals(2.5, (float) $booking->distance_km);
        $this->assertEquals(50.0, (float) $booking->fare_amount);
        $this->assertEquals(50.0, (float) $booking->fare_per_passenger);
    }

    #[Test]
    public function legitimate_trip_beyond_four_km_adds_continuous_rate_per_passenger(): void
    {
        // Straight line distance between these points is ~4.5 km.
        // Client submits 6.0 km.
        $payload = array_merge($this->basePayload(), [
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_lat' => 14.1100,
            'dropoff_lng' => 120.6100,
            'distance_km' => 6.0,
            'passenger_count' => 2,
        ]);

        $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        // 2 passengers: base fare = ₱25/passenger. 6 km - 4 km = 2 km excess * ₱5/km = ₱10.
        // Fare per passenger = 25 + 10 = 35. Total = 35 * 2 = ₱70.
        $this->assertEquals(6.0, (float) $booking->distance_km);
        $this->assertEquals(35.0, (float) $booking->fare_per_passenger);
        $this->assertEquals(70.0, (float) $booking->fare_amount);
    }
}
