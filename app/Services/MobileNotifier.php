<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDispatchOffer;
use App\Models\Driver;
use App\Models\FareConfiguration;
use App\Models\FranchiseScheme;
use App\Models\Passenger;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;

/**
 * The passenger- and driver-app notifications for real business events: wording and recipients.
 * Delivery (in-app row + phone push, idempotency, after-commit) is App\Services\AppNotifier's job.
 *
 * Like StaffNotifier, every method is called from the code path that performs the change — never
 * from model events — so seeders and data fixes never notify anyone, and every method is safe to
 * call inside the business transaction (nothing happens unless it commits).
 *
 * Recipients always come from the record itself (the booking's own passenger/driver, the
 * violation's tricycle, the dispatch offers), never from client input. Push previews carry only
 * generic wording — names, addresses, fines and reasons stay inside the app.
 */
class MobileNotifier
{
    // ── Booking requests (driver) ───────────────────────────────────────────────────────────

    /**
     * A booking was offered to these drivers by BookingDispatchService.
     *
     * @param  array<int, int>  $driverIds
     */
    public static function bookingOffered(Booking $booking, array $driverIds): void
    {
        self::safely(static function () use ($booking, $driverIds) {
            $userIds = self::driverUserIds($driverIds);
            $count = (int) ($booking->passenger_count ?: 1);

            AppNotifier::notify('driver', $userIds, 'booking_request', 'New ride request',
                "{$booking->pickup_name} → {$booking->dropoff_name} · {$count} " . ($count === 1 ? 'passenger' : 'passengers')
                    . ' · ' . self::peso($booking->fare_amount) . '. Respond before the offer expires.',
                [
                    'dedupe'      => self::requestDedupe($booking),
                    'group'       => self::requestDedupe($booking),
                    'record_type' => 'booking',
                    'record_id'   => $booking->id,
                    'push_body'   => 'A passenger near you needs a ride. Open Trivora to respond.',
                ]);
        });
    }

    /**
     * These drivers' offers for the booking are no longer valid (taken by another driver,
     * declined, expired or cancelled): remove the request from their notifications and phones.
     *
     * @param  array<int, int>  $driverIds
     */
    public static function bookingOfferWithdrawn(Booking $booking, array $driverIds): void
    {
        self::safely(static function () use ($booking, $driverIds) {
            AppNotifier::withdraw('driver', self::driverUserIds($driverIds), self::requestDedupe($booking), self::requestDedupe($booking));
        });
    }

    /** Every driver this booking was ever offered to, except $exceptDriverId. */
    public static function withdrawAllOffers(Booking $booking, ?int $exceptDriverId = null): void
    {
        self::safely(static function () use ($booking, $exceptDriverId) {
            $driverIds = BookingDispatchOffer::where('booking_id', $booking->id)
                ->when($exceptDriverId, fn ($q) => $q->where('driver_id', '!=', $exceptDriverId))
                ->pluck('driver_id')
                ->all();

            self::bookingOfferWithdrawn($booking, $driverIds);
        });
    }

    // ── Booking lifecycle ───────────────────────────────────────────────────────────────────

    /** A driver won the booking (BookingController::acceptBooking). */
    public static function bookingAccepted(Booking $booking): void
    {
        self::safely(static function () use ($booking) {
            $booking->loadMissing(['passenger', 'driver', 'tricycle']);
            $plate = $booking->tricycle?->plate_number;

            AppNotifier::notify('passenger', self::passengerUserIds($booking), 'booking_accepted', 'Driver assigned',
                "A driver accepted your ride {$booking->booking_code}" . ($plate ? " — tricycle {$plate}" : '') . ' is on the way to your pickup point.',
                [
                    'dedupe'      => "booking_accepted:{$booking->id}",
                    'record_type' => 'booking',
                    'record_id'   => $booking->id,
                    'push_body'   => 'A driver accepted your ride and is on the way to your pickup point.',
                ]);

            AppNotifier::notify('driver', self::driverUserIds([$booking->driver_id]), 'booking_assigned', 'Ride assigned to you',
                "Booking {$booking->booking_code} is now yours. Head to the pickup point: {$booking->pickup_name}.",
                [
                    'dedupe'      => "booking_assigned:{$booking->id}",
                    'record_type' => 'booking',
                    'record_id'   => $booking->id,
                    'push_body'   => 'Head to the pickup point. Open Trivora for directions.',
                ]);

            self::withdrawAllOffers($booking, $booking->driver_id);
        });
    }

