<?php

namespace App\Services;

use App\Models\TodaZone;

/**
 * TODA architecture moved from route-corridor areas (GeoJSON polylines, one per TODA) to
 * specific TODA terminal/location pins. Matching a pickup to a TODA is now purely a nearest-pin
 * lookup: haversine distance from the pickup coordinate to every active TODA's own
 * latitude/longitude, smallest distance wins. No route geometry, route files, or hardcoded
 * barangay/route-to-zone mappings are consulted here — those still exist and are used elsewhere
 * (e.g. the TMO dashboard's route visualization), just not for this.
 */
class TodaRouteMatcher
{
    /**
     * Determine the nearest active TODA to a given pickup (lat, lng) coordinate.
     *
     * @param float $lat pickup latitude
     * @param float $lng pickup longitude
     */
    public static function matchRoute(float $lat, float $lng): ?TodaZone
    {
        return self::nearestActiveZone($lat, $lng);
    }

    /**
     * Nearest active TODA by straight-line (haversine) distance from the given coordinate to
     * each zone's own pin (latitude/longitude). TODAs that are inactive, or have no coordinates
     * recorded, are excluded from consideration entirely — not just deprioritized.
     */
    public static function nearestActiveZone(float $lat, float $lng): ?TodaZone
    {
        $zones = TodaZone::where('is_active', true)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        $nearest = null;
        $minDistanceKm = null;

        foreach ($zones as $zone) {
            $distanceKm = self::haversineKm($lat, $lng, (float) $zone->latitude, (float) $zone->longitude);
            if ($minDistanceKm === null || $distanceKm < $minDistanceKm) {
                $minDistanceKm = $distanceKm;
                $nearest = $zone;
            }
        }

        // Last-resort fallback only: every active TODA is missing coordinates (shouldn't happen
        // in practice, since new TODAs require a pin) — better to return some active zone than
        // fail booking creation outright. This is not a matching strategy, just a safety net.
        return $nearest ?: TodaZone::where('is_active', true)->first();
    }

    /**
     * Haversine distance between two coordinates in kilometers. Reused by Driver::isWithinCoverage()
     * and TelemetryService's movement-gate check — unrelated to TODA matching, kept here as the
     * shared geo-distance primitive.
     */
    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }
}
