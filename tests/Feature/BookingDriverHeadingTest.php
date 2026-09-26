<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The passenger's active-booking response exposes the driver's latest stored GPS heading. */
class BookingDriverHeadingTest extends TestCase
{
    use DatabaseTransactions;

    protected User $passengerUser;
    protected Driver $driver;
    protected Tricycle $tricycle;
    protected Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        $this->passengerUser = User::create([
            'name' => 'Heading Passenger', 'email' => 'heading.p.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        $passenger = Passenger::create(['user_id' => $this->passengerUser->id, 'mobile_number' => '0917' . rand(1000000, 9999999)]);

        $driverUser = User::create([
            'name' => 'Heading Driver', 'email' => 'heading.d.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);
        $operator = Operator::create([
            'user_id' => $driverUser->id, 'first_name' => 'Heading', 'last_name' => 'Driver',
            'contact_number' => '09170000091', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-HEAD-001', 'license_expiry_date' => '2028-01-01',
        ]);
        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'plate_number' => 'HDG-0001',
            'engine_number' => 'ENG-HDG-001', 'chassis_number' => 'CHS-HDG-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-HDG-001', 'cr_number' => 'CR-HDG-001', 'status' => 'active',
        ]);
        $this->driver = Driver::create([
            'user_id' => $driverUser->id, 'operator_id' => $operator->id, 'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-HEAD-001', 'is_online' => true, 'is_available' => false,
            'current_lat' => 14.0715, 'current_lng' => 120.6330,
        ]);
        $this->booking = Booking::create([
            'booking_code' => 'BK-HDG-' . uniqid(), 'passenger_id' => $passenger->id,
            'driver_id' => $this->driver->id, 'tricycle_id' => $this->tricycle->id,
            'pickup_name' => 'A', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'B', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 20, 'passenger_count' => 1, 'fare_per_passenger' => 20, 'distance_km' => 1.0,
            'status' => 'accepted', 'requested_at' => now(), 'accepted_at' => now(),
        ]);
    }

    private function ping(?int $heading, int $secondsAgo = 0): void
    {
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id, 'latitude' => 14.0715, 'longitude' => 120.6330,
            'speed_kmh' => 10, 'heading_deg' => $heading, 'accuracy_m' => 5,
            'source' => 'mobile_app', 'recorded_at' => now()->subSeconds($secondsAgo),
        ]);
    }

    private function activeBooking()
    {
        Sanctum::actingAs($this->passengerUser, ['*']);

        return $this->getJson('/api/v1/passenger/bookings/active');
    }

    #[Test]
    public function latest_location_heading_is_returned(): void
    {
        $this->ping(45, 60);
        $this->ping(90, 0);

        $this->activeBooking()->assertOk()->assertJsonPath('booking.driver.heading_deg', 90);
    }

    #[Test]
    public function a_latest_location_without_heading_returns_null(): void
    {
        $this->ping(90, 60);
        $this->ping(null, 0);

        $this->activeBooking()->assertOk()->assertJsonPath('booking.driver.heading_deg', null);
    }

    #[Test]
    public function no_location_record_returns_null(): void
    {
        $this->activeBooking()->assertOk()->assertJsonPath('booking.driver.heading_deg', null);
    }

    #[Test]
    public function existing_driver_and_booking_fields_are_unchanged(): void
    {
        $this->ping(90);

        $response = $this->activeBooking()->assertOk();
        $response->assertJsonPath('booking.id', $this->booking->id);
        $response->assertJsonPath('booking.status', 'accepted');
        $response->assertJsonPath('booking.driver.id', $this->driver->id);
        $response->assertJsonPath('booking.driver.current_lat', 14.0715);
        $response->assertJsonPath('booking.driver.current_lng', 120.633);
        $this->assertNotNull($response->json('booking.driver.user'));
        $this->assertNotNull($response->json('booking.tricycle'));
        $this->assertArrayHasKey('dispatch_state', $response->json('booking'));
    }
}
