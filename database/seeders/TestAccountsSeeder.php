<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Dedicated development/testing accounts for manually exercising the real (non-simulated)
 * booking flow end to end: a Passenger and a Driver that can both authenticate through the
 * real login APIs and are eligible to transact with each other — same TODA zone, driver
 * online + available + linked to a real tricycle/operator record.
 *
 * Safe to re-run: every record is created via updateOrCreate keyed on a unique column
 * (email / user_id / license_number / plate_number), so running this seeder again just
 * refreshes the same accounts instead of duplicating them.
 *
 * Not wired into DatabaseSeeder::run() on purpose, so it never runs as a side effect of a
 * normal `db:seed` — invoke it explicitly:
 *   php artisan db:seed --class=Database\\Seeders\\TestAccountsSeeder
 */
class TestAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure TODA zones and system web users (TMO, BPLO, Driver) exist first
        $this->call(TodaZonesSeeder::class);
        $this->call(UsersSeeder::class);

        $zone = TodaZone::where('code', 'TODA-BRGY10')->first() ?? TodaZone::first();

        if (! $zone) {
            $this->command->error('TestAccountsSeeder: no TODA zone available even after TodaZonesSeeder ran — aborting.');
            return;
        }

        // ---------------------------------------------------------------------
        // 1. Passenger test account
        // ---------------------------------------------------------------------
        $passengerUser = User::updateOrCreate(
            ['email' => 'passenger.test@trivora.test'],
            [
                'name' => 'Test Passenger',
                'password' => Hash::make('TestPassenger123!'),
                'role' => 'passenger',
                'is_active' => true,
            ]
        );

        Passenger::updateOrCreate(
            ['user_id' => $passengerUser->id],
            [
                'mobile_number' => '+63 900 111 2222',
                'rating' => 5.00,
                'total_rides' => 0,
            ]
        );

        // ---------------------------------------------------------------------
        // 2. Driver test account (User + Operator + Tricycle + Driver, same TODA zone)
        // ---------------------------------------------------------------------
        $driverUser = User::updateOrCreate(
            ['email' => 'driver.test@trivora.test'],
            [
                'name' => 'Test Driver',
                'password' => Hash::make('TestDriver123!'),
                'role' => 'tricycle_driver',
                'is_active' => true,
            ]
        );

        $operator = Operator::updateOrCreate(
            ['license_number' => 'TEST-DRV-000001'],
            [
                'user_id' => $driverUser->id,
                'toda_id' => $zone->id,
                'first_name' => 'Test',
                'last_name' => 'Driver',
                'contact_number' => '09170001111',
                'address' => 'Test Address, Barangay 10, Nasugbu',
                'barangay' => 'Barangay 10',
                'date_of_birth' => '1990-01-01',
                'license_expiry_date' => now()->addYears(3)->toDateString(),
                'license_restriction_code' => '1,2',
            ]
        );

        $tricycle = Tricycle::updateOrCreate(
            ['plate_number' => 'TEST-0001'],
            [
                'operator_id' => $operator->id,
                'toda_zone_id' => $zone->id,
                'engine_number' => 'TEST-ENG-0001',
                'chassis_number' => 'TEST-CHS-0001',
                'make' => 'Honda',
                'model' => 'TMX 125',
                'year_model' => (int) now()->format('Y'),
                'body_color' => 'White',
                'body_type' => 'Standard',
                'status' => 'active',
                'tracking_capability' => 'mobile_only',
                'active_tracking_mode' => 'mobile_app',
            ]
        );

        // Forced online/available on every run so the account always starts from a known-good
        // state for manual testing, even if a previous test session left it offline/busy.
        // current_lat/lng seeded at the TODA Brgy. 10 zone's own pickup reference point (matching
        // MobileAppDataSeeder's convention for that zone) so it's immediately within coverage of
        // pickups there.
        Driver::updateOrCreate(
            ['user_id' => $driverUser->id],
            [
                'operator_id' => $operator->id,
                'tricycle_id' => $tricycle->id,
                'license_number' => 'TEST-DRV-000001',
                'mobile_number' => '09170001111',
                'is_online' => true,
                'is_available' => true,
                'current_lat' => 14.0725,
                'current_lng' => 120.6322,
                'last_location_updated_at' => now(),
                'rating' => 5.00,
                'total_trips' => 0,
                'today_earnings' => 0,
            ]
        );

        $this->command->info('✔ Test accounts ready — passenger.test@trivora.test / driver.test@trivora.test (TODA Brgy. 10, driver online & available).');
    }
}
