<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Violation;
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

            AuditLog::create([
                'user_id'        => $user->id,
                'event'          => 'violation_payment_confirmed',
                'auditable_type' => Violation::class,
                'auditable_id'   => $violation->id,
                'old_values'     => $oldValues,
                'new_values'     => $violation->only(['status', 'fine_paid_at']),
                'ip_address'     => $request->ip(),
                'user_agent'     => $request->userAgent(),
            ]);
        });

        return back()->with('success', 'Payment confirmed. This violation has been marked Settled.');
    }
}
