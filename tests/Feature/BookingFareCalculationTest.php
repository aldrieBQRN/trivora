<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\TodaZone;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingFareCalculationTest extends TestCase
{
    use DatabaseTransactions;

    protected TodaZone $zone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->zone = TodaZone::firstOrCreate(
            ['code' => 'TODA-FARETEST'],
            ['name' => 'TODA Fare Test Zone', 'barangay' => 'Brgy. 8', 'is_active' => true]
        );
    }

    protected function actingAsPassenger(): User
    {
        $passengerUser = User::create([
            'name' => 'Fare Test Passenger',
            'email' => 'fare.passenger.test.' . uniqid() . '@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($passengerUser, ['*']);

        return $passengerUser;
    }

    protected function basePayload(): array
    {
        return [
            'pickup_name' => 'Nasugbu Municipal Hall',
            'pickup_lat' => 14.071514,
            'pickup_lng' => 120.633083,
            'dropoff_name' => 'Barangay 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'toda_zone_id' => $this->zone->id,
        ];
    }

    #[Test]
    public function server_recalculates_total_fare_from_passenger_count_and_fare_per_passenger()
    {
        $this->actingAsPassenger();

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'passenger_count' => 3,
            'fare_per_passenger' => 15.50,
        ]));

        $response->assertStatus(201);
        $response->assertJsonPath('booking.fare_amount', 46.5);
        $response->assertJsonPath('booking.passenger_count', 3);
        $response->assertJsonPath('booking.fare_per_passenger', 15.5);

        $booking = Booking::find($response->json('booking.id'));
        $this->assertEquals(46.50, $booking->fare_amount);
    }

    #[Test]
    public function server_ignores_a_tampered_client_supplied_fare_amount()
    {
        $this->actingAsPassenger();

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'passenger_count' => 3,
            'fare_per_passenger' => 15.50,
            'fare_amount' => 999999.99,
        ]));

        $response->assertStatus(201);
        $response->assertJsonPath('booking.fare_amount', 46.5);

        $booking = Booking::find($response->json('booking.id'));
        $this->assertEquals(46.50, $booking->fare_amount);
    }

    #[Test]
    public function passenger_count_must_be_a_positive_whole_number()
    {
        $this->actingAsPassenger();

        foreach ([0, -1, 1.5] as $invalidCount) {
            $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
                'passenger_count' => $invalidCount,
                'fare_per_passenger' => 20.00,
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('passenger_count');
        }

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'fare_per_passenger' => 20.00,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('passenger_count');
    }

    #[Test]
    public function fare_per_passenger_must_be_a_positive_amount()
    {
        $this->actingAsPassenger();

        foreach ([0, -5] as $invalidFare) {
            $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
                'passenger_count' => 2,
                'fare_per_passenger' => $invalidFare,
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('fare_per_passenger');
        }

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'passenger_count' => 2,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('fare_per_passenger');
    }
}
