<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Tricycle;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverViolationController extends Controller
{
    /**
     * Resolve the authenticated Sanctum user's own Driver row — never a client-supplied id, so a
     * driver can only ever see/act on their own violations.
     */
    private function resolveDriver(Request $request): ?Driver
    {
        return Driver::where('user_id', $request->user()->id)->first();
    }

    /**
     * The driver's CURRENT tricycle — resolved via operator_id, the same source of truth
     * Api\DriverTelematicsController already uses for GPS telemetry, rather than trusting
     * Driver::tricycle_id directly. That column is set once and can go stale (e.g. an operator
     * who ends up with more than one Tricycle row over time), which would silently point
     * violation lookups at the wrong unit while telemetry/coding-detection correctly track the
     * real one — this keeps both resolving to the same tricycle. Falls back to the Driver row's
     * own tricycle_id only if no tricycle is found under the operator at all.
     */
    private function resolveTricycleId(Driver $driver): ?int
    {
        return Tricycle::where('operator_id', $driver->operator_id)->value('id') ?? $driver->tricycle_id;
    }

    /**
     * Maps a violation's raw status + its appeal (if any) into the clear, user-facing terms the
     * driver app shows — the internal enum values (open/acknowledged/contested/resolved) and the
     * appeal enum (under_review/approved/rejected) stay as they already are in the database; only
     * this mapping decides what the driver actually reads on screen.
     */
    private function driverFacingStatus(Violation $violation): array
    {
        $appeal = $violation->appeal;

        if (!$appeal) {
            $isResolved = $violation->status === 'resolved' || $violation->status === 'dismissed';
            return [
                'driver_status' => $isResolved ? 'resolved' : 'pending',
                'driver_status_label' => $isResolved ? 'Resolved' : 'Pending',
                'can_appeal' => !$isResolved,
            ];
        }

        return match ($appeal->status) {
            'under_review' => [
                'driver_status' => 'appeal_under_review',
                'driver_status_label' => 'Appeal Under Review',
                'can_appeal' => false,
            ],
            'approved' => [
                'driver_status' => 'resolved',
                'driver_status_label' => 'Violation Resolved',
                'can_appeal' => false,
            ],
            'rejected' => [
                'driver_status' => 'fine_payment_required',
                'driver_status_label' => 'Fine Payment Required',
                'can_appeal' => false,
            ],
            default => [
                'driver_status' => 'pending',
                'driver_status_label' => 'Pending',
                'can_appeal' => false,
            ],
        };
    }

    private function serializeViolation(Violation $violation): array
    {
        $appeal = $violation->appeal;
        $status = $this->driverFacingStatus($violation);

        return array_merge($status, [
            'id' => $violation->id,
            'citation_no' => 'CITE-' . str_pad((string) $violation->id, 5, '0', STR_PAD_LEFT),
            'violation_type' => $violation->violation_type,
            'title' => ucwords(str_replace('_', ' ', $violation->violation_type)),
            'description' => $violation->notes,
            'detected_at' => $violation->detected_at?->toIso8601String(),
            'day_of_week' => $violation->day_of_week,
            'detection_method' => $violation->detection_method,
            'fine_amount' => (float) $violation->fine_amount,
            'fine_paid_at' => $violation->fine_paid_at?->toIso8601String(),
            'location' => $violation->locationSnapshot
                ? [
                    'latitude' => (float) $violation->locationSnapshot->latitude,
                    'longitude' => (float) $violation->locationSnapshot->longitude,
                ]
                : null,
            'appeal' => $appeal
                ? [
                    'id' => $appeal->id,
                    'reason' => $appeal->reason,
                    'evidence_url' => $appeal->evidence_path ? asset('storage/' . $appeal->evidence_path) : null,
                    'status' => $appeal->status,
                    'submitted_at' => $appeal->submitted_at?->toIso8601String(),
                    'reviewed_at' => $appeal->reviewed_at?->toIso8601String(),
                    'review_notes' => $appeal->review_notes,
                ]
                : null,
        ]);
    }

    /**
     * List the authenticated driver's own violations (via their assigned tricycle), newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $driver = $this->resolveDriver($request);
        $tricycleId = $driver ? $this->resolveTricycleId($driver) : null;

        if (!$tricycleId) {
            return response()->json(['violations' => []]);
        }

        $violations = Violation::where('tricycle_id', $tricycleId)
            ->with(['appeal', 'locationSnapshot'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(fn (Violation $v) => $this->serializeViolation($v));

        return response()->json(['violations' => $violations]);
    }

    /**
     * Submit an appeal against one of the authenticated driver's own violations. Rejects outright
     * if the violation belongs to a different driver's tricycle, or if an appeal already exists
     * for it (one appeal per violation — see the migration's unique constraint).
     */
    public function storeAppeal(Request $request, int $id): JsonResponse
    {
        $driver = $this->resolveDriver($request);

        if (!$driver) {
            return response()->json(['message' => 'Driver account not found.'], 404);
        }

        $violation = Violation::where('id', $id)
            ->where('tricycle_id', $this->resolveTricycleId($driver))
            ->with('appeal')
            ->first();

        if (!$violation) {
            return response()->json(['message' => 'Violation not found.'], 404);
        }

        if ($violation->appeal) {
            return response()->json(['message' => 'An appeal has already been submitted for this violation.'], 422);
        }

        if (in_array($violation->status, ['resolved', 'dismissed'], true)) {
            return response()->json(['message' => 'This violation is already resolved and cannot be appealed.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:2000',
            'proof' => 'nullable|image|mimes:jpg,jpeg,png,heic,webp|max:8192',
        ]);

        $evidencePath = null;
        if ($request->hasFile('proof')) {
            $evidencePath = $request->file('proof')->store('violation_appeals', 'public');
        }

        $appeal = null;
        DB::transaction(function () use ($violation, $driver, $validated, $evidencePath, &$appeal) {
            $appeal = ViolationAppeal::create([
                'violation_id' => $violation->id,
                'driver_id' => $driver->id,
                'reason' => $validated['reason'],
                'evidence_path' => $evidencePath,
                'status' => 'under_review',
                'submitted_at' => now(),
            ]);

            // 'contested' already exists in the violations.status enum specifically for this —
            // a violation under active dispute, distinct from a plain unactioned 'open' one.
            $violation->update(['status' => 'contested']);
        });

        $violation->refresh();
        $violation->setRelation('appeal', $appeal);

        return response()->json([
            'message' => 'Appeal submitted successfully.',
            'violation' => $this->serializeViolation($violation),
        ], 201);
    }
}
