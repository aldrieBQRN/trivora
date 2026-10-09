<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * The authenticated driver's own passenger-capacity configuration, moved here from TMO. The
 * tricycle is resolved strictly from the driver's own assignment; the QR token is never touched.
 */
class DriverQrCapacityUpdateTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm();
    }

    #[Test]
    public function authenticated_driver_can_set_their_own_units_capacity(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: null);

        $this->as($driver->user)
            ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 4])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'passenger_capacity' => 4,
            ]);

        $this->assertSame(4, $tricycle->fresh()->passenger_capacity);

        // Reflected in the driver's own QR payload, and the status flips to ready.
        $this->as($driver->user)->getJson('/api/v1/driver/qr-code')
            ->assertOk()
            ->assertJsonPath('passenger_capacity', 4)
            ->assertJsonPath('status', 'ready');
    }

    #[Test]
    public function the_qr_token_is_never_changed_when_capacity_is_saved(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: null);
        $originalToken = $tricycle->qr_token;

        $this->as($driver->user)
            ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 6])
            ->assertOk();

        $this->assertSame($originalToken, $tricycle->fresh()->qr_token);
    }

    #[Test]
    public function saving_capacity_is_audited(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 2);

        $this->as($driver->user)
            ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 5])
            ->assertOk();

        $log = AuditLog::where('event', 'tricycle.passenger_capacity_updated')
            ->where('auditable_id', $tricycle->id)
            ->firstOrFail();

        $this->assertSame(['passenger_capacity' => 2], $log->old_values);
        $this->assertSame(5, $log->new_values['passenger_capacity']);
        $this->assertSame('driver_app', $log->new_values['source']);
        $this->assertSame($driver->user->id, $log->user_id);
    }

    #[Test]
    public function invalid_capacities_are_rejected_and_nothing_changes(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 3);

        foreach ([0, -1, 7, 21, 'abc', 2.5, ''] as $bad) {
            $this->as($driver->user)
                ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => $bad])
                ->assertStatus(422)
                ->assertJsonValidationErrors('passenger_capacity');
        }

        $this->assertSame(3, $tricycle->fresh()->passenger_capacity);
        $this->assertSame(0, AuditLog::where('event', 'tricycle.passenger_capacity_updated')->where('auditable_id', $tricycle->id)->count());
    }

    #[Test]
    public function a_driver_can_only_configure_their_own_assigned_unit(): void
    {
        [$tricycleA, $driverA] = $this->makeUnit(capacity: null);
        [$tricycleB] = $this->makeUnit(capacity: null);

        // Driver A's request only ever resolves Driver A's own tricycle — B is never touched, and
        // there is no client-supplied tricycle id that could retarget it.
        $this->as($driverA->user)
            ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 4])
            ->assertOk();

        $this->assertSame(4, $tricycleA->fresh()->passenger_capacity);
        $this->assertNull($tricycleB->fresh()->passenger_capacity);
    }

    #[Test]
    public function a_driver_without_an_assigned_unit_gets_an_error(): void
    {
        $user = User::create([
            'name' => 'Unassigned Driver',
            'email' => 'unassigned.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        \App\Models\Driver::create([
            'user_id' => $user->id,
            'license_number' => 'N01-99-' . rand(100000, 999999),
            'mobile_number' => '0917' . rand(1000000, 9999999),
            'tricycle_id' => null,
        ]);

        $this->as($user)
            ->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 4])
            ->assertNotFound();
    }

    #[Test]
    public function unauthenticated_requests_are_rejected(): void
    {
        [$tricycle] = $this->makeUnit(capacity: null);

        $this->postJson('/api/v1/driver/qr-code/capacity', ['passenger_capacity' => 4])
            ->assertUnauthorized();

        $this->assertNull($tricycle->fresh()->passenger_capacity);
    }
}
