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
    protected $signature = 'gps:listen {--port= : TCP port to listen on (overrides config(tracking.iot_listen_port))}';

    protected $description = 'Run the SinoTrack ST-901L TCP receiver and ingest tracker positions.';

    /** Connections silent for longer than this are dropped (the tracker simply reconnects). */
    private const IDLE_TIMEOUT_SECONDS = 600;

    /** @var array<int, array{socket: resource, peer: string, buffer: string, device_id: ?string, last_activity: int}> */
    private array $clients = [];

    private string $logFile;

    public function handle(SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): int
    {
        $port = (int) ($this->option('port') ?: config('tracking.iot_listen_port', 9001));

        $server = @stream_socket_server("tcp://0.0.0.0:{$port}", $errno, $errstr);

        if ($server === false) {
            $this->error("Could not bind to port {$port}: [{$errno}] {$errstr}");
            return self::FAILURE;
        }

        stream_set_blocking($server, false);
        $this->logFile = storage_path('logs/gps-listen-' . date('Y-m-d') . '.log');

        $this->info("SinoTrack receiver listening on 0.0.0.0:{$port}");
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

        stream_set_blocking($socket, false);
        $this->clients[(int) $socket] = [
            'socket'        => $socket,
            'peer'          => $peer ?: 'unknown',
            'buffer'        => '',
            'device_id'     => null,
            'last_activity' => time(),
        ];

        $this->log("CONNECT {$peer}");
    }

    private function receive($socket, SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): void
    {
        $key = (int) $socket;
        $client = &$this->clients[$key];
        $data = @fread($socket, 8192);

        if ($data === false || ($data === '' && feof($socket))) {
            $this->close($key, 'disconnected');
            return;
        }

        if ($data === '') {
            return;
        }

        $client['last_activity'] = time();
        $client['buffer'] .= $data;
        $this->log(sprintf('RAW %s (%d bytes): %s', $client['peer'], strlen($data), $this->printable($data)));

        foreach ($protocol->extractFrames($client['buffer']) as $frame) {
            // Remember the ID so binary X-mode records (which omit it) can still be attributed.
            if ($frame['device_id']) {
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
        }
    }

    private function dropIdleClients(): void
    {
        foreach ($this->clients as $key => $client) {
            if (time() - $client['last_activity'] > self::IDLE_TIMEOUT_SECONDS) {
                $this->close($key, 'idle timeout');
            }
        }
    }

    private function close(int $key, string $reason): void
    {
        $client = $this->clients[$key];
        @fclose($client['socket']);
        unset($this->clients[$key]);

        $this->log("CLOSE {$client['peer']} ({$reason})");
    }

    private function log(string $message): void
    {
        $line = '[' . now()->toDateTimeString() . '] ' . $message;
        $this->line($line);
        @file_put_contents($this->logFile, $line . "\n", FILE_APPEND);
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
