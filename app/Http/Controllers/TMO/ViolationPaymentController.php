<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Violation;
use App\Services\AuditService;
use App\Services\MobileNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ViolationPaymentController extends Controller
{
    /**
     * Confirm that the driver already paid the fine at the Municipal Treasurer's cashier and
     * mark the violation Settled. Called directly from the violation's own details page
     * (Violation Records → Details) via a plain confirm dialog — no receipt/OR details are
     * captured here: the cashier's OR stays a physical, offline record.
     *
     * Authorization: the route lives inside the `auth` + `role:tmo_personnel,admin` group,
     * and the controller re-checks the role so only an authorized TMO user can transition
     * the payment status, regardless of how the endpoint is reached.
     */
    public function confirm(Request $request, Violation $violation): RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['tmo_personnel', 'admin'], true)) {
            abort(403, 'Only TMO personnel can confirm violation payments.');
        }

        if ($violation->is_fine_paid) {
            return back()->with('error', 'This violation has already been marked as paid.');
        }

        if ($violation->appeal && $violation->appeal->status === 'under_review') {
            return back()->with('error', 'This violation has a pending appeal — resolve the appeal before confirming payment.');
        }

        DB::transaction(function () use ($violation, $user, $request) {
            $oldValues = $violation->only(['status', 'fine_paid_at']);

            $violation->update([
                'fine_paid_at' => now(),
                'status'       => in_array($violation->status, ['open', 'acknowledged'], true) ? 'resolved' : $violation->status,
            ]);
            MobileNotifier::violationFinePaid($violation);

            $vioRef = 'VIO-26-' . str_pad($violation->id, 4, '0', STR_PAD_LEFT);
            AuditService::log(
                module: 'violation',
                action: 'violation_payment.confirmed',
                record: $violation,
                description: "Confirmed municipal treasury fine payment for violation {$vioRef}. Marked Settled.",
                oldValues: $oldValues,
                newValues: $violation->only(['status', 'fine_paid_at']),
                targetReference: $vioRef,
                metadata: [
                    'violation_id' => $violation->id,
                    'fine_amount'  => (float) $violation->fine_amount,
                ]
            );
        });

        return back()->with('success', 'Payment confirmed. This violation has been marked Settled.');
    }
}
