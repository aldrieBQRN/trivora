<?php

namespace App\Services;

class FareService
{
    /**
     * Flat base fare for a single-passenger trip up to and including FREE_DISTANCE_KM.
     */
    public const BASE_FARE_SINGLE = 50.0;

    /**
     * Base fare charged per passenger for a trip with 2 or more passengers, up to and including
     * FREE_DISTANCE_KM.
     */
    public const BASE_FARE_PER_PASSENGER = 25.0;

    /**
     * Distance (in km) covered by the base fare before any additional charge applies.
     */
    public const FREE_DISTANCE_KM = 4.0;

    /**
     * Additional charge per kilometer beyond FREE_DISTANCE_KM, charged once per passenger.
     * Billed continuously (fractional km), not rounded up to the next whole km.
     */
    public const RATE_PER_KM = 5.0;

    /**
     * The base fare for a trip, before any distance charge: ₱50 flat for exactly 1 passenger,
     * or ₱25 per passenger for 2 or more.
     */
    public static function baseFare(int $passengerCount): float
    {
        return $passengerCount <= 1 ? self::BASE_FARE_SINGLE : self::BASE_FARE_PER_PASSENGER;
    }

    /**
     * The per-passenger fare for the booking's route distance: baseFare(passengerCount) plus
     * (distance_km - FREE_DISTANCE_KM) * RATE_PER_KM for any distance beyond FREE_DISTANCE_KM
     * (floored at 0 for distance_km <= FREE_DISTANCE_KM). Charged continuously — a partial
     * kilometer beyond the free distance is billed proportionally, not rounded up.
     */
    public static function perPassengerFare(float $distanceKm, int $passengerCount): float
    {
        // Round first so floating-point noise from upstream distance sources (e.g. a routing
        // service response) can't push a value that's really exactly at the free-distance
        // boundary (4.0) a hair over it.
        $excessKm = max(0.0, round($distanceKm, 2) - self::FREE_DISTANCE_KM);
        $distanceFee = round($excessKm * self::RATE_PER_KM, 2);

        return round(self::baseFare($passengerCount) + $distanceFee, 2);
    }

    /**
     * The single source of truth for the booking's final fare: the per-passenger fare charged
     * once per rider. total_fare = per_passenger_fare(distance_km, passenger_count) * passenger_count.
     */
    public static function calculate(float $distanceKm, int $passengerCount): float
    {
        $safeCount = max(1, $passengerCount);

        return round(self::perPassengerFare($distanceKm, $safeCount) * $safeCount, 2);
    }
}
