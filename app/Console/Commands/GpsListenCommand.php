<?php

namespace App\Console\Commands;

use App\Services\GpsDeviceIngestService;
use App\Services\SinoTrackProtocol;
use Illuminate\Console\Command;

/**
 * Production IoT receiver for SinoTrack ST-901L trackers. Each tracker holds a persistent TCP
 * connection (set on the device by SMS "804<password> <ip> <port>") and streams V1 position
 * packets; this server decodes them with SinoTrackProtocol and hands them to
 * GpsDeviceIngestService -> TelemetryService, the same pipeline the driver app uses.
 *
 * Supersedes the raw-byte `gps:capture` dev tool now that the vendor protocol is documented.
 */
class GpsListenCommand extends Command
{
    protected $signature = 'gps:listen {--port= : TCP port to listen on} {--max-connections= : Max simultaneous TCP connections}';

    protected $description = 'Run the SinoTrack ST-901L TCP receiver and ingest tracker positions.';

    public const DEFAULT_IDLE_TIMEOUT_SECONDS = 180;
    public const DEFAULT_MAX_CONNECTIONS = 100;
    public const DEFAULT_MAX_BUFFER_BYTES = 4096; // 4 KB
    public const DEFAULT_MAX_MALFORMED_FRAMES = 5;

    public int $maxConnections;
    public int $idleTimeoutSeconds;
    public int $maxBufferBytes;
    public int $maxMalformedFrames;

    /** @var array<int, array{socket: mixed, peer: string, buffer: string, device_id: ?string, malformed_count: int, last_activity: int}> */
    public array $clients = [];

    private string $logFile;

    public function handle(SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): int
    {
        $port = (int) ($this->option('port') ?: config('tracking.iot_listen_port', 9001));
        $this->maxConnections = (int) ($this->option('max-connections') ?: config('tracking.iot_max_connections', self::DEFAULT_MAX_CONNECTIONS));
        $this->idleTimeoutSeconds = (int) config('tracking.iot_idle_timeout_seconds', self::DEFAULT_IDLE_TIMEOUT_SECONDS);
        $this->maxBufferBytes = (int) config('tracking.iot_client_buffer_limit_bytes', self::DEFAULT_MAX_BUFFER_BYTES);
        $this->maxMalformedFrames = (int) config('tracking.iot_max_malformed_packets', self::DEFAULT_MAX_MALFORMED_FRAMES);

        $server = @stream_socket_server("tcp://0.0.0.0:{$port}", $errno, $errstr);

        if ($server === false) {
            $this->error("Could not bind to port {$port}: [{$errno}] {$errstr}");
            return self::FAILURE;
        }

        stream_set_blocking($server, false);
        $this->logFile = storage_path('logs/gps-listen-' . date('Y-m-d') . '.log');

        $this->info("SinoTrack receiver listening on 0.0.0.0:{$port} (Max conns: {$this->maxConnections}, Idle timeout: {$this->idleTimeoutSeconds}s, Buffer cap: {$this->maxBufferBytes}B)");
        $this->line("Log: {$this->logFile}");
        $this->line('Press Ctrl+C to stop.');

        while (true) {
            $read = array_merge([$server], array_column($this->clients, 'socket'));
            $write = $except = null;

            if (@stream_select($read, $write, $except, 30) === false) {
                continue;
            }

            foreach ($read as $socket) {
                if ($socket === $server) {
                    $this->accept($server);
                    continue;
                }

                $this->receive($socket, $protocol, $ingest);
            }

            $this->dropIdleClients();
        }
    }

    private function accept($server): void
    {
        $socket = @stream_socket_accept($server, 0, $peer);

        if ($socket === false) {
            return;
        }

        $this->acceptConnection($socket, $peer ?: 'unknown');
    }

    /**
     * Accepts and registers a new TCP connection, or rejects it if maximum connection limit is reached.
     */
    public function acceptConnection($socket, string $peer = 'unknown'): bool
    {
        if (count($this->clients) >= ($this->maxConnections ?? self::DEFAULT_MAX_CONNECTIONS)) {
            $this->log(sprintf('REJECT %s (max connections limit %d reached)', $peer, $this->maxConnections ?? self::DEFAULT_MAX_CONNECTIONS));
            if (is_resource($socket)) {
                @fclose($socket);
            }
            return false;
        }

        if (is_resource($socket)) {
            stream_set_blocking($socket, false);
        }

        $key = is_resource($socket) ? (int) $socket : rand(1000, 99999);
        $this->clients[$key] = [
            'socket'          => $socket,
            'peer'            => $peer,
            'buffer'          => '',
            'device_id'       => null,
            'malformed_count' => 0,
            'last_activity'   => time(),
        ];

        $this->log("CONNECT {$peer}");
        return true;
    }

