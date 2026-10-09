<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\Tricycle;
use App\Services\QrRideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Driver Mobile App QR Code access:
 * The driver's Profile page is the driver's exclusive place to view and download their assigned
 * tricycle's QR Code. Only the authenticated driver can access the QR belonging to their own
 * assigned tricycle.
 */
class DriverQrCodeController extends Controller
{
    /**
     * Get the authenticated driver's assigned tricycle QR details.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();

        if (!$driver) {
            return response()->json([
                'success' => false,
                'message' => 'Driver record not found for this account.',
            ], 404);
        }

        $tricycle = $driver->tricycle;

        if (!$tricycle) {
            return response()->json([
                'success' => false,
                'message' => 'No tricycle is currently assigned to your account.',
            ], 404);
        }

        $tricycle->loadMissing(['franchiseScheme', 'todaZone']);
        $summary = QrRideService::tmoSummary($tricycle);

        return response()->json([
            'success' => true,
            'unit_code' => 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT),
            'sticker_number' => $tricycle->coding_scheme_number ?: null,
            'plate_number' => $tricycle->plate_number,
            'passenger_capacity' => $tricycle->passenger_capacity,
            'qr_token' => $tricycle->qr_token,
            'qr_url' => QrRideService::publicUrl($tricycle),
            'status' => $summary['status'],
            'status_label' => match ($summary['status']) {
                'ready' => 'Ready',
                'capacity_required' => 'Capacity Required',
                default => 'Not Ready',
            },
            'note' => $summary['note'],
            'print_url' => route('driver.qr.print', ['token' => $tricycle->qr_token]),
        ], 200);
    }

    /**
     * Set the passenger capacity of the driver's OWN assigned tricycle. This is the driver's
     * authoritative capacity-configuration action (Profile → Assigned QR Code): the previous
     * TMO-side configuration was intentionally moved here. The tricycle is resolved strictly
     * from the authenticated driver's own assignment — never a client-supplied id — so a driver
     * can only ever configure their own unit. The QR token is never touched.
     *
     * Not gated by franchise.operational: capacity is configuration, not an operating action,
     * and a suspended/revoked driver may still keep their unit's seating up to date.
     */
    public function updateCapacity(Request $request): JsonResponse
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();

        if (!$driver) {
            return response()->json([
                'success' => false,
                'message' => 'Driver record not found for this account.',
            ], 404);
        }

        // The tricycle is resolved strictly from the driver's own assignment — never from the
        // request — so a driver can only ever configure their own unit.
        $tricycle = Tricycle::whereKey($driver->tricycle_id)->first();

        if (!$tricycle) {
            return response()->json([
                'success' => false,
                'message' => 'No tricycle is currently assigned to your account.',
            ], 404);
        }

        $validated = $request->validate([
            'passenger_capacity' => 'required|integer|min:1|max:6',
        ], [
            'passenger_capacity.required' => 'Passenger capacity is required.',
            'passenger_capacity.integer' => 'Passenger capacity must be a whole number.',
            'passenger_capacity.min' => 'Passenger capacity must be at least 1.',
            'passenger_capacity.max' => 'Passenger capacity cannot be more than 6.',
        ]);

        $new = (int) $validated['passenger_capacity'];
        $old = $tricycle->passenger_capacity;

        if ($old !== $new) {
            DB::transaction(function () use ($request, $tricycle, $old, $new) {
                $tricycle->update(['passenger_capacity' => $new]);
                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'event' => 'tricycle.passenger_capacity_updated',
                    'auditable_type' => Tricycle::class,
                    'auditable_id' => $tricycle->id,
                    'old_values' => ['passenger_capacity' => $old],
                    'new_values' => ['passenger_capacity' => $new, 'source' => 'driver_app'],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            });
        }

        return response()->json([
            'success' => true,
            'message' => "Passenger capacity set to {$new}.",
            'passenger_capacity' => $new,
        ], 200);
    }

    /**
     * Printable A6 "Scan to Ride" sheet for the driver's assigned tricycle.
     */
    public function printSheet(Request $request, string $token): \Inertia\Response
    {
        $tricycle = Tricycle::where('qr_token', $token)->firstOrFail();
        $summary = QrRideService::tmoSummary($tricycle);

        return Inertia::render('DriverQrPrint', [
            'unit' => [
                'id' => $tricycle->id,
                'unit_code' => 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT),
                'sticker_number' => $tricycle->coding_scheme_number ?: null,
                'plate_number' => $tricycle->plate_number,
                'passenger_capacity' => $tricycle->passenger_capacity,
            ],
            'qrRide' => $summary,
            'autoPrint' => $request->boolean('print', false),
        ]);
    }
}
