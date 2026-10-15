<?php

namespace App\Console\Commands;

use App\Services\GpsDeviceIngestService;
use App\Services\SinoTrackProtocol;
use Illuminate\Console\Command;

/**
 * Offline substitute for a live ST-901L tracker: replays a captured packet log through the SAME
 * decode + ingest path the live receiver uses (SinoTrackProtocol::extractFrames ->
 * GpsDeviceIngestService -> TelemetryService), so the full IoT chain can be exercised and
 * regression-tested without physical hardware.
 *
 * This is the "replay" half of the record/replay harness. The "record" half already exists as the
 * dev-only `gps:capture` command, whose raw bytes can be pasted into a fixture as `hex:` lines.
 *
 * Log format (one entry per line):
 *   - blank lines and lines starting with '#' are ignored (comments);
 *   - 'hex:<HEXBYTES>' contributes raw binary (e.g. '$'/'X' records), and may be split across
 *     several consecutive lines to reproduce TCP fragmentation;
 *   - any other non-empty line is a literal ASCII frame (e.g. '*TH,...#').
 * Frames are always built through extractFrames(), so a run also proves the framing/reassembly
 * logic against the fixture exactly as the live socket would.
 */
class GpsReplayCommand extends Command
{
    protected $signature = 'gps:replay
        {file : Path to a captured packet log (see the class doc for the line format)}
        {--device= : Tracker ID used for ID-less binary X-mode records (defaults to the last ASCII ID seen)}
        {--dry-run : Decode and report frames without touching the database}';

    protected $description = 'Replay a captured SinoTrack packet log through the real IoT ingest pipeline (offline, no hardware).';

    public function handle(SinoTrackProtocol $protocol, GpsDeviceIngestService $ingest): int
    {
        $path = $this->argument('file');

        if (!is_file($path) || !is_readable($path)) {
            $this->error("Capture file not found or unreadable: {$path}");
            return self::FAILURE;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            $this->error("Could not read capture file: {$path}");
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $lastDeviceId = $this->option('device') ?: null;
        $buffer = '';
        $counts = [];
        $frameCount = 0;

        $this->line(sprintf('<info>Replaying</info> %s%s', $path, $dryRun ? ' (dry run — no writes)' : ''));

        foreach ($lines as $index => $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (str_starts_with($line, 'hex:')) {
                $bytes = $this->decodeHex(substr($line, 4), $index + 1);
                if ($bytes === null) {
                    continue;
                }
                $buffer .= $bytes;
            } else {
                // Terminate the ASCII frame so framing matches a real socket read; a trailing CR/LF
                // between packets is exactly the noise extractFrames() is designed to skip.
                $buffer .= $line . "\r\n";
            }

            foreach ($protocol->extractFrames($buffer) as $frame) {
                $frameCount++;

                // Binary X-mode records omit the tracker ID; attribute them to the last ID seen
                // (the live receiver does exactly this per-connection).
                if (!empty($frame['device_id'])) {
                    $lastDeviceId = $frame['device_id'];
                } elseif ($lastDeviceId !== null) {
                    $frame['device_id'] = $lastDeviceId;
                }

                if ($dryRun) {
                    $outcome = 'decoded';
                    $message = $this->describe($frame);
                } else {
                    try {
                        $result = $ingest->ingest($frame, allowHistorical: true);
                    } catch (\Throwable $e) {
                        $result = ['outcome' => 'error', 'message' => $e->getMessage()];
                    }
                    $outcome = $result['outcome'];
                    $message = $result['message'];
                }

                $counts[$outcome] = ($counts[$outcome] ?? 0) + 1;
                $this->line(sprintf(
                    '  line %d  %-14s [%s %s] %s',
                    $index + 1,
                    strtoupper($outcome),
                    $frame['device_id'] ?? '?',
                    $frame['type'] ?? '?',
                    $message
                ));
            }
        }

        if (trim($buffer) !== '') {
            $this->warn('  trailing bytes with no complete frame (leftover after last read): ' . $this->printable($buffer));
        }

        if ($frameCount === 0) {
            $this->warn('No frames were found in the capture file.');
            return self::SUCCESS;
        }

        $this->newLine();
        $this->line(sprintf('Decoded %d frame(s): %s', $frameCount, $this->summarize($counts)));

        return self::SUCCESS;
    }

    /** @return string|null raw bytes, or null (after warning) if the hex line is malformed */
    private function decodeHex(string $hex, int $lineNumber): ?string
    {
        $hex = preg_replace('/\s+/', '', $hex);

        if ($hex === '' || strlen($hex) % 2 !== 0 || !ctype_xdigit($hex)) {
            $this->warn("  line {$lineNumber}: ignoring malformed hex entry.");
            return null;
        }

        $bytes = hex2bin($hex);
        if ($bytes === false) {
            $this->warn("  line {$lineNumber}: ignoring undecodable hex entry.");
            return null;
        }

        return $bytes;
    }

    /** @param array<string, mixed> $frame */
    private function describe(array $frame): string
    {
        if (empty($frame['has_position'])) {
            return 'no position block';
        }

        return sprintf(
            '%s %.6f,%.6f %s km/h',
            !empty($frame['valid']) ? 'fix' : 'invalid fix (V)',
            (float) ($frame['latitude'] ?? 0),
            (float) ($frame['longitude'] ?? 0),
            (float) ($frame['speed_kmh'] ?? 0)
        );
    }

    /** @param array<string, int> $counts */
    private function summarize(array $counts): string
    {
        ksort($counts);

        return implode(', ', array_map(
            static fn (string $outcome, int $count): string => "{$outcome}={$count}",
            array_keys($counts),
            $counts
        ));
    }

    private function printable(string $data): string
    {
        $trimmed = trim($data);

        return $trimmed !== '' && preg_match('/^[\x20-\x7E]+$/', $trimmed)
            ? $trimmed
            : 'HEX ' . strtoupper(bin2hex($data));
    }
}
