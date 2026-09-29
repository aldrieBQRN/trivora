<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsQrRides;
use Tests\TestCase;

/**
 * QR Ride Phase 3: TMO passenger-capacity configuration, QR management (URL, regeneration,
 * print sheet), the public /ride/q/{token} landing page, and the server-decided pick-up point.
 */
class QrRideTmoConfigurationTest extends TestCase
{
    use BuildsQrRides, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeOsrm();
    }

    private function tmo(): User
    {
        return User::create([
            'name' => 'TMO Officer', 'email' => 'qr.tmo.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    private function qrRideProps(User $tmo, Tricycle $tricycle): array
    {
        $props = null;
        $this->actingAs($tmo)->get(route('tricycle.details', $tricycle->id))->assertOk()
            ->assertInertia(function ($page) use (&$props) {
                $page->component('TMODashboard/TricycleDetails');
                $props = $page->toArray()['props']['initialTricycle']['qr_ride'];
            });

        return $props;
    }

    private function landing(string $token): \Illuminate\Testing\TestResponse
    {
        return $this->get('/ride/q/' . $token);
    }

    private function landingStatus(string $token): array
    {
        $status = null;
        $this->landing($token)->assertInertia(function ($page) use (&$status) {
            $page->component('QrRideLanding');
            $status = $page->toArray()['props']['status'];
        });

        return $status;
    }

    // ------------------------------------------------------------------ CAPACITY

    #[Test]
    public function tmo_can_set_the_passenger_capacity_and_the_details_page_returns_it(): void
    {
        [$tricycle] = $this->makeUnit(capacity: null);
        $tmo = $this->tmo();

        $this->assertNull($this->qrRideProps($tmo, $tricycle)['passenger_capacity'], 'never defaulted');

        $this->actingAs($tmo)->from(route('tricycle.details', $tricycle->id))
            ->post(route('tmo.qr-ride.capacity', $tricycle), ['passenger_capacity' => 4])
            ->assertRedirect(route('tricycle.details', $tricycle->id))
            ->assertSessionHasNoErrors();

        $this->assertSame(4, $tricycle->fresh()->passenger_capacity);
        $props = $this->qrRideProps($tmo, $tricycle);
        $this->assertSame(4, $props['passenger_capacity']);
        $this->assertSame('ready', $props['status']);

        $log = AuditLog::where('event', 'tricycle.passenger_capacity_updated')->where('auditable_id', $tricycle->id)->firstOrFail();
        $this->assertSame(['passenger_capacity' => null], $log->old_values);
        $this->assertSame(['passenger_capacity' => 4], $log->new_values);
        $this->assertSame($tmo->id, $log->user_id);
    }

    #[Test]
    public function invalid_capacities_are_rejected_and_nothing_changes(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 3);
        $tmo = $this->tmo();

        foreach ([0, -1, 21, 'abc', 2.5] as $bad) {
            $this->actingAs($tmo)->post(route('tmo.qr-ride.capacity', $tricycle), ['passenger_capacity' => $bad])
                ->assertSessionHasErrors('passenger_capacity');
        }
        $this->actingAs($tmo)->post(route('tmo.qr-ride.capacity', $tricycle), [])->assertSessionHasErrors('passenger_capacity');

        $this->assertSame(3, $tricycle->fresh()->passenger_capacity);
        $this->assertSame(0, AuditLog::where('event', 'tricycle.passenger_capacity_updated')->where('auditable_id', $tricycle->id)->count());
    }

    #[Test]
    public function capacity_can_be_cleared_back_to_not_configured(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 4);
        $tmo = $this->tmo();

        $this->actingAs($tmo)->post(route('tmo.qr-ride.capacity', $tricycle), ['passenger_capacity' => null])->assertSessionHasNoErrors();

        $this->assertNull($tricycle->fresh()->passenger_capacity);
        $this->assertSame('capacity_required', $this->qrRideProps($tmo, $tricycle)['status']);
        $this->quote($this->makePassengerUser(), $tricycle)->assertStatus(409)->assertJsonPath('code', 'capacity_not_configured');
    }

    #[Test]
    public function only_tmo_can_configure_qr_ride(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: null);

        foreach ([$driver->user, $this->makePassengerUser(), $this->qrIssuer()] as $user) {
            $user->forceFill(['is_active' => true])->save(); // active account, wrong role -> 403
            $this->actingAs($user)->post(route('tmo.qr-ride.capacity', $tricycle), ['passenger_capacity' => 4])->assertForbidden();
            $this->actingAs($user)->post(route('tmo.qr-ride.regenerate', $tricycle))->assertForbidden();
            $this->actingAs($user)->get(route('tmo.qr-ride.print', $tricycle))->assertForbidden();
        }
        $this->assertNull($tricycle->fresh()->passenger_capacity);
    }

    // ------------------------------------------------------------------ READINESS + QR URL

    #[Test]
    public function the_qr_url_is_built_from_the_configured_app_url(): void
    {
        config(['app.url' => 'https://trivora.nasugbu.example/']);
        [$tricycle] = $this->makeUnit();

        $this->assertSame(
            'https://trivora.nasugbu.example/ride/q/' . $tricycle->qr_token,
            $this->qrRideProps($this->tmo(), $tricycle)['qr_url']
        );
    }

    #[Test]
    public function readiness_reflects_capacity_and_franchise_authority(): void
    {
        $tmo = $this->tmo();
        [$ready] = $this->makeUnit(capacity: 4);
        [$noCapacity] = $this->makeUnit(capacity: null);
        [$suspended] = $this->makeUnit(capacity: 4);
        $suspended->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);
        [$revoked] = $this->makeUnit(capacity: 4);
        $revoked->franchiseScheme->transitionStatus('revoked', 'Test', $this->qrIssuer()->id);
        [$inactive] = $this->makeUnit(capacity: 4, tricycleStatus: 'unregistered');

        $this->assertSame('ready', $this->qrRideProps($tmo, $ready)['status']);
        $this->assertSame('capacity_required', $this->qrRideProps($tmo, $noCapacity)['status']);
        foreach ([$suspended, $revoked, $inactive] as $unit) {
            $this->assertSame('not_ready', $this->qrRideProps($tmo, $unit)['status'], 'never presented as operational');
        }
    }

    // ------------------------------------------------------------------ REGENERATION

    #[Test]
    public function regenerating_invalidates_the_old_qr_and_its_quotes_and_the_new_one_works(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $tmo = $this->tmo();
        $passenger = $this->makePassengerUser();
        $oldToken = $tricycle->qr_token;
        $oldQuote = $this->quote($passenger, $tricycle)->json('quote');
        $before = DB::table('tricycles')->where('id', $tricycle->id)->first();
        $franchiseBefore = $tricycle->franchiseScheme()->first()->toArray();

        $this->actingAs($tmo)->post(route('tmo.qr-ride.regenerate', $tricycle))->assertRedirect()->assertSessionHasNoErrors();

        $after = $tricycle->fresh();
        $this->assertNotSame($oldToken, $after->qr_token);
        $this->assertSame(40, strlen($after->qr_token));
        $this->assertSame($before->id, $after->id);
        $this->assertSame($before->plate_number, $after->plate_number);
        $this->assertSame($before->passenger_capacity, $after->passenger_capacity);
        $this->assertSame($franchiseBefore, $after->franchiseScheme()->first()->toArray(), 'franchise untouched');
        $this->assertSame($tricycle->id, $driver->fresh()->tricycle_id, 'driver assignment untouched');

        // Old QR: dead everywhere, including a quote made with it.
        $this->landing($oldToken)->assertNotFound();
        $this->as($passenger)->getJson('/api/v1/passenger/qr-rides/tricycle/' . $oldToken)->assertNotFound()->assertJsonPath('code', 'invalid_qr');
        $this->join($passenger, $oldQuote)->assertNotFound()->assertJsonPath('code', 'invalid_qr');

        // New QR works.
        $this->assertTrue($this->landingStatus($after->qr_token)['available']);
        $this->quoteAndJoin($passenger, $after)->assertCreated();

        $log = AuditLog::where('event', 'qr_token.regenerated')->where('auditable_id', $tricycle->id)->firstOrFail();
        $this->assertSame($tmo->id, $log->user_id);
        $this->assertStringNotContainsString($oldToken, json_encode($log->toArray()));
        $this->assertStringNotContainsString($after->qr_token, json_encode($log->toArray()), 'tokens are never logged');
    }

    #[Test]
    public function regenerating_keeps_ride_history(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $code = $this->quoteAndJoin($this->makePassengerUser(), $tricycle)->json('booking.booking_code');
        $this->as($driver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();
        $this->as($driver->user)->postJson("/api/v1/driver/qr-session/passengers/{$code}/drop-off")->assertOk();
        $booking = Booking::where('booking_code', $code)->first()->toArray();

        $this->actingAs($this->tmo())->post(route('tmo.qr-ride.regenerate', $tricycle));

        $this->assertSame($booking, Booking::where('booking_code', $code)->first()->toArray());
        $this->assertSame(1, $tricycle->rideSessions()->count());
    }

    // ------------------------------------------------------------------ PRINT SHEET

    #[Test]
    public function the_print_sheet_shows_the_unit_code_and_only_a_real_sticker_number(): void
    {
        [$tricycle] = $this->makeUnit();
        [$noSticker] = $this->makeUnit();
        // No issued coding number and only an application-style franchise number (FS-…), which
        // Tricycle::getCodingSchemeNumberAttribute never treats as a Sticker Number.
        DB::table('tricycles')->where('id', $noSticker->id)->update(['coding_scheme_number' => null]);
        DB::table('franchise_schemes')->where('tricycle_id', $noSticker->id)->update(['franchise_number' => 'FS-QR-' . $noSticker->id]);
        $tmo = $this->tmo();

        $this->actingAs($tmo)->get(route('tmo.qr-ride.print', $tricycle))->assertOk()
            ->assertInertia(fn ($page) => $page->component('TMODashboard/QrRidePrint')
                ->where('unit.unit_code', 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT))
                ->where('unit.sticker_number', $tricycle->coding_scheme_number)
                ->where('qrRide.qr_url', rtrim(config('app.url'), '/') . '/ride/q/' . $tricycle->qr_token));

        $this->actingAs($tmo)->get(route('tmo.qr-ride.print', $noSticker))->assertOk()
            ->assertInertia(fn ($page) => $page->where('unit.sticker_number', null));
    }

    // ------------------------------------------------------------------ PUBLIC LANDING

    #[Test]
    public function the_landing_page_resolves_a_valid_qr_with_only_public_details(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);

        $response = $this->landing($tricycle->qr_token)->assertOk();
        $status = $this->landingStatus($tricycle->qr_token);

        $this->assertTrue($status['valid']);
        $this->assertTrue($status['available']);
        $this->assertSame($tricycle->plate_number, $status['tricycle']['plate_number']);
        $this->assertSame($tricycle->coding_scheme_number, $status['tricycle']['sticker_number']);
        $this->assertArrayNotHasKey('id', $status['tricycle']);
        $this->assertArrayNotHasKey('driver', $status);

        // The token is only in the URL the visitor already has — never echoed in the page data.
        $this->assertStringNotContainsString($tricycle->qr_token, json_encode($status));
        $this->assertStringNotContainsString($driver->user->name, $response->getContent());
        $this->assertStringNotContainsString('09171112222', $response->getContent());
    }

    #[Test]
    public function the_landing_page_rejects_an_invalid_qr(): void
    {
        $this->landing('definitely-not-a-token')->assertNotFound();
        $status = null;
        $this->landing('definitely-not-a-token')->assertInertia(function ($page) use (&$status) {
            $status = $page->toArray()['props']['status'];
        });

        $this->assertFalse($status['valid']);
        $this->assertSame('invalid_qr', $status['reason']);
        $this->assertNull($status['tricycle']);
    }

    #[Test]
    public function the_landing_page_never_presents_an_unavailable_tricycle_as_available(): void
    {
        [$suspended] = $this->makeUnit();
        $suspended->franchiseScheme->transitionStatus('suspended', 'Test', $this->qrIssuer()->id);
        [$revoked] = $this->makeUnit();
        $revoked->franchiseScheme->transitionStatus('revoked', 'Test', $this->qrIssuer()->id);
        [$inactive] = $this->makeUnit(tricycleStatus: 'unregistered');
        [$noDriver, $orphanDriver] = $this->makeUnit();
        $orphanDriver->update(['tricycle_id' => null]);
        [$offline] = $this->makeUnit(online: false);
        [$noCapacity] = $this->makeUnit(capacity: null);
        [$full] = $this->makeUnit(capacity: 1);
        $this->quoteAndJoin($this->makePassengerUser(), $full)->assertCreated();
        [$started, $startedDriver] = $this->makeUnit();
        $this->quoteAndJoin($this->makePassengerUser(), $started)->assertCreated();
        $this->as($startedDriver->user)->postJson('/api/v1/driver/qr-session/start')->assertOk();

        $expected = [
            'franchise_suspended' => $suspended, 'franchise_revoked' => $revoked, 'tricycle_not_active' => $inactive,
            'no_driver' => $noDriver, 'driver_offline' => $offline, 'capacity_not_configured' => $noCapacity,
            'ride_full' => $full, 'ride_in_progress' => $started,
        ];
        foreach ($expected as $reason => $unit) {
            $status = $this->landingStatus($unit->qr_token);
            $this->assertTrue($status['valid'], $reason);
            $this->assertFalse($status['available'], $reason);
            $this->assertSame($reason, $status['reason']);
            $this->assertNotEmpty($status['message']);
        }
    }

    // ------------------------------------------------------------------ TOKEN EXPOSURE

    #[Test]
    public function the_qr_token_never_appears_in_booking_or_scan_payloads(): void
    {
        [$tricycle, $driver] = $this->makeUnit(capacity: 4);
        $passenger = $this->makePassengerUser();
        $scan = $this->scan($passenger, $tricycle)->assertOk()->getContent();
        $join = $this->quoteAndJoin($passenger, $tricycle)->assertCreated()->getContent();
        $history = $this->as($passenger)->getJson('/api/v1/passenger/bookings/history')->getContent();
        $driverSession = $this->as($driver->user)->getJson('/api/v1/driver/qr-session/active')->getContent();

        foreach ([$scan, $join, $history, $driverSession] as $body) {
            $this->assertStringNotContainsString($tricycle->qr_token, $body);
        }
    }

    // ------------------------------------------------------------------ PICK-UP DECISION

    #[Test]
    public function the_pickup_is_the_tricycles_fresh_gps_position_not_the_phone(): void
    {
        [$tricycle] = $this->makeUnit(capacity: 4);
        TricycleLocation::create([
            'tricycle_id' => $tricycle->id, 'latitude' => 14.0731234, 'longitude' => 120.6341234,
            'source' => 'mobile_app', 'recorded_at' => now()->subSeconds(10),
        ]);
        $passenger = $this->makePassengerUser();

        $this->quote($passenger, $tricycle)->assertOk()
            ->assertJsonPath('pickup.source', 'tricycle_gps')
            ->assertJsonPath('pickup.lat', 14.0731234)
            ->assertJsonPath('pickup.lng', 120.6341234);

        $this->quoteAndJoin($passenger, $tricycle)->assertCreated();
        $booking = Booking::where('passenger_id', $this->passengerOf($passenger)->id)->first();
        $this->assertEqualsWithDelta(14.0731234, $booking->pickup_lat, 0.0000001);
        $this->assertEqualsWithDelta(120.6341234, $booking->pickup_lng, 0.0000001);
    }

    #[Test]
    public function the_pickup_falls_back_to_the_phone_only_when_the_tricycle_gps_is_stale_or_missing(): void
    {
        [$stale] = $this->makeUnit(capacity: 4);
        TricycleLocation::create([
            'tricycle_id' => $stale->id, 'latitude' => 14.0999, 'longitude' => 120.6999,
            'source' => 'mobile_app', 'recorded_at' => now()->subMinutes(5),
        ]);
        [$none] = $this->makeUnit(capacity: 4);

        foreach ([$stale, $none] as $unit) {
            $this->quote($this->makePassengerUser(), $unit)->assertOk()
                ->assertJsonPath('pickup.source', 'passenger_gps')
                ->assertJsonPath('pickup.lat', self::PICKUP['lat'])
                ->assertJsonPath('pickup.lng', self::PICKUP['lng']);
        }
    }
}
