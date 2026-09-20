<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Models\Tricycle;
use App\Models\Violation;
use App\Models\FranchiseScheme;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $operatorModel = $user->operator;

        if (!$operatorModel) {
            return Inertia::render('Operator/Dashboard', [
                'operator' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'stats' => [
                    'total_units' => 0,
                    'active_units' => 0,
                    'pending_violations' => 0,
                    'pending_fine_amount' => '0.00',
                ],
                'tricycles' => [],
                'recentViolations' => [],
                'expiringRegistrations' => [],
                'applicationProgress' => null,
            ]);
        }

        // 1. Operator Details
        $operator = [
            'name' => $operatorModel->full_name,
            'email' => $user->email,
        ];

        // 2. Load operator tricycles
        $operatorTricycles = Tricycle::where('operator_id', $operatorModel->id)
            ->with(['franchiseScheme'])
            ->get();

        $triIds = $operatorTricycles->pluck('id');

        // 3. Quick Stats
        $totalUnits = $operatorTricycles->count();
        $activeUnits = $operatorTricycles->where('status', 'active')->count();
        $pendingViolations = Violation::whereIn('tricycle_id', $triIds)
            ->where('status', 'open')
            ->count();
        // Matches Operator\ViolationController::index()'s own eligibility filter exactly — a
        // violation resolved via an APPROVED appeal never gets a fine_paid_at (no fine was ever
        // owed), so excluding only 'dismissed' here let a resolved-by-appeal violation still count
        // as a pending fine even though nothing is actually owed.
        $pendingFineAmount = Violation::whereIn('tricycle_id', $triIds)
            ->whereNull('fine_paid_at')
            ->whereNotIn('status', ['dismissed', 'resolved'])
            ->sum('fine_amount');

        $stats = [
            'total_units' => $totalUnits,
            'active_units' => $activeUnits,
            'pending_violations' => $pendingViolations,
            'pending_fine_amount' => number_format((float) $pendingFineAmount, 2, '.', ''),
        ];

        // 4. Fleet Data (Tricycles)
        $tricycles = $operatorTricycles->map(function ($tri) {
            $fs = $tri->franchiseScheme;
            $isExpired = $fs && $fs->expiry_date ? $fs->expiry_date->isPast() : false;

            $hasActiveValidFranchise = \App\Models\FranchiseScheme::where('tricycle_id', $tri->id)
                ->where('is_active', true)
                ->where('expiry_date', '>', now())
                ->exists();

            $hasPendingRenewal = \App\Models\Application::where('tricycle_id', $tri->id)
                ->where('application_type', 'renewal')
                ->whereNotIn('status', ['completed', 'rejected'])
                ->exists();

            $canRenew = $isExpired && !$hasActiveValidFranchise && !$hasPendingRenewal;

            // Real countdown to renewal — only meaningful while the permit is still valid.
            $daysLeft = ($fs && $fs->expiry_date && !$isExpired) ? (int) now()->diffInDays($fs->expiry_date, false) : null;

            return [
                'id'                  => $tri->id,
                'body_number'         => $tri->body_number ?: 'N/A',
                'plate_number'        => $tri->plate_number,
                'status'              => ucfirst($tri->status),
                'driver'              => 'Self / Unassigned',
                'is_expired'          => $isExpired,
                'can_renew'           => $canRenew,
                'has_pending_renewal' => $hasPendingRenewal,
                'mtop_status'         => $hasPendingRenewal ? 'Renewal In Progress' : ($isExpired ? 'Expired' : ($tri->status === 'active' ? 'Valid' : 'Pending')),
                'mtop_expiry'         => $fs && $fs->expiry_date ? $fs->expiry_date->format('M d, Y') : 'N/A',
                'mtop_days_left'      => $daysLeft,
            ];
        });

        // 5. IoT Violation Logs — only unpaid, actionable violations belong on the dashboard's
        // "Active Violations" card; settled/dismissed ones live in Payment History instead.
        // Must exclude 'resolved' the same way Operator\ViolationController::index() (the actual
        // Active Violations page) does — a violation resolved via an approved appeal has no
        // fine_paid_at (no fine was ever owed), so filtering on fine_paid_at alone let it appear
        // here as "active" while the Active Violations page correctly already excluded it.
        $recentViolations = Violation::whereIn('tricycle_id', $triIds)
            ->whereNull('fine_paid_at')
            ->whereNotIn('status', ['dismissed', 'resolved'])
            ->with('tricycle')
            ->orderByDesc('detected_at')
            ->take(3)
            ->get()
            ->map(function ($v) {
                return [
                    'id'          => $v->id,
                    'body_number' => $v->tricycle?->body_number ?: 'N/A',
                    'violation'   => ucwords(str_replace('_', ' ', $v->violation_type)),
                    'date'        => $v->detected_at->toDateString(),
                    'status'      => 'Pending Review',
                ];
            });

        // 6. Expiration Alerts
        $expiringRegistrations = FranchiseScheme::whereIn('tricycle_id', $triIds)
            ->where('is_active', true)
            ->get()
            ->map(function ($scheme) {
                $daysLeft = now()->diffInDays($scheme->expiry_date, false);
                return [
                    'body_number'     => $scheme->franchise_number,
                    'expiration_date' => $scheme->expiry_date->toDateString(),
                    'days_left'       => $daysLeft,
                ];
            });

        // 7. Franchise application currently in progress (if any) — real tracking for the
        // dashboard, separate from the already-issued franchise shown on the unit card.
        // Mirrors the same status categories Operator\MTOPController uses for its own
        // pipeline, condensed to a simple 5-step progress the dashboard can show compactly.
        $activeApplication = \App\Models\Application::where('operator_id', $operatorModel->id)
            ->whereNotIn('status', ['completed', 'scheme_issued'])
            ->with('tricycle')
            ->latest('created_at')
            ->first();

        $applicationProgress = null;
        if ($activeApplication) {
            $stepMap = [
                'draft'                     => [1, 'Document Review', false, 'Draft saved — continue and submit your requirements.'],
                'pending_review'            => [1, 'Document Review', false, 'Awaiting TMO review of your submitted documents.'],
                'under_review'              => [1, 'Document Review', false, 'Awaiting TMO review of your submitted documents.'],
                'rejected'                  => [1, 'Document Review', true, 'Documents were rejected — resubmission required.'],
                'pending_inspection'        => [2, 'Physical Inspection', false, 'Approved — bring your unit for physical inspection.'],
                'under_inspection'          => [2, 'Physical Inspection', false, 'Approved — bring your unit for physical inspection.'],
                'failed_inspection'         => [2, 'Physical Inspection', true, 'Inspection found issues — re-inspection required.'],
                'pending_payment'           => [3, 'Payment', true, 'Payment ticket issued — pay at the Municipal Cashier.'],
                'payment_issue'             => [3, 'Payment', true, 'BPLO flagged an issue with your payment receipt.'],
                'payment_verified'          => [4, 'BPLO Release', false, 'Payment verified — awaiting sticker release.'],
                'paid'                      => [4, 'BPLO Release', false, 'Payment verified — awaiting sticker release.'],
                'awaiting_tmo_confirmation' => [5, 'Final Confirmation', true, 'Sticker released — return to TMO to finish activation.'],
            ];
            $meta = $stepMap[$activeApplication->status] ?? [1, 'Document Review', false, 'Application submitted.'];

            $applicationProgress = [
                'db_id'       => $activeApplication->id,
                'reference'   => $activeApplication->reference_number,
                'type'        => $activeApplication->application_type === 'new' ? 'New Franchise' : 'Franchise Renewal',
                'unit'        => $activeApplication->tricycle?->body_number ?: ($activeApplication->tricycle?->plate_number ?: 'N/A'),
                'step'        => $meta[0],
                'stepLabel'   => $meta[1],
                'needsAction' => $meta[2],
                'message'     => $meta[3],
                'totalSteps'  => 5,
            ];
        }

        return Inertia::render('Operator/Dashboard', [
            'operator' => $operator,
            'stats' => $stats,
            'tricycles' => $tricycles,
            'recentViolations' => $recentViolations,
            'expiringRegistrations' => $expiringRegistrations,
            'applicationProgress' => $applicationProgress,
        ]);
    }
}
