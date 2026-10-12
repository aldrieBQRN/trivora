<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\GpsDevice;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Exercises the record/replay harness (app/Console/Commands/GpsReplayCommand.php): a captured
 * packet log is decoded and ingested through the exact same path as the live ST-901L receiver,
 * giving end-to-end coverage of the IoT chain without physical hardware. Fixture files live in
 * tests/Fixtures/sinotrack/.
 */
class GpsReplayHarnessTest extends TestCase
{
    use DatabaseTransactions;

    private const DEVICE_ID = '2020916012';

    protected Tricycle $tricycle;

    protected function setUp(): void
    {
        parent::setUp();


        $user = User::create([
            'name' => 'Replay Driver', 'email' => 'replay.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id' => $user->id, 'first_name' => 'Replay', 'last_name' => 'Driver',
            'contact_number' => '09170000123', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-REPLAY-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $suffix = uniqid();
        $this->tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'coding_scheme_number' => '0004',
            'plate_number' => 'RPL-' . substr($suffix, -6), 'engine_number' => "ENG-{$suffix}", 'chassis_number' => "CHS-{$suffix}",
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => "OR-{$suffix}", 'cr_number' => "CR-{$suffix}", 'status' => 'active',
            'active_tracking_mode' => 'iot_device',
        ]);

        Driver::create([
            'user_id' => $user->id, 'operator_id' => $operator->id, 'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-REPLAY-D-' . $suffix, 'mobile_number' => '09170000123',
        ]);

        // The tracker the fixture streams report as — paired exactly as TMO Final Confirmation does.
        GpsDevice::create([
            'device_identifier' => self::DEVICE_ID,
            'imei'              => '35800002020916012',
            'tricycle_id'       => $this->tricycle->id,
            'status'            => 'paired',
        ]);
    }

    private function fixture(string $name): string
    {
        return base_path('tests' . DIRECTORY_SEPARATOR . 'Fixtures' . DIRECTORY_SEPARATOR . 'sinotrack' . DIRECTORY_SEPARATOR . $name);
    }

    #[Test]
    public function it_replays_a_captured_stream_and_records_only_valid_paired_fixes(): void
    {
        $exit = Artisan::call('gps:replay', ['file' => $this->fixture('vendor_examples.gpslog')]);
        $output = Artisan::output();

        $this->assertSame(0, $exit);

        // The four valid frames (ASCII V1, ASCII V4, binary '$', binary X-mode) each become a ping;
        // the invalid 'V' fix and the unpaired tracker's packet are surfaced but never stored.
        $this->assertSame(4, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
        $this->assertSame(
            0,
            TricycleLocation::where('tricycle_id', $this->tricycle->id)->where('source', '!=', 'gps_device')->count(),
            'every replayed IoT ping must be stamped gps_device'
        );

        $this->assertStringContainsString('RECORDED', $output);
        $this->assertStringContainsString('NO_FIX', $output);
        $this->assertStringContainsString('UNKNOWN_DEVICE', $output);

        // A packet (even one without a stored fix) still proves the tracker is online.
        $this->assertNotNull(GpsDevice::where('device_identifier', self::DEVICE_ID)->value('last_seen_at'));
    }

    #[Test]
    public function it_reassembles_frames_split_across_reads_before_ingesting_them(): void
    {
        $exit = Artisan::call('gps:replay', ['file' => $this->fixture('split_binary.gpslog')]);

        $this->assertSame(0, $exit);

        // ASCII V1 + the reassembled '$' record + the X-mode record = 3 rows. If extractFrames() did
        // not hold the partial binary buffer, the fragmented '$' record would be lost and this fails.
        $this->assertSame(3, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
    }

    #[Test]
    public function a_dry_run_decodes_frames_without_writing_anything(): void
    {
        $exit = Artisan::call('gps:replay', [
            'file' => $this->fixture('vendor_examples.gpslog'),
            '--dry-run' => true,
        ]);
        $output = Artisan::output();

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('DECODED', $output);
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $this->tricycle->id)->count());
    }
}