    /**
     * The booking was cancelled. $by is the booking's own `cancelled_by` ('passenger', 'driver' or
     * 'system'); the side that cancelled is never notified about its own action.
     */
    public static function bookingCancelled(Booking $booking): void
    {
        self::safely(static function () use ($booking) {
            $by = $booking->cancelled_by;
            $options = [
                'dedupe'      => "booking_cancelled:{$booking->id}",
                'record_type' => 'booking',
                'record_id'   => $booking->id,
            ];

            if ($by === 'driver') {
                AppNotifier::notify('passenger', self::passengerUserIds($booking), 'booking_cancelled', 'Ride cancelled',
                    "Your driver cancelled ride {$booking->booking_code}. You can book another tricycle from the Home screen.",
                    $options + ['push_body' => 'Your driver cancelled the ride. Open Trivora to book again.']);
            } elseif ($by === 'system') {
                AppNotifier::notify('passenger', self::passengerUserIds($booking), 'booking_cancelled', 'No driver available',
                    "No tricycle accepted ride {$booking->booking_code} in time. Please try booking again.",
                    $options + ['push_body' => 'No tricycle was available for your ride. Please try again.']);
            } elseif ($booking->driver_id) {
                AppNotifier::notify('driver', self::driverUserIds([$booking->driver_id]), 'booking_cancelled', 'Ride cancelled',
                    "The passenger cancelled ride {$booking->booking_code}. You're available for new requests again.",
                    $options + ['push_body' => 'The passenger cancelled the ride.']);
            }

            // Nobody can accept a cancelled booking any more (an accepted one already withdrew them).
            if (! $booking->driver_id) {
                self::withdrawAllOffers($booking);
            }
        });
    }

    /** The ride was completed (BookingController::updateStatus). */
    public static function bookingCompleted(Booking $booking): void
    {
        self::safely(static function () use ($booking) {
            $fare = self::peso($booking->fare_amount);

            AppNotifier::notify('passenger', self::passengerUserIds($booking), 'booking_completed', 'Trip completed',
                "Ride {$booking->booking_code} is complete. Total fare {$fare}. Tap to view your e-receipt.",
                [
                    'dedupe'      => "booking_completed:{$booking->id}",
                    'record_type' => 'booking',
                    'record_id'   => $booking->id,
                    'push_body'   => 'You have arrived. Tap to view your e-receipt.',
                ]);

            AppNotifier::notify('driver', self::driverUserIds([$booking->driver_id]), 'booking_completed', 'Trip completed',
                "Ride {$booking->booking_code} is complete. Fare {$fare} recorded in your ride history.",
                [
                    'dedupe'      => "booking_completed:{$booking->id}",
                    'record_type' => 'booking',
                    'record_id'   => $booking->id,
                    'push_body'   => 'Trip completed. Open Trivora to see the summary.',
                ]);
        });
    }

    // ── Violations & franchise (driver) ─────────────────────────────────────────────────────

