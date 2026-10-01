<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Passenger;
use App\Models\RideSession;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

class BookingPaymentTest extends TestCase
{
    use DatabaseTransactions, BuildsQrRides;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function createFixtures(string $paymentMethod = 'cash'): array
    {
        [$tricycle, $driver] = $this->makeUnit();
        $driver->update([
            'today_earnings' => 0.00,
            'total_trips' => 0,
            'gcash_qr_path' => 'driver_gcash_qrs/sample-qr.png',
            'gcash_name' => 'Juan Driver',
            'gcash_number' => '09123456789',
        ]);
        $driverUser = $driver->user;

        $passengerUser = $this->makePassengerUser();
        $passenger = $this->passengerOf($passengerUser);

        $booking = Booking::create([
            'booking_code' => 'BK-' . uniqid(),
            'booking_type' => Booking::TYPE_BOOKING,
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'pickup_name' => 'Nasugbu Public Market',
            'pickup_lat' => 14.0712,
            'pickup_lng' => 120.6315,
            'dropoff_name' => 'Wawa Port',
            'dropoff_lat' => 14.0815,
            'dropoff_lng' => 120.6221,
            'fare_amount' => 60.00,
            'passenger_count' => 1,
            'fare_per_passenger' => 60.00,
            'distance_km' => 3.2,
            'status' => 'in_transit',
            'payment_method' => $paymentMethod,
            'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
            'requested_at' => now(),
            'started_at' => now(),
        ]);

        return [$passengerUser, $passenger, $driverUser, $driver, $booking];
    }

    #[Test]
    public function completing_ride_does_not_mark_payment_paid_and_does_not_credit_earnings()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", [
            'status' => 'completed',
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $driver->refresh();

