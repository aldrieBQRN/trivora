<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingDispatchOffer;
use App\Models\BookingDriverDecline;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\User;
use App\Services\BookingDispatchService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SimultaneousDispatchTest extends TestCase
{
    use DatabaseTransactions;

    protected const PICKUP_LAT = 14.0715;
    protected const PICKUP_LNG = 120.6330;

    protected Passenger $passenger;
    protected Driver $driverA; // ~50m from pickup (within 500m)
    protected Driver $driverB; // ~300m from pickup (within 500m)
    protected Driver $driverC; // ~800m from pickup (outside 500m, within 1km)
    protected Driver $driverD; // ~1.5km from pickup (outside 1km, within 2km)
    protected Driver $driverOffline;

    protected function setUp(): void
    {
        parent::setUp();

        $passengerUser = User::create([
            'name' => 'Simultaneous Dispatch Passenger',
            'email' => 'simul.passenger.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $this->passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);

        // Driver A: ~50m from pickup (eligible for Round 1: 500m)
        $this->driverA = $this->makeDriver('Driver A', 14.0718, 120.6332, true, true);

        // Driver B: ~300m from pickup (eligible for Round 1: 500m)
        $this->driverB = $this->makeDriver('Driver B', 14.0735, 120.6345, true, true);

        // Driver C: ~800m from pickup (eligible for Round 2: 1km)
        $this->driverC = $this->makeDriver('Driver C', 14.0780, 120.6370, true, true);

        // Driver D: ~1.5km from pickup (eligible for Round 3: 2km)
        $this->driverD = $this->makeDriver('Driver D', 14.0840, 120.6410, true, true);

        // Offline driver near pickup (should never be offered)
        $this->driverOffline = $this->makeDriver('Offline Driver', 14.0716, 120.6331, false, true);
    }

    private function makeDriver(string $name, float $lat, float $lng, bool $online, bool $available): Driver
    {
        $suffix = substr(uniqid(), -8);
        $user = User::create([
            'name' => $name,
            'email' => 'simul.'.$suffix.'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $operator = Operator::create([
            'first_name' => 'Simul', 'last_name' => 'Operator '.$suffix,
            'contact_number' => '0917'.rand(1000000, 9999999),
            'address' => 'Nasugbu', 'barangay' => 'Brgy 8', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SIM-'.$suffix, 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id,
            'plate_number' => 'PLT-SIM-'.$suffix,
            'engine_number' => 'ENG-SIM-'.$suffix,
            'chassis_number' => 'CHS-SIM-'.$suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-SIM-'.$suffix, 'cr_number' => 'CR-SIM-'.$suffix,
            'status' => 'active',
        ]);

        $colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Simul Dispatch Test Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
        $issuer = User::firstOrCreate(
            ['email' => 'simul.issuer@trivora.test'],
            ['name' => 'Simul Issuer', 'password' => bcrypt('password'), 'role' => 'bplo_staff']
        );
        FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-SIM-'.$suffix,
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        return Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-SIM-'.$suffix,
            'is_online' => $online,
            'is_available' => $available,
            'current_lat' => $lat,
            'current_lng' => $lng,
            'last_location_updated_at' => $online ? now() : null,
        ]);
    }

    private function makePendingBooking(): Booking
    {
        return Booking::create([
            'booking_code' => 'BK-SIM-'.uniqid(),
            'passenger_id' => $this->passenger->id,
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => self::PICKUP_LAT,
            'pickup_lng' => self::PICKUP_LNG,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'fare_amount' => 45.00,
            'status' => 'pending',
            'requested_at' => now(),
            'dispatch_round' => 1,
            'dispatched_at' => now(),
        ]);
    }

    #[Test]
    public function all_eligible_drivers_within_active_radius_receive_the_same_request_simultaneously(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Round 1 (500m): Driver A (50m) and Driver B (300m) should both receive the offer
        Sanctum::actingAs($this->driverA->user, ['*']);
        $respA = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertTrue(collect($respA->json('requests'))->contains('id', $booking->id));

        Sanctum::actingAs($this->driverB->user, ['*']);
        $respB = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertTrue(collect($respB->json('requests'))->contains('id', $booking->id));

        // Driver C (800m) is outside Round 1 (500m) and must NOT receive it
        Sanctum::actingAs($this->driverC->user, ['*']);
        $respC = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respC->json('requests'))->contains('id', $booking->id));

        // Offline driver must NOT receive it
        Sanctum::actingAs($this->driverOffline->user, ['*']);
        $respOffline = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertEmpty($respOffline->json('requests'));
    }

    #[Test]
    public function search_radius_expands_after_20_seconds_and_notifies_only_newly_eligible_drivers(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Simulate 20-second timeout on Round 1
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 1)]);

        // Evaluate dispatch -> should advance to Round 2 (1km)
        BookingDispatchService::evaluateDispatch($booking);
        $booking->refresh();

        $this->assertEquals(2, $booking->dispatch_round);

        // Driver C (800m) is within 1km and was not offered in Round 1 -> now receives the offer
        Sanctum::actingAs($this->driverC->user, ['*']);
        $respC = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertTrue(collect($respC->json('requests'))->contains('id', $booking->id));

        // Driver A and Driver B already received the offer in Round 1 -> must NOT be re-offered
        Sanctum::actingAs($this->driverA->user, ['*']);
        $respA = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respA->json('requests'))->contains('id', $booking->id));

        Sanctum::actingAs($this->driverB->user, ['*']);
        $respB = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respB->json('requests'))->contains('id', $booking->id));
    }

    #[Test]
    public function search_expands_to_round_3_and_exhausts_to_cancelled_with_no_driver_available(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Expire Round 1 -> Advances to Round 2
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 1)]);
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals(2, $booking->refresh()->dispatch_round);

        // Expire Round 2 -> Advances to Round 3 (2km)
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 1)]);
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals(3, $booking->refresh()->dispatch_round);

        // Driver D (1.5km) now receives the offer in Round 3
        Sanctum::actingAs($this->driverD->user, ['*']);
        $respD = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertTrue(collect($respD->json('requests'))->contains('id', $booking->id));

        // Expire Round 3 -> All 3 rounds exhausted!
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 1)]);
        BookingDispatchService::evaluateDispatch($booking);
        $booking->refresh();

        // Terminal state: cancelled with no_driver_available
        $this->assertEquals('cancelled', $booking->status);
        $this->assertEquals('no_driver_available', $booking->cancellation_reason);
        $this->assertEquals('system', $booking->cancelled_by);

        // Pending list must now be empty for Driver D
        $respDExhausted = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respDExhausted->json('requests'))->contains('id', $booking->id));
    }

    #[Test]
    public function first_driver_to_accept_wins_and_invalidates_peer_offers(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Driver A accepts first
        Sanctum::actingAs($this->driverA->user, ['*']);
        $acceptResp = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();
        $this->assertEquals('accepted', $acceptResp->json('booking.status'));
        $this->assertEquals($this->driverA->id, $acceptResp->json('booking.driver_id'));

        $booking->refresh();
        $this->assertEquals('accepted', $booking->status);
        $this->assertEquals($this->driverA->id, $booking->driver_id);
        $this->assertFalse($this->driverA->refresh()->is_available);

        // Driver B's offer should be expired/invalidated
        $this->assertDatabaseHas('booking_dispatch_offers', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverB->id,
            'status' => BookingDispatchOffer::STATUS_EXPIRED,
        ]);

        // Driver B's pending list immediately no longer includes the booking
        Sanctum::actingAs($this->driverB->user, ['*']);
        $respB = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respB->json('requests'))->contains('id', $booking->id));
    }

    #[Test]
    public function simultaneous_acceptance_rejects_losing_driver_with_409(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Driver A accepts first
        Sanctum::actingAs($this->driverA->user, ['*']);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();

        // Driver B attempts to accept right after
        Sanctum::actingAs($this->driverB->user, ['*']);
        $loseResp = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");

        $loseResp->assertStatus(409);
        $this->assertStringContainsString('already accepted', $loseResp->json('message'));
    }

    #[Test]
    public function driver_decline_does_not_cancel_offer_for_peer_drivers_in_the_same_round(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Driver A declines
        Sanctum::actingAs($this->driverA->user, ['*']);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/decline")->assertOk();

        // Booking must remain pending
        $booking->refresh();
        $this->assertEquals('pending', $booking->status);

        // Driver A's offer is marked declined
        $this->assertDatabaseHas('booking_dispatch_offers', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
            'status' => BookingDispatchOffer::STATUS_DECLINED,
        ]);

        // Driver B still has active offer and can accept
        Sanctum::actingAs($this->driverB->user, ['*']);
        $respB = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertTrue(collect($respB->json('requests'))->contains('id', $booking->id));

        $acceptB = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();
        $this->assertEquals('accepted', $acceptB->json('booking.status'));
        $this->assertEquals($this->driverB->id, $booking->refresh()->driver_id);
    }

    #[Test]
    public function expired_offer_cannot_be_accepted(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Simulate 20s timeout without advancing yet
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 5)]);

        Sanctum::actingAs($this->driverA->user, ['*']);
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");

        $response->assertStatus(409);
        $this->assertEquals('pending', $booking->refresh()->status);
        $this->assertNull($booking->driver_id);
    }

    #[Test]
    public function passenger_active_booking_poll_advances_rounds_and_reflects_no_driver_available(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        Sanctum::actingAs($this->passenger->user, ['*']);

        // Active poll in Round 1
        $resp = $this->getJson("/api/v1/passenger/bookings/active?booking_id={$booking->id}")->assertOk();
        $this->assertEquals(1, $resp->json('booking.dispatch_round'));
        $this->assertEquals(500, $resp->json('booking.dispatch_radius_m'));

        // Fast forward 65 seconds (exceeding all 3 rounds)
        $booking->update([
            'dispatch_round' => 3,
            'dispatched_at' => now()->subSeconds(BookingDispatchService::ROUND_TIMEOUT_SECONDS + 5),
        ]);

        // Next poll should evaluate and mark cancelled with no_driver_available
        $respExhausted = $this->getJson("/api/v1/passenger/bookings/active?booking_id={$booking->id}")->assertOk();
        $this->assertEquals('cancelled', $respExhausted->json('booking.status'));
        $this->assertEquals('no_driver_available', $respExhausted->json('booking.cancellation_reason'));
    }

    #[Test]
    public function passenger_cancellation_expires_active_offers_and_removes_from_drivers(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);

        // Drivers A and B have active offers
        $this->assertDatabaseHas('booking_dispatch_offers', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
            'status' => BookingDispatchOffer::STATUS_OFFERED,
        ]);

        // Passenger cancels booking
        Sanctum::actingAs($this->passenger->user, ['*']);
        $this->postJson("/api/v1/passenger/bookings/{$booking->id}/cancel", [
            'status' => 'cancelled',
            'cancellation_reason' => 'Cancelled by passenger',
        ])->assertOk();

        // Offers are now expired
        $this->assertDatabaseHas('booking_dispatch_offers', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
            'status' => BookingDispatchOffer::STATUS_EXPIRED,
        ]);

        // Driver A no longer sees it in pending
        Sanctum::actingAs($this->driverA->user, ['*']);
        $respA = $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->assertFalse(collect($respA->json('requests'))->contains('id', $booking->id));
    }

    #[Test]
    public function passenger_retry_creates_fresh_booking_and_dispatches_round_1(): void
    {
        // First booking was cancelled due to no drivers
        $oldBooking = $this->makePendingBooking();
        $oldBooking->update([
            'status' => 'cancelled',
            'cancellation_reason' => 'no_driver_available',
        ]);

        // Passenger retries immediately (creating new booking request with same route)
        Sanctum::actingAs($this->passenger->user, ['*']);
        $resp = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Hall',
            'pickup_lat' => self::PICKUP_LAT,
            'pickup_lng' => self::PICKUP_LNG,
            'dropoff_name' => 'Brgy 8 Chapel',
            'dropoff_lat' => 14.0703,
            'dropoff_lng' => 120.6332,
            'passenger_count' => 1,
            'distance_km' => 1.5,
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $newBookingId = $resp->json('booking.id');
        $this->assertNotEquals($oldBooking->id, $newBookingId);
        $this->assertEquals('pending', $resp->json('booking.status'));
        $this->assertEquals(1, $resp->json('booking.dispatch_round'));
        $this->assertEquals(500, $resp->json('booking.dispatch_radius_m'));

        // Fresh offers created for eligible drivers A and B
        $this->assertDatabaseHas('booking_dispatch_offers', [
            'booking_id' => $newBookingId,
            'driver_id' => $this->driverA->id,
            'status' => BookingDispatchOffer::STATUS_OFFERED,
        ]);
    }
}