    /** A violation row was just created (TelemetryService / DashboardController::storeViolation). */
    public static function violationRecorded(Violation $violation): void
    {
        self::safely(static function () use ($violation) {
            $type = ucwords(str_replace('_', ' ', (string) $violation->violation_type));
            $date = $violation->detected_at?->copy()->timezone(config('app.timezone'))->format('M j, Y g:i A');
            $fine = $violation->fine_amount !== null ? ' Fine: ' . self::peso($violation->fine_amount) . '.' : '';

            self::notifyViolationDriver($violation, 'violation_recorded', 'New violation recorded',
                self::citation($violation) . " — {$type} violation" . ($date ? " on {$date}" : '') . ".{$fine} Open Violations to view details or file an appeal.",
                "violation_recorded:{$violation->id}",
                'A new violation was recorded for your unit. Open Trivora to view details.');
        });
    }

    /** TMO decided the driver's appeal (DashboardController::approveAppeal / rejectAppeal). */
    public static function violationAppealDecided(ViolationAppeal $appeal): void
    {
        self::safely(static function () use ($appeal) {
            $violation = $appeal->violation;
            if (! $violation) {
                return;
            }

            $approved = $appeal->status === 'approved';
            self::notifyViolationDriver($violation,
                $approved ? 'violation_appeal_approved' : 'violation_appeal_rejected',
                $approved ? 'Appeal approved' : 'Appeal rejected',
                $approved
                    ? 'TMO approved your appeal for ' . self::citation($violation) . '. The violation is resolved and no fine is due.'
                    : 'TMO rejected your appeal for ' . self::citation($violation) . '. The fine is still due — open the violation to see the reason.',
                "violation_appeal:{$appeal->id}:{$appeal->status}",
                'TMO has decided your violation appeal. Open Trivora to see the result.');
        });
    }

    /** TMO confirmed the fine was paid (TMO\ViolationPaymentController). */
    public static function violationFinePaid(Violation $violation): void
    {
        self::safely(static function () use ($violation) {
            self::notifyViolationDriver($violation, 'violation_settled', 'Violation settled',
                'TMO confirmed your fine payment for ' . self::citation($violation) . '. The violation is now settled.',
                "violation_settled:{$violation->id}",
                'Your violation fine payment was confirmed.');
        });
    }

    /**
     * A franchise's operational status changed (FranchiseScheme::transitionStatus). Every driver
     * assigned to the franchise's tricycle is told.
     */
    public static function franchiseStatusChanged(FranchiseScheme $franchise, string $toStatus, ?string $reason, int $historyId): void
    {
        self::safely(static function () use ($franchise, $toStatus, $reason, $historyId) {
            $number = $franchise->franchise_number ? " #{$franchise->franchise_number}" : '';
            $reasonText = $reason ? " Reason: {$reason}" : '';

            [$title, $message, $push] = match ($toStatus) {
                FranchiseScheme::STATUS_SUSPENDED => ['Franchise suspended',
                    "TMO suspended franchise{$number}. You can't go online or accept rides until it is reinstated.{$reasonText}",
                    'Your franchise was suspended by TMO. Open Trivora for details.'],
                FranchiseScheme::STATUS_REVOKED => ['Franchise revoked',
                    "TMO revoked franchise{$number}. This unit can no longer operate.{$reasonText}",
                    'Your franchise was revoked by TMO. Open Trivora for details.'],
                FranchiseScheme::STATUS_ACTIVE => ['Franchise reinstated',
                    "TMO reinstated franchise{$number}. You can go online and accept rides again.",
                    'Your franchise was reinstated. You can go online again.'],
                default => [null, null, null],
            };

            if (! $title) {
                return;
            }

            $driverIds = Driver::where('tricycle_id', $franchise->tricycle_id)->pluck('id')->all();

            AppNotifier::notify('driver', self::driverUserIds($driverIds), 'franchise_' . $toStatus, $title, $message, [
                'dedupe'      => "franchise_status:{$historyId}",
                'record_type' => 'franchise',
                'record_id'   => $franchise->id,
                'push_body'   => $push,
            ]);
        });
    }

    // ── Fare configuration (everyone) ───────────────────────────────────────────────────────

