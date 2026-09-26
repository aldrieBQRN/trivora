<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\Violation;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * The single GPS telemetry pipeline shared by every ingestion source. Mobile GPS
 * (Api\DriverTelematicsController) is the only caller today; a future ST-901L IoT receiver will
 * call the same methods once it exists — this class deliberately knows nothing about HTTP,
 * Sanctum, driver ownership, or any device protocol. Callers are responsible for resolving a
 * trusted tricycle_id (mobile: via the authenticated driver's operator; IoT, later: via
 * GpsDevice -> tricycle) before calling in — this service never resolves ownership itself and
 * never accepts a client-asserted tricycle_id directly from an unauthenticated source.
 *
 * Normalized telemetry shape:
 * ['tricycle_id', 'latitude', 'longitude', 'speed_kmh'?, 'heading_deg'?, 'accuracy_m'?,
 *  'source' (one of TricycleLocation::source's enum values), 'recorded_at'?]
 */
class TelemetryService
{
    /**
     * Full single-reading pipeline: validate, persist the ping, then run the color-coding check.
     * This is what a live/real-time ping should call (mobile's store() today; a future IoT
     * receiver's live-packet path later). Batch/offline ingestion calls recordLocation() and
     * checkColorCoding() separately instead, so the coding check still runs once per distinct
     * date rather than once per ping — see DriverTelematicsController::batchStore().
     *
     * @param array<string, mixed> $telemetry
     * @return array{location: TricycleLocation, violation: array}
     */
    public function process(array $telemetry): array
    {
        $location = $this->recordLocation($telemetry);
        $tricycle = Tricycle::findOrFail($telemetry['tricycle_id']);

        try {
            $violation = $this->checkColorCoding($tricycle, $location);
        } catch (\Throwable $e) {
            Log::error("Color-coding check failed for tricycle {$tricycle->id}: {$e->getMessage()}");
            $violation = ['flagged' => false];
        }

        return ['location' => $location, 'violation' => $violation];
    }

    /**
     * Validates and persists one normalized telemetry reading as a TricycleLocation. No
     * coding-check/violation logic here — kept separate so batch ingestion can create many
     * locations first and run the (potentially expensive/side-effecting) coding check only once
     * per distinct date afterward.
     *
     * Defaults mirror exactly what DriverTelematicsController::store()/batchStore() already
     * applied inline before this refactor (speed_kmh/heading_deg default 0, accuracy_m default
     * 5.0 meters) — unchanged, just centralized so every caller gets the same defaults.
     *
     * @param array<string, mixed> $telemetry
     */
    public function recordLocation(array $telemetry): TricycleLocation
    {
        $this->validate($telemetry);

        return TricycleLocation::create([
            'tricycle_id' => $telemetry['tricycle_id'],
            'latitude'    => $telemetry['latitude'],
            'longitude'   => $telemetry['longitude'],
            'speed_kmh'   => $telemetry['speed_kmh'] ?? 0,
            'heading_deg' => $telemetry['heading_deg'] ?? 0,
            'accuracy_m'  => $telemetry['accuracy_m'] ?? 5.0,
            'source'      => $telemetry['source'],
            'recorded_at' => $telemetry['recorded_at'] ?? now(),
        ]);
    }

    /**
     * The single, official automated color-coding violation engine — moved verbatim (same rule
     * lookup, same fields, same dedup handling) from DriverTelematicsController so mobile and
     * (later) IoT telemetry share exactly one implementation instead of two. Scope is
     * color-coding only; there is deliberately no overspeeding or out-of-line check here.
     *
     * ColorCodingRuleService remains the sole source of truth for the day/digit restriction
     * rule — this method only invokes it, never re-derives or duplicates it.
     */
    public function checkColorCoding(Tricycle $tricycle, TricycleLocation $location): array
    {
        // Judge by the ping's own timestamp, not wall-clock now() — matters for batch/catch-up
        // pings that get uploaded after the fact, so they're judged by the day they actually
        // happened, not the day they were uploaded.
        $today = $location->recorded_at ?? now();
        $dayName = $today->format('l');
        $restrictedEndings = ColorCodingRuleService::restrictedDigitsForDay($dayName);

        $identifier = $tricycle->coding_scheme_number ?: $tricycle->plate_number;
        $lastDigit = $identifier ? (int) substr(trim($identifier), -1) : null;

        if ($lastDigit === null || !in_array($lastDigit, $restrictedEndings, true)) {
            return ['flagged' => false];
        }

        // Receiving a GPS ping alone must not trigger a violation — the tricycle must have
        // genuinely MOVED at least the configured threshold from where it first reported after
        // going Online, confirmed by a second consecutive reading, not merely be parked and
        // transmitting (or produce a violation off one single GPS jump/glitch). Checked only once
        // the cheap day/digit rule already matches.
        if (!$this->hasConfirmedMovementSinceOnline($tricycle, $location)) {
            return ['flagged' => false];
        }

        $scheme = $tricycle->franchiseScheme;
        if (!$scheme) {
            Log::warning("Color-coding check skipped: tricycle {$tricycle->id} has no active franchise scheme.");
            return ['flagged' => false];
        }

        try {
            $violation = Violation::create([
                'tricycle_id'            => $tricycle->id,
                'franchise_scheme_id'    => $scheme->id,
                'color_coding_scheme_id' => $scheme->color_coding_scheme_id,
                'location_snapshot_id'   => $location->id,
                'detected_by'            => null, // automated
                'violation_type'         => 'color_coding',
                'detected_at'            => $today,
                'day_of_week'            => $dayName,
                'detection_method'       => 'automated',
                'status'                 => 'open',
                'fine_amount'            => 500.00,
                'notes'                  => "Automated GPS detection: operating on restricted color-coding day ({$dayName}), Sticker Number ending {$lastDigit}.",
            ]);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'violations_color_coding_daily_unique')) {
                // Lost a race to a concurrent ping (e.g. a live 60s ping and a batch-flush ping
                // arriving together) — another request already recorded today's citation.
                return ['flagged' => false, 'already_recorded_today' => true];
            }
            throw $e;
        }

        return [
            'flagged'  => true,
            'type'     => 'color_coding',
            'citation' => 'CITE-' . str_pad($violation->id, 5, '0', STR_PAD_LEFT),
            'message'  => "Operating on restricted coding day ({$dayName}). Violation recorded.",
        ];
    }

    /**
     * The coding/restricted-day 100-meter movement rule:
     *
     *   1. Going Online alone never creates a violation.
     *   2. The tricycle's first valid GPS reading received after going Online becomes that
     *      session's movement anchor (never the TODA zone center, never a fixed/default point).
     *   3. Movement is measured as straight-line (Haversine) distance from that anchor, using the
     *      same GeoService primitive every other distance calculation in this codebase already
     *      shares — not a second/parallel distance system.
     *   4. A single reading at/beyond the configured threshold is only a CANDIDATE — the very
     *      next valid reading must also be at/beyond the threshold before a violation is actually
     *      created, so a single GPS jump/glitch can never trigger one on its own.
     *   5. Going Offline (Driver::online_since cleared, see DriverAuthController::updateStatus())
     *      ends the session; the next Online establishes a brand-new anchor from scratch.
     *
     * Recomputed fresh from the current online session's TricycleLocation rows each call (cheap
     * at this fleet's scale, served by the existing (tricycle_id, recorded_at) index) rather than
     * kept as separately-persisted running state — nothing to invalidate, no second source of
     * truth to drift out of sync with the location history itself.
     */
    protected function hasConfirmedMovementSinceOnline(Tricycle $tricycle, TricycleLocation $location): bool
    {
        $driver = Driver::where('tricycle_id', $tricycle->id)->first();

        // No active online session (never gone online through the tracked endpoint, or currently
        // offline) — there is no anchor to measure movement from yet.
        if (!$driver || !$driver->online_since) {
            return false;
        }

        $sessionReadings = TricycleLocation::where('tricycle_id', $tricycle->id)
            ->where('recorded_at', '>=', $driver->online_since)
            ->where('recorded_at', '<=', $location->recorded_at)
            ->orderBy('recorded_at')
            ->orderBy('id')
            ->get(['id', 'latitude', 'longitude']);

        $currentIndex = $sessionReadings->search(fn (TricycleLocation $reading) => $reading->id === $location->id);

        // The current reading IS this session's anchor (the first one received since going
        // Online) — nothing to compare it against yet, so it can never itself be a violation.
        if ($currentIndex === false || $currentIndex === 0) {
            return false;
        }

        $thresholdMeters = (float) config('tracking.coding_violation_movement_threshold_meters', 100);
        $anchor = $sessionReadings->first();

        $metersFromAnchor = fn (TricycleLocation $reading): float => GeoService::haversineKm(
            (float) $anchor->latitude,
            (float) $anchor->longitude,
            (float) $reading->latitude,
            (float) $reading->longitude
        ) * 1000;

        $current = $sessionReadings[$currentIndex];
        $previous = $sessionReadings[$currentIndex - 1];

        // Confirmed only when BOTH the current reading and the one immediately before it (within
        // this same online session) are at/beyond the threshold — a lone reading crossing it is
        // just a candidate, never enough on its own.
        return $metersFromAnchor($current) >= $thresholdMeters
            && $metersFromAnchor($previous) >= $thresholdMeters;
    }

    /**
     * Defensive validation the service performs on its own, independent of whatever HTTP-layer
     * validation (or lack thereof) the caller already did. A future non-HTTP IoT receiver won't
     * have Laravel's request Validator at all, so the shared pipeline must refuse bad values on
     * its own rather than trusting every caller to have validated already — this is what keeps
     * one malformed reading from silently creating an invalid location (see Phase 3 safety
     * requirements). Rules mirror DriverTelematicsController's existing request validation
     * exactly, so the mobile path's behavior is unchanged.
     *
     * @throws \InvalidArgumentException
     */
    protected function validate(array $telemetry): void
    {
        $validator = Validator::make($telemetry, [
            'tricycle_id' => 'required|integer|exists:tricycles,id',
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'speed_kmh'   => 'nullable|numeric|min:0',
            'heading_deg' => 'nullable|integer|between:0,360',
            'accuracy_m'  => 'nullable|numeric|min:0',
            'source'      => 'required|in:gps_device,mobile_app,manual',
        ]);

        if ($validator->fails()) {
            throw new \InvalidArgumentException($validator->errors()->first());
        }
    }
}
