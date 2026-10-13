<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\FranchiseScheme;
use App\Models\Violation;
use App\Models\ViolationEnforcement;
use App\Services\AuditService;
use App\Services\ViolationEnforcementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ViolationEnforcementController extends Controller
{
    /**
     * Review and confirm required municipal enforcement action for 3rd and 4th offenses.
     *
     * 3rd Offense: Tricycle impoundment + Franchise suspension
     * 4th Offense: Franchise cancellation (Revocation)
     */
    public function confirm(Request $request, Violation $violation): RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['tmo_personnel', 'admin'], true)) {
            abort(403, 'Only authorized TMO personnel can confirm enforcement actions.');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        // Safeguard 1: Prevent duplicate enforcement processing
        if ($violation->enforcement && $violation->enforcement->status === 'completed') {
            return back()->with('error', 'Enforcement action has already been confirmed for this violation.');
        }

        // Safeguard 2: Block enforcement if appeal is under review
        if ($violation->appeal && $violation->appeal->status === 'under_review') {
            return back()->with('error', 'This violation has a pending appeal — resolve the appeal before confirming enforcement.');
        }

        // Safeguard 3: Block enforcement if violation was dismissed or exonerated
        if ($violation->status === 'dismissed' || ($violation->appeal && $violation->appeal->status === 'approved')) {
            return back()->with('error', 'Cannot confirm enforcement on a dismissed or exonerated violation.');
        }

        $offenseNumber = ViolationEnforcementService::calculateOffenseNumber($violation);

        if ($offenseNumber < 3) {
            return back()->with('error', 'Offenses 1 and 2 do not require administrative franchise enforcement actions.');
        }

        $isThirdOffense = ($offenseNumber === 3);
        $actionType = $isThirdOffense ? 'impoundment_and_suspension' : 'revocation';
        $targetFranchiseStatus = $isThirdOffense ? FranchiseScheme::STATUS_SUSPENDED : FranchiseScheme::STATUS_REVOKED;

        $notes = $validated['notes'] ?? null;
        $officerNotes = $notes ?: ($isThirdOffense
            ? "TMO confirmed 3rd offense: Tricycle impoundment and franchise suspension applied."
            : "TMO confirmed 4th offense: Franchise cancelled (Revoked)."
        );

        $franchiseScheme = $violation->franchiseScheme ?: $violation->tricycle?->franchiseScheme;

        DB::transaction(function () use ($violation, $franchiseScheme, $offenseNumber, $actionType, $targetFranchiseStatus, $officerNotes, $user) {
            // 1. Record / update the enforcement record
            $enforcement = ViolationEnforcement::updateOrCreate(
                ['violation_id' => $violation->id],
                [
                    'franchise_scheme_id' => $franchiseScheme?->id,
                    'offense_number'      => $offenseNumber,
                    'action_type'         => $actionType,
                    'status'              => 'completed',
                    'confirmed_by'        => $user->id,
                    'confirmed_at'        => now(),
                    'notes'               => $officerNotes,
                ]
            );

            // 2. Transition franchise operational status if applicable
            if ($franchiseScheme) {
                // If the franchise is not yet in the target status or terminal state
                if ($franchiseScheme->status !== $targetFranchiseStatus) {
                    if ($franchiseScheme->canTransitionTo($targetFranchiseStatus)) {
                        $franchiseScheme->transitionStatus($targetFranchiseStatus, $officerNotes, $user->id);
                    }
                }
            }

            // 3. Log audit trail
            $vioRef = 'VIO-26-' . str_pad($violation->id, 4, '0', STR_PAD_LEFT);
            $ordinal = ViolationEnforcementService::ordinal($offenseNumber);
            $actionTitle = $offenseNumber === 3
                ? "3rd Offense: Confirmed tricycle impoundment and franchise suspension"
                : "{$ordinal} Offense: Confirmed franchise cancellation (Revoked)";

            AuditService::log(
                module: 'violation',
                action: 'violation_enforcement.confirmed',
                record: $violation,
                description: "{$actionTitle} for citation {$vioRef}. Note: {$officerNotes}",
                oldValues: null,
                newValues: [
                    'enforcement_id'   => $enforcement->id,
                    'offense_number'   => $offenseNumber,
                    'action_type'      => $actionType,
                    'franchise_status' => $franchiseScheme?->fresh()?->status,
                    'confirmed_by'     => $user->name,
                ],
                targetReference: $vioRef,
                metadata: [
                    'violation_id'     => $violation->id,
                    'offense_number'   => $offenseNumber,
                    'action_type'      => $actionType,
                    'franchise_number' => $franchiseScheme?->franchise_number,
                    'plate_number'     => $violation->tricycle?->plate_number,
                    'notes'            => $officerNotes,
                ]
            );
        });

        $ordinal = ViolationEnforcementService::ordinal($offenseNumber);
        $successMessage = $isThirdOffense
            ? "3rd Offense enforcement confirmed: ₱2,500 fine, tricycle impoundment, and franchise suspension applied."
            : "{$ordinal} Offense enforcement confirmed: Franchise cancelled and revoked.";

        return back()->with('success', $successMessage);
    }
}
