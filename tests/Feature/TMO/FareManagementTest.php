<?php

namespace Tests\Feature\TMO;

use App\Models\Booking;
use App\Models\FareConfiguration;
use App\Models\TodaZone;
use App\Models\User;
use App\Services\FareService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FareManagementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected User $adminUser;
    protected User $driverUser;
    protected User $passengerUser;
    protected TodaZone $zone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::factory()->create([
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->driverUser = User::factory()->create([
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);

        $this->passengerUser = User::factory()->create([
            'role' => 'passenger',
            'is_active' => true,
        ]);

        $this->zone = TodaZone::firstOrCreate(
            ['code' => 'TODA-FAREMGMT'],
            ['name' => 'TODA Fare Mgmt Zone', 'barangay' => 'Brgy. 1', 'is_active' => true]
        );

        // Ensure baseline fare exists for test context
        FareConfiguration::firstOrCreate(
            ['effective_date' => '2026-01-01'],
            [
                'base_fare' => 50.00,
                'base_fare_per_passenger' => 25.00,
                'included_distance_km' => 4.00,
                'rate_per_km' => 5.00,
                'is_active' => true,
            ]
        );
    }

    /**
     * 1. Authorization: Only authorized TMO and Admin users can access the page.
     */
    public function test_authorized_tmo_and_admin_users_can_view_fare_management(): void
    {
        $responseTmo = $this->actingAs($this->tmoUser)->get(route('tmo.fares'));
        $responseTmo->assertOk();

        $responseAdmin = $this->actingAs($this->adminUser)->get(route('tmo.fares'));
        $responseAdmin->assertOk();
    }

    public function test_unauthorized_users_and_guests_are_blocked_from_fare_management(): void
    {
        // Unauthenticated guest is redirected to login
        $this->get(route('tmo.fares'))->assertRedirect(route('login'));

        // Passenger gets 403 Forbidden
        $this->actingAs($this->passengerUser)->get(route('tmo.fares'))->assertForbidden();

        // Driver gets 403 Forbidden
        $this->actingAs($this->driverUser)->get(route('tmo.fares'))->assertForbidden();

        // Passenger cannot POST to create fare
        $this->actingAs($this->passengerUser)->post(route('tmo.fares.store'), [
            'base_fare' => 60,
            'base_fare_per_passenger' => 30,
            'included_distance_km' => 4,
            'rate_per_km' => 6,
            'effective_date' => now()->addDays(5)->toDateString(),
        ])->assertForbidden();

        // Driver cannot POST to create fare
        $this->actingAs($this->driverUser)->post(route('tmo.fares.store'), [
            'base_fare' => 60,
            'base_fare_per_passenger' => 30,
            'included_distance_km' => 4,
            'rate_per_km' => 6,
            'effective_date' => now()->addDays(5)->toDateString(),
        ])->assertForbidden();
    }

    /**
     * 2. Active Fare Retrieval: Active fare is retrieved from the database.
     */
    public function test_active_fare_retrieval_from_database(): void
    {
        $activeFare = FareService::getActiveFare();

        $this->assertInstanceOf(FareConfiguration::class, $activeFare);
        $this->assertEquals(50.0, (float) $activeFare->base_fare);
        $this->assertEquals(25.0, (float) $activeFare->base_fare_per_passenger);
        $this->assertEquals(4.0, (float) $activeFare->included_distance_km);
        $this->assertEquals(5.0, (float) $activeFare->rate_per_km);
    }

    /**
     * 3. Database-backed Fare Calculation: Calculations update when active config changes.
     */
    public function test_database_backed_fare_calculation_uses_active_configuration(): void
    {
        // Baseline calculation at 5km:
        // 1 pax, 5km -> 50 + (5-4)*5 = 55.0
        $this->assertEquals(55.0, FareService::calculate(5.0, 1));

        // Create an active fare configuration effective today with higher rates
        FareConfiguration::create([
            'base_fare' => 60.00,
            'base_fare_per_passenger' => 30.00,
            'included_distance_km' => 3.00,
            'rate_per_km' => 10.00,
            'effective_date' => now()->toDateString(),
            'is_active' => true,
        ]);

        // Recalculate at 5km with new active fare:
        // 1 pax, 5km -> 60 + (5-3)*10 = 80.0
        $this->assertEquals(80.0, FareService::calculate(5.0, 1));
    }

    /**
     * 4. 1 Passenger calculation: Uses configurable 1 passenger base fare.
     */
    public function test_one_passenger_calculation(): void
    {
        $customConfig = new FareConfiguration([
            'base_fare' => 55.00,
            'base_fare_per_passenger' => 28.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 6.00,
        ]);

        // Within included distance
        $this->assertEquals(55.0, FareService::calculate(3.5, 1, $customConfig));

        // Exactly at included distance
        $this->assertEquals(55.0, FareService::calculate(4.0, 1, $customConfig));

        // Beyond included distance: 55 + (6 - 4) * 6 = 67.0
        $this->assertEquals(67.0, FareService::calculate(6.0, 1, $customConfig));
    }

    /**
     * 5. 2+ Passengers calculation: Uses configurable 2+ passenger per-head rate.
     */
    public function test_two_plus_passengers_calculation(): void
    {
        $customConfig = new FareConfiguration([
            'base_fare' => 50.00,
            'base_fare_per_passenger' => 30.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 5.00,
        ]);

        // 2 passengers within 4km: 30 * 2 = 60.0
        $this->assertEquals(60.0, FareService::calculate(3.0, 2, $customConfig));

        // 3 passengers at 5km: (30 + (5 - 4)*5) * 3 = 35 * 3 = 105.0
        $this->assertEquals(105.0, FareService::calculate(5.0, 3, $customConfig));

        // 4 passengers at 6km: (30 + (6 - 4)*5) * 4 = 40 * 4 = 160.0
        $this->assertEquals(160.0, FareService::calculate(6.0, 4, $customConfig));
    }

    /**
     * 6. Included Distance & Additional Distance: Continuous distance charge without ceil().
     */
    public function test_included_distance_and_continuous_additional_distance_billing(): void
    {
        $customConfig = new FareConfiguration([
            'base_fare' => 50.00,
            'base_fare_per_passenger' => 25.00,
            'included_distance_km' => 5.00, // 5 km included
            'rate_per_km' => 10.00,
        ]);

        // At 4.5 km (under 5 km) -> no extra charge
        $this->assertEquals(50.0, FareService::calculate(4.5, 1, $customConfig));

        // At 5.25 km (fractional excess 0.25 km) -> 50 + 0.25 * 10 = 52.5 (no whole km ceil)
        $this->assertEquals(52.5, FareService::calculate(5.25, 1, $customConfig));

        // At 5.75 km -> 50 + 0.75 * 10 = 57.5
        $this->assertEquals(57.5, FareService::calculate(5.75, 1, $customConfig));
    }

    /**
     * 7. New Fare Creation: TMO can create a new fare record.
     */
    public function test_tmo_can_create_new_fare_configuration(): void
    {
        $targetDate = now()->addDays(10)->toDateString();

        $response = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 65.00,
            'base_fare_per_passenger' => 32.50,
            'included_distance_km' => 4.50,
            'rate_per_km' => 6.00,
            'effective_date' => $targetDate,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('tmo.fares'));

        $this->assertDatabaseHas('fare_configurations', [
            'base_fare' => 65.00,
            'base_fare_per_passenger' => 32.50,
            'included_distance_km' => 4.50,
            'rate_per_km' => 6.00,
            'effective_date' => $targetDate,
            'created_by' => $this->tmoUser->id,
        ]);
    }

    /**
     * 7b. Effective Date Required: Effective date is required when creating a new fare.
     */
    public function test_effective_date_is_required_when_creating_fare(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 65.00,
            'base_fare_per_passenger' => 32.50,
            'included_distance_km' => 4.50,
            'rate_per_km' => 6.00,
            'effective_date' => '',
        ]);

        $response->assertSessionHasErrors(['effective_date']);
    }

    /**
     * 8. Fare History Preservation: Creating a new fare does not overwrite the old one.
     */
    public function test_fare_history_is_preserved_when_new_fare_is_created(): void
    {
        $initialCount = FareConfiguration::count();
        $targetDate = now()->addDays(20)->toDateString();

        $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 70.00,
            'base_fare_per_passenger' => 35.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 7.00,
            'effective_date' => $targetDate,
        ]);

        $this->assertEquals($initialCount + 1, FareConfiguration::count());

        // Baseline record remains completely intact
        $this->assertDatabaseHas('fare_configurations', [
            'effective_date' => '2026-01-01',
            'base_fare' => 50.00,
            'base_fare_per_passenger' => 25.00,
        ]);
    }

    /**
     * 9. Effective Dates: A scheduled future fare only becomes active on its effective date.
     */
    public function test_scheduled_fare_only_takes_effect_on_effective_date(): void
    {
        $futureDate = now()->addDays(7)->toDateString();

        FareConfiguration::create([
            'base_fare' => 90.00,
            'base_fare_per_passenger' => 45.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 8.00,
            'effective_date' => $futureDate,
            'is_active' => true,
        ]);

        // Today, the active fare is still the baseline ₱50
        $todayActive = FareService::getActiveFare(now());
        $this->assertEquals(50.0, (float) $todayActive->base_fare);
        $this->assertEquals(50.0, FareService::calculate(2.0, 1));

        // On the future date, the new fare becomes active
        $futureActive = FareService::getActiveFare(Carbon::parse($futureDate));
        $this->assertEquals(90.0, (float) $futureActive->base_fare);
        $this->assertEquals(90.0, FareService::calculate(2.0, 1, $futureActive));
    }

    /**
     * 10. Overlapping Date Prevention: Overlapping/duplicate dates are rejected.
     */
    public function test_overlapping_and_duplicate_effective_dates_are_prevented(): void
    {
        $targetDate = now()->addDays(30)->toDateString();

        // 1st creation succeeds
        $response1 = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 60.00,
            'base_fare_per_passenger' => 30.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 5.00,
            'effective_date' => $targetDate,
        ]);
        $response1->assertSessionHasNoErrors();

        // 2nd creation with exact same date is rejected
        $response2 = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 65.00,
            'base_fare_per_passenger' => 32.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 6.00,
            'effective_date' => $targetDate,
        ]);
        $response2->assertSessionHasErrors('effective_date');

        // Submitting an effective date backdated before the active baseline (2026-01-01) is rejected
        $response3 = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 40.00,
            'base_fare_per_passenger' => 20.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 4.00,
            'effective_date' => '2025-06-01',
        ]);
        $response3->assertSessionHasErrors('effective_date');
    }

    /**
     * 11. Historical Booking Protection: Past bookings are not modified or recalculated.
     */
    public function test_historical_bookings_are_protected_when_new_fare_is_created(): void
    {
        $passenger = \App\Models\Passenger::firstOrCreate(
            ['user_id' => $this->passengerUser->id],
            ['mobile_number' => '+63 900 000 0000', 'rating' => 5.00]
        );

        // Historical booking with initial fare
        $booking = Booking::create([
            'booking_code' => 'BK-TEST-HISTORICAL',
            'passenger_id' => $passenger->id,
            'pickup_name' => 'Start Point',
            'pickup_lat' => 14.07,
            'pickup_lng' => 120.63,
            'dropoff_name' => 'Destination',
            'dropoff_lat' => 14.08,
            'dropoff_lng' => 120.64,
            'passenger_count' => 1,
            'fare_per_passenger' => 50.00,
            'fare_amount' => 50.00,
            'distance_km' => 3.0,
            'estimated_duration_mins' => 10,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'status' => 'completed',
            'requested_at' => now()->subDays(5),
            'completed_at' => now()->subDays(5),
        ]);

        $this->assertEquals(50.00, $booking->fresh()->fare_amount);

        // Add a new fare with base fare ₱80.00
        $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare' => 80.00,
            'base_fare_per_passenger' => 40.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 8.00,
            'effective_date' => now()->toDateString(),
        ]);

        // Historical booking remains untouched at ₱50.00
        $this->assertEquals(50.00, $booking->fresh()->fare_amount);
        $this->assertEquals(50.00, $booking->fresh()->fare_per_passenger);
    }
}
