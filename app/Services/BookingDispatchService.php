<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDriverDecline;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BookingDispatchService
{
    /**
     * How long a single driver has to accept a booking before dispatch moves to the next nearest driver.
     */
    public const OFFER_TIMEOUT_SECONDS = 25;

    /**
     * Maximum radius from pickup to search for eligible drivers in kilometers.
     */
    public const MAX_SEARCH_RADIUS_KM = 3.0;

    /**
     * Get all eligible drivers for a booking, sorted by distance from pickup (nearest first).
     *
     * @param Booking $booking
     * @param float $maxRadiusKm
     * @return Collection<int, Driver>
     */
    public static function getEligibleDrivers(Booking $booking, float $maxRadiusKm = self::MAX_SEARCH_RADIUS_KM): Collection
    {
        $declinedDriverIds = BookingDriverDecline::where('booking_id', $booking->id)
            ->pluck('driver_id')
            ->all();

        $drivers = Driver::where('is_online', true)
            ->where('is_available', true)
            // A driver whose assigned franchise is suspended/revoked is already forced offline
            // the moment TMO changes the franchise's status (see
            // FranchiseScheme::transitionStatus()), but this is checked explicitly too — the
            // dispatch candidate pool must never include a driver whose franchise isn't currently
            // authorized to operate, regardless of how is_online/is_available got set.
            ->whereHas('tricycle.franchiseScheme', fn ($q) => $q->where('status', FranchiseScheme::STATUS_ACTIVE))
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            ->whereNotIn('id', $declinedDriverIds)
            ->get();

        $pickupLat = (float) $booking->pickup_lat;
        $pickupLng = (float) $booking->pickup_lng;

        return $drivers
            ->map(function (Driver $driver) use ($pickupLat, $pickupLng) {
                $distanceKm = GeoService::haversineKm(
                    (float) $driver->current_lat,
                    (float) $driver->current_lng,
                    $pickupLat,
                    $pickupLng
                );
                $driver->pickup_distance_km = round($distanceKm, 2);
                return $driver;
            })
            ->filter(function (Driver $driver) use ($maxRadiusKm) {
                return $driver->pickup_distance_km <= $maxRadiusKm;
            })
            ->sortBy('pickup_distance_km')
            ->values();
    }

    /**
     * Evaluate the current dispatch state of a pending booking.
     * Checks for timeouts or declines and automatically advances to the next nearest driver if needed.
     *
     * Runs inside a row lock on the booking so this never races with a concurrent call for the
     * same booking (e.g. the passenger's own poll and another driver's poll evaluating the same
     * booking at the same instant, or this racing an in-flight acceptBooking()) — whichever
     * request acquires the lock first sees and writes the authoritative state; the other blocks
     * briefly and then re-reads the now-current row instead of clobbering it with a stale decision.
     *
     * @param Booking $booking
     * @return Driver|null The currently targeted driver, or null if no drivers available.
     */
    public static function evaluateDispatch(Booking $booking): ?Driver
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->first();

            if (!$locked || $locked->status !== 'pending') {
                return null;
            }

            $target = self::evaluateLocked($locked);

            // Keep the caller's in-memory copy in sync with whatever this call just committed,
            // since several call sites read $booking's attributes again right after calling this.
            $booking->setRawAttributes($locked->getAttributes(), true);

            return $target;
        });
    }

    /**
     * The actual evaluate logic, run against an already row-locked Booking inside a transaction.
     */
    private static function evaluateLocked(Booking $locked): ?Driver
    {
        // If a driver is currently dispatched, verify if the offer has expired or been declined
        if ($locked->dispatched_driver_id) {
            $hasDeclined = BookingDriverDecline::where('booking_id', $locked->id)
                ->where('driver_id', $locked->dispatched_driver_id)
                ->exists();

            $isExpired = false;
            if ($locked->dispatched_at) {
                // Carbon 3 (in use here) returns a SIGNED diff by default — dispatched_at (past)
                // ->diffInSeconds(now()) is the order that yields a positive elapsed-time value,
                // matching the convention already used elsewhere in this codebase (see
                // GpsDevice::status(), Tricycle's staleness check). The previous now()->diffInSeconds
                // ($dispatched_at) ordering returned a NEGATIVE number for any past timestamp, so
                // this check was never true and offers never expired via timeout — the root cause
                // of a driver staying the dispatch target long after they should have been passed
                // over.
                $secondsElapsed = $locked->dispatched_at->diffInSeconds(now());
                if ($secondsElapsed >= self::OFFER_TIMEOUT_SECONDS) {
                    $isExpired = true;
                }
            }

            if ($hasDeclined || $isExpired) {
                // If expired without an explicit decline record, log it so the queue moves forward permanently
                if ($isExpired && !$hasDeclined) {
                    BookingDriverDecline::firstOrCreate([
                        'booking_id' => $locked->id,
                        'driver_id'  => $locked->dispatched_driver_id,
                    ]);
                }

                return self::advanceLocked($locked);
            }

            // Current driver is still within the active offer window — re-check their eligibility
            // against the CURRENT driver row, never a cached/stale copy. Includes canOperate() so
            // a driver whose FRANCHISE is suspended/revoked WHILE an offer is outstanding to them
            // is advanced past, not left holding a live offer they're no longer authorized to accept.
            $currentDriver = Driver::find($locked->dispatched_driver_id);
            if ($currentDriver && $currentDriver->is_online && $currentDriver->is_available && $currentDriver->canOperate()) {
                return $currentDriver;
            }

            // Driver went offline or became unavailable mid-offer -> advance
            BookingDriverDecline::firstOrCreate([
                'booking_id' => $locked->id,
                'driver_id'  => $locked->dispatched_driver_id,
            ]);
            return self::advanceLocked($locked);
        }

        // No driver dispatched yet -> advance
        return self::advanceLocked($locked);
    }

    /**
     * Advance the dispatch queue to the next nearest eligible driver.
     *
     * @param Booking $booking
     * @return Driver|null
     */
    public static function advanceDispatch(Booking $booking): ?Driver
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->first();

            if (!$locked || $locked->status !== 'pending') {
                return null;
            }

            $target = self::advanceLocked($locked);
            $booking->setRawAttributes($locked->getAttributes(), true);

            return $target;
        });
    }

    /**
     * The actual advance logic, run against an already row-locked Booking inside a transaction.
     * Recalculates eligible drivers from current DB state every time — never reuses a cached
     * candidate — and re-targets the nearest one not yet declined/timed-out for this booking.
     * If no drivers remain, clears the dispatch target so the booking stays pending for the next
     * eligible driver to come online/into range, without ever silently cancelling it.
     */
    private static function advanceLocked(Booking $locked): ?Driver
    {
        $eligibleDrivers = self::getEligibleDrivers($locked);
        $nextDriver = $eligibleDrivers->first();

        if ($nextDriver) {
            $locked->update([
                'dispatched_driver_id' => $nextDriver->id,
                'dispatched_at'        => now(),
            ]);

            return $nextDriver;
        }

        // No eligible drivers currently available — keep booking pending for any driver coming online/in range
        $locked->update([
            'dispatched_driver_id' => null,
            'dispatched_at'        => null,
        ]);

        return null;
    }

    /**
     * Handle explicit decline from a driver and immediately advance to the next nearest driver.
     *
     * @param Booking $booking
     * @param int $driverId
     * @return Driver|null
     */
    public static function handleDriverDecline(Booking $booking, int $driverId): ?Driver
    {
        return DB::transaction(function () use ($booking, $driverId) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->first();

            if (!$locked) {
                return null;
            }

            BookingDriverDecline::firstOrCreate([
                'booking_id' => $locked->id,
                'driver_id'  => $driverId,
            ]);

            if ($locked->status !== 'pending') {
                $booking->setRawAttributes($locked->getAttributes(), true);
                return null;
            }

            $target = self::advanceLocked($locked);
            $booking->setRawAttributes($locked->getAttributes(), true);

            return $target;
        });
    }
}
