<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDispatchOffer;
use App\Models\BookingDriverDecline;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BookingDispatchService
{
    /**
     * Search radius configurations per round in kilometers.
     */
    public const ROUND_1_MAX_RADIUS_KM = 0.5; // 500 meters
    public const ROUND_2_MAX_RADIUS_KM = 1.0; // 1,000 meters
    public const ROUND_3_MAX_RADIUS_KM = 2.0; // 2,000 meters

    /**
     * Maximum response window per dispatch round in seconds.
     */
    public const ROUND_TIMEOUT_SECONDS = 20;

    /**
     * Maximum number of dispatch rounds before search is exhausted.
     */
    public const MAX_ROUNDS = 3;

    // Backward-compatibility aliases
    public const OFFER_TIMEOUT_SECONDS = self::ROUND_TIMEOUT_SECONDS;
    public const MAX_SEARCH_RADIUS_KM = self::ROUND_3_MAX_RADIUS_KM;

    /**
     * Get maximum radius in kilometers for a given dispatch round.
     */
    public static function getRadiusForRound(int $round): float
    {
        return match ($round) {
            1 => self::ROUND_1_MAX_RADIUS_KM,
            2 => self::ROUND_2_MAX_RADIUS_KM,
            default => self::ROUND_3_MAX_RADIUS_KM,
        };
    }

    /**
     * Get all eligible drivers for a booking within a given radius, excluding specified driver IDs.
     *
     * @param Booking $booking
     * @param float $maxRadiusKm
     * @param array<int> $excludedDriverIds
     * @return Collection<int, Driver>
     */
    public static function getEligibleDrivers(
        Booking $booking,
        float $maxRadiusKm = self::ROUND_1_MAX_RADIUS_KM,
        array $excludedDriverIds = []
    ): Collection {
        $declinedDriverIds = BookingDriverDecline::where('booking_id', $booking->id)
            ->pluck('driver_id')
            ->all();

        $allExcluded = array_values(array_unique(array_merge($declinedDriverIds, $excludedDriverIds)));

        $drivers = Driver::effectivelyOnline()
            ->where('is_available', true)
            // A driver whose assigned franchise is suspended/revoked is already forced offline
            // the moment TMO changes the franchise's status (see
            // FranchiseScheme::transitionStatus()), but this is checked explicitly too — the
            // dispatch candidate pool must never include a driver whose franchise isn't currently
            // authorized to operate, regardless of how is_online/is_available got set.
            ->whereHas('tricycle.franchiseScheme', fn ($q) => $q->where('status', FranchiseScheme::STATUS_ACTIVE))
            // A driver running a QR walk-in ride session is never offered a booked ride too
            // (they are already marked unavailable; this holds even if is_available drifts).
            ->whereDoesntHave('rideSessions', fn ($q) => $q->open())
            // ...and neither is a driver in the middle of a Manual Ride (walk-in, no app).
            ->whereDoesntHave('bookings', fn ($q) => $q->where('booking_type', Booking::TYPE_MANUAL)->where('status', 'in_transit'))
            ->when($booking->payment_method === Booking::PAYMENT_METHOD_GCASH, fn ($q) => $q->whereNotNull('gcash_qr_path'))
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            ->whereNotIn('id', $allExcluded)
            ->get();

        $pickupLat = (float) $booking->pickup_lat;
        $pickupLng = (float) $booking->pickup_lng;

        return $drivers
            ->filter(fn (Driver $driver) => $driver->canOperate())
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
     * Dispatches the specified round to all newly eligible drivers within that round's radius.
     */
    public static function dispatchRound(Booking $locked, int $round): Collection
    {
        $radiusKm = self::getRadiusForRound($round);

        // Drivers who already received an offer for this booking in ANY round are never offered it again
        $alreadyOfferedDriverIds = BookingDispatchOffer::where('booking_id', $locked->id)
            ->pluck('driver_id')
            ->all();

        $eligibleDrivers = self::getEligibleDrivers($locked, $radiusKm, $alreadyOfferedDriverIds);

        foreach ($eligibleDrivers as $driver) {
            BookingDispatchOffer::firstOrCreate(
                [
                    'booking_id' => $locked->id,
                    'driver_id'  => $driver->id,
                ],
                [
                    'dispatch_round' => $round,
                    'status'         => BookingDispatchOffer::STATUS_OFFERED,
                ]
            );
        }

        $locked->update([
            'dispatch_round'       => $round,
            'dispatched_at'        => now(),
            'dispatched_driver_id' => $eligibleDrivers->first()?->id,
        ]);

        return $eligibleDrivers;
    }

    /**
     * Evaluate the dispatch state of a pending booking.
     * Advances rounds if timed out, or cancels as 'no_driver_available' if all 3 rounds exhaust.
     *
     * @param Booking $booking
     * @return Collection<int, Driver> Drivers with active offers in the current round.
     */
    public static function evaluateDispatch(Booking $booking): Collection
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->first();

            if (!$locked || $locked->status !== 'pending') {
                return collect();
            }

            $currentRound = (int) ($locked->dispatch_round ?: 1);

            // 1. Initial dispatch if not yet started
            if (!$locked->dispatched_at) {
                $drivers = self::dispatchRound($locked, 1);
                $booking->setRawAttributes($locked->getAttributes(), true);
                return $drivers;
            }

            // 2. Check elapsed time in current round
            $secondsElapsed = $locked->dispatched_at->diffInSeconds(now());

            if ($secondsElapsed >= self::ROUND_TIMEOUT_SECONDS) {
                // Mark current round's unaccepted offers as expired
                BookingDispatchOffer::where('booking_id', $locked->id)
                    ->where('dispatch_round', $currentRound)
                    ->where('status', BookingDispatchOffer::STATUS_OFFERED)
                    ->update(['status' => BookingDispatchOffer::STATUS_EXPIRED]);

                if ($currentRound < self::MAX_ROUNDS) {
                    // Advance to next round
                    $nextRound = $currentRound + 1;
                    $drivers = self::dispatchRound($locked, $nextRound);
                    $booking->setRawAttributes($locked->getAttributes(), true);
                    return $drivers;
                }

                // All 3 rounds exhausted!
                $locked->update([
                    'status'              => 'cancelled',
                    'cancelled_by'        => 'system',
                    'cancellation_reason' => 'no_driver_available',
                    'cancelled_at'        => now(),
                ]);

                $booking->setRawAttributes($locked->getAttributes(), true);
                return collect();
            }

            // 3. Current round still active: offer to any newly online/in-range drivers who haven't received an offer yet
            $radiusKm = self::getRadiusForRound($currentRound);
            $alreadyOfferedDriverIds = BookingDispatchOffer::where('booking_id', $locked->id)
                ->pluck('driver_id')
                ->all();
            $newlyEligible = self::getEligibleDrivers($locked, $radiusKm, $alreadyOfferedDriverIds);

            foreach ($newlyEligible as $driver) {
                BookingDispatchOffer::firstOrCreate(
                    [
                        'booking_id' => $locked->id,
                        'driver_id'  => $driver->id,
                    ],
                    [
                        'dispatch_round' => $currentRound,
                        'status'         => BookingDispatchOffer::STATUS_OFFERED,
                    ]
                );
            }

            // Return all drivers who currently have active 'offered' status in this round
            $activeDriverIds = BookingDispatchOffer::where('booking_id', $locked->id)
                ->where('dispatch_round', $currentRound)
                ->where('status', BookingDispatchOffer::STATUS_OFFERED)
                ->pluck('driver_id');

            $activeDrivers = Driver::whereIn('id', $activeDriverIds)->get();

            $booking->setRawAttributes($locked->getAttributes(), true);
            return $activeDrivers;
        });
    }

    /**
     * Handle explicit decline from a driver.
     * Records decline without cancelling for other drivers; if all offered drivers in this round have declined,
     * advances immediately to next round or exhausts if at max rounds.
     *
     * @param Booking $booking
     * @param int $driverId
     * @return Collection<int, Driver>
     */
    public static function handleDriverDecline(Booking $booking, int $driverId): Collection
    {
        return DB::transaction(function () use ($booking, $driverId) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->first();

            if (!$locked) {
                return collect();
            }

            BookingDriverDecline::firstOrCreate([
                'booking_id' => $locked->id,
                'driver_id'  => $driverId,
            ]);

            BookingDispatchOffer::where('booking_id', $locked->id)
                ->where('driver_id', $driverId)
                ->update(['status' => BookingDispatchOffer::STATUS_DECLINED]);

            if ($locked->status !== 'pending') {
                $booking->setRawAttributes($locked->getAttributes(), true);
                return collect();
            }

            $currentRound = (int) ($locked->dispatch_round ?: 1);

            // Check if any other drivers still hold an active offer in this round
            $hasRemainingOffers = BookingDispatchOffer::where('booking_id', $locked->id)
                ->where('dispatch_round', $currentRound)
                ->where('status', BookingDispatchOffer::STATUS_OFFERED)
                ->exists();

            if (!$hasRemainingOffers) {
                // All offered drivers in this round have declined!
                if ($currentRound < self::MAX_ROUNDS) {
                    $nextRound = $currentRound + 1;
                    $drivers = self::dispatchRound($locked, $nextRound);
                    $booking->setRawAttributes($locked->getAttributes(), true);
                    return $drivers;
                }

                // Exhausted!
                $locked->update([
                    'status'              => 'cancelled',
                    'cancelled_by'        => 'system',
                    'cancellation_reason' => 'no_driver_available',
                    'cancelled_at'        => now(),
                ]);

                $booking->setRawAttributes($locked->getAttributes(), true);
                return collect();
            }

            $booking->setRawAttributes($locked->getAttributes(), true);

            $activeDriverIds = BookingDispatchOffer::where('booking_id', $locked->id)
                ->where('dispatch_round', $currentRound)
                ->where('status', BookingDispatchOffer::STATUS_OFFERED)
                ->pluck('driver_id');

            return Driver::whereIn('id', $activeDriverIds)->get();
        });
    }

    /**
     * Check if a driver has an active offer for a booking.
     */
    public static function hasActiveOffer(Booking $booking, int $driverId): bool
    {
        return BookingDispatchOffer::where('booking_id', $booking->id)
            ->where('driver_id', $driverId)
            ->where('status', BookingDispatchOffer::STATUS_OFFERED)
            ->exists();
    }
}
