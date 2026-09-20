<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Services\TelemetryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Thin API layer over TelemetryService (the shared GPS processing pipeline mobile and a future
 * ST-901L IoT receiver both feed): authentication (route middleware), request validation,
 * resolving the authenticated driver's own tricycle, and shaping the HTTP response. All actual
 * location/coding-check/violation processing lives in the service — this controller has none of
 * it anymore.
 */
class DriverTelematicsController extends Controller
{
    public function __construct(private readonly TelemetryService $telemetryService)
    {
    }

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

        // The mobile/web app sends recorded_at as a UTC ISO string (JS Date::toISOString()).
        // Carbon::parse() on a string carrying an explicit offset keeps that offset internally —
        // without converting to the app's own timezone here, MySQL's naive datetime column would
        // silently store the raw UTC wall-clock digits, mislabeled as if they were already
        // Asia/Manila (config('app.timezone')), making every client-stamped ping look ~8 hours
        // stale next to now()/other server-stamped timestamps.
        $recordedAt = $request->recorded_at
            ? \Carbon\Carbon::parse($request->recorded_at)->setTimezone(config('app.timezone'))
            : now();
        $source = $tricycle->active_tracking_mode === 'iot_device' ? 'gps_device' : 'mobile_app';

        // 1-3. Persist the location, run the shared color-coding engine, and return its result —
        // all delegated to TelemetryService so mobile and a future IoT receiver share exactly one
        // implementation. The service already wraps the coding-check step in its own try/catch,
        // so an engine failure here still never blocks the ping itself from being recorded.
        $result = $this->telemetryService->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => $request->latitude,
            'longitude'   => $request->longitude,
            'speed_kmh'   => $request->speed_kmh,
            'heading_deg' => $request->heading_deg,
            'accuracy_m'  => $request->accuracy_m,
            'source'      => $source,
            'recorded_at' => $recordedAt,
        ]);
        $location = $result['location'];

        // 4. Update the driver's live position cache (used for booking dispatch/display) in the
        // same request, so the mobile app no longer needs a separate /driver/location call. This
        // stays controller-side, not in the shared service: it's keyed by the authenticated
        // driver's own User/Driver row, which a future IoT device ping has no equivalent of.
        $driver = Driver::where('user_id', $user->id)->first();
        if ($driver) {
            $driver->update([
                'current_lat'              => $request->latitude,
                'current_lng'              => $request->longitude,
                'last_location_updated_at' => $recordedAt,
            ]);
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Location ping recorded successfully.',
            'ping_id'   => $location->id,
            'violation' => $result['violation'],
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

        $source = $tricycle->active_tracking_mode === 'iot_device' ? 'gps_device' : 'mobile_app';
        $insertedCount = 0;
        $createdLocations = collect();

        // Each ping is persisted via the shared service's recordLocation() — but NOT process(),
        // since that would run the color-coding check once per ping. The check still needs to
        // run only once per distinct calendar date, exactly as before this refactor.
        DB::transaction(function () use ($request, $tricycle, $source, &$insertedCount, &$createdLocations) {
            foreach ($request->pings as $ping) {
                $createdLocations->push($this->telemetryService->recordLocation([
                    'tricycle_id' => $tricycle->id,
                    'latitude'    => $ping['latitude'],
                    'longitude'   => $ping['longitude'],
                    'speed_kmh'   => $ping['speed_kmh'] ?? null,
                    'heading_deg' => $ping['heading_deg'] ?? null,
                    'accuracy_m'  => $ping['accuracy_m'] ?? null,
                    'source'      => $source,
                    // See the identical fix + comment in store() above.
                    'recorded_at' => \Carbon\Carbon::parse($ping['recorded_at'])->setTimezone(config('app.timezone')),
                ]));
                $insertedCount++;
            }
        });

        // Update the driver's live position cache from the most recent ping in the batch.
        $latest = $createdLocations->sortByDesc('recorded_at')->first();
        if ($latest) {
            $driver = Driver::where('user_id', $request->user()->id)->first();
            if ($driver) {
                $driver->update([
                    'current_lat'              => $latest->latitude,
                    'current_lng'              => $latest->longitude,
                    'last_location_updated_at' => $latest->recorded_at,
                ]);
            }
        }

        // Run the shared color-coding check once per distinct calendar date present in the batch
        // (judged by each ping's own recorded_at, not upload time) — never once per ping.
        try {
            $createdLocations
                ->groupBy(fn (TricycleLocation $loc) => $loc->recorded_at->toDateString())
                ->each(function ($locationsForDate) use ($tricycle) {
                    $this->telemetryService->checkColorCoding($tricycle, $locationsForDate->sortByDesc('recorded_at')->first());
                });
        } catch (\Throwable $e) {
            Log::error("Color-coding check failed during batch flush for tricycle {$tricycle->id}: {$e->getMessage()}");
        }

        return response()->json([
            'success'        => true,
            'message'        => "Flushed {$insertedCount} offline location pings to server.",
            'processed_count'=> $insertedCount,
        ], 200);
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
