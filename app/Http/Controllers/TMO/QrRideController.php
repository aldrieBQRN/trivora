<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tricycle;
use App\Services\QrRideService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * TMO QR Ride management for one tricycle, shown on the Tricycle Details page: QR token
 * regeneration and the printable QR sheet. Passenger capacity is NOT configured here — it is
 * read-only in TMO and is configured by the authenticated driver in the Driver App (see
 * Api\DriverQrCodeController::updateCapacity). Readiness rules live in QrRideService::tmoSummary().
 */
class QrRideController extends Controller
{
    /**
     * Issue a new QR token. The old QR (and every fare quote made with it) stops working
     * immediately; ride history, franchise data and driver assignment are untouched. The token
     * itself is never written to the audit log.
     */
    public function regenerate(Request $request, Tricycle $tricycle): RedirectResponse
    {
        DB::transaction(function () use ($request, $tricycle) {
            $hadToken = (bool) $tricycle->qr_token;
            $tricycle->update(['qr_token' => Tricycle::generateQrToken()]);
            $this->audit($request, $tricycle, 'qr_token.regenerated', ['had_qr' => $hadToken], ['had_qr' => true]);
        });

        return back()->with('success', 'A new QR code was issued. The previous QR no longer works — print and attach the new one.');
    }

    /** Printable "Scan to Ride" sheet for this unit. */
    public function print(Tricycle $tricycle): Response
    {
        return Inertia::render('TMODashboard/QrRidePrint', [
            'unit' => [
                'id' => $tricycle->id,
                'unit_code' => 'TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT),
                // The real Sticker Number only — never padded or derived from the id.
                'sticker_number' => $tricycle->coding_scheme_number ?: null,
                'plate_number' => $tricycle->plate_number,
            ],
            'qrRide' => QrRideService::tmoSummary($tricycle),
        ]);
    }

    private function audit(Request $request, Tricycle $tricycle, string $event, array $old, array $new): void
    {
        \App\Services\AuditService::log(
            module: 'qr_management',
            action: $event,
            record: $tricycle,
            description: "Regenerated public QR ride token for tricycle {$tricycle->plate_number}.",
            oldValues: $old,
            newValues: $new,
            targetReference: $tricycle->plate_number ?: ('TRV-' . str_pad($tricycle->id, 3, '0', STR_PAD_LEFT)),
            metadata: ['plate_number' => $tricycle->plate_number]
        );
    }
}
