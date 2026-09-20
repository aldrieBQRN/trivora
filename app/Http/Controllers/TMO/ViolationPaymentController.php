<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Violation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ViolationPaymentController extends Controller
{
    /**
     * Record an offline treasury payment: the driver already paid the cashier and brought
     * back an official receipt — this just confirms it and marks the violation Settled.
     * Called directly from the violation's own details page (Violation Records → Details).
     */
    public function confirm(Request $request, Violation $violation): RedirectResponse
    {
        if ($violation->is_fine_paid) {
            return back()->with('error', 'This violation has already been marked as paid.');
        }

        if ($violation->appeal && $violation->appeal->status === 'under_review') {
            return back()->with('error', 'This violation has a pending appeal — resolve the appeal before confirming payment.');
        }

        $data = $request->validate([
            'official_receipt_number' => 'required|string|max:50',
            'amount_paid'             => 'required|numeric|min:0',
            'payment_date'            => 'required|date|before_or_equal:today',
            'notes'                   => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($violation, $data) {
            $oldValues = $violation->only(['status', 'fine_paid_at', 'official_receipt_number', 'amount_paid', 'confirmed_by']);

            $violation->update([
                'fine_paid_at'             => $data['payment_date'],
                'official_receipt_number'  => $data['official_receipt_number'],
                'amount_paid'              => $data['amount_paid'],
                'confirmed_by'             => Auth::id(),
                'status'                   => in_array($violation->status, ['open', 'acknowledged'], true) ? 'resolved' : $violation->status,
                'notes'                    => $data['notes']
                    ? trim(($violation->notes ? $violation->notes . ' | ' : '') . "Payment confirmed: {$data['notes']}")
                    : $violation->notes,
            ]);

            AuditLog::create([
                'user_id'        => Auth::id(),
                'event'          => 'violation_payment_confirmed',
                'auditable_type' => Violation::class,
                'auditable_id'   => $violation->id,
                'old_values'     => $oldValues,
                'new_values'     => $violation->only(['status', 'fine_paid_at', 'official_receipt_number', 'amount_paid', 'confirmed_by']),
                'ip_address'     => $request->ip(),
                'user_agent'     => $request->userAgent(),
            ]);
        });

        return back()->with('success', 'Payment confirmed. This violation has been marked Settled.');
    }
}
