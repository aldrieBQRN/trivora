<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Pure (no DB, no I/O) decoder for the SinoTrack ST-901/901L wire protocol, written against the
 * vendor's own "Protocol ST-901,901M,902,..." document (the H02-family protocol):
 *
 *  - ASCII:  *HQ,4106000054,V1,HHMMSS,A,DDMM.MMMM,N,DDDMM.MMMM,E,speed,course,DDMMYY,status#
 *            (also V4 command confirmations and V2/V3 address requests — same position block)
 *  - Binary: 32-byte '$' standard record (BCD), or 'X' mode record (mileage in place of the ID)
 *
 * Device time is UTC ("8 hours behind Beijing"); speed is in knots (the mileage section's
 * 1852/3600 factor), converted here to km/h so callers get TelemetryService's normal shape.
 */
class SinoTrackProtocol
{
    public const BINARY_RECORD_LENGTH = 32;

    /** An ASCII frame longer than this without a closing '#' is treated as garbage. */
    private const MAX_ASCII_LENGTH = 1024;

    private const KNOTS_TO_KMH = 1.852;

    /**
     * Pulls every complete frame out of $buffer (consuming them) and leaves any trailing partial
     * frame in place for the next read, since TCP may split or merge packets arbitrarily.
     *
     * @return array<int, array<string, mixed>>
     */
    public function extractFrames(string &$buffer): array
    {
        $frames = [];

        while ($buffer !== '') {
            $marker = $buffer[0];

            if ($marker === '*') {
                $end = strpos($buffer, '#');
                if ($end === false) {
                    if (strlen($buffer) > self::MAX_ASCII_LENGTH) {
                        $buffer = substr($buffer, 1);
                        continue;
                    }
                    break;
                }

                $frame = $this->parseAscii(substr($buffer, 0, $end + 1));
                $buffer = substr($buffer, $end + 1);
                if ($frame) {
                    $frames[] = $frame;
                }
                continue;
            }

            if ($marker === '$' || $marker === 'X') {
                if (strlen($buffer) < self::BINARY_RECORD_LENGTH) {
                    break;
                }

                $frame = $this->parseBinary(substr($buffer, 0, self::BINARY_RECORD_LENGTH));
                $buffer = substr($buffer, self::BINARY_RECORD_LENGTH);
                if ($frame) {
                    $frames[] = $frame;
                }
                continue;
            }

            // Noise (e.g. stray CR/LF between packets): skip to the next known frame start.
            $next = strcspn($buffer, '*$X', 1) + 1;
            $buffer = $next < strlen($buffer) ? substr($buffer, $next) : '';
        }

        return $frames;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function parseAscii(string $raw): ?array
    {
        $fields = explode(',', rtrim(ltrim(trim($raw), '*'), '#'));

        if (count($fields) < 3) {
            return null;
        }

        $frame = [
            'format'       => 'ascii',
            'manufacturer' => $fields[0],
            'device_id'    => $fields[1],
            'type'         => $fields[2],
            'has_position' => false,
            'raw'          => $raw,
        ];

        // The position block's offset differs per message type (V4 confirmations carry command
        // parameters before it), so locate it by shape: A|V, lat, N|S, lon, E|W.
        for ($i = 3; $i + 8 < count($fields); $i++) {
            if (in_array($fields[$i], ['A', 'V'], true)
                && in_array($fields[$i + 2], ['N', 'S'], true)
                && in_array($fields[$i + 4], ['E', 'W'], true)) {
                $latitude = $this->ddmmToDecimal($fields[$i + 1]);
                $longitude = $this->ddmmToDecimal($fields[$i + 3]);

                if ($latitude === null || $longitude === null) {
                    break;
                }

                return array_merge($frame, [
                    'has_position' => true,
                    'valid'        => $fields[$i] === 'A',
                    'latitude'     => $fields[$i + 2] === 'S' ? -$latitude : $latitude,
                    'longitude'    => $fields[$i + 4] === 'W' ? -$longitude : $longitude,
                    // An empty speed segment means 0 per the protocol document.
                    'speed_kmh'    => round((float) ($fields[$i + 5] ?: 0) * self::KNOTS_TO_KMH, 2),
                    'heading_deg'  => ((int) $fields[$i + 6]) % 360,
                    'recorded_at'  => $this->utcTimestamp($fields[$i + 7], $fields[$i - 1]),
                    'status'       => $fields[$i + 8] ?? null,
                ]);
            }
        }

        return $frame;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function parseBinary(string $raw): ?array
    {
        if (strlen($raw) !== self::BINARY_RECORD_LENGTH) {
            return null;
        }

        $hex = bin2hex($raw);
        $isXMode = $raw[0] === 'X';

        // Byte offsets (×2 for hex nibbles) per the document's coding-format table.
        $time = substr($hex, 12, 6);
        $date = substr($hex, 18, 6);
        $lat = substr($hex, 24, 8);
        $lon = substr($hex, 34, 9);
        $flags = hexdec($hex[43]);
        $speedCourse = substr($hex, 44, 6);

        if (!ctype_digit($lat . $lon . $speedCourse)) {
            return null;
        }

        $latitude = $this->ddmmToDecimal(substr($lat, 0, 4) . '.' . substr($lat, 4));
        $longitude = $this->ddmmToDecimal(substr($lon, 0, 5) . '.' . substr($lon, 5));

        return [
            'format'       => $isXMode ? 'binary_x' : 'binary',
            'manufacturer' => null,
            // X-mode records carry mileage here instead of the ID; the caller supplies the ID
            // from an earlier ASCII packet on the same connection.
            'device_id'    => $isXMode ? null : substr($hex, 2, 10),
            'type'         => 'V1',
            'has_position' => true,
            'valid'        => ($flags & 0b0010) !== 0,
            'latitude'     => ($flags & 0b0100) ? $latitude : -$latitude,
            'longitude'    => ($flags & 0b1000) ? $longitude : -$longitude,
            'speed_kmh'    => round((int) substr($speedCourse, 0, 3) * self::KNOTS_TO_KMH, 2),
            'heading_deg'  => ((int) substr($speedCourse, 3, 3)) % 360,
            'recorded_at'  => $this->utcTimestamp($date, $time),
            'status'       => strtoupper(substr($hex, 50, 8)),
            'raw'          => strtoupper($hex),
        ];
    }

    /**
     * DDMM.MMMM / DDDMM.MMMM (degrees + decimal minutes) -> decimal degrees.
     */
    private function ddmmToDecimal(string $value): ?float
    {
        if (!is_numeric($value)) {
            return null;
        }

        $number = (float) $value;
        $degrees = floor($number / 100);
        $minutes = $number - ($degrees * 100);

        return round($degrees + ($minutes / 60), 7);
    }

    /**
     * Device DDMMYY + HHMMSS (UTC) -> app-timezone Carbon, or null if unparseable.
     */
    private function utcTimestamp(?string $ddmmyy, ?string $hhmmss): ?Carbon
    {
        if (!$ddmmyy || !$hhmmss || !preg_match('/^\d{6}$/', $ddmmyy) || !preg_match('/^\d{6}$/', $hhmmss)) {
            return null;
        }

        try {
            $time = Carbon::createFromFormat('dmyHis', $ddmmyy . $hhmmss, 'UTC');
        } catch (\Throwable) {
            return null;
        }

        return $time ? $time->setTimezone(config('app.timezone')) : null;
    }
}
