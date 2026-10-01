<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingPaymentController extends Controller
{
    /**
     * Payment is collected and confirmed only by the assigned driver (the passenger app shows
     * payment status only - never the driver's GCash QR nor a reference input). A booking is
     * payable once the trip is completed (normal booking completed / QR or manual passenger
     * dropped off); each booking is settled on its own, never per ride session.
     */
    private const PAYABLE_STATUS = 'completed';

    /**
     * Driver confirms physical cash payment received, recording tendered amount and change.
     */
    public function confirmCash(Request $request, string|int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $booking = is_numeric($id) ? Booking::where('id', (int) $id)->first() : Booking::where('booking_code', $id)->first();
        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        $validated = $request->validate([
            'amount_received' => 'required|numeric|min:' . $booking->fare_amount,
        ]);

        $amountReceived = round((float) $validated['amount_received'], 2);
        $changeAmount = round($amountReceived - (float) $booking->fare_amount, 2);

        $forbidden = false;
        $alreadyPaid = false;
        $invalidMethod = false;
        $notPayable = false;
        $resultBooking = null;

        DB::transaction(function () use ($id, $driver, $amountReceived, $changeAmount, $request, &$resultBooking, &$forbidden, &$alreadyPaid, &$invalidMethod, &$notPayable) {
            $locked = (is_numeric($id) ? Booking::where('id', (int) $id) : Booking::where('booking_code', $id))
                ->lockForUpdate()
                ->first();

            if (!$locked) {
                return;
            }

            if ($locked->driver_id !== $driver->id) {
                $forbidden = true;
                return;
            }

            if ($locked->payment_status === Booking::PAYMENT_STATUS_PAID) {
                $alreadyPaid = true;
                $resultBooking = $locked;
                return;
            }

            if ($locked->payment_method !== Booking::PAYMENT_METHOD_CASH) {
                $invalidMethod = true;
                return;
            }

            if ($locked->status !== self::PAYABLE_STATUS) {
                $notPayable = true;
                return;
            }

            $locked->update([
                'payment_status' => Booking::PAYMENT_STATUS_PAID,
                'payment_amount_received' => $amountReceived,
                'payment_change_amount' => $changeAmount,
                'paid_at' => now(),
            ]);

            // Idempotent earnings credit: only incremented on unpaid -> paid transition
            $driverLocked = Driver::whereKey($driver->id)->lockForUpdate()->first();
            $driverLocked->increment('today_earnings', $locked->fare_amount);
            $driverLocked->increment('total_trips');

            AuditLog::create([
                'user_id' => $request->user()->id,
                'event' => 'payment.cash_confirmed',
                'auditable_type' => Booking::class,
                'auditable_id' => $locked->id,
                'old_values' => ['payment_status' => 'unpaid'],
                'new_values' => [
                    'payment_status' => 'paid',
                    'fare_amount' => $locked->fare_amount,
                    'amount_received' => $amountReceived,
                    'change_amount' => $changeAmount,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $resultBooking = $locked;
        });

        if ($forbidden) {
            return response()->json(['message' => 'Unauthorized. You are not the assigned driver for this booking.'], 403);
        }

        if ($invalidMethod) {
            return response()->json(['message' => 'This booking is configured for GCash payment.'], 422);
        }

        if ($notPayable) {
            return response()->json(['message' => 'Payment can only be confirmed after the passenger is dropped off.'], 422);
        }

        if ($alreadyPaid) {
            return response()->json([
                'message' => 'Payment has already been confirmed.',
                'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
            ]);
        }

        return response()->json([
            'message' => 'Cash payment confirmed successfully.',
            'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Driver confirms GCash payment by entering the reference number provided by the passenger.
     * Transitions payment status from unpaid (or payment_submitted) directly to paid.
     */
    public function confirmGcash(Request $request, string|int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $booking = is_numeric($id) ? Booking::where('id', (int) $id)->first() : Booking::where('booking_code', $id)->first();
        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        $validated = $request->validate([
            'reference_number' => 'required|string|min:4|max:100',
        ]);

        $referenceNumber = trim($validated['reference_number']);
        if (empty($referenceNumber)) {
            return response()->json(['message' => 'Enter the GCash reference number provided by the passenger.'], 422);
        }

        $forbidden = false;
        $alreadyPaid = false;
        $invalidMethod = false;
        $notPayable = false;
        $resultBooking = null;

        DB::transaction(function () use ($id, $driver, $referenceNumber, $request, &$resultBooking, &$forbidden, &$alreadyPaid, &$invalidMethod, &$notPayable) {
            $locked = (is_numeric($id) ? Booking::where('id', (int) $id) : Booking::where('booking_code', $id))
                ->lockForUpdate()
                ->first();

            if (!$locked) {
                return;
            }

            if ($locked->driver_id !== $driver->id) {
                $forbidden = true;
                return;
            }

            if ($locked->payment_status === Booking::PAYMENT_STATUS_PAID) {
                $alreadyPaid = true;
                $resultBooking = $locked;
                return;
            }

            if ($locked->payment_method !== Booking::PAYMENT_METHOD_GCASH) {
                $invalidMethod = true;
                return;
            }

            if ($locked->status !== self::PAYABLE_STATUS) {
                $notPayable = true;
                return;
            }

            $locked->update([
                'payment_reference' => $referenceNumber,
                'payment_status' => Booking::PAYMENT_STATUS_PAID,
                'paid_at' => now(),
            ]);

            // Idempotent earnings credit: only incremented on transition to paid
            $driverLocked = Driver::whereKey($driver->id)->lockForUpdate()->first();
            $driverLocked->increment('today_earnings', $locked->fare_amount);
            $driverLocked->increment('total_trips');

            AuditLog::create([
                'user_id' => $request->user()->id,
                'event' => 'payment.gcash_confirmed',
                'auditable_type' => Booking::class,
                'auditable_id' => $locked->id,
                'old_values' => ['payment_status' => $locked->getOriginal('payment_status')],
                'new_values' => [
                    'payment_status' => Booking::PAYMENT_STATUS_PAID,
                    'fare_amount' => $locked->fare_amount,
                    'reference_number' => $locked->payment_reference,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $resultBooking = $locked;
        });

        if ($forbidden) {
            return response()->json(['message' => 'Unauthorized. You are not the assigned driver for this booking.'], 403);
        }

        if ($invalidMethod) {
            return response()->json(['message' => 'This booking is configured for Cash payment.'], 422);
        }

        if ($notPayable) {
            return response()->json(['message' => 'Payment can only be confirmed after the passenger is dropped off.'], 422);
        }

        if ($alreadyPaid) {
            return response()->json([
                'message' => 'Payment has already been confirmed.',
                'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
            ]);
        }

        return response()->json([
            'message' => 'GCash payment confirmed successfully.',
            'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }

    /**
     * Driver records and confirms GCash payment for a walk-in Manual Ride passenger (no app account).
     */
    public function recordManualGcash(Request $request, string|int $id): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();
        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $booking = is_numeric($id) ? Booking::where('id', (int) $id)->first() : Booking::where('booking_code', $id)->first();
        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        $validated = $request->validate([
            'reference_number' => 'required|string|min:4|max:100',
        ]);

        $referenceNumber = trim($validated['reference_number']);
        if (empty($referenceNumber)) {
            return response()->json(['message' => 'Enter the GCash reference number provided by the passenger.'], 422);
        }

        $forbidden = false;
        $alreadyPaid = false;
        $notManual = false;
        $notPayable = false;
        $resultBooking = null;

        DB::transaction(function () use ($id, $driver, $referenceNumber, $request, &$resultBooking, &$forbidden, &$alreadyPaid, &$notManual, &$notPayable) {
            $locked = (is_numeric($id) ? Booking::where('id', (int) $id) : Booking::where('booking_code', $id))
                ->lockForUpdate()
                ->first();

            if (!$locked) {
                return;
            }

            if ($locked->driver_id !== $driver->id) {
                $forbidden = true;
                return;
            }

            if ($locked->booking_type !== Booking::TYPE_MANUAL) {
                $notManual = true;
                return;
            }

            if ($locked->payment_status === Booking::PAYMENT_STATUS_PAID) {
                $alreadyPaid = true;
                $resultBooking = $locked;
                return;
            }

            if ($locked->status !== self::PAYABLE_STATUS) {
                $notPayable = true;
                return;
            }

            $locked->update([
                'payment_method' => Booking::PAYMENT_METHOD_GCASH,
                'payment_reference' => $referenceNumber,
                'payment_status' => Booking::PAYMENT_STATUS_PAID,
                'paid_at' => now(),
            ]);

            $driverLocked = Driver::whereKey($driver->id)->lockForUpdate()->first();
            $driverLocked->increment('today_earnings', $locked->fare_amount);
            $driverLocked->increment('total_trips');

            AuditLog::create([
                'user_id' => $request->user()->id,
                'event' => 'payment.manual_gcash_confirmed',
                'auditable_type' => Booking::class,
                'auditable_id' => $locked->id,
                'old_values' => ['payment_status' => $locked->getOriginal('payment_status')],
                'new_values' => [
                    'payment_status' => Booking::PAYMENT_STATUS_PAID,
                    'fare_amount' => $locked->fare_amount,
                    'reference_number' => $locked->payment_reference,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $resultBooking = $locked;
        });

        if ($forbidden) {
            return response()->json(['message' => 'Unauthorized. You are not the assigned driver for this booking.'], 403);
        }

        if ($notManual) {
            return response()->json(['message' => 'Only manual walk-in rides use direct driver GCash recording.'], 422);
        }

        if ($notPayable) {
            return response()->json(['message' => 'Payment can only be confirmed after the passenger is dropped off.'], 422);
        }

        if ($alreadyPaid) {
            return response()->json([
                'message' => 'Payment has already been confirmed.',
                'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
            ]);
        }

        return response()->json([
            'message' => 'Manual GCash payment confirmed successfully.',
            'booking' => $resultBooking->fresh(['passenger.user', 'driver.user', 'tricycle']),
        ]);
    }
}