    /**
     * TMO saved a new fare configuration (TMO\FareManagementController::store). Every registered
     * passenger and driver gets it, online or not — the row waits in their notification list.
     */
    public static function fareConfigurationSaved(FareConfiguration $fare): void
    {
        self::safely(static function () use ($fare) {
            $timezone = config('app.timezone');
            $effective = $fare->effective_date?->copy()->timezone($timezone);
            if (! $effective) {
                return;
            }

            $upcoming = $effective->isFuture();
            $when = $effective->format('F j, Y \a\t g:i A') . ($timezone === 'Asia/Manila' ? ' (Philippine Time)' : " ({$timezone})");
            $rates = 'Base fare ' . self::peso($fare->base_fare) . ' for 1 passenger or ' . self::peso($fare->base_fare_per_passenger)
                . ' per passenger for 2 or more, covering the first ' . rtrim(rtrim(number_format((float) $fare->included_distance_km, 2), '0'), '.')
                . ' km, then ' . self::peso($fare->rate_per_km) . ' per additional km.';

            $title = $upcoming ? 'Upcoming fare change' : 'New fare rates in effect';
            $message = 'TMO has updated the official tricycle fare rates. '
                . ($upcoming ? "The new rates take effect on {$when}. " : "The new rates took effect on {$when}. ")
                . $rates;
            $push = 'TMO updated the official tricycle fare rates. ' . ($upcoming ? "Effective {$when}." : "Now in effect since {$when}.");

            $options = [
                'dedupe'      => "fare_configuration:{$fare->id}",
                'record_type' => 'fare_configuration',
                'record_id'   => $fare->id,
                'push_body'   => $push,
                'data'        => [
                    'effective_at' => $effective->toIso8601String(),
                    'fare_status'  => $upcoming ? 'upcoming' : 'effective',
                ],
            ];

            $passengerUserIds = User::where('is_active', true)
                ->where(fn ($q) => $q->where('role', 'passenger')->orWhereIn('id', Passenger::select('user_id')))
                ->pluck('id')
                ->all();
            $driverUserIds = Driver::query()
                ->join('users', 'users.id', '=', 'drivers.user_id')
                ->where('users.is_active', true)
                ->pluck('drivers.user_id')
                ->all();

            AppNotifier::notify('passenger', $passengerUserIds, 'fare_updated', $title, $message, $options);
            AppNotifier::notify('driver', $driverUserIds, 'fare_updated', $title, $message, $options);
        });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────────────────

    /** Recipient lookups run inside the caller's business operation, so they must never break it. */
    private static function safely(\Closure $build): void
    {
        try {
            $build();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private static function notifyViolationDriver(Violation $violation, string $event, string $title, string $message, string $dedupe, string $push): void
    {
        try {
            $driver = ViolationNotifier::resolveDriver($violation);
        } catch (\Throwable $e) {
            report($e);

            return;
        }

        AppNotifier::notify('driver', $driver?->user_id ? [$driver->user_id] : [], $event, $title, $message, [
            'dedupe'      => $dedupe,
            'record_type' => 'violation',
            'record_id'   => $violation->id,
            'push_body'   => $push,
        ]);
    }

    private static function requestDedupe(Booking $booking): string
    {
        return "booking_request:{$booking->id}";
    }

    /** @return array<int, int> */
    private static function driverUserIds(array $driverIds): array
    {
        $driverIds = array_values(array_filter($driverIds));

        return $driverIds === [] ? [] : Driver::whereIn('id', $driverIds)->pluck('user_id')->all();
    }

    /** @return array<int, int> */
    private static function passengerUserIds(Booking $booking): array
    {
        $userId = $booking->passenger_id ? Passenger::whereKey($booking->passenger_id)->value('user_id') : null;

        return $userId ? [(int) $userId] : [];
    }

    private static function citation(Violation $violation): string
    {
        return 'CITE-' . str_pad((string) $violation->id, 5, '0', STR_PAD_LEFT);
    }

    private static function peso(mixed $amount): string
    {
        return '₱' . number_format((float) $amount, 2);
    }
}
