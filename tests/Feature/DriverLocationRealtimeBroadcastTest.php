<?php

namespace Tests\Feature;

use App\Events\DriverLocationUpdated;
use App\Models\Booking;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverLocationRealtimeBroadcastTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Driver $driver;
    protected Operator $operator;
    protected Tricycle $tricycle;

    protected User $passengerUser;
    protected Passenger $passenger;

    protected User $otherPassengerUser;
    protected Passenger $otherPassenger;

    protected function setUp(): void
    {
        parent::setUp();


        $colorScheme = ColorCodingScheme::create([
            'name'            => 'Realtime Scheme ' . uniqid(),
            'color_hex'       => '#0000FF',
            'restricted_days' => ['Monday'],
            'is_active'       => true,
        ]);

        $issuer = User::create([
            'name'     => 'BPLO Issuer RT',
            'email'    => 'bplo.rt.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role'     => 'bplo_staff',
        ]);

        // Driver setup
        $this->driverUser = User::create([
            'name'     => 'Realtime Driver',
            'email'    => 'rt.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role'     => 'tricycle_driver',
        ]);

        $this->operator = Operator::create([
            'user_id'             => $this->driverUser->id,
            'first_name'          => 'Realtime',
            'last_name'           => 'Driver',
            'contact_number'      => '09170000041',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'LIC-RT-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id'          => $this->operator->id,
            'coding_scheme_number' => '0041',
            'plate_number'         => 'RT-0041',
            'engine_number'        => 'ENG-RT-041',
            'chassis_number'       => 'CHS-RT-041',
            'make'                 => 'Honda',
            'model'                => 'TMX',
            'year_model'           => 2022,
            'body_color'           => 'Blue',
            'body_type'            => 'Standard',
            'or_number'            => 'OR-RT-041',
            'cr_number'            => 'CR-RT-041',
            'status'               => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        FranchiseScheme::create([
            'tricycle_id'            => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by'              => $issuer->id,
            'franchise_number'       => 'FR-RT-' . uniqid(),
            'issue_date'             => '2024-01-01',
            'expiry_date'            => '2029-01-01',
            'is_active'              => true,
        ]);

        $this->driver = Driver::create([
            'user_id'        => $this->driverUser->id,
            'operator_id'    => $this->operator->id,
            'tricycle_id'    => $this->tricycle->id,
            'license_number' => 'LIC-RT-001',
            'mobile_number'  => '09170000041',
            'is_online'      => true,
            'is_available'   => false,
            'current_lat'    => 14.0680,
            'current_lng'    => 120.6280,
        ]);

        // Primary Passenger
        $this->passengerUser = User::create([
            'name'     => 'Realtime Passenger',
            'email'    => 'rt.passenger.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role'     => 'passenger',
        ]);

        $this->passenger = Passenger::create([
            'user_id'                 => $this->passengerUser->id,
            'mobile_number'           => '09180000041',
            'terms_accepted'          => true,
            'privacy_policy_accepted' => true,
        ]);

        // Second (unauthorized) passenger
        $this->otherPassengerUser = User::create([
            'name'     => 'Other Passenger',
            'email'    => 'other.passenger.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role'     => 'passenger',
        ]);

        $this->otherPassenger = Passenger::create([
            'user_id'                 => $this->otherPassengerUser->id,
            'mobile_number'           => '09180000042',
            'terms_accepted'          => true,
            'privacy_policy_accepted' => true,
        ]);

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb' => [
                'driver' => 'reverb',
                'key' => 'test_reverb_key',
                'secret' => 'test_reverb_secret',
                'app_id' => '123456',
                'options' => [
                    'host' => '127.0.0.1',
                    'port' => 8080,
                    'scheme' => 'http',
                    'useTLS' => false,
                ],
            ],
        ]);

        require base_path('routes/channels.php');
    }

    private function createBooking(string $status = 'accepted'): Booking
    {
        return Booking::create([
            'booking_code'            => 'TRV-' . strtoupper(uniqid()),
            'booking_type'            => Booking::TYPE_BOOKING,
            'passenger_id'            => $this->passenger->id,
            'driver_id'               => $this->driver->id,
            'tricycle_id'             => $this->tricycle->id,
            'pickup_name'             => 'Test Pickup',
            'pickup_lat'              => 14.0680,
            'pickup_lng'              => 120.6280,
            'dropoff_name'            => 'Test Dropoff',
            'dropoff_lat'             => 14.0720,
            'dropoff_lng'             => 120.6320,
            'fare_amount'             => 35.00,
            'passenger_count'         => 1,
            'fare_per_passenger'      => 35.00,
            'distance_km'             => 1.5,
            'estimated_duration_mins' => 5,
            'status'                  => $status,
            'payment_method'          => 'cash',
            'payment_status'          => 'unpaid',
            'requested_at'            => now(),
            'accepted_at'             => now(),
        ]);
    }

    public function test_driver_telemetry_broadcasts_location_to_active_booking_channel(): void
    {
        Event::fake([DriverLocationUpdated::class]);

        $booking = $this->createBooking('accepted');

        Sanctum::actingAs($this->driverUser);

        $payload = [
            'latitude'    => 14.0688,
            'longitude'   => 120.6288,
            'speed_kmh'   => 18.5,
            'heading_deg' => 90,
            'accuracy_m'  => 4.2,
            'recorded_at' => now()->toIso8601String(),
        ];

        $response = $this->postJson('/api/v1/driver/telematics', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('tricycle_locations', [
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.0688,
            'longitude'   => 120.6288,
        ]);

        $this->driver->refresh();
        $this->assertEquals(14.0688, (float) $this->driver->current_lat);
        $this->assertEquals(120.6288, (float) $this->driver->current_lng);

        Event::assertDispatched(DriverLocationUpdated::class, function (DriverLocationUpdated $event) use ($booking) {
            return $event->bookingId === $booking->id
                && $event->driverId === $this->driver->id
                && $event->tricycleId === $this->tricycle->id
                && abs($event->latitude - 14.0688) < 0.0001
                && abs($event->longitude - 120.6288) < 0.0001
                && $event->headingDeg === 90;
        });
    }

    public function test_driver_telemetry_does_not_broadcast_if_booking_is_not_active(): void
    {
        Event::fake([DriverLocationUpdated::class]);

        // Booking is completed, so not in ['accepted', 'arrived', 'in_transit']
        $this->createBooking('completed');

        Sanctum::actingAs($this->driverUser);

        $payload = [
            'latitude'    => 14.0690,
            'longitude'   => 120.6290,
            'speed_kmh'   => 15.0,
            'heading_deg' => 180,
            'recorded_at' => now()->toIso8601String(),
        ];

        $response = $this->postJson('/api/v1/driver/telematics', $payload);

        $response->assertStatus(201);
        Event::assertNotDispatched(DriverLocationUpdated::class);
    }

    public function test_driver_telemetry_batch_broadcasts_latest_location_to_active_booking(): void
    {
        Event::fake([DriverLocationUpdated::class]);

        $booking = $this->createBooking('in_transit');

        Sanctum::actingAs($this->driverUser);

        $payload = [
            'pings' => [
                [
                    'latitude'    => 14.0670,
                    'longitude'   => 120.6270,
                    'heading_deg' => 45,
                    'recorded_at' => now()->subSeconds(10)->toIso8601String(),
                ],
                [
                    'latitude'    => 14.0695,
                    'longitude'   => 120.6295,
                    'heading_deg' => 120,
                    'recorded_at' => now()->toIso8601String(),
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/driver/telematics/batch', $payload);

        $response->assertStatus(200);

        Event::assertDispatched(DriverLocationUpdated::class, function (DriverLocationUpdated $event) use ($booking) {
            return $event->bookingId === $booking->id
                && abs($event->latitude - 14.0695) < 0.0001
                && abs($event->longitude - 120.6295) < 0.0001
                && $event->headingDeg === 120;
        });
    }

    public function test_driver_location_updated_event_payload_is_minimal_and_authoritative(): void
    {
        $event = new DriverLocationUpdated(
            bookingId: 42,
            driverId: 7,
            tricycleId: 99,
            latitude: 14.0685,
            longitude: 120.6285,
            headingDeg: 270,
            recordedAt: '2026-10-05T12:00:00Z'
        );

        $this->assertEquals(['private-booking.42'], array_map(fn($ch) => $ch->name, $event->broadcastOn()));
        $this->assertEquals('DriverLocationUpdated', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals([
            'booking_id'  => 42,
            'driver_id'   => 7,
            'tricycle_id' => 99,
            'latitude'    => 14.0685,
            'longitude'   => 120.6285,
            'heading_deg' => 270,
            'recorded_at' => '2026-10-05T12:00:00Z',
            'pickup_distance_km' => null,
            'pickup_eta_mins'    => null,
        ], $payload);

        // Verify sensitive or unnecessary fields are NOT present
        $this->assertArrayNotHasKey('password', $payload);
        $this->assertArrayNotHasKey('token', $payload);
        $this->assertArrayNotHasKey('driver_name', $payload);
    }

    public function test_authorized_passenger_can_authenticate_booking_channel(): void
    {
        $booking = $this->createBooking('accepted');

        Sanctum::actingAs($this->passengerUser);

        $response = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-booking.' . $booking->id,
            'socket_id'    => '12345.67890',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('auth', $response->json());
    }

    public function test_unauthorized_passenger_cannot_authenticate_another_passengers_booking_channel(): void
    {
        $booking = $this->createBooking('accepted');

        // Authenticated as OTHER passenger
        Sanctum::actingAs($this->otherPassengerUser);

        $response = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-booking.' . $booking->id,
            'socket_id'    => '12345.67890',
        ]);

        $response->assertStatus(403);
    }

    public function test_passenger_cannot_authenticate_channel_when_booking_is_completed(): void
    {
        $booking = $this->createBooking('completed');

        Sanctum::actingAs($this->passengerUser);

        $response = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-booking.' . $booking->id,
            'socket_id'    => '12345.67890',
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_cannot_access_channel_auth(): void
    {
        $booking = $this->createBooking('accepted');

        $response = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-booking.' . $booking->id,
            'socket_id'    => '12345.67890',
        ]);

        $response->assertStatus(401);
    }
}
