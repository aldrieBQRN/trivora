<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\GpsDevice;

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
    public function ingest(array $frame): array
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

        if (empty($frame['valid']) || ((float) $frame['latitude'] === 0.0 && (float) $frame['longitude'] === 0.0)) {
            return ['outcome' => 'no_fix', 'message' => 'GPS fix invalid (V) — tracker has no satellite lock yet.'];
        }

        // A device clock that is wrong (or set to local time instead of UTC) would otherwise
        // create future-dated pings that look "connected" forever.
        $recordedAt = $frame['recorded_at'] ?? null;
        if (!$recordedAt || $recordedAt->isAfter(now()->addMinutes(5))) {
            $recordedAt = now();
        }

        $result = $this->telemetryService->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => $frame['latitude'],
            'longitude'   => $frame['longitude'],
            'speed_kmh'   => $frame['speed_kmh'] ?? 0,
            'heading_deg' => $frame['heading_deg'] ?? 0,
            'source'      => 'gps_device',
            'recorded_at' => $recordedAt,
        ]);

        // Mirror the mobile path's live-position cache so dispatch/Live Monitoring see the unit.
        Driver::where('tricycle_id', $tricycle->id)->update([
            'current_lat'              => $frame['latitude'],
            'current_lng'              => $frame['longitude'],
            'last_location_updated_at' => $recordedAt,
        ]);

        return [
            'outcome' => 'recorded',
            'message' => sprintf(
                'Tricycle #%d @ %.6f,%.6f %.1f km/h (ping #%d)%s',
                $tricycle->id,
                $frame['latitude'],
                $frame['longitude'],
                $frame['speed_kmh'] ?? 0,
                $result['location']->id,
                !empty($result['violation']['flagged']) ? ' — coding violation flagged' : ''
            ),
        ];
    }

    /**
     * The 10-digit ID in the packet is usually the tail of the IMEI, so TMO may have recorded
     * either the short ID or the full IMEI.
     */
    private function findDevice(string $deviceId): ?GpsDevice
    {
        return GpsDevice::with('tricycle')
            ->where('device_identifier', $deviceId)
            ->orWhere('imei', $deviceId)
            ->first()
            ?? GpsDevice::with('tricycle')
                ->where('device_identifier', 'like', "%{$deviceId}")
                ->orWhere('imei', 'like', "%{$deviceId}")
                ->first();
    }
}
