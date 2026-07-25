<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\Violation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DriverTelematicsController extends Controller
{
    /**
     * Ingest single live location ping from mobile app background/foreground watcher.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'speed_kmh'   => 'nullable|numeric|min:0',
            'heading_deg' => 'nullable|integer|between:0,360',
            'accuracy_m'  => 'nullable|numeric|min:0',
            'recorded_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid location parameters',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            return response()->json([
                'success' => false,
                'message' => 'No operator profile linked to this user account.',
            ], 400);
        }

        $tricycle = Tricycle::where('operator_id', $operator->id)->first();

        if (!$tricycle) {
            return response()->json([
                'success' => false,
                'message' => 'No registered tricycle unit found for this driver.',
            ], 404);
        }

        $recordedAt = $request->recorded_at ? \Carbon\Carbon::parse($request->recorded_at) : now();

        // 1. Create Location Telemetry Record
        $location = TricycleLocation::create([
            'tricycle_id' => $tricycle->id,
            'latitude'    => $request->latitude,
            'longitude'   => $request->longitude,
            'speed_kmh'   => $request->speed_kmh ?? 0,
            'heading_deg' => $request->heading_deg ?? 0,
            'accuracy_m'  => $request->accuracy_m ?? 5.0,
            'source'      => 'mobile_app',
            'recorded_at' => $recordedAt,
        ]);

        // 2. Execute Server-Side Automated Violation Engine
        $violationDetected = $this->runAutomatedViolationChecks($tricycle, $location);

        return response()->json([
            'success'   => true,
            'message'   => 'Location ping recorded successfully.',
            'ping_id'   => $location->id,
            'violation' => $violationDetected,
        ], 201);
    }

    /**
     * Ingest batch location pings stored offline during network drops.
     */
    public function batchStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pings'               => 'required|array|min:1|max:100',
            'pings.*.latitude'    => 'required|numeric|between:-90,90',
            'pings.*.longitude'   => 'required|numeric|between:-180,180',
            'pings.*.speed_kmh'   => 'nullable|numeric|min:0',
            'pings.*.heading_deg' => 'nullable|integer|between:0,360',
            'pings.*.accuracy_m'  => 'nullable|numeric|min:0',
            'pings.*.recorded_at' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid batch ping format',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $operator = $user->operator;

        if (!$operator || !($tricycle = Tricycle::where('operator_id', $operator->id)->first())) {
            return response()->json([
                'success' => false,
                'message' => 'No active tricycle unit linked to driver.',
            ], 400);
        }

        $insertedCount = 0;
        DB::transaction(function () use ($request, $tricycle, &$insertedCount) {
            foreach ($request->pings as $ping) {
                TricycleLocation::create([
                    'tricycle_id' => $tricycle->id,
                    'latitude'    => $ping['latitude'],
                    'longitude'   => $ping['longitude'],
                    'speed_kmh'   => $ping['speed_kmh'] ?? 0,
                    'heading_deg' => $ping['heading_deg'] ?? 0,
                    'accuracy_m'  => $ping['accuracy_m'] ?? 5.0,
                    'source'      => 'mobile_app',
                    'recorded_at' => \Carbon\Carbon::parse($ping['recorded_at']),
                ]);
                $insertedCount++;
            }
        });

        return response()->json([
            'success'        => true,
            'message'        => "Flushed {$insertedCount} offline location pings to server.",
            'processed_count'=> $insertedCount,
        ], 200);
    }

    /**
     * Core Automated Violation Detection Engine
     */
    protected function runAutomatedViolationChecks(Tricycle $tricycle, TricycleLocation $location)
    {
        $today = now();
        $dayName = $today->format('l'); // e.g. Monday
        $restrictedEndings = $this->getRestrictedDigitsForDay($dayName);

        $bodyNo = $tricycle->body_number ?: $tricycle->plate_number;
        $lastDigit = $bodyNo ? (int)substr(trim($bodyNo), -1) : null;

        // Check 1: Color-Coding Operating Violation
        if ($lastDigit !== null && in_array($lastDigit, $restrictedEndings)) {
            // Check if violation citation already generated today for coding
            $existingViolation = Violation::where('tricycle_id', $tricycle->id)
                ->where('violation_type', 'coding_no_operation')
                ->whereDate('detected_at', $today->toDateString())
                ->exists();

            if (!$existingViolation) {
                $violation = Violation::create([
                    'tricycle_id'    => $tricycle->id,
                    'violation_type' => 'coding_no_operation',
                    'description'    => "Automated GPS Detection: Operating on restricted color-coding day ({$dayName}, ending digit {$lastDigit}).",
                    'fine_amount'    => 500.00,
                    'penalty_amount' => 500.00,
                    'status'         => 'open',
                    'detected_at'    => now(),
                ]);

                return [
                    'flagged'  => true,
                    'type'     => 'coding_no_operation',
                    'citation' => "CITE-" . str_pad($violation->id, 5, '0', STR_PAD_LEFT),
                    'message'  => "ALERT: Operating on restricted coding day ({$dayName}). Violation recorded.",
                ];
            }
        }

        // Check 2: Over-speeding Limit (> 40 km/h in municipal zone)
        if ($location->speed_kmh > 40.0) {
            $existingSpeeding = Violation::where('tricycle_id', $tricycle->id)
                ->where('violation_type', 'overspeeding')
                ->where('detected_at', '>=', now()->subMinutes(30))
                ->exists();

            if (!$existingSpeeding) {
                $violation = Violation::create([
                    'tricycle_id'    => $tricycle->id,
                    'violation_type' => 'overspeeding',
                    'description'    => "Automated Telematics: Exceeded 40 km/h speed limit (Recorded: {$location->speed_kmh} km/h).",
                    'fine_amount'    => 1000.00,
                    'penalty_amount' => 1000.00,
                    'status'         => 'open',
                    'detected_at'    => now(),
                ]);

                return [
                    'flagged'  => true,
                    'type'     => 'overspeeding',
                    'citation' => "CITE-" . str_pad($violation->id, 5, '0', STR_PAD_LEFT),
                    'message'  => "WARNING: Speed limit exceeded ({$location->speed_kmh} km/h). Citation issued.",
                ];
            }
        }

        return ['flagged' => false];
    }

    /**
     * Map day of week to restricted last digits
     */
    protected function getRestrictedDigitsForDay(string $dayName): array
    {
        return match ($dayName) {
            'Monday'    => [1, 2],
            'Tuesday'   => [3, 4],
            'Wednesday' => [5, 6],
            'Thursday'  => [7, 8],
            'Friday'    => [9, 0],
            default     => [], // Saturday & Sunday no coding restriction
        };
    }

    /**
     * Get current driver tracking setup and mode status
     */
    public function getTrackingStatus(Request $request)
    {
        $user = $request->user();
        $operator = $user?->operator;
        $tricycle = $operator ? Tricycle::where('operator_id', $operator->id)->first() : null;

        if (!$tricycle) {
            return response()->json(['success' => false, 'message' => 'No registered tricycle unit found.'], 404);
        }

        return response()->json([
            'success'              => true,
            'tricycle_id'          => $tricycle->id,
            'plate_number'         => $tricycle->plate_number,
            'iot_device_id'        => $tricycle->iot_device_id,
            'tracking_capability'  => $tricycle->tracking_capability,
            'active_tracking_mode' => $tricycle->active_tracking_mode,
        ]);
    }

    /**
     * Driver updates active location tracking mode (iot_device vs mobile_app)
     */
    public function setTrackingMode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mode'          => 'required|in:iot_device,mobile_app',
            'iot_device_id' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $operator = $user?->operator;
        $tricycle = $operator ? Tricycle::where('operator_id', $operator->id)->first() : null;

        if (!$tricycle) {
            return response()->json(['success' => false, 'message' => 'No registered tricycle unit found.'], 404);
        }

        $mode = $request->mode;
        $iotId = $request->iot_device_id ?: $tricycle->iot_device_id;

        $tricycle->update([
            'active_tracking_mode' => $mode,
            'iot_device_id'        => $mode === 'iot_device' ? $iotId : $tricycle->iot_device_id,
            'tracking_capability'  => ($mode === 'iot_device' || !empty($iotId)) ? 'iot_enabled' : $tricycle->tracking_capability,
        ]);

        return response()->json([
            'success'              => true,
            'message'              => 'Active tracking mode updated successfully.',
            'active_tracking_mode' => $tricycle->active_tracking_mode,
            'iot_device_id'        => $tricycle->iot_device_id,
        ]);
    }
}
