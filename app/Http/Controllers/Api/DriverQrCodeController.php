<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Tricycle;
use App\Services\QrRideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
