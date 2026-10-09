<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\GpsDevice;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Services\GpsDeviceIngestService;
use App\Services\SinoTrackProtocol;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Packets below are the literal examples from the vendor's SinoTrack protocol document.
 */
class SinoTrackIngestTest extends TestCase
{
    use DatabaseTransactions;

    private const V1 = '*TH,2020916012,V1,050316,A,2212.8745,N,11346.6574,E,14.28,028,220902,FFFFFBFF#';

    private SinoTrackProtocol $protocol;

    protected function setUp(): void
    {
        parent::setUp();
        $this->protocol = new SinoTrackProtocol();
    }

    #[Test]
    public function it_decodes_an_ascii_v1_position_packet(): void
    {
        $frame = $this->protocol->parseAscii(self::V1);

        $this->assertSame('2020916012', $frame['device_id']);
        $this->assertSame('V1', $frame['type']);
        $this->assertTrue($frame['valid']);
        $this->assertEqualsWithDelta(22.2145750, $frame['latitude'], 0.0000001);
        $this->assertEqualsWithDelta(113.7776233, $frame['longitude'], 0.0000001);
        $this->assertEqualsWithDelta(26.45, $frame['speed_kmh'], 0.01); // 14.28 knots
        $this->assertSame(28, $frame['heading_deg']);
        // 05:03:16 UTC on 22 Sep 2002 -> 13:03:16 Asia/Manila
        $this->assertSame('2002-09-22 13:03:16', $frame['recorded_at']->toDateTimeString());
    }

    #[Test]
    public function it_finds_the_position_block_in_v4_confirmations_with_extra_parameters(): void
    {
        $frame = $this->protocol->parseAscii('*TH,2020916012,V4,S14,100,10,1,3,130305,050316,A,2212.8745,N,11346.6574,E,14.28,028,220902,FFFFFBFF#');

        $this->assertSame('V4', $frame['type']);
        $this->assertTrue($frame['has_position']);
        $this->assertSame('2002-09-22 13:03:16', $frame['recorded_at']->toDateTimeString());
    }

    #[Test]
    public function it_decodes_a_binary_standard_record(): void
    {
        $raw = hex2bin('24' . '1030731001' . '050316' . '220902' . '22128745' . '00' . '113466574E' . '014028' . 'FFFFFBFF' . 'FF' . '00' . '01');

        $frame = $this->protocol->parseBinary($raw);

        $this->assertSame('1030731001', $frame['device_id']);
        $this->assertTrue($frame['valid']);
        $this->assertEqualsWithDelta(22.2145750, $frame['latitude'], 0.0000001);
        $this->assertEqualsWithDelta(113.7776233, $frame['longitude'], 0.0000001);
        $this->assertSame(28, $frame['heading_deg']);
    }

    #[Test]
    public function it_reassembles_frames_split_and_merged_across_tcp_reads(): void
    {
        $buffer = substr(self::V1, 0, 30);
        $this->assertSame([], $this->protocol->extractFrames($buffer));

        $buffer .= substr(self::V1, 30) . "\r\n" . self::V1;
        $frames = $this->protocol->extractFrames($buffer);

        $this->assertCount(2, $frames);
        $this->assertSame('', $buffer);
    }

    #[Test]
    public function a_paired_tracker_fix_is_recorded_for_its_tricycle(): void
    {
        [$tricycle, $driver] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => 'TRK-TEST-1',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $frame = $this->protocol->parseAscii(str_replace('220902', now('UTC')->format('dmy'), self::V1));
        $result = app(GpsDeviceIngestService::class)->ingest($frame);

        $this->assertSame('recorded', $result['outcome'], $result['message']);
        $location = TricycleLocation::where('tricycle_id', $tricycle->id)->latest('id')->first();
        $this->assertSame('gps_device', $location->source);
        $this->assertEqualsWithDelta(22.214575, (float) $location->latitude, 0.000001);
        $this->assertNotNull(GpsDevice::where('device_identifier', 'TRK-TEST-1')->value('last_seen_at'));
        $this->assertEqualsWithDelta(22.214575, $driver->fresh()->current_lat, 0.000001);
    }

    #[Test]
    public function unknown_and_no_fix_packets_are_not_recorded(): void
    {
        $ingest = app(GpsDeviceIngestService::class);

        $this->assertSame('unknown_device', $ingest->ingest($this->protocol->parseAscii(str_replace('2020916012', '9999999999', self::V1)))['outcome']);

        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create(['device_identifier' => '2020916012', 'tricycle_id' => $tricycle->id, 'status' => 'paired']);

        $noFix = $this->protocol->parseAscii(str_replace(',A,', ',V,', self::V1));
        $this->assertSame('no_fix', $ingest->ingest($noFix)['outcome']);
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $tricycle->id)->count());
    }

    /**
     * @return array{0: Tricycle, 1: Driver}
     */
    private function makeTricycleWithDriver(): array
    {
        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-SINOTRACK-TEST'],
            ['name' => 'SinoTrack Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );
        $user = User::create([
            'name' => 'SinoTrack Driver', 'email' => 'sinotrack.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);
        $operator = Operator::create([
            'user_id' => $user->id, 'toda_id' => $toda->id,
            'first_name' => 'Sino', 'last_name' => 'Track',
            'contact_number' => '09170000099', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SINO-' . uniqid(), 'license_expiry_date' => '2028-01-01',
        ]);
        $suffix = uniqid();
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'coding_scheme_number' => '0003',
            'plate_number' => 'SNO-' . substr($suffix, -6), 'engine_number' => "ENG-{$suffix}", 'chassis_number' => "CHS-{$suffix}",
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => "OR-{$suffix}", 'cr_number' => "CR-{$suffix}", 'status' => 'active',
            'active_tracking_mode' => 'iot_device',
        ]);
        $driver = Driver::create([
            'user_id' => $user->id, 'operator_id' => $operator->id, 'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-SINO-D-' . $suffix, 'mobile_number' => '09170000099',
        ]);

        return [$tricycle, $driver];
    }
}
