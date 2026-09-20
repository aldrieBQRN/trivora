<?php

namespace Tests\Feature\TMO;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TodaManagementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected User $driverUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::create([
            'name' => 'TMO Inspector',
            'email' => 'tmo.toda.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Driver Regular',
            'email' => 'driver.toda.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
    }

    public function test_tmo_can_view_toda_list(): void
    {
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.toda'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Toda/Index')
            ->has('todas')
            ->has('stats')
        );
    }

    public function test_driver_cannot_access_toda_management(): void
    {
        $response = $this->actingAs($this->driverUser)->get(route('tmo.toda'));

        $response->assertForbidden();
    }

    public function test_tmo_can_create_toda_with_terminal_coordinates(): void
    {
        $code = 'TODA-' . strtoupper(substr(uniqid(), 0, 5));

        $response = $this->actingAs($this->tmoUser)->post(route('tmo.toda.store'), [
            'name' => 'Wawa TODA Association',
            'code' => $code,
            'barangay' => 'Wawa',
            'terminal_name' => 'Wawa Bay Terminal',
            'address' => 'Wawa Port Access Road, Nasugbu',
            'latitude' => 14.0750,
            'longitude' => 120.6280,
            'president_name' => 'Mario Dela Cruz',
            'contact_number' => '09171234567',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('toda_zones', [
            'code' => $code,
            'terminal_name' => 'Wawa Bay Terminal',
            'latitude' => 14.0750,
            'longitude' => 120.6280,
            'president_name' => 'Mario Dela Cruz',
        ]);
    }

    public function test_tmo_can_create_toda_with_auto_generated_code(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.toda.store'), [
            'name' => 'TODA Natipuan ' . uniqid(),
            'barangay' => 'Natipuan',
            'terminal_name' => 'Natipuan Main Station',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('toda_zones', [
            'barangay' => 'Natipuan',
            'terminal_name' => 'Natipuan Main Station',
        ]);

        $created = TodaZone::where('barangay', 'Natipuan')->latest('id')->first();
        $this->assertNotNull($created);
        $this->assertMatchesRegularExpression('/^TODA-\d+$/', $created->code);
    }

    public function test_tmo_can_view_toda_details_with_assigned_tricycles(): void
    {
        $zone = TodaZone::create([
            'name' => 'Details Test TODA',
            'code' => 'TODA-' . strtoupper(substr(uniqid(), 0, 5)),
            'barangay' => 'Poblacion',
            'terminal_name' => 'Central Plaza Terminal',
            'latitude' => 14.0740,
            'longitude' => 120.6310,
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'toda_id' => $zone->id,
            'first_name' => 'Juan',
            'last_name' => 'Tamad',
            'contact_number' => '09170000099',
            'address' => 'Poblacion',
            'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TODA-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        Tricycle::create([
            'operator_id' => $operator->id,
            'toda_zone_id' => $zone->id,
            'plate_number' => 'TD-9999',
            'engine_number' => 'ENG-TD-999',
            'chassis_number' => 'CHS-TD-999',
            'make' => 'Kawasaki',
            'model' => 'Barako',
            'year_model' => 2022,
            'body_color' => 'Blue',
            'body_type' => 'Standard',
            'or_number' => 'OR-TD-999',
            'cr_number' => 'CR-TD-999',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.toda.show', $zone->id));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Toda/Details')
            ->has('toda')
            ->where('toda.id', $zone->id)
            ->has('assignedTricycles', 1)
        );
    }

    public function test_tmo_can_update_toda_coordinates_and_info(): void
    {
        $zone = TodaZone::create([
            'name' => 'Updatable TODA',
            'code' => 'TODA-' . strtoupper(substr(uniqid(), 0, 5)),
            'barangay' => 'Brgy. 1',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->tmoUser)->put(route('tmo.toda.update', $zone->id), [
            'name' => 'Updatable TODA Renamed',
            'code' => $zone->code,
            'barangay' => 'Brgy. 1 Updated',
            'terminal_name' => 'New Terminal Point',
            'address' => 'J.P. Laurel St., Nasugbu',
            'latitude' => 14.0722,
            'longitude' => 120.6333,
            'president_name' => 'Pedro Penduko',
            'contact_number' => '09181112233',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('toda_zones', [
            'id' => $zone->id,
            'name' => 'Updatable TODA Renamed',
            'terminal_name' => 'New Terminal Point',
            'latitude' => 14.0722,
            'longitude' => 120.6333,
        ]);
    }

    public function test_tmo_can_toggle_toda_status(): void
    {
        $zone = TodaZone::create([
            'name' => 'Toggleable TODA',
            'code' => 'TODA-' . strtoupper(substr(uniqid(), 0, 5)),
            'barangay' => 'Brgy. 2',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->tmoUser)->patch(route('tmo.toda.toggle-status', $zone->id));

        $response->assertRedirect();
        $this->assertDatabaseHas('toda_zones', [
            'id' => $zone->id,
            'is_active' => false,
        ]);

        // Toggle back
        $this->actingAs($this->tmoUser)->patch(route('tmo.toda.toggle-status', $zone->id));
        $this->assertDatabaseHas('toda_zones', [
            'id' => $zone->id,
            'is_active' => true,
        ]);
    }
}
