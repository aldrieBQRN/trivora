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
 * TMO QR Ride configuration for one tricycle, shown on the Tricycle Details page: passenger
 * capacity (tricycles.passenger_capacity — never defaulted, TMO sets it explicitly), QR token
 * regeneration, and the printable QR sheet. Readiness rules live in QrRideService::tmoSummary().
 */
class QrRideController extends Controller
{
    /**
     * Set (or clear) the unit's passenger capacity — seats counted by party size, the same unit
     * QR Ride joins consume. Cleared (null) takes the unit out of QR Ride until it is set again.
     */
    public function updateCapacity(Request $request, Tricycle $tricycle): RedirectResponse
    {
        $validated = $request->validate([
            'passenger_capacity' => 'present|nullable|integer|min:1|max:20',
        ], [
            'passenger_capacity.integer' => 'Passenger capacity must be a whole number.',
            'passenger_capacity.min' => 'Passenger capacity must be at least 1.',
            'passenger_capacity.max' => 'Passenger capacity cannot be more than 20.',
        ]);

        $old = $tricycle->passenger_capacity;
        $new = $validated['passenger_capacity'] === null ? null : (int) $validated['passenger_capacity'];

        if ($old !== $new) {
            DB::transaction(function () use ($request, $tricycle, $old, $new) {
                $tricycle->update(['passenger_capacity' => $new]);
                $this->audit($request, $tricycle, 'tricycle.passenger_capacity_updated', ['passenger_capacity' => $old], ['passenger_capacity' => $new]);
            });
        }

        return back()->with('success', $new === null
            ? 'Passenger capacity cleared. This unit will not accept QR Ride passengers until it is set.'
            : "Passenger capacity set to {$new}.");
    }

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
        AuditLog::create([
            'user_id' => $request->user()->id,
            'event' => $event,
            'auditable_type' => Tricycle::class,
            'auditable_id' => $tricycle->id,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
