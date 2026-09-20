<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\RideRating;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingRouteAssignmentTest extends TestCase
{
    use DatabaseTransactions;

    protected TodaZone $zoneBrgy8;
    protected TodaZone $zoneBucana;
    protected Driver $driverBrgy8Online;
    protected Driver $driverBucanaOnline;
    protected Driver $driverBrgy8Offline;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Fetch or create TODA zones — coordinates matter now: TODA matching is purely
        // nearest-pin (haversine to latitude/longitude), no GeoJSON fallback, so a zone without
        // real coordinates would simply be excluded from matching.
        $this->zoneBrgy8 = TodaZone::firstOrCreate(
            ['code' => 'TODA-BRGY8'],
            ['name' => 'TODA Brgy. 8', 'barangay' => 'Brgy. 8', 'is_active' => true, 'latitude' => 14.0693163, 'longitude' => 120.6347771]
        );

        $this->zoneBucana = TodaZone::firstOrCreate(
            ['code' => 'TODA-BUCANA'],
            ['name' => 'TODA Bucana', 'barangay' => 'Bucana', 'is_active' => true, 'latitude' => 14.0677115, 'longitude' => 120.6275606]
        );

        // 2. Setup Drivers
        $user1 = User::create([
            'name' => 'Driver One',
            'email' => 'driver1.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $op1 = Operator::create([
            'toda_id' => $this->zoneBrgy8->id,
            'first_name' => 'Driver',
            'last_name' => 'One',
            'contact_number' => '09170000001',
            'address' => 'Brgy 8',
            'barangay' => 'Brgy 8',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TEST-001',
            'license_expiry_date' => '2028-01-01',
        ]);
        $tri1 = Tricycle::create([
            'operator_id' => $op1->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'plate_number' => 'PLT-TEST-001',
            'engine_number' => 'ENG-TEST-001',
            'chassis_number' => 'CHS-TEST-001',
            'make' => 'Honda',
            'model' => 'TMX 125',
            'year_model' => 2021,
            'body_color' => 'Red',
            'body_type' => 'Standard',
            'or_number' => 'OR-TEST-001',
            'cr_number' => 'CR-TEST-001',
            'status' => 'active',
        ]);
        $this->driverBrgy8Online = Driver::create([
            'user_id' => $user1->id,
            'operator_id' => $op1->id,
            'tricycle_id' => $tri1->id,
            'license_number' => 'LIC-TEST-001',
            'is_online' => true,
            'is_available' => true,
            'current_lat' => 14.0715,
            'current_lng' => 120.6330,
        ]);

        $user2 = User::create([
            'name' => 'Driver Two',
            'email' => 'driver2.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $op2 = Operator::create([
            'toda_id' => $this->zoneBucana->id,
            'first_name' => 'Driver',
            'last_name' => 'Two',
            'contact_number' => '09170000002',
            'address' => 'Bucana',
            'barangay' => 'Bucana',
            'date_of_birth' => '1992-01-01',
            'license_number' => 'LIC-TEST-002',
            'license_expiry_date' => '2028-01-01',
        ]);
        $tri2 = Tricycle::create([
            'operator_id' => $op2->id,
            'toda_zone_id' => $this->zoneBucana->id,
            'plate_number' => 'PLT-TEST-002',
            'engine_number' => 'ENG-TEST-002',
            'chassis_number' => 'CHS-TEST-002',
            'make' => 'Kawasaki',
            'model' => 'Barako 175',
            'year_model' => 2022,
            'body_color' => 'Blue',
            'body_type' => 'Standard',
            'or_number' => 'OR-TEST-002',
            'cr_number' => 'CR-TEST-002',
            'status' => 'active',
        ]);
        $this->driverBucanaOnline = Driver::create([
            'user_id' => $user2->id,
            'operator_id' => $op2->id,
            'tricycle_id' => $tri2->id,
            'license_number' => 'LIC-TEST-002',
            'is_online' => true,
            'is_available' => true,
            'current_lat' => 14.0640,
            'current_lng' => 120.6298,
        ]);

        $user3 = User::create([
            'name' => 'Driver Three',
            'email' => 'driver3.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $op3 = Operator::create([
            'toda_id' => $this->zoneBrgy8->id,
            'first_name' => 'Driver',
            'last_name' => 'Three',
            'contact_number' => '09170000003',
            'address' => 'Brgy 8',
            'barangay' => 'Brgy 8',
            'date_of_birth' => '1995-01-01',
            'license_number' => 'LIC-TEST-003',
            'license_expiry_date' => '2028-01-01',
        ]);
        $tri3 = Tricycle::create([
            'operator_id' => $op3->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'plate_number' => 'PLT-TEST-003',
            'engine_number' => 'ENG-TEST-003',
            'chassis_number' => 'CHS-TEST-003',
            'make' => 'Yamaha',
            'model' => 'STX',
            'year_model' => 2020,
            'body_color' => 'Green',
            'body_type' => 'Standard',
            'or_number' => 'OR-TEST-003',
            'cr_number' => 'CR-TEST-003',
            'status' => 'active',
        ]);
        $this->driverBrgy8Offline = Driver::create([
            'user_id' => $user3->id,
            'operator_id' => $op3->id,
            'tricycle_id' => $tri3->id,
            'license_number' => 'LIC-TEST-003',
            'is_online' => false,
            'is_available' => true,
            'current_lat' => 14.0715,
            'current_lng' => 120.6330,
        ]);
    }

    #[Test]
    public function booking_creation_assigns_the_nearest_toda_pin_to_pickup()
    {
        // requestBooking is authenticated (auth:sanctum) — the booking belongs to whichever
        // passenger record the token resolves to, not a client-supplied id.
        $passengerUser = User::create([
            'name' => 'Route Test Passenger',
            'email' => 'route.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($passengerUser, ['*']);

        // Pickup near TODA Brgy. 8's own pin (see setUp), well away from TODA Bucana's.
        $response = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Municipal Hall',
            'pickup_lat' => 14.071514,
            'pickup_lng' => 120.633083,
            'dropoff_name' => 'Barangay 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'passenger_count' => 3,
            'fare_per_passenger' => 15.00,
        ]);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        $this->assertNotNull($booking);
        $this->assertEquals($this->zoneBrgy8->id, $booking->toda_zone_id);
    }

    #[Test]
    public function destination_coordinates_do_not_affect_toda_matching()
    {
        // Same pickup as the test above (nearest to TODA Brgy. 8), but the dropoff is now placed
        // right on top of TODA Bucana's own pin. Only pickup may influence the matched zone.
        $passengerUser = User::create([
            'name' => 'Destination Independence Passenger',
            'email' => 'destination.independence.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($passengerUser, ['*']);

        $response = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Municipal Hall',
            'pickup_lat' => 14.071514,
            'pickup_lng' => 120.633083,
            'dropoff_name' => 'Right at TODA Bucana',
            'dropoff_lat' => $this->zoneBucana->latitude,
            'dropoff_lng' => $this->zoneBucana->longitude,
            'passenger_count' => 1,
            'fare_per_passenger' => 20.00,
        ]);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        $this->assertEquals($this->zoneBrgy8->id, $booking->toda_zone_id);
        $this->assertNotEquals($this->zoneBucana->id, $booking->toda_zone_id);
    }

    #[Test]
    public function a_toda_zone_id_that_does_not_exist_in_this_table_does_not_422_and_is_ignored()
    {
        // The passenger app displays a TODA zone matched from its own local reference data,
        // whose ids don't correspond to this table's actual auto-increment ids. Sending that id
        // must never 422 (previously caused by `exists:toda_zones,id`) — pickup coordinates
        // alone determine the real zone, server-side.
        $passengerUser = User::create([
            'name' => 'Mismatched Zone Passenger',
            'email' => 'mismatched.zone.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($passengerUser, ['*']);

        $response = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Municipal Hall',
            'pickup_lat' => 14.071514,
            'pickup_lng' => 120.633083,
            'dropoff_name' => 'Barangay 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'passenger_count' => 2,
            'fare_per_passenger' => 20.00,
            'toda_zone_id' => 999999, // does not exist in toda_zones
        ]);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        $this->assertNotNull($booking);
        $this->assertEquals($this->zoneBrgy8->id, $booking->toda_zone_id);
    }

    #[Test]
    public function a_toda_zone_id_that_does_not_match_the_pickup_is_not_trusted()
    {
        // Even a *valid* toda_zone_id (exists in the table) must be overridden by the zone
        // actually matched from pickup coordinates — the backend is the authority, not the app.
        $passengerUser = User::create([
            'name' => 'Wrong Zone Passenger',
            'email' => 'wrong.zone.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Sanctum::actingAs($passengerUser, ['*']);

        // Pickup coordinates are in Brgy. 8's territory (same as the geojson-route test above),
        // but the client claims the pickup TODA is Bucana.
        $response = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Municipal Hall',
            'pickup_lat' => 14.071514,
            'pickup_lng' => 120.633083,
            'dropoff_name' => 'Barangay 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'passenger_count' => 2,
            'fare_per_passenger' => 20.00,
            'toda_zone_id' => $this->zoneBucana->id,
        ]);

        $response->assertStatus(201);
        $booking = Booking::find($response->json('booking.id'));

        $this->assertNotNull($booking);
        $this->assertEquals($this->zoneBrgy8->id, $booking->toda_zone_id);
        $this->assertNotEquals($this->zoneBucana->id, $booking->toda_zone_id);
    }

    #[Test]
    public function only_eligible_online_and_matching_toda_drivers_receive_booking_request()
    {
        $passengerUser = User::create([
            'name' => 'Passenger Test',
            'email' => 'passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '09190000000',
        ]);

        // Create booking in TODA Brgy. 8
        $booking = Booking::create([
            'booking_code' => 'BK-TEST-BRGY8',
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // 1. Online driver in TODA Brgy 8 receives the request — identity comes from the
        // authenticated account (auth:sanctum), not a driver_id query param.
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $res1 = $this->getJson('/api/v1/driver/bookings/pending');
        $res1->assertStatus(200);
        $this->assertCount(1, $res1->json('requests'));
        $this->assertEquals($booking->id, $res1->json('requests.0.id'));

        // 2. Online driver in TODA Bucana (different route) MUST NOT receive the request
        Sanctum::actingAs($this->driverBucanaOnline->user, ['*']);
        $res2 = $this->getJson('/api/v1/driver/bookings/pending');
        $res2->assertStatus(200);
        $this->assertCount(0, $res2->json('requests'));

        // 3. Offline driver in TODA Brgy 8 MUST NOT receive the request
        Sanctum::actingAs($this->driverBrgy8Offline->user, ['*']);
        $res3 = $this->getJson('/api/v1/driver/bookings/pending');
        $res3->assertStatus(200);
        $this->assertCount(0, $res3->json('requests'));
    }

    #[Test]
    public function declining_a_request_hides_it_from_that_driver_only_without_changing_its_status()
    {
        $passenger = Passenger::create([
            'user_id' => User::create([
                'name' => 'Decline Test Passenger', 'email' => 'decline.'.uniqid().'@trivora.test',
                'password' => bcrypt('password'), 'role' => 'passenger',
            ])->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);
        $booking = Booking::create([
            'booking_code' => 'BK-DECLINE-'.uniqid(),
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel', 'dropoff_lat' => 14.0703, 'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00, 'status' => 'pending', 'requested_at' => now(),
        ]);

        // driverBrgy8Online declines it.
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $decline = $this->postJson("/api/v1/driver/bookings/{$booking->id}/decline");
        $decline->assertStatus(200);

        // The booking itself is untouched — still pending, still assignable.
        $this->assertEquals('pending', $booking->refresh()->status);
        $this->assertDatabaseHas('booking_driver_declines', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverBrgy8Online->id,
        ]);

        // Declining again is idempotent — no duplicate row, no error.
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/decline")->assertStatus(200);
        $this->assertDatabaseCount('booking_driver_declines', 1);

        // The declining driver no longer receives it...
        $afterDecline = $this->getJson('/api/v1/driver/bookings/pending');
        $this->assertFalse(
            collect($afterDecline->json('requests'))->pluck('id')->contains($booking->id),
            'A driver must never be re-offered a request they already declined.'
        );

        // ...but a DIFFERENT eligible driver in the same zone still sees it (reusing the offline
        // Brgy 8 fixture driver here, flipped online, as that second eligible driver).
        $this->driverBrgy8Offline->update(['is_online' => true]);
        Sanctum::actingAs($this->driverBrgy8Offline->user, ['*']);
        $forOtherDriver = $this->getJson('/api/v1/driver/bookings/pending');
        $this->assertTrue(
            collect($forOtherDriver->json('requests'))->pluck('id')->contains($booking->id),
            'A decline by one driver must not remove the request for other eligible drivers.'
        );
    }

    #[Test]
    public function declining_requires_an_authenticated_driver_account()
    {
        $booking = $this->makeBookingWithStatus('pending');

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/decline");
        $response->assertStatus(401);
    }

    #[Test]
    public function a_passenger_cancelling_a_pending_booking_removes_it_from_every_drivers_pending_list()
    {
        $booking = $this->makeBookingWithStatus('pending');

        Sanctum::actingAs(Passenger::find($booking->passenger_id)->user, ['*']);
        $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", ['status' => 'cancelled'])
            ->assertStatus(200);

        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $pending = $this->getJson('/api/v1/driver/bookings/pending');
        $this->assertFalse(
            collect($pending->json('requests'))->pluck('id')->contains($booking->id),
            'A passenger-cancelled booking must never still appear as a pending request to any driver.'
        );
    }

    #[Test]
    public function only_one_driver_can_accept_a_pending_booking()
    {
        $passengerUser = User::create([
            'name' => 'Race Test Passenger',
            'email' => 'race.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '09190000099',
        ]);

        $booking = Booking::create([
            'booking_code' => 'BK-TEST-RACE',
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // Driver A accepts first — must succeed and assign the booking to them.
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $resA = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");
        $resA->assertStatus(200);
        $this->assertEquals('accepted', $resA->json('booking.status'));
        $this->assertEquals($this->driverBrgy8Online->id, $resA->json('booking.driver_id'));

        // Driver B accepts the SAME booking afterward — must be rejected with 409, and must NOT
        // overwrite driver A's assignment.
        Sanctum::actingAs($this->driverBucanaOnline->user, ['*']);
        $resB = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");
        $resB->assertStatus(409);

        $booking->refresh();
        $this->assertEquals('accepted', $booking->status);
        $this->assertEquals($this->driverBrgy8Online->id, $booking->driver_id);
    }

    #[Test]
    public function accepting_a_booking_requires_an_authenticated_driver_account()
    {
        $passengerUser = User::create([
            'name' => 'Unauth Test Passenger',
            'email' => 'unauth.passenger.test@trivora.ph',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '09190000098',
        ]);

        $booking = Booking::create([
            'booking_code' => 'BK-TEST-NOAUTH',
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        // No Sanctum::actingAs() — an unauthenticated accept attempt must be rejected before it
        // ever reaches the controller.
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");
        $response->assertStatus(401);

        $booking->refresh();
        $this->assertEquals('pending', $booking->status);
        $this->assertNull($booking->driver_id);
    }

    private function makeBookingWithStatus(string $status): Booking
    {
        $passengerUser = User::create([
            'name' => 'Transition Test Passenger '.uniqid(),
            'email' => 'transition.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);

        return Booking::create([
            'booking_code' => 'BK-TEST-'.uniqid(),
            'passenger_id' => $passenger->id,
            'driver_id' => $this->driverBrgy8Online->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => $status,
            'requested_at' => now(),
        ]);
    }

    #[Test]
    public function the_full_valid_status_lifecycle_is_accepted_in_order()
    {
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $booking = $this->makeBookingWithStatus('accepted');

        $res1 = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'arrived']);
        $res1->assertStatus(200);
        $this->assertEquals('arrived', $booking->refresh()->status);

        $res2 = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'in_transit']);
        $res2->assertStatus(200);
        $this->assertEquals('in_transit', $booking->refresh()->status);

        $res3 = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'completed']);
        $res3->assertStatus(200);
        $this->assertEquals('completed', $booking->refresh()->status);
    }

    #[Test]
    public function pending_cannot_skip_directly_to_completed()
    {
        $booking = $this->makeBookingWithStatus('pending');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'completed']);
        $response->assertStatus(409);

        $this->assertEquals('pending', $booking->refresh()->status);
    }

    #[Test]
    public function accepted_cannot_skip_directly_to_completed()
    {
        $booking = $this->makeBookingWithStatus('accepted');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'completed']);
        $response->assertStatus(409);

        $this->assertEquals('accepted', $booking->refresh()->status);
    }

    #[Test]
    public function completed_is_a_terminal_status()
    {
        $booking = $this->makeBookingWithStatus('completed');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $toArrived = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'arrived']);
        $toArrived->assertStatus(409);

        $toInTransit = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'in_transit']);
        $toInTransit->assertStatus(409);

        $this->assertEquals('completed', $booking->refresh()->status);
    }

    #[Test]
    public function a_driver_cannot_update_a_booking_assigned_to_a_different_driver()
    {
        $booking = $this->makeBookingWithStatus('accepted');
        Sanctum::actingAs($this->driverBucanaOnline->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'arrived']);
        $response->assertStatus(403);

        $this->assertEquals('accepted', $booking->refresh()->status);
    }

    #[Test]
    public function a_driver_can_cancel_while_still_accepted_and_not_yet_arrived()
    {
        $booking = $this->makeBookingWithStatus('accepted');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'cancelled']);
        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals('cancelled', $booking->status);
        $this->assertEquals('driver', $booking->cancelled_by);
    }

    #[Test]
    public function a_driver_cannot_cancel_once_arrived()
    {
        $booking = $this->makeBookingWithStatus('arrived');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'cancelled']);
        $response->assertStatus(409);

        $this->assertEquals('arrived', $booking->refresh()->status);
    }

    #[Test]
    public function a_driver_cannot_cancel_once_in_transit()
    {
        $booking = $this->makeBookingWithStatus('in_transit');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'cancelled']);
        $response->assertStatus(409);

        $this->assertEquals('in_transit', $booking->refresh()->status);
    }

    #[Test]
    public function a_driver_cannot_cancel_a_completed_booking()
    {
        $booking = $this->makeBookingWithStatus('completed');
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'cancelled']);
        $response->assertStatus(409);

        $this->assertEquals('completed', $booking->refresh()->status);
    }

    #[Test]
    public function the_drivers_cancel_window_restriction_does_not_affect_passenger_cancellation()
    {
        // The extra driver-only restriction in updateStatus() must not touch the pre-existing,
        // unchanged passenger-side cancellation rules — a passenger can still cancel after
        // 'arrived', same as before this change.
        $booking = $this->makeBookingWithStatus('arrived');
        Sanctum::actingAs(Passenger::find($booking->passenger_id)->user, ['*']);

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", ['status' => 'cancelled']);
        $response->assertStatus(200);

        $this->assertEquals('cancelled', $booking->refresh()->status);
    }

    #[Test]
    public function a_still_searching_pending_booking_can_be_cancelled()
    {
        $booking = $this->makeBookingWithStatus('pending');
        Sanctum::actingAs(Passenger::find($booking->passenger_id)->user, ['*']);

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", ['status' => 'cancelled']);
        $response->assertStatus(200);

        $this->assertEquals('cancelled', $booking->refresh()->status);
    }

    #[Test]
    public function passenger_cancelling_before_driver_acceptance_never_generates_driver_earnings_or_rating()
    {
        // A genuinely still-searching booking has no driver assigned yet — unlike
        // makeBookingWithStatus's fixture (which always pre-assigns driverBrgy8Online for the
        // status-transition tests above), this must be built with no driver_id at all.
        $passengerUser = User::create([
            'name' => 'Before Accept Passenger', 'email' => 'before.accept.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        $passenger = Passenger::create(['user_id' => $passengerUser->id, 'mobile_number' => '0917'.rand(1000000, 9999999)]);
        $booking = Booking::create([
            'booking_code' => 'BK-TEST-'.uniqid(),
            'passenger_id' => $passenger->id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel', 'dropoff_lat' => 14.0703, 'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00, 'status' => 'pending', 'requested_at' => now(),
        ]);
        $driver = $this->driverBrgy8Online;
        $earningsBefore = $driver->today_earnings;
        $tripsBefore = $driver->total_trips;

        Sanctum::actingAs(Passenger::find($booking->passenger_id)->user, ['*']);
        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", ['status' => 'cancelled']);
        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals('cancelled', $booking->status);
        $this->assertNull($booking->driver_id, 'A booking cancelled before acceptance must never have a driver assigned.');
        $this->assertNull(RideRating::where('booking_id', $booking->id)->first());

        // No driver was ever assigned to this booking, so no driver's earnings/trips can have
        // been touched by it — confirmed here against the driver used for makeBookingWithStatus's
        // (unused) driver_id column, which this cancellation must leave completely untouched.
        $driver->refresh();
        $this->assertEquals((float) $earningsBefore, (float) $driver->today_earnings);
        $this->assertEquals($tripsBefore, $driver->total_trips);
    }

    #[Test]
    public function passenger_cancelling_after_driver_acceptance_never_generates_normal_completed_earnings_or_rating()
    {
        $booking = $this->makeBookingWithStatus('accepted');
        $driver = $this->driverBrgy8Online;
        $driver->update(['is_available' => false]);
        $earningsBefore = $driver->today_earnings;
        $tripsBefore = $driver->total_trips;

        Sanctum::actingAs(Passenger::find($booking->passenger_id)->user, ['*']);
        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", ['status' => 'cancelled']);
        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals('cancelled', $booking->status);
        $this->assertEquals('passenger', $booking->cancelled_by);
        // The assignment itself is preserved for history/audit — driver_id being non-null here
        // (vs. the before-acceptance test above, where it stays null) is exactly how the two
        // cancellation stages remain distinguishable without any extra column.
        $this->assertNotNull($booking->driver_id);
        $this->assertNull(RideRating::where('booking_id', $booking->id)->first());

        $driver->refresh();
        $this->assertEquals((float) $earningsBefore, (float) $driver->today_earnings);
        $this->assertEquals($tripsBefore, $driver->total_trips);
        $this->assertTrue((bool) $driver->is_available, 'Cancelling an assigned ride must free the driver back up.');

        // Cancelled bookings must never masquerade as completed rides in either party's history.
        Sanctum::actingAs($driver->user, ['*']);
        $driverHistory = $this->getJson('/api/v1/driver/bookings/history');
        $entry = collect($driverHistory->json('bookings'))->firstWhere('id', $booking->id);
        $this->assertNotNull($entry);
        $this->assertEquals('cancelled', $entry['status']);
    }

    /** Returns [Booking, passengerUser] for a completed booking owned by a fresh passenger. */
    private function makeCompletedBookingWithPassenger(): array
    {
        $passengerUser = User::create([
            'name' => 'History Test Passenger '.uniqid(),
            'email' => 'history.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);

        $booking = Booking::create([
            'booking_code' => 'BK-TEST-'.uniqid(),
            'passenger_id' => $passenger->id,
            'driver_id' => $this->driverBrgy8Online->id,
            'tricycle_id' => $this->driverBrgy8Online->tricycle_id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => 14.0715,
            'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => 'completed',
            'requested_at' => now()->subMinutes(20),
            'accepted_at' => now()->subMinutes(18),
            'arrived_at' => now()->subMinutes(15),
            'started_at' => now()->subMinutes(13),
            'completed_at' => now()->subMinutes(2),
        ]);

        return [$booking, $passengerUser];
    }

    #[Test]
    public function passenger_history_returns_completed_at_as_the_booking_timestamp()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();
        Sanctum::actingAs($passengerUser, ['*']);

        $response = $this->getJson('/api/v1/passenger/bookings/history');
        $response->assertStatus(200);

        $entry = collect($response->json('bookings'))->firstWhere('id', $booking->id);
        $this->assertNotNull($entry, 'Completed booking missing from passenger history.');
        $this->assertEquals(
            $booking->completed_at->toJSON(),
            $entry['completed_at'],
            'Passenger history must return the same completed_at value stored on the booking.'
        );
    }

    #[Test]
    public function driver_history_returns_the_same_booking_timestamp_as_passenger_history()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();

        Sanctum::actingAs($passengerUser, ['*']);
        $passengerRes = $this->getJson('/api/v1/passenger/bookings/history');

        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $driverRes = $this->getJson('/api/v1/driver/bookings/history');

        $passengerEntry = collect($passengerRes->json('bookings'))->firstWhere('id', $booking->id);
        $driverEntry = collect($driverRes->json('bookings'))->firstWhere('id', $booking->id);

        $this->assertNotNull($passengerEntry);
        $this->assertNotNull($driverEntry);
        // Same underlying field, same raw JSON string — no per-endpoint reformatting or a
        // separate timezone conversion applied on one side only.
        $this->assertEquals($passengerEntry['completed_at'], $driverEntry['completed_at']);
        $this->assertEquals($passengerEntry['requested_at'], $driverEntry['requested_at']);
        // UTC wire format (trailing Z) on both — neither endpoint pre-converts to local time,
        // so there is exactly one conversion left to do (on the client, for display).
        $this->assertStringEndsWith('Z', $passengerEntry['completed_at']);
        $this->assertStringEndsWith('Z', $driverEntry['completed_at']);
    }

    #[Test]
    public function passenger_rating_is_stored_against_the_correct_booking_and_passenger()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();
        Sanctum::actingAs($passengerUser, ['*']);

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", [
            'score' => 5,
            'feedback_tags' => ['Safe Driving'],
            'comment' => 'Great ride',
        ]);
        $response->assertStatus(201);

        $rating = RideRating::where('booking_id', $booking->id)->first();
        $this->assertNotNull($rating);
        $this->assertEquals($booking->passenger_id, $rating->passenger_id);
        $this->assertEquals($booking->driver_id, $rating->driver_id);
        $this->assertEquals(5, $rating->score);
    }

    #[Test]
    public function driver_history_receives_the_passengers_rating_for_the_same_booking()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();
        Sanctum::actingAs($passengerUser, ['*']);
        $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 4])
            ->assertStatus(201);

        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $driverRes = $this->getJson('/api/v1/driver/bookings/history');
        $driverEntry = collect($driverRes->json('bookings'))->firstWhere('id', $booking->id);

        $this->assertNotNull($driverEntry);
        $this->assertNotNull($driverEntry['rating'], 'Driver history must include the rating relation.');
        $this->assertEquals(4, $driverEntry['rating']['score']);

        Sanctum::actingAs($passengerUser, ['*']);
        $passengerRes = $this->getJson('/api/v1/passenger/bookings/history');
        $passengerEntry = collect($passengerRes->json('bookings'))->firstWhere('id', $booking->id);
        $this->assertEquals(4, $passengerEntry['rating']['score']);
    }

    #[Test]
    public function an_unrated_completed_ride_shows_no_rating_on_either_side()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();

        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $driverRes = $this->getJson('/api/v1/driver/bookings/history');

        Sanctum::actingAs($passengerUser, ['*']);
        $passengerRes = $this->getJson('/api/v1/passenger/bookings/history');

        $driverEntry = collect($driverRes->json('bookings'))->firstWhere('id', $booking->id);
        $passengerEntry = collect($passengerRes->json('bookings'))->firstWhere('id', $booking->id);

        $this->assertNull($driverEntry['rating']);
        $this->assertNull($passengerEntry['rating']);
    }

    #[Test]
    public function driver_a_never_sees_driver_bs_history_earnings_or_rating()
    {
        // Driver A: one completed ride, rated 5.
        $passengerA = User::create([
            'name' => 'Passenger A', 'email' => 'passenger.a.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        Passenger::create(['user_id' => $passengerA->id, 'mobile_number' => '0917'.rand(1000000, 9999999)]);
        $bookingA = Booking::create([
            'booking_code' => 'BK-A-'.uniqid(),
            'passenger_id' => Passenger::where('user_id', $passengerA->id)->first()->id,
            'driver_id' => $this->driverBrgy8Online->id,
            'tricycle_id' => $this->driverBrgy8Online->tricycle_id,
            'toda_zone_id' => $this->zoneBrgy8->id,
            'pickup_name' => 'Nasugbu Hall', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Brgy 8 Chapel', 'dropoff_lat' => 14.0703, 'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00, 'status' => 'completed', 'requested_at' => now(),
            'completed_at' => now(),
        ]);
        // Mirrors exactly what updateStatus()'s 'completed' branch would have credited to this
        // driver, without re-running the whole accept→arrived→in_transit→completed lifecycle.
        $this->driverBrgy8Online->increment('today_earnings', $bookingA->fare_amount);
        $this->driverBrgy8Online->increment('total_trips');
        Sanctum::actingAs($passengerA, ['*']);
        $this->postJson("/api/v1/passenger/bookings/{$bookingA->id}/rate", ['score' => 5])->assertStatus(201);

        // Driver B: one completed ride, rated 3 — a different driver, different zone.
        $passengerB = User::create([
            'name' => 'Passenger B', 'email' => 'passenger.b.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        Passenger::create(['user_id' => $passengerB->id, 'mobile_number' => '0917'.rand(1000000, 9999999)]);
        $bookingB = Booking::create([
            'booking_code' => 'BK-B-'.uniqid(),
            'passenger_id' => Passenger::where('user_id', $passengerB->id)->first()->id,
            'driver_id' => $this->driverBucanaOnline->id,
            'tricycle_id' => $this->driverBucanaOnline->tricycle_id,
            'toda_zone_id' => $this->zoneBucana->id,
            'pickup_name' => 'Bucana Terminal', 'pickup_lat' => 14.0640, 'pickup_lng' => 120.6298,
            'dropoff_name' => 'Bucana Market', 'dropoff_lat' => 14.0650, 'dropoff_lng' => 120.6310,
            'fare_amount' => 60.00, 'status' => 'completed', 'requested_at' => now(),
            'completed_at' => now(),
        ]);
        $this->driverBucanaOnline->increment('today_earnings', $bookingB->fare_amount);
        $this->driverBucanaOnline->increment('total_trips');
        Sanctum::actingAs($passengerB, ['*']);
        $this->postJson("/api/v1/passenger/bookings/{$bookingB->id}/rate", ['score' => 3])->assertStatus(201);

        // Driver A's history/earnings/rating must contain ONLY driver A's own booking.
        Sanctum::actingAs($this->driverBrgy8Online->user, ['*']);
        $historyA = $this->getJson('/api/v1/driver/bookings/history');
        $idsA = collect($historyA->json('bookings'))->pluck('id');
        $this->assertTrue($idsA->contains($bookingA->id));
        $this->assertFalse($idsA->contains($bookingB->id), 'Driver A must never see Driver B\'s booking in history.');

        $this->driverBrgy8Online->refresh();
        $this->assertEquals(45.00, (float) $this->driverBrgy8Online->today_earnings);
        $this->assertEquals(5.00, (float) $this->driverBrgy8Online->rating);

        // Driver B's history/earnings/rating must contain ONLY driver B's own booking.
        Sanctum::actingAs($this->driverBucanaOnline->user, ['*']);
        $historyB = $this->getJson('/api/v1/driver/bookings/history');
        $idsB = collect($historyB->json('bookings'))->pluck('id');
        $this->assertTrue($idsB->contains($bookingB->id));
        $this->assertFalse($idsB->contains($bookingA->id), 'Driver B must never see Driver A\'s booking in history.');

        $this->driverBucanaOnline->refresh();
        $this->assertEquals(60.00, (float) $this->driverBucanaOnline->today_earnings);
        $this->assertEquals(3.00, (float) $this->driverBucanaOnline->rating);
    }

    #[Test]
    public function a_drivers_average_rating_reflects_only_their_own_completed_ride_ratings()
    {
        $scores = [5, 4, 5];
        foreach ($scores as $score) {
            [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();
            Sanctum::actingAs($passengerUser, ['*']);
            $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => $score])
                ->assertStatus(201);
        }

        $this->assertEquals(4.67, (float) $this->driverBrgy8Online->refresh()->rating);
    }

    #[Test]
    public function a_driver_cannot_fetch_another_drivers_active_booking_by_guessing_the_booking_id()
    {
        $booking = $this->makeBookingWithStatus('accepted');

        // driverBucanaOnline has no relationship to this booking at all.
        Sanctum::actingAs($this->driverBucanaOnline->user, ['*']);
        $response = $this->getJson('/api/v1/driver/bookings/active?booking_id='.$booking->id);
        $response->assertStatus(200);
        $this->assertNull($response->json('booking'), 'A driver must never be able to fetch a booking that is not theirs by id.');
    }

    #[Test]
    public function rating_a_booking_requires_authentication()
    {
        [$booking] = $this->makeCompletedBookingWithPassenger();

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 5]);
        $response->assertStatus(401);
    }

    #[Test]
    public function a_passenger_cannot_rate_another_passengers_booking()
    {
        [$booking] = $this->makeCompletedBookingWithPassenger();

        $otherUser = User::create([
            'name' => 'Other Passenger',
            'email' => 'other.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Passenger::create(['user_id' => $otherUser->id, 'mobile_number' => '0917'.rand(1000000, 9999999)]);
        Sanctum::actingAs($otherUser, ['*']);

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 1]);
        $response->assertStatus(404);

        $this->assertNull(RideRating::where('booking_id', $booking->id)->first());
    }

    #[Test]
    public function a_non_completed_booking_cannot_be_rated()
    {
        $booking = $this->makeBookingWithStatus('accepted');
        // makeBookingWithStatus doesn't return a passenger user, so build one directly here.
        $passenger = Passenger::find($booking->passenger_id);
        Sanctum::actingAs($passenger->user, ['*']);

        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 5]);
        $response->assertStatus(409);
    }

    #[Test]
    public function resubmitting_a_rating_updates_it_instead_of_duplicating()
    {
        [$booking, $passengerUser] = $this->makeCompletedBookingWithPassenger();
        Sanctum::actingAs($passengerUser, ['*']);

        $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 3])->assertStatus(201);
        $this->postJson("/api/v1/passenger/bookings/{$booking->id}/rate", ['score' => 5])->assertStatus(201);

        $this->assertEquals(1, RideRating::where('booking_id', $booking->id)->count());
        $this->assertEquals(5, RideRating::where('booking_id', $booking->id)->first()->score);
    }
}
