<?php

namespace Tests\Feature;

use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers app/Console/Commands/SimulateTelematics.php: simulated pings must be recorded with the
 * real TricycleLocation.source column (matching the unit's active tracking mode), not a
 * non-existent tracking_source attribute that mass assignment silently drops.
 */
class SimulateTelematicsSourceTest extends TestCase
{
    use DatabaseTransactions;

    protected Tricycle $tricycle;

    protected function setUp(): void
    {
        parent::setUp();


        $operator = Operator::create([
            'first_name' => 'Sim', 'last_name' => 'Tester',
            'contact_number' => '09170000063', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SIM-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'plate_number' => 'SIM-0001', 'engine_number' => 'ENG-SIM-001', 'chassis_number' => 'CHS-SIM-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2022, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-SIM-001', 'cr_number' => 'CR-SIM-001', 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);
    }

    #[Test]
    public function simulated_pings_store_the_source_column_from_the_active_tracking_mode(): void
    {
        Artisan::call('telematics:simulate', ['--count' => 1, '--interval' => 0]);

        $ping = TricycleLocation::where('tricycle_id', $this->tricycle->id)
            ->latest('recorded_at')->first();

        $this->assertNotNull($ping, 'simulation should record a ping for the active unit');
        $this->assertSame('mobile_app', $ping->source);
    }

    #[Test]
    public function an_iot_device_mode_unit_is_simulated_with_the_gps_device_source(): void
    {
        // active_tracking_mode='iot_device' is NOT itself a valid tricycle_locations.source value;
        // the simulator must map it onto the real 'gps_device' enum member rather than writing the
        // mode verbatim (which would blank/fail the column).
        $iotTricycle = Tricycle::create([
            'operator_id' => $this->tricycle->operator_id, 'plate_number' => 'SIM-0002', 'engine_number' => 'ENG-SIM-002', 'chassis_number' => 'CHS-SIM-002',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2022, 'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-SIM-002', 'cr_number' => 'CR-SIM-002', 'status' => 'active',
            'active_tracking_mode' => 'iot_device',
        ]);

        Artisan::call('telematics:simulate', ['--count' => 1, '--interval' => 0]);

        $ping = TricycleLocation::where('tricycle_id', $iotTricycle->id)
            ->latest('recorded_at')->first();

        $this->assertNotNull($ping, 'simulation should record a ping for the iot-mode unit');
        $this->assertSame('gps_device', $ping->source);
    }
}