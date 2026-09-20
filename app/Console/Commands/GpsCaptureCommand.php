<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * TEMPORARY DEVELOPMENT TOOL — captures raw TCP bytes from a physical GPS tracker (SinoTrack
 * ST-901L) so the real wire protocol can be inspected before a parser is written, per the GPS/IoT
 * integration plan's explicit instruction not to guess the ST-901L packet format.
 *
 * Deliberately does nothing else: no parsing, no framing assumptions, no TricycleLocation writes,
 * no TelemetryService/ColorCodingRuleService calls, no gps_devices lookups, no violation logic.
 * This must never be confused with the eventual production IoT receiver — it exists solely to
 * answer "what does the device actually send."
 */
class GpsCaptureCommand extends Command
{
    protected $signature = 'gps:capture {--port= : TCP port to listen on (overrides config(gps_capture.port))}';

    protected $description = 'DEV ONLY: listen on a raw TCP port and print exactly what a connecting device sends, for ST-901L protocol capture.';

    public function handle(): void
    {
        $port = (int) ($this->option('port') ?: config('gps_capture.port', 9001));

        $server = @stream_socket_server("tcp://0.0.0.0:{$port}", $errno, $errstr);

        if ($server === false) {
            $this->error("Could not bind to port {$port}: [{$errno}] {$errstr}");
            return;
        }

        $logFile = storage_path('logs/gps-capture-' . date('Y-m-d') . '.log');

        $this->info('GPS raw TCP capture — DEVELOPMENT ONLY, no production data is touched.');
        $this->line("Listening on 0.0.0.0:{$port}");
        $this->line("Also appending everything below to: {$logFile}");
        $this->line('Never writes TricycleLocation, never runs violation logic, never calls TelemetryService.');
        $this->line('Press Ctrl+C to stop.');
        $this->newLine();

        while (true) {
            $conn = @stream_socket_accept($server, -1, $peer);

            if ($conn === false) {
                continue;
            }

            $this->emit($logFile, sprintf(
                "[%s] Connection received\nRemote: %s\n",
                now()->toDateTimeString(),
                $peer ?: 'unknown'
            ));

            // Reads until the client disconnects (feof) — a single physical device is expected to
            // hold one persistent connection open and stream multiple packets over time, so this
            // inner loop is what makes "multiple packets, same connection" work: each fread()
            // call blocks until the next chunk of bytes arrives (or the socket closes), prints it
            // immediately exactly as received, then waits for the next one.
            while (!feof($conn)) {
                $data = @fread($conn, 8192);

                if ($data === false || $data === '') {
                    break;
                }

                $this->emit($logFile, sprintf(
                    "[%s] RAW (%d bytes) from %s:\n%s\n\nHEX:\n%s\n",
                    now()->toDateTimeString(),
                    strlen($data),
                    $peer ?: 'unknown',
                    $data,
                    $this->hexDump($data)
                ));
            }

            fclose($conn);

            $this->emit($logFile, sprintf(
                "[%s] Connection closed: %s\n",
                now()->toDateTimeString(),
                $peer ?: 'unknown'
            ));

            // Loop back to stream_socket_accept() above — the listener keeps running and accepts
            // the next connection (a reconnect from the same device, or a fresh test connection).
        }
    }

    /**
     * Prints to the console and appends the exact same text to the capture log file, so the
     * output can be copied straight from a scrollback-limited terminal or read back from disk.
     */
    private function emit(string $logFile, string $text): void
    {
        $this->line($text);
        $this->line(str_repeat('-', 60));
        @file_put_contents($logFile, $text . str_repeat('-', 60) . "\n", FILE_APPEND);
    }

    /**
     * A lossless, purely additional view alongside the raw text above — never a replacement for
     * it. Included because a real device packet may contain non-printable/control bytes that
     * would otherwise be invisible or corrupt terminal rendering; the hex form makes exact byte
     * values and framing visible regardless.
     */
    private function hexDump(string $data): string
    {
        return trim(chunk_split(strtoupper(bin2hex($data)), 2, ' '));
    }
}
