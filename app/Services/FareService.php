<?php

namespace App\Services;

use App\Models\FareConfiguration;

class FareService
{
    /**
     * Fallback flat base fare for a single-passenger trip up to and including FREE_DISTANCE_KM.
     */
    public const BASE_FARE_SINGLE = 50.0;

    /**
     * Fallback base fare charged per passenger for a trip with 2 or more passengers, up to and
     * including FREE_DISTANCE_KM.
     */
    public const BASE_FARE_PER_PASSENGER = 25.0;

    /**
     * Fallback distance (in km) covered by the base fare before any additional charge applies.
     */
    public const FREE_DISTANCE_KM = 4.0;

    /**
     * Fallback additional charge per kilometer beyond FREE_DISTANCE_KM, charged once per passenger.
     * Billed continuously (fractional km), not rounded up to the next whole km.
     */
    public const RATE_PER_KM = 5.0;

    /**
     * Retrieve the currently active fare configuration from the database.
     * Returns a fallback FareConfiguration instance if the database has no records yet.
     */
    public static function getActiveFare(?\DateTimeInterface $asOf = null): FareConfiguration
    {
        $active = FareConfiguration::activeAsOf($asOf);

        if ($active) {
            return $active;
        }

        return new FareConfiguration([
            'base_fare' => self::BASE_FARE_SINGLE,
            'base_fare_per_passenger' => self::BASE_FARE_PER_PASSENGER,
            'included_distance_km' => self::FREE_DISTANCE_KM,
            'rate_per_km' => self::RATE_PER_KM,
            'effective_date' => '2026-01-01',
            'is_active' => true,
        ]);
    }

    /**
     * The base fare for a trip, before any distance charge: ₱50 flat for exactly 1 passenger,
     * or ₱25 per passenger for 2 or more (configurable via active FareConfiguration).
     */
    public static function baseFare(int $passengerCount, ?FareConfiguration $config = null): float
    {
        $config = $config ?? self::getActiveFare();

        return (float) ($passengerCount <= 1 ? $config->base_fare : $config->base_fare_per_passenger);
    }

    /**
     * The per-passenger fare for the booking's route distance: baseFare(passengerCount) plus
     * (distance_km - included_distance_km) * rate_per_km for any distance beyond included_distance_km
     * (floored at 0 for distance_km <= included_distance_km). Charged continuously — a partial
     * kilometer beyond the free distance is billed proportionally, not rounded up.
     */
    public static function perPassengerFare(float $distanceKm, int $passengerCount, ?FareConfiguration $config = null): float
    {
        $config = $config ?? self::getActiveFare();

        $includedDistance = (float) $config->included_distance_km;
        $ratePerKm = (float) $config->rate_per_km;

        // Round first so floating-point noise from upstream distance sources (e.g. a routing
        // service response) can't push a value that's really exactly at the free-distance
        // boundary (4.0) a hair over it.
        $excessKm = max(0.0, round($distanceKm, 2) - $includedDistance);
        $distanceFee = round($excessKm * $ratePerKm, 2);

        return round(self::baseFare($passengerCount, $config) + $distanceFee, 2);
    }

    /**
     * The single source of truth for the booking's final fare: the per-passenger fare charged
     * once per rider. total_fare = per_passenger_fare(distance_km, passenger_count) * passenger_count.
     */
    public static function calculate(float $distanceKm, int $passengerCount, ?FareConfiguration $config = null): float
    {
        $safeCount = max(1, $passengerCount);

        return round(self::perPassengerFare($distanceKm, $safeCount, $config) * $safeCount, 2);
    }
}
