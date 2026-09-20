<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Violation;
use App\Models\Tricycle;
use App\Models\Driver;
use App\Models\ViolationAppeal;

class ViolationController extends Controller
{
    /**
     * Display operator violations.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            return Inertia::render('Operator/Violations/Violations', [
                'violations' => [],
            ]);
        }

        $triIds = Tricycle::where('operator_id', $operator->id)->pluck('id');

        $violations = Violation::whereIn('tricycle_id', $triIds)
            ->whereNull('fine_paid_at')
            ->whereNotIn('status', ['dismissed', 'resolved'])
            ->with(['tricycle.franchiseScheme.colorCodingScheme', 'locationSnapshot', 'appeal'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(function ($v) {
                $location = 'Nasugbu Poblacion Area';
                if ($v->locationSnapshot) {
                    $location = "Nasugbu Poblacion Zone ({$v->locationSnapshot->latitude}, {$v->locationSnapshot->longitude})";
                } elseif ($v->violation_type === 'route_violation') {
                    $location = 'TODA Route Boundary — Border Gate';
                }

                $status = match ($v->appeal?->status) {
                    'under_review' => 'appeal_pending',
                    'rejected'     => 'appeal_rejected',
                    default        => 'unpaid',
                };

                return [
                    'id'         => 'VIO-2026-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                    'db_id'      => $v->id,
                    'type'       => ucwords(str_replace('_', ' ', $v->violation_type)),
                    'isIot'      => $v->detection_method === 'automated',
                    'date'       => $v->detected_at->format('M d, Y'),
                    'time'       => $v->detected_at->format('h:i A'),
                    'location'   => $location,
                    'notes'      => $v->notes,
                    'unit'       => $v->tricycle?->body_number ?: 'Pending',
                    'colorCode'  => $v->tricycle?->franchiseScheme?->colorCodingScheme ? $v->tricycle->franchiseScheme->colorCodingScheme->name : 'N/A',
                    'colorHex'   => $v->tricycle?->franchiseScheme?->colorCodingScheme ? $v->tricycle->franchiseScheme->colorCodingScheme->color_hex : '#94A3B8',
                    'fine'       => (float)$v->fine_amount,
                    'status'     => $status,
                ];
            });

        return Inertia::render('Operator/Violations/Violations', [
            'violations' => $violations,
        ]);
    }

    /**
     * Display the printable Violation Ticket — presented to the Municipal Treasurer's
     * cashier for offline payment, and re-viewable afterwards to show the settlement
     * once TMO has confirmed the payment.
     */
    public function ticket(Request $request, $id)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $triIds = Tricycle::where('operator_id', $operator->id)->pluck('id');

        $v = Violation::whereIn('tricycle_id', $triIds)
            ->where('id', $id)
            ->with(['tricycle.franchiseScheme.colorCodingScheme', 'locationSnapshot', 'confirmedBy', 'appeal'])
            ->firstOrFail();

        $location = 'Nasugbu Poblacion Area';
        if ($v->locationSnapshot) {
            $location = "Nasugbu Poblacion Zone ({$v->locationSnapshot->latitude}, {$v->locationSnapshot->longitude})";
        } elseif ($v->violation_type === 'route_violation') {
            $location = 'TODA Route Boundary — Border Gate';
        }

        $tricycle = $v->tricycle;
        $colorScheme = $tricycle?->franchiseScheme?->colorCodingScheme;
        $appeal = $v->appeal;

        $violationData = [
            'id'                      => 'VIO-2026-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'db_id'                   => $v->id,
            'type'                    => ucwords(str_replace('_', ' ', $v->violation_type)),
            'detectionMethod'         => $v->detection_method === 'automated' ? 'Automated IoT Detection' : 'Manual (TMO Personnel)',
            'date'                    => $v->detected_at->format('M d, Y'),
            'time'                    => $v->detected_at->format('h:i A'),
            'location'                => $location,
            'notes'                   => $v->notes,
            'fine'                    => (float)$v->fine_amount,
            'driverName'              => $operator->full_name,
            'contactNumber'           => $operator->contact_number,
            'licenseNumber'           => $operator->license_number,
            'unit'                    => $tricycle?->body_number ?: 'Pending',
            'plateNumber'             => $tricycle?->plate_number ?: 'N/A',
            'makeModel'               => $tricycle ? trim("{$tricycle->make} {$tricycle->model}") : 'N/A',
            'colorScheme'             => $colorScheme?->name ?: 'N/A',
            'isPaid'                  => $v->is_fine_paid,
            'officialReceiptNumber'   => $v->official_receipt_number,
            'amountPaid'              => $v->amount_paid !== null ? (float)$v->amount_paid : null,
            'paidAt'                  => $v->fine_paid_at ? $v->fine_paid_at->format('M d, Y') : null,
            'confirmedByName'         => $v->confirmedBy?->name,
            'canAppeal'               => !$appeal && !in_array($v->status, ['resolved', 'dismissed'], true),
            'appeal'                  => $appeal ? [
                'id'           => $appeal->id,
                'reason'       => $appeal->reason,
                'evidenceUrl'  => $appeal->evidence_path ? asset('storage/' . $appeal->evidence_path) : null,
                'status'       => $appeal->status,
                'submittedAt'  => $appeal->submitted_at?->format('M d, Y \a\t h:i A'),
                'reviewedAt'   => $appeal->reviewed_at?->format('M d, Y \a\t h:i A'),
                'reviewNotes'  => $appeal->review_notes,
            ] : null,
        ];

        return Inertia::render('Operator/Violations/ViolationTicket', [
            'violation' => $violationData,
        ]);
    }

    /**
     * Submit an appeal against one of the operator's own violations. Mirrors
     * Api\DriverViolationController::storeAppeal() (the proven mobile-app flow) — same
     * validation rules, same storage convention, same status transition — adapted only for
     * the web's session auth and multi-tricycle operator ownership model.
     */
    public function storeAppeal(Request $request, $id): RedirectResponse
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $driver = Driver::where('user_id', $user->id)->first();

        if (!$driver) {
            return back()->with('error', 'Driver account not found. Please contact TMO for assistance.');
        }

        $triIds = Tricycle::where('operator_id', $operator->id)->pluck('id');

        $violation = Violation::whereIn('tricycle_id', $triIds)
            ->where('id', $id)
            ->with('appeal')
            ->firstOrFail();

        if ($violation->appeal) {
            return back()->with('error', 'An appeal has already been submitted for this violation.');
        }

        if (in_array($violation->status, ['resolved', 'dismissed'], true)) {
            return back()->with('error', 'This violation is already resolved and cannot be appealed.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:2000',
            'proof'  => 'nullable|image|mimes:jpg,jpeg,png,heic,webp|max:8192',
        ]);

        $evidencePath = null;
        if ($request->hasFile('proof')) {
            $evidencePath = $request->file('proof')->store('violation_appeals', 'public');
        }

        DB::transaction(function () use ($violation, $driver, $validated, $evidencePath) {
            ViolationAppeal::create([
                'violation_id' => $violation->id,
                'driver_id'    => $driver->id,
                'reason'       => $validated['reason'],
                'evidence_path'=> $evidencePath,
                'status'       => 'under_review',
                'submitted_at' => now(),
            ]);

            // 'contested' already exists in the violations.status enum specifically for this —
            // a violation under active dispute, distinct from a plain unactioned 'open' one.
            $violation->update(['status' => 'contested']);
        });

        return redirect()->route('operator.violations.ticket', $violation->id)
            ->with('success', 'Appeal submitted successfully. TMO will review it shortly.');
    }
}
