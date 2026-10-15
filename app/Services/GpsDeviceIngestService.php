<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\GpsDevice;
use App\Models\TricycleLocation;

/**
 * Turns one decoded SinoTrack frame (see SinoTrackProtocol) into Trivora telemetry. This is the
 * IoT half of TelemetryService's contract: the tricycle is resolved only through the server-side
 * gps_devices pairing that TMO recorded at Final Confirmation — never from anything the packet
 * asserts beyond its own tracker ID.
 */
class GpsDeviceIngestService
{
    public function __construct(private readonly TelemetryService $telemetryService)
    {
    }

    /**
     * @param array<string, mixed> $frame
     * @return array{outcome: string, message: string}
     */
    public function ingest(array $frame, bool $allowHistorical = false): array
    {
        $deviceId = (string) ($frame['device_id'] ?? '');

        if ($deviceId === '') {
            return ['outcome' => 'no_device_id', 'message' => 'Frame carries no tracker ID yet.'];
        }

        $device = $this->findDevice($deviceId);

        if (!$device) {
            return [
                'outcome' => 'unknown_device',
                'message' => "Tracker ID {$deviceId} is not registered — enter it as the IoT Device ID in TMO Final Confirmation & GPS Setup.",
            ];
        }

        // Any packet (even one without a fix) proves the tracker is online.
        $device->update(['last_seen_at' => now()]);

        if ($device->status !== 'paired' || !$device->tricycle) {
            return ['outcome' => 'unpaired', 'message' => "Tracker {$deviceId} is {$device->status}, not paired to a tricycle."];
        }

        $tricycle = $device->tricycle;

        if ($tricycle->active_tracking_mode !== 'iot_device') {
            return ['outcome' => 'mode_mobile', 'message' => "Tricycle #{$tricycle->id} is in mobile-app tracking mode; IoT fix not recorded."];
        }

        if (empty($frame['has_position'])) {
            return ['outcome' => 'no_position', 'message' => "{$frame['type']} packet has no position block."];
        }

        $lat = $frame['latitude'] ?? null;
        $lng = $frame['longitude'] ?? null;
        if (!is_numeric($lat) || !is_numeric($lng) || !is_finite((float) $lat) || !is_finite((float) $lng)
            || (float) $lat < -90.0 || (float) $lat > 90.0 || (float) $lng < -180.0 || (float) $lng > 180.0) {
            return ['outcome' => 'invalid_coordinates', 'message' => 'Coordinates out of valid geographical range.'];
        }
        $lat = (float) $lat;
        $lng = (float) $lng;

        if (empty($frame['valid']) || ($lat === 0.0 && $lng === 0.0)) {
            return ['outcome' => 'no_fix', 'message' => 'GPS fix invalid (V) — tracker has no satellite lock yet.'];
        }

        $speed = $frame['speed_kmh'] ?? 0;
        if (!is_numeric($speed) || !is_finite((float) $speed) || (float) $speed < 0) {
            return ['outcome' => 'invalid_speed', 'message' => 'Speed must be a non-negative finite number.'];
        }
        $speed = (float) $speed;
        if ($speed > 150.0) {
            return ['outcome' => 'impossible_speed', 'message' => "Speed {$speed} km/h exceeds realistic maximum limit of 150 km/h."];
        }

        // A device clock that is wrong (or set to local time instead of UTC) would otherwise
        // create future-dated pings that look "connected" forever.
        $recordedAt = $frame['recorded_at'] ?? null;
        if (!$recordedAt || $recordedAt->isAfter(now()->addMinutes(5))) {
            $recordedAt = now();
        } elseif (!$allowHistorical && $recordedAt->isBefore(now()->subDays(7))) {
            return ['outcome' => 'stale_timestamp', 'message' => 'Telemetry timestamp is older than 7 days.'];
        }

        // Sanity check: detect impossible movement / teleportation from previous recent ping
        $lastLocation = TricycleLocation::where('tricycle_id', $tricycle->id)
            ->latest('recorded_at')
            ->first();

        if ($lastLocation && $lastLocation->recorded_at) {
            $elapsedSecs = abs($recordedAt->diffInSeconds($lastLocation->recorded_at));
            if ($elapsedSecs > 0 && $elapsedSecs <= 300) {
                $jumpDistKm = GeoService::haversineKm(
                    (float) $lastLocation->latitude,
                    (float) $lastLocation->longitude,
                    $lat,
                    $lng
                );
                $impliedSpeedKmh = ($jumpDistKm / ($elapsedSecs / 3600.0));
                if ($impliedSpeedKmh > 200.0) {
                    return [
                        'outcome' => 'impossible_movement',
                        'message' => sprintf(
                            'Impossible movement: %.2f km jumped in %d seconds (implied %.1f km/h).',
                            $jumpDistKm,
                            $elapsedSecs,
                            $impliedSpeedKmh
                        ),
                    ];
                }
            }
        }

        $result = $this->telemetryService->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => $lat,
            'longitude'   => $lng,
            'speed_kmh'   => $speed,
            'heading_deg' => $frame['heading_deg'] ?? 0,
            'source'      => 'gps_device',
            'recorded_at' => $recordedAt,
        ]);

        // Mirror the mobile path's live-position cache so dispatch/Live Monitoring see the unit.
        Driver::where('tricycle_id', $tricycle->id)->update([
            'current_lat'              => $lat,
            'current_lng'              => $lng,
            'last_location_updated_at' => $recordedAt,
        ]);

        return [
            'outcome' => 'recorded',
            'message' => sprintf(
                'Tricycle #%d @ %.6f,%.6f %.1f km/h (ping #%d)%s',
                $tricycle->id,
                $lat,
                $lng,
                $speed,
                $result['location']->id,
                !empty($result['violation']['flagged']) ? ' — coding violation flagged' : ''
            ),
        ];
    }

    /**
     * Resolves device by exact identifier or IMEI first, with safe minimum length
     * requirement to prevent short wildcard prefix collisions.
     */
    private function findDevice(string $deviceId): ?GpsDevice
    {
        $cleanId = trim($deviceId);
        if (!preg_match('/^[A-Za-z0-9_-]{3,30}$/', $cleanId)) {
            return null;
        }

        $device = GpsDevice::with('tricycle')
            ->where('device_identifier', $cleanId)
            ->orWhere('imei', $cleanId)
            ->first();

        if ($device) {
            return $device;
        }

        // Only allow suffix match if the ID has at least 7 characters to avoid wildcard collisions
        if (strlen($cleanId) >= 7) {
            return GpsDevice::with('tricycle')
                ->where('device_identifier', 'like', "%{$cleanId}")
                ->orWhere('imei', 'like', "%{$cleanId}")
                ->first();
        }

        return null;
    }
}
