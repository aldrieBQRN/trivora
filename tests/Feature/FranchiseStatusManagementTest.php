<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\FranchiseStatusHistory;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use App\Services\BookingDispatchService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the Franchise Status Management feature end-to-end — the successor to the retired
 * Driver Account Status feature. Operational authorization belongs to the FRANCHISE
 * (FranchiseScheme), not the individual driver account:
 *   - FranchiseScheme::transitionStatus() state machine (allowed transitions, Revoked terminal).
 *   - TMO's Suspend/Revoke/Reinstate web actions (App\Http\Controllers\TMO\FranchiseStatusController).
 *   - Driver App enforcement: login always succeeds regardless of franchise status, and the
 *     EnsureFranchiseIsOperational middleware on the operational endpoints (going Online, booking
 *     actions, GPS telematics) resolves through Driver::franchise().
 *   - Booking dispatch excludes drivers whose assigned franchise is not Active.
 */
class FranchiseStatusManagementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Operator $operator;
    protected Tricycle $tricycle;
    protected Driver $driver;
    protected FranchiseScheme $franchiseScheme;
    protected User $tmoUser;

    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-FRANCHISE-TEST'],
            ['name' => 'Franchise Status Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Franchise Status Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Franchise Test Driver', 'email' => 'franchise.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $toda->id,
            'first_name' => 'Franchise', 'last_name' => 'Driver',
            'contact_number' => '09170000070', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-FRAN-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $this->operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0003',
            'plate_number' => 'FRN-0003', 'engine_number' => 'ENG-FRN-003', 'chassis_number' => 'CHS-FRN-003',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-FRN-003', 'cr_number' => 'CR-FRN-003', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer Franchise', 'email' => 'bplo.franchise.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);
        $this->franchiseScheme = FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-FRN-003',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        $this->driver = Driver::create([
            'user_id' => $this->driverUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-FRAN-001',
            'mobile_number' => '09170000070',
            'is_online' => false, 'is_available' => true,
        ]);

        $this->tmoUser = User::create([
            'name' => 'TMO Franchise Officer', 'email' => 'tmo.franchise.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // FranchiseScheme::transitionStatus() — the state machine itself
    // -------------------------------------------------------------------------

    #[Test]
    public function a_new_franchise_defaults_to_active_and_allows_the_driver_to_operate(): void
    {
        $this->assertSame('active', $this->franchiseScheme->status);
        $this->assertTrue($this->franchiseScheme->canOperate());
        $this->assertTrue($this->driver->canOperate());
    }

    #[Test]
    public function active_to_suspended_is_allowed_and_records_history(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Reported unsafe driving.', $this->tmoUser->id);
        $this->franchiseScheme->refresh();

        $this->assertSame('suspended', $this->franchiseScheme->status);
        $this->assertSame('Reported unsafe driving.', $this->franchiseScheme->status_reason);
        $this->assertNotNull($this->franchiseScheme->status_changed_at);
        $this->assertFalse($this->franchiseScheme->canOperate());
        $this->assertFalse($this->driver->fresh()->canOperate());

        $history = FranchiseStatusHistory::where('franchise_scheme_id', $this->franchiseScheme->id)->first();
        $this->assertNotNull($history);
        $this->assertSame('active', $history->from_status);
        $this->assertSame('suspended', $history->to_status);
        $this->assertSame('Reported unsafe driving.', $history->reason);
        $this->assertSame($this->tmoUser->id, $history->changed_by);
    }

    #[Test]
    public function suspended_franchise_prevents_the_driver_from_operating(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);

        $this->assertFalse($this->driver->fresh()->canOperate());
    }

    #[Test]
    public function active_to_revoked_is_allowed(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Franchise permanently cancelled.', $this->tmoUser->id);
        $this->assertSame('revoked', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function revoked_franchise_prevents_the_driver_from_operating(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Franchise permanently cancelled.', $this->tmoUser->id);

        $this->assertFalse($this->driver->fresh()->canOperate());
    }

    #[Test]
    public function suspended_to_active_is_allowed(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Initial suspension.', $this->tmoUser->id);
        $this->franchiseScheme->refresh()->transitionStatus('active', 'Cleared after review.', $this->tmoUser->id);

        $this->assertSame('active', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function reinstated_franchise_allows_operation_again(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Initial suspension.', $this->tmoUser->id);
        $this->franchiseScheme->refresh()->transitionStatus('active', 'Cleared after review.', $this->tmoUser->id);

        $this->assertTrue($this->driver->fresh()->canOperate());
    }

    #[Test]
    public function suspended_to_revoked_is_allowed(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Initial suspension.', $this->tmoUser->id);
        $this->franchiseScheme->refresh()->transitionStatus('revoked', 'Escalated to revocation.', $this->tmoUser->id);

        $this->assertSame('revoked', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function revoked_to_active_is_never_allowed(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Terminal.', $this->tmoUser->id);
        $this->franchiseScheme->refresh();

        $this->assertFalse($this->franchiseScheme->canTransitionTo('active'));
        $this->expectException(\InvalidArgumentException::class);
        $this->franchiseScheme->transitionStatus('active', 'Attempted reinstatement.', $this->tmoUser->id);
    }

    #[Test]
    public function revoked_to_suspended_is_never_allowed_either(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Terminal.', $this->tmoUser->id);
        $this->franchiseScheme->refresh();

        $this->assertFalse($this->franchiseScheme->canTransitionTo('suspended'));
    }

    #[Test]
    public function transitioning_away_from_active_forces_the_driver_offline_and_clears_the_session(): void
    {
        $this->driver->update(['is_online' => true, 'is_available' => true, 'online_since' => now()]);

        $this->franchiseScheme->refresh()->transitionStatus('suspended', 'Went offline check.', $this->tmoUser->id);
        $this->driver->refresh();

        $this->assertFalse($this->driver->is_online);
        $this->assertFalse($this->driver->is_available);
        $this->assertNull($this->driver->online_since);
    }

    // -------------------------------------------------------------------------
    // TMO web actions
    // -------------------------------------------------------------------------

    #[Test]
    public function tmo_can_suspend_an_active_franchise_with_a_reason(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.suspend', $this->tricycle), [
            'reason' => 'Multiple passenger complaints.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertSame('suspended', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function tmo_suspending_without_a_reason_is_rejected(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.suspend', $this->tricycle), []);

        $response->assertSessionHasErrors('reason');
        $this->assertSame('active', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function tmo_can_revoke_an_active_franchise_with_a_reason(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.revoke', $this->tricycle), [
            'reason' => 'Franchise revoked by BPLO.',
        ]);

        $response->assertRedirect();
        $this->assertSame('revoked', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function tmo_revoking_without_a_reason_is_rejected(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.revoke', $this->tricycle), []);

        $response->assertSessionHasErrors('reason');
        $this->assertSame('active', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function tmo_can_reinstate_a_suspended_franchise(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Initial suspension.', $this->tmoUser->id);

        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.reinstate', $this->tricycle));

        $response->assertRedirect();
        $this->assertSame('active', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function tmo_cannot_reinstate_a_revoked_franchise(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Terminal.', $this->tmoUser->id);

        $response = $this->actingAs($this->tmoUser)->post(route('tmo.franchise.reinstate', $this->tricycle));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertSame('revoked', $this->franchiseScheme->fresh()->status);
    }

    #[Test]
    public function a_non_tmo_user_cannot_change_franchise_status(): void
    {
        $response = $this->actingAs($this->driverUser)->post(route('tmo.franchise.suspend', $this->tricycle), [
            'reason' => 'Trying to self-suspend.',
        ]);

        $response->assertStatus(403);
        $this->assertSame('active', $this->franchiseScheme->fresh()->status);
    }

    // -------------------------------------------------------------------------
    // Driver App: login is NEVER blocked by franchise status
    // -------------------------------------------------------------------------

    #[Test]
    public function a_driver_with_an_active_franchise_can_login(): void
    {
        $response = $this->postJson('/api/v1/driver/login', [
            'login' => '09170000070', 'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
    }

    #[Test]
    public function a_driver_with_a_suspended_franchise_can_still_authenticate(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);

        $response = $this->postJson('/api/v1/driver/login', [
            'login' => '09170000070', 'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('franchise.status', 'suspended');
    }

    #[Test]
    public function a_driver_with_a_revoked_franchise_can_still_authenticate(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Franchise revoked.', $this->tmoUser->id);

        $response = $this->postJson('/api/v1/driver/login', [
            'login' => '09170000070', 'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('franchise.status', 'revoked');

        // The account itself is untouched — never disabled just because the franchise was revoked.
        $this->assertDatabaseHas('users', ['id' => $this->driverUser->id, 'is_active' => true]);
    }

    // -------------------------------------------------------------------------
    // Driver App: operational endpoints (the franchise.operational middleware)
    // -------------------------------------------------------------------------

    #[Test]
    public function an_active_franchise_driver_can_go_online(): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/status', ['is_online' => true]);

        $response->assertOk();
        $response->assertJsonPath('is_online', true);
        $this->assertTrue($this->driver->fresh()->is_online);
    }

    #[Test]
    public function a_suspended_franchise_prevents_going_online(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/status', ['is_online' => true]);

        $response->assertStatus(403);
        $response->assertJsonPath('franchise_status', 'suspended');
        $this->assertFalse($this->driver->fresh()->is_online);
    }

    #[Test]
    public function a_driver_whose_franchise_is_suspended_can_still_go_offline(): void
    {
        // Suspension already forces is_online=false, but the endpoint itself must not be
        // blanket-blocked for a driver explicitly turning themself off.
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/status', ['is_online' => false]);

        $response->assertOk();
    }

    #[Test]
    public function a_suspended_franchise_prevents_fetching_pending_bookings(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->getJson('/api/v1/driver/bookings/pending');

        $response->assertStatus(403);
    }

    #[Test]
    public function a_suspended_franchise_prevents_accepting_a_booking(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/bookings/999/accept');

        $response->assertStatus(403);
    }

    #[Test]
    public function a_suspended_franchise_prevents_sending_gps_telematics(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $response = $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63,
        ]);

        $response->assertStatus(403);
        $this->assertSame(0, \App\Models\TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function a_driver_with_a_suspended_franchise_can_still_view_their_profile_and_history(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review, please hold.', $this->tmoUser->id);
        Sanctum::actingAs($this->driverUser, ['*']);

        $me = $this->getJson('/api/v1/driver/me');
        $me->assertOk();
        $me->assertJsonPath('franchise.status', 'suspended');
        $me->assertJsonPath('franchise.status_reason', 'Under review, please hold.');

        $violations = $this->getJson('/api/v1/driver/violations');
        $violations->assertOk();
    }

    #[Test]
    public function a_revoked_franchise_is_forced_offline_immediately(): void
    {
        $this->driver->update(['is_online' => true, 'is_available' => true, 'online_since' => now()]);

        $this->franchiseScheme->refresh()->transitionStatus('revoked', 'Franchise revoked.', $this->tmoUser->id);

        $fresh = $this->driver->fresh();
        $this->assertFalse($fresh->is_online);
        $this->assertNull($fresh->online_since);
    }

    #[Test]
    public function a_revoked_franchise_cannot_access_protected_operational_apis_even_with_a_still_valid_token(): void
    {
        // Simulates a driver holding an already-issued token from before the franchise was revoked.
        Sanctum::actingAs($this->driverUser, ['*']);
        $this->franchiseScheme->transitionStatus('revoked', 'Franchise revoked.', $this->tmoUser->id);

        $status = $this->postJson('/api/v1/driver/status', ['is_online' => true]);
        $status->assertStatus(403);
        $status->assertJsonPath('franchise_status', 'revoked');

        $telematics = $this->postJson('/api/v1/driver/telematics', ['latitude' => 14.07, 'longitude' => 120.63]);
        $telematics->assertStatus(403);

        $pending = $this->getJson('/api/v1/driver/bookings/pending');
        $pending->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Booking dispatch
    // -------------------------------------------------------------------------

    #[Test]
    public function booking_dispatch_excludes_drivers_whose_franchise_is_not_active(): void
    {
        $this->driver->update([
            'is_online' => true, 'is_available' => true,
            'current_lat' => 14.0715, 'current_lng' => 120.6330,
        ]);
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);

        $passengerUser = User::create([
            'name' => 'Dispatch Test Passenger', 'email' => 'dispatch.passenger.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        $passenger = Passenger::create(['user_id' => $passengerUser->id, 'mobile_number' => '0917' . rand(1000000, 9999999)]);

        $booking = Booking::create([
            'booking_code' => 'BK-FRAN-TEST-' . uniqid(),
            'passenger_id' => $passenger->id,
            'pickup_name' => 'Test Pickup', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Test Dropoff', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 20, 'passenger_count' => 1, 'fare_per_passenger' => 20,
            'distance_km' => 1.0, 'status' => 'pending', 'requested_at' => now(),
        ]);

        $eligible = BookingDispatchService::getEligibleDrivers($booking);

        $this->assertFalse($eligible->contains('id', $this->driver->id));
    }

    #[Test]
    public function booking_dispatch_includes_drivers_whose_franchise_is_active(): void
    {
        $this->driver->update([
            'is_online' => true, 'is_available' => true,
            'current_lat' => 14.0715, 'current_lng' => 120.6330,
        ]);

        $passengerUser = User::create([
            'name' => 'Dispatch Test Passenger Active', 'email' => 'dispatch.passenger.active.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger',
        ]);
        $passenger = Passenger::create(['user_id' => $passengerUser->id, 'mobile_number' => '0917' . rand(1000000, 9999999)]);

        $booking = Booking::create([
            'booking_code' => 'BK-FRAN-TEST-' . uniqid(),
            'passenger_id' => $passenger->id,
            'pickup_name' => 'Test Pickup', 'pickup_lat' => 14.0715, 'pickup_lng' => 120.6330,
            'dropoff_name' => 'Test Dropoff', 'dropoff_lat' => 14.08, 'dropoff_lng' => 120.64,
            'fare_amount' => 20, 'passenger_count' => 1, 'fare_per_passenger' => 20,
            'distance_km' => 1.0, 'status' => 'pending', 'requested_at' => now(),
        ]);

        $eligible = BookingDispatchService::getEligibleDrivers($booking);

        $this->assertTrue($eligible->contains('id', $this->driver->id));
    }

    // -------------------------------------------------------------------------
    // Data integrity / non-regression
    // -------------------------------------------------------------------------

    #[Test]
    public function suspending_and_revoking_never_deletes_records(): void
    {
        $driverId = $this->driver->id;
        $tricycleId = $this->tricycle->id;
        $userId = $this->driverUser->id;
        $franchiseId = $this->franchiseScheme->id;

        $this->franchiseScheme->transitionStatus('suspended', 'Reason A.', $this->tmoUser->id);
        $this->franchiseScheme->refresh()->transitionStatus('revoked', 'Reason B.', $this->tmoUser->id);

        $this->assertDatabaseHas('drivers', ['id' => $driverId]);
        $this->assertDatabaseHas('tricycles', ['id' => $tricycleId]);
        $this->assertDatabaseHas('users', ['id' => $userId, 'is_active' => true]);
        $this->assertDatabaseHas('franchise_schemes', ['id' => $franchiseId]);
        $this->assertSame(2, FranchiseStatusHistory::where('franchise_scheme_id', $franchiseId)->count());
    }

    #[Test]
    public function driver_account_remains_intact_after_franchise_suspension(): void
    {
        $this->franchiseScheme->transitionStatus('suspended', 'Under review.', $this->tmoUser->id);

        $this->assertDatabaseHas('drivers', ['id' => $this->driver->id, 'user_id' => $this->driverUser->id]);
        $this->assertDatabaseHas('users', ['id' => $this->driverUser->id, 'is_active' => true]);
    }

    #[Test]
    public function driver_account_remains_intact_after_franchise_revocation(): void
    {
        $this->franchiseScheme->transitionStatus('revoked', 'Terminal.', $this->tmoUser->id);

        $this->assertDatabaseHas('drivers', ['id' => $this->driver->id, 'user_id' => $this->driverUser->id]);
        $this->assertDatabaseHas('users', ['id' => $this->driverUser->id, 'is_active' => true]);
    }

    #[Test]
    public function an_untouched_active_franchise_driver_is_completely_unaffected(): void
    {
        // A second, completely separate driver/franchise that nobody ever touches — proves this
        // feature is opt-in per franchise and doesn't perturb existing active franchises.
        $otherUser = User::create([
            'name' => 'Untouched Franchise Driver', 'email' => 'untouched.franchise.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        $otherOperator = Operator::create([
            'user_id' => $otherUser->id, 'toda_id' => $this->tricycle->toda_zone_id,
            'first_name' => 'Untouched', 'last_name' => 'Driver',
            'contact_number' => '09170000098', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-UNTOUCHED-FRAN-001', 'license_expiry_date' => '2028-01-01',
        ]);
        $otherTricycle = Tricycle::create([
            'operator_id' => $otherOperator->id, 'toda_zone_id' => $this->tricycle->toda_zone_id,
            'coding_scheme_number' => '0004',
            'plate_number' => 'FRN-0004', 'engine_number' => 'ENG-FRN-004', 'chassis_number' => 'CHS-FRN-004',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-FRN-004', 'cr_number' => 'CR-FRN-004', 'status' => 'active',
        ]);
        FranchiseScheme::create([
            'tricycle_id' => $otherTricycle->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'issued_by' => $this->franchiseScheme->issued_by,
            'franchise_number' => 'FR-FRN-004',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);
        $otherDriver = Driver::create([
            'user_id' => $otherUser->id, 'operator_id' => $otherOperator->id, 'tricycle_id' => $otherTricycle->id,
            'license_number' => 'LIC-UNTOUCHED-FRAN-001', 'mobile_number' => '09170000098',
            'is_online' => false, 'is_available' => true,
        ]);

        $this->assertTrue($otherDriver->canOperate());

        Sanctum::actingAs($otherUser, ['*']);
        $response = $this->postJson('/api/v1/driver/status', ['is_online' => true]);
        $response->assertOk();
        $this->assertTrue($otherDriver->fresh()->is_online);

        // Our own franchise's earlier suspension (if any ran before this test in the same
        // process) never touches this completely separate franchise/driver pair.
        $this->assertSame('active', $otherDriver->franchise()->status);
    }
}
