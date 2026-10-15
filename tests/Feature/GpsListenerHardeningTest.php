<?php

namespace Tests\Feature;

use App\Console\Commands\GpsListenCommand;
use App\Models\Driver;
use App\Models\GpsDevice;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Services\GpsDeviceIngestService;
use App\Services\SinoTrackProtocol;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GpsListenerHardeningTest extends TestCase
{
    use DatabaseTransactions;

    private SinoTrackProtocol $protocol;
    private GpsDeviceIngestService $ingest;
    private GpsListenCommand $command;

    protected function setUp(): void
    {
        parent::setUp();
        $this->protocol = new SinoTrackProtocol();
        $this->ingest = app(GpsDeviceIngestService::class);
        $this->command = new GpsListenCommand();
        $this->command->maxConnections = 3;
        $this->command->idleTimeoutSeconds = 60;
        $this->command->maxBufferBytes = 1024; // 1 KB for test
        $this->command->maxMalformedFrames = 3;
    }

    #[Test]
    public function connection_limit_rejects_excess_connections(): void
    {
        $this->command->maxConnections = 2;

        // Connect client 1 and 2
        $this->assertTrue($this->command->acceptConnection(fopen('php://memory', 'r+'), '192.168.1.101:5001'));
        $this->assertTrue($this->command->acceptConnection(fopen('php://memory', 'r+'), '192.168.1.102:5002'));
        $this->assertCount(2, $this->command->clients);

        // 3rd client exceeds max connections of 2
        $rejectedSocket = fopen('php://memory', 'r+');
        $accepted = $this->command->acceptConnection($rejectedSocket, '192.168.1.103:5003');

        $this->assertFalse($accepted);
        $this->assertCount(2, $this->command->clients);
    }

    #[Test]
    public function oversized_buffer_disconnects_client(): void
    {
        $socket = fopen('php://memory', 'r+');
        $this->command->acceptConnection($socket, '192.168.1.105:5005');
        $key = array_key_first($this->command->clients);

        // Send a chunk that exceeds the 1024 byte buffer limit
        $oversizedData = str_repeat('X', 1025);
        $this->command->processClientData($key, $oversizedData, $this->protocol, $this->ingest);

        // The client must be disconnected and removed
        $this->assertArrayNotHasKey($key, $this->command->clients);
    }

    #[Test]
    public function persistent_malformed_data_disconnects_client(): void
    {
        $socket = fopen('php://memory', 'r+');
        $this->command->acceptConnection($socket, '192.168.1.106:5006');
        $key = array_key_first($this->command->clients);

        $junk = str_repeat('GARBAGE_PAYLOAD_NOT_GPS_', 4); // > 64 bytes of non-marker noise

        // Send malformed data up to threshold (3 times)
        $this->command->processClientData($key, $junk, $this->protocol, $this->ingest);
        $this->assertArrayHasKey($key, $this->command->clients);

        $this->command->processClientData($key, $junk, $this->protocol, $this->ingest);
        $this->assertArrayHasKey($key, $this->command->clients);

        // 3rd consecutive junk frame reaches maxMalformedFrames and disconnects
        $this->command->processClientData($key, $junk, $this->protocol, $this->ingest);
        $this->assertArrayNotHasKey($key, $this->command->clients);
    }

    #[Test]
    public function idle_clients_are_dropped_after_timeout(): void
    {
        $socket1 = fopen('php://memory', 'r+');
        $socket2 = fopen('php://memory', 'r+');

        $this->command->acceptConnection($socket1, '192.168.1.107:5007');
        $this->command->acceptConnection($socket2, '192.168.1.108:5008');

        $keys = array_keys($this->command->clients);
        $keyActive = $keys[0];
        $keyIdle = $keys[1];

        // Simulate client 1 active now, client 2 inactive 100 seconds ago
        $this->command->clients[$keyActive]['last_activity'] = time();
        $this->command->clients[$keyIdle]['last_activity'] = time() - 100;

        $dropped = $this->command->dropIdleClients(time());

        $this->assertSame(1, $dropped);
        $this->assertArrayHasKey($keyActive, $this->command->clients);
        $this->assertArrayNotHasKey($keyIdle, $this->command->clients);
    }

    #[Test]
    public function ingest_rejects_invalid_coordinates(): void
    {
        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => '2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $invalidLat = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 95.12345, // invalid > 90
            'longitude'    => 120.6322,
            'speed_kmh'    => 20.0,
            'heading_deg'  => 0,
            'recorded_at'  => now(),
        ];

        $res = $this->ingest->ingest($invalidLat);
        $this->assertSame('invalid_coordinates', $res['outcome']);

        $invalidLng = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.0725,
            'longitude'    => 200.0, // invalid > 180
            'speed_kmh'    => 20.0,
            'heading_deg'  => 0,
            'recorded_at'  => now(),
        ];

        $res = $this->ingest->ingest($invalidLng);
        $this->assertSame('invalid_coordinates', $res['outcome']);
    }

    #[Test]
    public function ingest_rejects_impossible_speed(): void
    {
        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => '2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $impossibleSpeed = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.0725,
            'longitude'    => 120.6322,
            'speed_kmh'    => 350.0, // 350 km/h is impossible for a tricycle
            'heading_deg'  => 0,
            'recorded_at'  => now(),
        ];

        $res = $this->ingest->ingest($impossibleSpeed);
        $this->assertSame('impossible_speed', $res['outcome']);
    }

    #[Test]
    public function ingest_rejects_impossible_movement_jump(): void
    {
        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => '2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $firstPingTime = Carbon::now()->subSeconds(30);

        // Seed an initial location at Nasugbu Poblacion (14.0725, 120.6322)
        TricycleLocation::create([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0725,
            'longitude'   => 120.6322,
            'speed_kmh'   => 20,
            'heading_deg' => 0,
            'source'      => 'gps_device',
            'recorded_at' => $firstPingTime,
        ]);

        // Second ping 10 seconds later, but located 50 km away in Tagaytay (14.1153, 120.9621)
        // 50 km in 10 seconds = 18,000 km/h (impossible teleportation)
        $teleportPing = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.1153,
            'longitude'    => 120.9621,
            'speed_kmh'    => 30,
            'heading_deg'  => 0,
            'recorded_at'  => $firstPingTime->copy()->addSeconds(10),
        ];

        $res = $this->ingest->ingest($teleportPing);
        $this->assertSame('impossible_movement', $res['outcome']);
    }

    #[Test]
    public function ingest_rejects_stale_timestamps(): void
    {
        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => '2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $stalePing = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.0725,
            'longitude'    => 120.6322,
            'speed_kmh'    => 20,
            'heading_deg'  => 0,
            'recorded_at'  => now()->subDays(10), // older than 7 days
        ];

        $res = $this->ingest->ingest($stalePing);
        $this->assertSame('stale_timestamp', $res['outcome']);
    }

    #[Test]
    public function short_arbitrary_ids_do_not_match_registered_devices(): void
    {
        [$tricycle] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => 'TRK-2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        // Attempting to match with a single character "2" or short string "012" must fail
        $shortPing = [
            'device_id'    => '012', // too short for suffix match
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.0725,
            'longitude'    => 120.6322,
            'speed_kmh'    => 20,
            'heading_deg'  => 0,
            'recorded_at'  => now(),
        ];

        $res = $this->ingest->ingest($shortPing);
        $this->assertSame('unknown_device', $res['outcome']);
    }

    #[Test]
    public function legitimate_packet_is_ingested_and_updates_live_state(): void
    {
        [$tricycle, $driver] = $this->makeTricycleWithDriver();
        GpsDevice::create([
            'device_identifier' => '2020916012',
            'imei'              => '35800002020916012',
            'tricycle_id'       => $tricycle->id,
            'status'            => 'paired',
        ]);

        $legitPing = [
            'device_id'    => '2020916012',
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => true,
            'latitude'     => 14.0725,
            'longitude'    => 120.6322,
            'speed_kmh'    => 25.0,
            'heading_deg'  => 90,
            'recorded_at'  => now(),
        ];

        $res = $this->ingest->ingest($legitPing);
        $this->assertSame('recorded', $res['outcome']);

        $driver->refresh();
        $this->assertEqualsWithDelta(14.0725, (float) $driver->current_lat, 0.0001);
        $this->assertEqualsWithDelta(120.6322, (float) $driver->current_lng, 0.0001);
    }

    private function makeTricycleWithDriver(): array
    {
        $user = User::create([
            'name'      => 'Hardening Driver',
            'email'     => 'hdriver.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $user->id,
            'first_name'          => 'Hardening',
            'last_name'           => 'Operator',
            'contact_number'      => '09170000088',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'LIC-HD-' . uniqid(),
            'license_expiry_date' => '2028-01-01',
        ]);

        $suffix = uniqid();
        $tricycle = Tricycle::create([
            'operator_id'          => $operator->id,
            'coding_scheme_number' => '0005',
            'plate_number'         => 'HD-' . substr($suffix, -6),
            'engine_number'        => "ENG-HD-{$suffix}",
            'chassis_number'       => "CHS-HD-{$suffix}",
            'make'                 => 'Honda',
            'model'                => 'TMX',
            'year_model'           => 2022,
            'body_color'           => 'Red',
            'body_type'            => 'Standard',
            'status'               => 'active',
            'active_tracking_mode' => 'iot_device',
        ]);

        $driver = Driver::create([
            'user_id'        => $user->id,
            'operator_id'    => $operator->id,
            'tricycle_id'    => $tricycle->id,
            'license_number' => 'LIC-HDD-' . $suffix,
            'mobile_number'  => '09170000088',
        ]);

        return [$tricycle, $driver];
    }
}
