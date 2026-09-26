<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\TodaZone;
use App\Models\User;
use App\Services\FareService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers FareService (the single source of truth for the passenger fare) and
 * BookingController::requestBooking()'s use of it:
 *   - Base fare is ₱50 flat for exactly 1 passenger, or ₱25 per passenger for 2 or more.
 *   - The first 4 km are included in the base fare; every kilometer beyond that adds ₱5 per
 *     kilometer per passenger, billed continuously (a partial km is billed proportionally, not
 *     rounded up to the next whole km).
 *   - total_fare = per_passenger_fare(distance_km, passenger_count) * passenger_count.
 * Never trusts a client-supplied fare/fare_per_passenger, and never falls back to a fake/default
 * distance — distance_km is required and, together with passenger_count, is the sole input.
 */
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
            'passenger_count' => 1,
        ];
    }

    public static function perPassengerFareTableProvider(): array
    {
        // [distanceKm, passengerCount, expectedFarePerPassenger]
        return [
            // 1 passenger — ₱50 base, no ceiling on the excess distance beyond 4 km.
            '1 pax, 0 km -> 50' => [0.0, 1, 50.0],
            '1 pax, 1 km -> 50' => [1.0, 1, 50.0],
            '1 pax, 3.99 km -> 50' => [3.99, 1, 50.0],
            '1 pax, exactly 4 km -> 50' => [4.0, 1, 50.0],
            '1 pax, 4.01 km -> 50.05' => [4.01, 1, 50.05],
            '1 pax, 4.5 km -> 52.5' => [4.5, 1, 52.5],
            '1 pax, 5.0 km -> 55' => [5.0, 1, 55.0],
            '1 pax, 6.1 km -> 60.5' => [6.1, 1, 60.5],
            '1 pax, 10.0 km -> 80' => [10.0, 1, 80.0],
            // 2+ passengers — ₱25 base per passenger, same continuous distance charge.
            '2 pax, 0 km -> 25' => [0.0, 2, 25.0],
            '2 pax, 3.99 km -> 25' => [3.99, 2, 25.0],
            '2 pax, exactly 4 km -> 25' => [4.0, 2, 25.0],
            '2 pax, 4.01 km -> 25.05' => [4.01, 2, 25.05],
            '2 pax, 4.5 km -> 27.5' => [4.5, 2, 27.5],
            '2 pax, 5.0 km -> 30' => [5.0, 2, 30.0],
            '2 pax, 6.1 km -> 35.5' => [6.1, 2, 35.5],
            '2 pax, 10.0 km -> 55' => [10.0, 2, 55.0],
            // The base is identical for every count >= 2 (e.g. 4 passengers uses the same ₱25
            // per-passenger base as 2 passengers) — passenger count only matters as the 1-vs-2+
            // threshold, and as the final multiplier in calculate().
            '4 pax, 5.0 km -> 30 (same per-passenger base as 2 pax)' => [5.0, 4, 30.0],
        ];
    }

    #[Test]
    #[\PHPUnit\Framework\Attributes\DataProvider('perPassengerFareTableProvider')]
    public function fare_service_calculates_the_correct_per_passenger_fare_for_the_full_distance_table(float $distanceKm, int $passengerCount, float $expectedFarePerPassenger): void
    {
        $this->assertEquals($expectedFarePerPassenger, FareService::perPassengerFare($distanceKm, $passengerCount));
    }

    public static function totalFareTableProvider(): array
    {
        // [distanceKm, passengerCount, expectedTotalFare] — the spec's own example table, plus
        // additional edge rows (below 4 km, exactly 4 km) for full coverage.
        return [
            '1 passenger, 4 km -> 50' => [4.0, 1, 50.0],
            '1 passenger, 5 km -> 55' => [5.0, 1, 55.0],
            '2 passengers, 4 km -> 50' => [4.0, 2, 50.0],
            '2 passengers, 5 km -> 60' => [5.0, 2, 60.0],
            '3 passengers, 4 km -> 75' => [4.0, 3, 75.0],
            '3 passengers, 5 km -> 90' => [5.0, 3, 90.0],
            '4 passengers, 6 km -> 140' => [6.0, 4, 140.0],
            // Below 4 km — same as exactly 4 km, no distance charge either way.
            '1 passenger, 2 km (below 4) -> 50' => [2.0, 1, 50.0],
            '2 passengers, 2 km (below 4) -> 50' => [2.0, 2, 50.0],
            '4 passengers, 3 km (below 4) -> 100' => [3.0, 4, 100.0],
            // Exactly 4 km, more passenger counts.
            '4 passengers, exactly 4 km -> 100' => [4.0, 4, 100.0],
        ];
    }

    #[Test]
    #[\PHPUnit\Framework\Attributes\DataProvider('totalFareTableProvider')]
    public function fare_service_calculates_the_correct_total_fare_for_distance_and_passenger_count(float $distanceKm, int $passengerCount, float $expectedTotal): void
    {
        $this->assertEquals($expectedTotal, FareService::calculate($distanceKm, $passengerCount));
    }

    #[Test]
    public function increasing_passenger_count_from_two_and_above_scales_the_final_fare_proportionally(): void
    {
        // Every count >= 2 shares the same ₱25 per-passenger base, so the total scales linearly
        // with headcount once you're past the 1-passenger special case.
        $distanceKm = 6.1; // per-passenger fare for 2+ pax = 35.5

        $this->assertEquals(71.0, FareService::calculate($distanceKm, 2));
        $this->assertEquals(106.5, FareService::calculate($distanceKm, 3));
        $this->assertEquals(177.5, FareService::calculate($distanceKm, 5));
    }

    #[Test]
    public function one_passenger_uses_a_higher_base_fare_than_a_naive_scale_down_from_two_passengers(): void
    {
        // 1 passenger is NOT "half of the 2-passenger total" — it has its own ₱50 base, distinct
        // from the ₱25-per-passenger rate that applies from 2 passengers upward.
        $distanceKm = 6.1;

        $this->assertEquals(60.5, FareService::calculate($distanceKm, 1));
        $this->assertEquals(71.0, FareService::calculate($distanceKm, 2));
    }

    #[Test]
    public function server_computes_total_fare_from_distance_and_passenger_count(): void
    {
        $this->actingAsPassenger();

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 6.1,
            'passenger_count' => 4,
        ]));

        $response->assertStatus(201);
        $response->assertJsonPath('booking.fare_per_passenger', 35.5);
        $response->assertJsonPath('booking.fare_amount', 142);
        $response->assertJsonPath('booking.passenger_count', 4);

        $booking = Booking::find($response->json('booking.id'));
        $this->assertEquals(35.5, $booking->fare_per_passenger);
        $this->assertEquals(142.0, $booking->fare_amount);
    }

    #[Test]
    public function changing_passenger_count_changes_the_stored_final_fare_proportionally(): void
    {
        $this->actingAsPassenger();

        // Both requests use passenger_count >= 2, so the per-passenger base is identical (₱30 at
        // 5 km) and the totals scale exactly linearly with headcount.
        $twoResponse = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 5.0,
            'passenger_count' => 2,
        ]));
        $twoResponse->assertStatus(201);
        $this->assertEquals(60.0, Booking::find($twoResponse->json('booking.id'))->fare_amount);

        $sixResponse = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 5.0,
            'passenger_count' => 6,
        ]));
        $sixResponse->assertStatus(201);
        $this->assertEquals(180.0, Booking::find($sixResponse->json('booking.id'))->fare_amount);

        // Same distance, 3x the passengers -> exactly 3x the fare.
        $this->assertEquals(
            Booking::find($twoResponse->json('booking.id'))->fare_amount * 3,
            Booking::find($sixResponse->json('booking.id'))->fare_amount
        );

        // The 1-passenger case at the same distance uses the separate ₱50 base, not a fraction of
        // the 2-passenger total.
        $oneResponse = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 5.0,
            'passenger_count' => 1,
        ]));
        $oneResponse->assertStatus(201);
        $this->assertEquals(55.0, Booking::find($oneResponse->json('booking.id'))->fare_amount);
    }

    #[Test]
    public function server_ignores_a_tampered_client_supplied_fare_amount(): void
    {
        $this->actingAsPassenger();

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 1.0,
            'fare_amount' => 999999.99,
        ]));

        $response->assertStatus(201);
        // distance_km=1.0 (below the 4 km free distance) with the default passenger_count=1 from
        // basePayload() -> ₱50 flat base, no distance charge.
        $response->assertJsonPath('booking.fare_amount', 50);

        $booking = Booking::find($response->json('booking.id'));
        $this->assertEquals(50.0, $booking->fare_amount);
    }

    #[Test]
    public function a_tampered_client_supplied_fare_per_passenger_no_longer_has_any_effect(): void
    {
        $this->actingAsPassenger();

        $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
            'distance_km' => 1.0,
            'fare_per_passenger' => 999.00,
        ]));

        $response->assertStatus(201);
        $response->assertJsonPath('booking.fare_amount', 50);
        $response->assertJsonPath('booking.fare_per_passenger', 50);
    }

    #[Test]
    public function distance_km_is_required_and_never_defaults_to_a_fake_value(): void
    {
        $this->actingAsPassenger();

        $payload = $this->basePayload();
        unset($payload['distance_km']);

        $response = $this->postJson('/api/v1/passenger/bookings/request', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('distance_km');
    }

    #[Test]
    public function passenger_count_must_be_a_positive_whole_number(): void
    {
        $this->actingAsPassenger();

        foreach ([0, -1, 1.5] as $invalidCount) {
            $response = $this->postJson('/api/v1/passenger/bookings/request', array_merge($this->basePayload(), [
                'distance_km' => 2.0,
                'passenger_count' => $invalidCount,
            ]));

            $response->assertStatus(422);
            $response->assertJsonValidationErrors('passenger_count');
        }
    }
}
