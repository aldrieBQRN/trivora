<?php

namespace Tests\Feature;

use App\Models\Booking;
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

/**
 * Covers the sequential nearest-driver dispatch bug fix: real-time eligibility recalculation,
 * one-driver-at-a-time offering with per-booking (not permanent) exclusion, backend-authoritative
 * offer timing, and the passenger-facing dispatch_state label. All coordinates are chosen so
 * distance-from-pickup ordering is unambiguous: driverOfflineNearest < driverA < driverB < driverC.
 */
class SequentialDispatchTest extends TestCase
{
    use DatabaseTransactions;

    protected const PICKUP_LAT = 14.0715;
    protected const PICKUP_LNG = 120.6330;

    protected Passenger $passenger;
    protected Driver $driverOfflineNearest;
    protected Driver $driverA;
    protected Driver $driverB;
    protected Driver $driverC;

    protected function setUp(): void
    {
        parent::setUp();

        $passengerUser = User::create([
            'name' => 'Sequential Dispatch Passenger',
            'email' => 'sequential.dispatch.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $this->passenger = Passenger::create([
            'user_id' => $passengerUser->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);

        // Nearest of all, but OFFLINE — must never be selected while offline.
        $this->driverOfflineNearest = $this->makeDriver('Offline Nearest', 14.07151, 120.63301, false, true);

        // Online, nearest eligible driver.
        $this->driverA = $this->makeDriver('Driver A', 14.07155, 120.63305, true, true);

        // Online, second-nearest eligible driver.
        $this->driverB = $this->makeDriver('Driver B', 14.0740, 120.6350, true, true);

        // Online, third-nearest eligible driver (still within the 3km radius).
        $this->driverC = $this->makeDriver('Driver C', 14.0800, 120.6400, true, true);
    }

    private function makeDriver(string $name, float $lat, float $lng, bool $online, bool $available): Driver
    {
        $suffix = substr(uniqid(), -8);
        $user = User::create([
            'name' => $name,
            'email' => 'seqdispatch.'.$suffix.'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $operator = Operator::create([
            'first_name' => 'Seq', 'last_name' => 'Dispatch '.$suffix,
            'contact_number' => '0917'.rand(1000000, 9999999),
            'address' => 'Nasugbu', 'barangay' => 'Brgy 8', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SEQ-'.$suffix, 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id,
            'plate_number' => 'PLT-SEQ-'.$suffix,
            'engine_number' => 'ENG-SEQ-'.$suffix,
            'chassis_number' => 'CHS-SEQ-'.$suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-SEQ-'.$suffix, 'cr_number' => 'CR-SEQ-'.$suffix,
            'status' => 'active',
        ]);

        // Dispatch eligibility requires an ACTIVE franchise (see
        // BookingDispatchService::getEligibleDrivers()) — a real active tricycle always has one
        // (created/activated together at TMO Final Confirmation), so this mirrors production data.
        $colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Sequential Dispatch Test Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
        $issuer = User::firstOrCreate(
            ['email' => 'seqdispatch.issuer@trivora.test'],
            ['name' => 'Seq Dispatch Issuer', 'password' => bcrypt('password'), 'role' => 'bplo_staff']
        );
        FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-SEQ-'.$suffix,
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        return Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-SEQ-'.$suffix,
            'is_online' => $online,
            'is_available' => $available,
            'current_lat' => $lat,
            'current_lng' => $lng,
        ]);
    }

    private function makePendingBooking(): Booking
    {
        return Booking::create([
            'booking_code' => 'BK-SEQ-'.uniqid(),
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
        ]);
    }

    #[Test]
    public function offline_driver_is_not_selected_even_when_nearest(): void
    {
        $booking = $this->makePendingBooking();

        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertNotNull($target);
        $this->assertEquals($this->driverA->id, $target->id);
        $this->assertNotEquals($this->driverOfflineNearest->id, $target->id);
    }

    #[Test]
    public function first_driver_timeout_selects_next_nearest_and_excludes_the_first(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        // Simulate the offer window having elapsed.
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);

        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertNotNull($target);
        $this->assertEquals($this->driverB->id, $target->id);
        $this->assertEquals($this->driverB->id, $booking->refresh()->dispatched_driver_id);
        $this->assertDatabaseHas('booking_driver_declines', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
        ]);

        // Driver A must never be re-offered THIS booking again during its current cycle.
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);
        $target = BookingDispatchService::evaluateDispatch($booking);
        $this->assertNotEquals($this->driverA->id, $target?->id);
    }

    #[Test]
    public function first_driver_declining_immediately_advances_to_the_next_nearest(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        Sanctum::actingAs($this->driverA->user, ['*']);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/decline")->assertStatus(200);

        $booking->refresh();
        $this->assertEquals('pending', $booking->status);
        $this->assertEquals($this->driverB->id, $booking->dispatched_driver_id);
        $this->assertDatabaseHas('booking_driver_declines', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
        ]);
    }

    #[Test]
    public function a_driver_who_comes_online_mid_offer_does_not_interrupt_the_active_offer_but_is_eligible_next_attempt(): void
    {
        // Driver A starts OFFLINE, so the first dispatch targets B instead.
        $this->driverA->update(['is_online' => false]);

        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverB->id, $booking->refresh()->dispatched_driver_id);

        // Driver A comes online while B's offer is still active (not expired).
        $this->driverA->update(['is_online' => true]);
        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertEquals(
            $this->driverB->id,
            $target?->id,
            'A driver coming online must not interrupt an already-active offer to another driver.'
        );

        // B's offer now expires — the NEW attempt must recalculate eligibility and can now pick A.
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);
        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertEquals($this->driverA->id, $target?->id);
    }

    #[Test]
    public function a_driver_going_offline_during_an_active_offer_is_excluded_from_the_current_cycle(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        // Driver A goes offline mid-offer — well within the timeout window, no explicit decline.
        $this->driverA->update(['is_online' => false]);

        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertNotEquals($this->driverA->id, $target?->id);
        $this->assertEquals($this->driverB->id, $target?->id);
        $this->assertDatabaseHas('booking_driver_declines', [
            'booking_id' => $booking->id,
            'driver_id' => $this->driverA->id,
        ]);
    }

    #[Test]
    public function the_same_driver_is_never_reoffered_once_no_other_eligible_driver_remains(): void
    {
        // Only driver A is eligible for this test.
        $this->driverB->update(['is_online' => false]);
        $this->driverC->update(['is_online' => false]);

        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);
        $target = BookingDispatchService::evaluateDispatch($booking);

        $this->assertNull($target, 'With no other eligible driver, dispatch must not re-select the excluded driver.');
        $this->assertNull($booking->refresh()->dispatched_driver_id);
        $this->assertEquals('pending', $booking->status, 'The booking must stay pending, not be silently cancelled.');

        // Re-evaluating again must stay consistently empty, not flap back to driver A.
        $target = BookingDispatchService::evaluateDispatch($booking);
        $this->assertNull($target);
    }

    #[Test]
    public function passenger_dispatch_state_reflects_backend_state_not_a_local_timer(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $booking->refresh();
        $this->assertEquals('driver_found', $booking->dispatch_state);

        // Only driver A eligible; expire the offer with no one else to advance to.
        $this->driverB->update(['is_online' => false]);
        $this->driverC->update(['is_online' => false]);
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);
        BookingDispatchService::evaluateDispatch($booking);
        $booking->refresh();
        $this->assertEquals('searching', $booking->dispatch_state);

        // Bring B back online — next evaluation must find them and report driver_found again.
        $this->driverB->update(['is_online' => true]);
        BookingDispatchService::evaluateDispatch($booking);
        $booking->refresh();
        $this->assertEquals('driver_found', $booking->dispatch_state);
        $this->assertEquals($this->driverB->id, $booking->dispatched_driver_id);
    }

    #[Test]
    public function an_expired_offer_cannot_be_accepted_by_the_driver_it_was_offered_to(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        // The offer expires, but nothing has re-evaluated dispatch yet (e.g. neither app happened
        // to poll at exactly the right moment) — the booking row itself still says driver A.
        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);

        Sanctum::actingAs($this->driverA->user, ['*']);
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");

        $response->assertStatus(409);
        $booking->refresh();
        $this->assertEquals('pending', $booking->status);
        $this->assertNull($booking->driver_id, 'A driver must never be able to accept their own already-expired offer.');
    }

    #[Test]
    public function a_driver_never_offered_the_booking_cannot_accept_it_out_of_turn(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        // Driver B was never offered this booking (A is still the current, active target).
        Sanctum::actingAs($this->driverB->user, ['*']);
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept");

        $response->assertStatus(409);
        $booking->refresh();
        $this->assertEquals('pending', $booking->status);
        $this->assertNull($booking->driver_id);
    }

    #[Test]
    public function concurrent_timeout_advancement_only_selects_one_next_driver(): void
    {
        $booking = $this->makePendingBooking();
        BookingDispatchService::evaluateDispatch($booking);
        $this->assertEquals($this->driverA->id, $booking->refresh()->dispatched_driver_id);

        $booking->update(['dispatched_at' => now()->subSeconds(BookingDispatchService::OFFER_TIMEOUT_SECONDS + 5)]);

        // Two independently-loaded copies of the same booking, simulating two requests racing to
        // advance the same expired offer at the same time.
        $copy1 = Booking::find($booking->id);
        $copy2 = Booking::find($booking->id);

        $target1 = BookingDispatchService::evaluateDispatch($copy1);
        $target2 = BookingDispatchService::evaluateDispatch($copy2);

        $this->assertEquals($target1?->id, $target2?->id, 'Both racing requests must agree on exactly one next driver.');
        $this->assertEquals($this->driverB->id, $target1?->id);

        // Only ONE decline row for driver A — not one per racing request.
        $this->assertEquals(1, BookingDriverDecline::where('booking_id', $booking->id)
            ->where('driver_id', $this->driverA->id)
            ->count());

        // Driver C must not have been skipped to — dispatch must not have advanced twice.
        $this->assertNotEquals($this->driverC->id, $booking->refresh()->dispatched_driver_id);
    }
}
