<?php

namespace App\Services;

class GeoService
{
    /**
     * Calculate the Great Circle (Haversine) distance between two sets of coordinates in kilometers.
     *
     * @param float $lat1 Starting latitude
     * @param float $lng1 Starting longitude
     * @param float $lat2 Ending latitude
     * @param float $lng2 Ending longitude
     * @return float Distance in kilometers
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