        $this->assertSame('completed', $booking->status);
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->payment_status);
        $this->assertEquals(0.00, (float) $driver->today_earnings);
        $this->assertSame(0, $driver->total_trips);
    }

    #[Test]
    public function driver_confirms_cash_payment_with_exact_amount()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", [
            'amount_received' => 60.00,
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertEquals(60.00, (float) $booking->payment_amount_received);
        $this->assertEquals(0.00, (float) $booking->payment_change_amount);
        $this->assertNotNull($booking->paid_at);
        $this->assertEquals(60.00, (float) $driver->today_earnings);
        $this->assertSame(1, $driver->total_trips);
    }

    #[Test]
    public function driver_confirms_cash_payment_with_change()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", [
            'amount_received' => 100.00,
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertEquals(100.00, (float) $booking->payment_amount_received);
        $this->assertEquals(40.00, (float) $booking->payment_change_amount);
        $this->assertEquals(60.00, (float) $driver->today_earnings);
    }

    #[Test]
    public function cash_payment_with_insufficient_amount_is_rejected()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", [
            'amount_received' => 50.00,
        ]);

        $response->assertStatus(422);

        $booking->refresh();
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->payment_status);
    }

    #[Test]
    public function duplicate_cash_confirmation_does_not_duplicate_earnings()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", [
            'amount_received' => 100.00,
        ]);

        // Duplicate call
        $secondResponse = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", [
            'amount_received' => 100.00,
        ]);

        $secondResponse->assertStatus(200);

        $driver->refresh();
        $this->assertEquals(60.00, (float) $driver->today_earnings);
        $this->assertSame(1, $driver->total_trips);
    }

    #[Test]
    public function passenger_cannot_retrieve_the_drivers_gcash_qr()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($pUser, ['*']);

        // The driver shows their own QR on the Driver app; the passenger API no longer exposes it.
        $this->getJson("/api/v1/passenger/bookings/{$booking->id}/payment/driver-gcash-qr")->assertStatus(404);
        $this->getJson("/api/v1/passenger/bookings/{$booking->id}/driver-gcash-qr")->assertStatus(404);
    }

    #[Test]
    public function payment_cannot_be_confirmed_before_drop_off()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        Sanctum::actingAs($dUser, ['*']);

        $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", ['amount_received' => 60])
            ->assertStatus(422);

        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->fresh()->payment_status);
        $this->assertEquals(0.00, (float) $driver->fresh()->today_earnings);
    }

    #[Test]
    public function cash_confirmation_is_rejected_for_a_gcash_booking()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-cash", ['amount_received' => 100])
            ->assertStatus(422);

        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->fresh()->payment_status);
        $this->assertEquals(0.00, (float) $driver->fresh()->today_earnings);
    }

    #[Test]
    public function passenger_cannot_submit_a_new_gcash_reference()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($pUser, ['*']);

        // Passenger submit-gcash endpoint has been removed; requests are rejected (404)
        $response = $this->postJson("/api/v1/passenger/bookings/{$booking->id}/payment/submit-gcash", [
            'reference_number' => 'GCASH-987654321',
        ]);

        $response->assertStatus(404);

        $booking->refresh();
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->payment_status);
    }

    #[Test]
    public function passenger_cannot_confirm_payment()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($pUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-123456789',
        ]);

        // Passenger has no driver profile, forbidden
        $response->assertStatus(403);
    }

    #[Test]
    public function driver_can_enter_gcash_reference_and_confirm_payment_unpaid_to_paid()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update([
            'status' => 'completed',
            'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
        ]);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-99887766',
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertSame('GCASH-99887766', $booking->payment_reference);
        $this->assertNotNull($booking->paid_at);
        $this->assertEquals(60.00, (float) $driver->today_earnings);
        $this->assertSame(1, $driver->total_trips);
    }

    #[Test]
    public function driver_reference_is_required_for_gcash_confirmation()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        // Missing reference_number
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", []);
        $response->assertStatus(422);

        $booking->refresh();
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->payment_status);
    }

    #[Test]
    public function empty_or_short_gcash_reference_is_rejected()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        // Empty string
        $resEmpty = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => '',
        ]);
        $resEmpty->assertStatus(422);

        // Too short (< 4 chars)
        $resShort = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => '12',
        ]);
        $resShort->assertStatus(422);

        $booking->refresh();
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $booking->payment_status);
    }

    #[Test]
    public function duplicate_gcash_confirmation_does_not_duplicate_earnings()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $res1 = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-11223344',
        ]);
        $res1->assertStatus(200);

        // Second confirmation
        $res2 = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-11223344',
        ]);
        $res2->assertStatus(200);

        $driver->refresh();
        $this->assertEquals(60.00, (float) $driver->today_earnings);
        $this->assertSame(1, $driver->total_trips);
    }

    #[Test]
    public function driver_cannot_confirm_cash_booking_as_gcash()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-55667788',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'This booking is configured for Cash payment.']);
    }

    #[Test]
    public function driver_cannot_confirm_payment_for_another_drivers_booking()
    {
        [$pUser, $passenger, $dUserA, $driverA, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);

        // Create driver B
        $userB = User::create([
            'name' => 'Driver B',
            'email' => 'driverb.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        Driver::create([
            'user_id' => $userB->id,
            'license_number' => 'LIC-B-' . strtoupper(uniqid()),
            'today_earnings' => 0.00,
        ]);

        Sanctum::actingAs($userB, ['*']);
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-00011122',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function driver_can_confirm_by_booking_code_as_well_as_id()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $booking->update(['status' => 'completed']);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->booking_code}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-BYCODE-1234',
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertSame('GCASH-BYCODE-1234', $booking->payment_reference);
    }

    #[Test]
    public function driver_can_record_and_confirm_manual_ride_walkin_gcash()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('cash');
        $booking->update([
            'booking_type' => Booking::TYPE_MANUAL,
            'passenger_id' => null,
            'status' => 'completed',
            'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
        ]);
        Sanctum::actingAs($dUser, ['*']);

        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/record-manual-gcash", [
            'reference_number' => 'MANUAL-GCASH-555',
        ]);

        $response->assertStatus(200);

        $booking->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_METHOD_GCASH, $booking->payment_method);
        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertSame('MANUAL-GCASH-555', $booking->payment_reference);
        $this->assertEquals(60.00, (float) $driver->today_earnings);
    }

    #[Test]
    public function multiple_qr_passengers_have_independent_payment_states()
    {
        [$tricycle, $driver] = $this->makeUnit();
        $driver->update([
            'today_earnings' => 0.00,
            'total_trips' => 0,
            'gcash_qr_path' => 'driver_gcash_qrs/sample-qr.png',
            'gcash_name' => 'Juan Driver',
            'gcash_number' => '09123456789',
        ]);

        $pUserA = $this->makePassengerUser();
        $passengerA = $this->passengerOf($pUserA);
        $pUserB = $this->makePassengerUser();
        $passengerB = $this->passengerOf($pUserB);

        $session = RideSession::create([
            'session_code' => 'RS-' . uniqid(),
            'tricycle_id' => $tricycle->id,
            'driver_id' => $driver->id,
            'status' => RideSession::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        $bookingA = Booking::create([
            'booking_code' => 'BK-QR-A-' . uniqid(),
            'booking_type' => Booking::TYPE_QR_WALKIN,
            'passenger_id' => $passengerA->id,
            'driver_id' => $driver->id,
            'ride_session_id' => $session->id,
            'pickup_name' => 'Nasugbu Public Market',
            'pickup_lat' => 14.0712,
            'pickup_lng' => 120.6315,
            'dropoff_name' => 'Wawa Port',
            'dropoff_lat' => 14.0815,
            'dropoff_lng' => 120.6221,
            'fare_amount' => 50.00,
            'passenger_count' => 1,
            'status' => 'completed',
            'payment_method' => 'cash',
            'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
            'requested_at' => now(),
        ]);

        $bookingB = Booking::create([
            'booking_code' => 'BK-QR-B-' . uniqid(),
            'booking_type' => Booking::TYPE_QR_WALKIN,
            'passenger_id' => $passengerB->id,
            'driver_id' => $driver->id,
            'ride_session_id' => $session->id,
            'pickup_name' => 'Nasugbu Public Market',
            'pickup_lat' => 14.0712,
            'pickup_lng' => 120.6315,
            'dropoff_name' => 'Bucana Beach',
            'dropoff_lat' => 14.0915,
            'dropoff_lng' => 120.6121,
            'fare_amount' => 75.00,
            'passenger_count' => 1,
            'status' => 'completed',
            'payment_method' => 'gcash',
            'payment_status' => Booking::PAYMENT_STATUS_UNPAID,
            'requested_at' => now(),
        ]);

        Sanctum::actingAs($driver->user, ['*']);

        // Driver confirms passenger A (Cash)
        $resA = $this->postJson("/api/v1/driver/bookings/{$bookingA->booking_code}/payment/confirm-cash", [
            'amount_received' => 50.00,
        ]);
        $resA->assertStatus(200);

        $bookingA->refresh();
        $bookingB->refresh();
        $driver->refresh();

        // Passenger A is paid, passenger B remains unpaid
        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $bookingA->payment_status);
        $this->assertSame(Booking::PAYMENT_STATUS_UNPAID, $bookingB->payment_status);
        $this->assertEquals(50.00, (float) $driver->today_earnings);

        // Driver confirms passenger B (GCash with driver-entered reference)
        $resB = $this->postJson("/api/v1/driver/bookings/{$bookingB->booking_code}/payment/confirm-gcash", [
            'reference_number' => 'GCASH-QR-999',
        ]);
        $resB->assertStatus(200);

        $bookingB->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $bookingB->payment_status);
        $this->assertSame('GCASH-QR-999', $bookingB->payment_reference);
        $this->assertEquals(125.00, (float) $driver->today_earnings);
        $this->assertSame(2, $driver->total_trips);
    }

    #[Test]
    public function existing_historical_payment_records_remain_intact()
    {
        [$pUser, $passenger, $dUser, $driver, $booking] = $this->createFixtures('gcash');
        $historicalDate = now()->subDays(5);
        $booking->update([
            'status' => 'completed',
            'payment_status' => Booking::PAYMENT_STATUS_PAID,
            'payment_reference' => 'HISTORICAL-REF-12345',
            'paid_at' => $historicalDate,
        ]);

        Sanctum::actingAs($dUser, ['*']);

        // Re-confirming an already paid historical booking doesn't mutate or re-credit
        $response = $this->postJson("/api/v1/driver/bookings/{$booking->id}/payment/confirm-gcash", [
            'reference_number' => 'NEW-REF-IGNORED',
        ]);

        $response->assertStatus(200);
        $booking->refresh();
        $driver->refresh();

        $this->assertSame(Booking::PAYMENT_STATUS_PAID, $booking->payment_status);
        $this->assertSame('HISTORICAL-REF-12345', $booking->payment_reference);
        $this->assertEquals($historicalDate->timestamp, $booking->paid_at->timestamp);
        $this->assertEquals(0.00, (float) $driver->today_earnings);
    }
}
