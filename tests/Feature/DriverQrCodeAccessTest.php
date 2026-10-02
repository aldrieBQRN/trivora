<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

class DriverQrCodeAccessTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm();
    }

    #[Test]
    public function authenticated_driver_can_access_their_own_assigned_qr_code_details(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);

        $response = $this->as($driver->user)->getJson('/api/v1/driver/qr-code')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'unit_code' => 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT),
                'sticker_number' => $tricycle->coding_scheme_number ?: null,
                'plate_number' => $tricycle->plate_number,
                'passenger_capacity' => 4,
                'qr_token' => $tricycle->qr_token,
                'qr_url' => rtrim(config('app.url'), '/') . '/ride/q/' . $tricycle->qr_token,
                'status' => 'ready',
                'status_label' => 'Ready',
            ]);

        $this->assertNotEmpty($response->json('print_url'));
    }

    #[Test]
    public function driver_sees_configured_capacity_and_cannot_access_arbitrary_or_other_driver_qr(): void
    {
        [$tricycleA, $driverA] = $this->makeUnit(capacity: 4);
        [$tricycleB, $driverB] = $this->makeUnit(capacity: 2);

        // Driver A only gets Driver A's assigned tricycle QR details
        $resA = $this->as($driverA->user)->getJson('/api/v1/driver/qr-code')->assertOk();
        $this->assertSame($tricycleA->qr_token, $resA->json('qr_token'));
        $this->assertSame($tricycleA->plate_number, $resA->json('plate_number'));
        $this->assertSame(4, $resA->json('passenger_capacity'));
        $this->assertNotSame($tricycleB->qr_token, $resA->json('qr_token'));

        // Driver B only gets Driver B's assigned tricycle QR details
        $resB = $this->as($driverB->user)->getJson('/api/v1/driver/qr-code')->assertOk();
        $this->assertSame($tricycleB->qr_token, $resB->json('qr_token'));
        $this->assertSame($tricycleB->plate_number, $resB->json('plate_number'));
        $this->assertSame(2, $resB->json('passenger_capacity'));
        $this->assertNotSame($tricycleA->qr_token, $resB->json('qr_token'));
    }

    #[Test]
    public function unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/v1/driver/qr-code')->assertUnauthorized();
    }

    #[Test]
    public function user_without_driver_profile_or_without_tricycle_gets_error(): void
    {
        $passenger = $this->makePassengerUser();
        $this->as($passenger)->getJson('/api/v1/driver/qr-code')->assertNotFound();

        // Driver without assigned tricycle
        $unassignedUser = User::create([
            'name' => 'Unassigned Driver',
            'email' => 'unassigned.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        Driver::create([
            'user_id' => $unassignedUser->id,
            'license_number' => 'N01-99-' . rand(100000, 999999),
            'mobile_number' => '0917' . rand(1000000, 9999999),
            'tricycle_id' => null,
        ]);

        $this->as($unassignedUser)->getJson('/api/v1/driver/qr-code')
            ->assertNotFound()
            ->assertJsonPath('message', 'No tricycle is currently assigned to your account.');
    }

    #[Test]
    public function driver_printable_sheet_is_accessible_via_assigned_token(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 3);

        $this->get(route('driver.qr.print', ['token' => $tricycle->qr_token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('DriverQrPrint')
                ->where('unit.unit_code', 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT))
                ->where('unit.plate_number', $tricycle->plate_number)
                ->where('unit.passenger_capacity', 3)
                ->where('qrRide.qr_url', rtrim(config('app.url'), '/') . '/ride/q/' . $tricycle->qr_token));
    }

    #[Test]
    public function passenger_scanning_flow_remains_intact(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 4);
        $passenger = $this->makePassengerUser();

        // 1. Scanning QR with phone camera opens /ride/q/{token}
        $this->get('/ride/q/' . $tricycle->qr_token)->assertOk()
            ->assertInertia(fn ($page) => $page->component('QrRideLanding'));

        // 2. Passenger app inspects the QR token
        $this->as($passenger)->getJson('/api/v1/passenger/qr-rides/tricycle/' . $tricycle->qr_token)
            ->assertOk()
            ->assertJsonPath('tricycle.plate_number', $tricycle->plate_number)
            ->assertJsonPath('ride.passenger_capacity', 4);

        // 3. Passenger quote & join
        $join = $this->quoteAndJoin($passenger, $tricycle);
        $join->assertCreated();
        $this->assertNotEmpty($join->json('booking.booking_code'));
    }
}
