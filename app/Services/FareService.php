<?php

namespace App\Services;

use App\Models\FareConfiguration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FareService
{
    /**
     * Cache lifetime (seconds) for the "current" active fare configuration. Kept short because the
     * active configuration can roll over at an effective-datetime boundary without any write.
     */
    public const CACHE_TTL_CURRENT_SECONDS = 60;

    /**
     * Cache lifetime (seconds) for an explicitly-dated (historical or future) lookup. History rows
     * are immutable, so this is bounded only by version invalidation on a new configuration.
     */
    public const CACHE_TTL_ASOF_SECONDS = 86400;

    /** Bumped on every successful fare write to invalidate every derived cache key at once. */
    private const CACHE_VERSION_KEY = 'fare.active.version';

    private const CACHE_KEY_PREFIX = 'fare.active';

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
     *
     * Results are cached under a version-stamped key so a fare write can invalidate every derived
     * entry atomically (see forgetActiveFareCache). A null `$asOf` ("now") uses a short TTL because
     * the active row can change at an effective-datetime boundary with no write; an explicit
     * `$asOf` (historical/explicit date) is immutable history and is cached for longer.
     */
    public static function getActiveFare(?\DateTimeInterface $asOf = null): FareConfiguration
    {
        $cacheKey = self::activeFareCacheKey($asOf);

        $cached = Cache::get($cacheKey);
        if ($cached instanceof FareConfiguration) {
            return $cached;
        }

        $active = FareConfiguration::activeAsOf($asOf);

        $config = $active ?? new FareConfiguration([
            'base_fare' => self::BASE_FARE_SINGLE,
            'base_fare_per_passenger' => self::BASE_FARE_PER_PASSENGER,
            'included_distance_km' => self::FREE_DISTANCE_KM,
            'rate_per_km' => self::RATE_PER_KM,
            'effective_date' => '2026-01-01',
            'is_active' => true,
        ]);

        $ttl = $asOf === null ? self::CACHE_TTL_CURRENT_SECONDS : self::CACHE_TTL_ASOF_SECONDS;
        Cache::put($cacheKey, $config, now()->addSeconds($ttl));

        return $config;
    }

    /**
     * Invalidate every cached active-fare lookup by bumping the cache version. Call this only after
     * a successful database transaction that wrote a fare configuration (see FareManagementController).
     */
    public static function forgetActiveFareCache(): void
    {
        Cache::forever(self::CACHE_VERSION_KEY, self::activeFareCacheVersion() + 1);
    }

    /**
     * The version every active-fare cache key is stamped with; a fare write bumps it (see
     * forgetActiveFareCache), invalidating all derived entries at once. Exposed for tests to
     * observe whether (and when) the cache was invalidated.
     */
    public static function activeFareCacheVersion(): int
    {
        return (int) Cache::get(self::CACHE_VERSION_KEY, 1);
    }

    /** Test-only hook: the defer decision follows this when set, otherwise the runtime rule. */
    private static ?bool $deferInvalidationOverride = null;

    /**
     * Test-only override so a test can exercise the real after-commit / rollback path even though
     * app()->runningUnitTests() is always true under PHPUnit. Pass null to restore the runtime rule.
     */
    public static function forceDeferredCacheInvalidation(?bool $defer): void
    {
        self::$deferInvalidationOverride = $defer;
    }

    /**
     * Invalidate only once the surrounding write has actually committed, so a concurrent reader
     * can never repopulate the cache from the pre-write state and a rolled-back write can never
     * leave the cache pointing at a configuration that was never persisted.
     *
     * Outside a transaction there is nothing to defer to. Under PHPUnit the outer
     * DatabaseTransactions wrapper is rolled back rather than committed, so an after-commit
     * callback would never fire; invalidation is only ever a cache clear, so tests clear
     * immediately to stay deterministic.
     */
    public static function forgetActiveFareCacheAfterCommit(): void
    {
        if (! self::shouldDeferInvalidation() || DB::transactionLevel() === 0) {
            self::forgetActiveFareCache();

            return;
        }

        DB::afterCommit(static fn () => self::forgetActiveFareCache());
    }

    private static function shouldDeferInvalidation(): bool
    {
        if (self::$deferInvalidationOverride !== null) {
            return self::$deferInvalidationOverride;
        }

        return ! app()->runningUnitTests();
    }

    /**
     * Version-stamped cache key. `null` $asOf caches the "current" lookup; an explicit date caches
     * under its timestamp so historical and future lookups never collide.
     */
    private static function activeFareCacheKey(?\DateTimeInterface $asOf): string
    {
        $suffix = $asOf === null ? 'now' : (string) $asOf->getTimestamp();

        return self::CACHE_KEY_PREFIX . ':v' . self::activeFareCacheVersion() . ':' . $suffix;
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