    private function receive($socket, SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): void
    {
        $key = (int) $socket;
        $data = @fread($socket, 4096);

        if ($data === false || ($data === '' && feof($socket))) {
            $this->close($key, 'disconnected');
            return;
        }

        if ($data === '') {
            return;
        }

        $this->processClientData($key, $data, $protocol, $ingest);
    }

    /**
     * Processes inbound TCP chunk for a client: enforces buffer size limits, malformed packet limits,
     * extracts valid protocol frames, and routes to ingestion.
     *
     * @return array<int, array{outcome: string, message: string}>
     */
    public function processClientData(int $key, string $data, SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): array
    {
        if (!isset($this->clients[$key])) {
            return [];
        }

        $client = &$this->clients[$key];
        $maxBuffer = $this->maxBufferBytes ?? self::DEFAULT_MAX_BUFFER_BYTES;

        // Enforce per-client buffer limits to prevent unbounded memory growth
        if (strlen($client['buffer']) + strlen($data) > $maxBuffer) {
            $this->close($key, sprintf('buffer limit exceeded (%d bytes > %d limit)', strlen($client['buffer']) + strlen($data), $maxBuffer));
            return [];
        }

        $client['last_activity'] = time();
        $client['buffer'] .= $data;
        $this->log(sprintf('RAW %s (%d bytes): %s', $client['peer'], strlen($data), $this->printable($data)));

        $frames = $protocol->extractFrames($client['buffer']);
        $maxMalformed = $this->maxMalformedFrames ?? self::DEFAULT_MAX_MALFORMED_FRAMES;

        // If data was sent but no valid frame could be extracted (noise, corrupt payload, or scanner probe)
        if (empty($frames)) {
            $client['malformed_count']++;
            if ($client['malformed_count'] >= $maxMalformed) {
                $this->close($key, sprintf('excessive malformed/unrecognized packets (%d consecutive)', $client['malformed_count']));
                return [];
            }
        } else {
            $client['malformed_count'] = 0;
        }

        $results = [];
        foreach ($frames as $frame) {
            // Remember the ID so binary X-mode records (which omit it) can still be attributed.
            if (!empty($frame['device_id'])) {
                $client['device_id'] = $frame['device_id'];
            } else {
                $frame['device_id'] = $client['device_id'];
            }

            try {
                $result = $ingest->ingest($frame);
            } catch (\Throwable $e) {
                $result = ['outcome' => 'error', 'message' => $e->getMessage()];
            }

            $this->log(sprintf('%s [%s %s] %s', strtoupper($result['outcome']), $frame['device_id'] ?? '?', $frame['type'], $result['message']));
            $results[] = $result;
        }

        return $results;
    }

    public function dropIdleClients(?int $now = null): int
    {
        $now = $now ?? time();
        $timeout = $this->idleTimeoutSeconds ?? self::DEFAULT_IDLE_TIMEOUT_SECONDS;
        $dropped = 0;

        foreach ($this->clients as $key => $client) {
            if ($now - $client['last_activity'] > $timeout) {
                $this->close($key, sprintf('idle timeout (> %ds silent)', $timeout));
                $dropped++;
            }
        }

        return $dropped;
    }

    public function close(int $key, string $reason): void
    {
        if (!isset($this->clients[$key])) {
            return;
        }

        $client = $this->clients[$key];
        if (is_resource($client['socket'])) {
            @fclose($client['socket']);
        }
        unset($this->clients[$key]);

        $this->log("CLOSE {$client['peer']} ({$reason})");
    }

    private function log(string $message): void
    {
        $line = '[' . now()->toDateTimeString() . '] ' . $message;
        if ($this->output) {
            $this->line($line);
        }
        if (!empty($this->logFile)) {
            @file_put_contents($this->logFile, $line . "\n", FILE_APPEND);
        }
    }

    /**
     * ASCII packets print as-is; binary records (or any control bytes) print as hex.
     */
    private function printable(string $data): string
    {
        $trimmed = trim($data);

        return preg_match('/^[\x20-\x7E]*$/', $trimmed)
            ? $trimmed
            : 'HEX ' . strtoupper(bin2hex($data));
    }
}
