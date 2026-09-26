<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Inspection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InspectionController extends Controller
{
    /**
     * Display physical inspection queue.
     */
    public function index(): Response
    {
        // Ordered by when the application actually ENTERED this queue (the most recent status
        // transition on record), not updated_at — updated_at would also move on any unrelated
        // field edit, silently bumping a long-waiting application to the back of the queue. The
        // append-only application_status_histories table's own created_at is the true, immutable
        // "entered this phase" timestamp. Oldest-entered first, so the longest-waiting unit is
        // processed first.
        $applications = Application::with(['operator', 'tricycle', 'inspections'])
            ->whereIn('status', ['pending_inspection', 'under_inspection', 'failed_inspection'])
            ->addSelect(['queue_entered_at' => ApplicationStatusHistory::select('created_at')
                ->whereColumn('application_id', 'applications.id')
                ->orderByDesc('created_at')
                ->orderByDesc('id') // tiebreaker when two transitions land in the same second
                ->limit(1),
            ])
            ->orderBy('queue_entered_at', 'asc')
            ->get()
            ->map(function ($app) {
                if ($app->status === 'failed_inspection') {
                    $statusLabel = 'Reinspection Required';
                } elseif ($app->inspections->contains('result', 'failed')) {
                    $statusLabel = 'Ready for Reinspection';
                } else {
                    $statusLabel = 'Awaiting Inspection';
                }

                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'operator'       => $app->operator ? $app->operator->full_name : 'N/A',
                    'contact'        => $app->operator ? $app->operator->contact_number : 'N/A',
                    'make'           => $app->tricycle ? trim("{$app->tricycle->make} {$app->tricycle->model}") : 'N/A',
                    'plate'          => $app->tricycle ? ($app->tricycle->plate_number ?: '—') : '—',
                    'status'         => $statusLabel,
                    'raw_status'     => $app->status,
                    'submitted_at'   => $app->submitted_at ? $app->submitted_at->format('M d, Y') : ($app->created_at ? $app->created_at->format('M d, Y') : null),
                    'updated_at_fmt' => $app->updated_at ? $app->updated_at->format('M d, Y · h:i A') : null,
                ];
            });

        $awaitingCount = $applications->where('status', 'Awaiting Inspection')->count();
        $readyReinspectionCount = $applications->where('status', 'Ready for Reinspection')->count();
        $reinspectionRequiredCount = $applications->where('status', 'Reinspection Required')->count();
        $reinspectionCount = $readyReinspectionCount + $reinspectionRequiredCount;

        // Count inspections passed today by the current inspector
        $passedTodayCount = Inspection::where('inspector_id', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->where('result', 'passed')
            ->count();

        // Count total inspections completed today by the current inspector
        $completedTodayCount = Inspection::where('inspector_id', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->count();

        return Inertia::render('TMODashboard/PhysicalQueue', [
            'applications'              => $applications,
            'awaitingCount'             => $awaitingCount,
            'readyReinspectionCount'    => $readyReinspectionCount,
            'reinspectionRequiredCount' => $reinspectionRequiredCount,
            'scheduledCount'            => $awaitingCount,
            'reinspectionCount'         => $reinspectionCount,
            'passedTodayCount'          => $passedTodayCount,
            'completedTodayCount'       => $completedTodayCount,
        ]);
    }

    /**
     * Show physical inspection detail.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator', 'tricycle', 'tricycleDriver', 'inspections']);

        $operator = $application->operator;
        $tricycle = $application->tricycle;
        $latestInspection = $application->inspections->sortByDesc('attempt_number')->first();

        // Check if this is a re-inspection attempt
        $attemptCount = $application->inspections->count();
        $isReinspection = $attemptCount > 0 && $latestInspection && $latestInspection->result === 'failed';
        $previousRejectionReason = null;
        if ($isReinspection) {
            $previousRejectionReason = $latestInspection->overall_notes;
        }

        $appData = [
            'id'                        => $application->id,
            'reference'                 => $application->reference_number,
            'operator'                  => $operator ? $operator->full_name : 'N/A',
            'owner'                     => $application->ownerDetails(),
            'ownerIsDriver'             => (bool) $application->owner_is_driver,
            'tricycleDriver'            => $application->driverDetails(),
            'contact'                   => $operator ? $operator->contact_number : 'N/A',
            'barangay'                  => $operator ? $operator->barangay : 'N/A',
            'make'                      => $tricycle ? trim("{$tricycle->make} {$tricycle->model}") : 'N/A',
            'make_name'                 => $tricycle ? $tricycle->make : 'N/A',
            'model_name'                => $tricycle ? $tricycle->model : 'N/A',
            'year_model'                => $tricycle ? ($tricycle->year_model ?: '—') : '—',
            'body_color'                => $tricycle ? ($tricycle->body_color ?: '—') : '—',
            'body_type'                 => $tricycle ? ($tricycle->body_type ?: '—') : '—',
            'engine_number'             => $tricycle ? ($tricycle->engine_number ?: '—') : '—',
            'chassis_number'            => $tricycle ? ($tricycle->chassis_number ?: '—') : '—',
            'plate'                     => $tricycle ? ($tricycle->plate_number ?: '—') : '—',
            'or_number'                 => $tricycle ? ($tricycle->or_number ?: '—') : '—',
            'cr_number'                 => $tricycle ? ($tricycle->cr_number ?: '—') : '—',
            'status'                    => $application->status,
            'attempt_count'             => $attemptCount,
            'is_reinspection'           => $isReinspection,
            'previous_rejection_reason' => $previousRejectionReason,
        ];

        return Inertia::render('TMODashboard/PhysicalInspection', [
            'application' => $appData,
        ]);
    }

    /**
     * Submit physical inspection report (Single overall decision: Approve or Reject).
     */
    public function store(Request $request, Application $application): RedirectResponse
    {
        $action = strtolower((string) $request->input('action'));

        // Support both 'approve'/'reject' and legacy 'pass'/'fail'
        $isApprove = in_array($action, ['approve', 'pass']);
        $isReject = in_array($action, ['reject', 'fail']);

        if (!$isApprove && !$isReject) {
            return back()->withErrors(['action' => 'Invalid inspection decision. Must be Approve or Reject.']);
        }

        $rejectionReason = null;
        if ($isReject) {
            $rejectionReason = trim((string) (
                $request->input('rejection_reason')
                ?? $request->input('rejection_comment')
                ?? $request->input('comments')
                ?? (is_array($request->input('defectNotes')) ? implode('; ', array_filter($request->input('defectNotes'))) : null)
                ?? $request->input('remarks')
            ));

            if (empty($rejectionReason)) {
                return back()->withErrors([
                    'rejection_reason' => 'A reason for rejection is required when rejecting physical inspection.',
                ]);
            }
        }

        DB::transaction(function () use ($application, $isApprove, $rejectionReason) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            $attemptNumber = $application->inspections()->count() + 1;

            if ($isApprove) {
                $result = 'passed';
                $safetyPassed = true;
                $brakesPassed = true;
                $lightsPassed = true;
                $tiresPassed = true;
                $emissionsTest = true;
                $licenseDocs = true;
                $inspectorNotes = 'Physical inspection approved.';

                $toStatus = 'pending_bplo_release';
                $toStep = 3; // Step 3: proceed to BPLO for sticker/plate release
                $notes = "Passed physical tricycle inspection attempt #{$attemptNumber}. Driver instructed to proceed to BPLO for sticker/plate release.";
            } else {
                $result = 'failed';
                $safetyPassed = false;
                $brakesPassed = false;
                $lightsPassed = false;
                $tiresPassed = false;
                $emissionsTest = false;
                $licenseDocs = false;
                $inspectorNotes = $rejectionReason;

                $toStatus = 'failed_inspection';
                $toStep = 2; // Stay at Physical Inspection step for re-inspection
                $notes = "Failed physical tricycle inspection attempt #{$attemptNumber}. Reason: {$rejectionReason}";
            }

            // Save Inspection
            Inspection::create([
                'application_id'    => $application->id,
                'inspector_id'      => Auth::id(),
                'attempt_number'    => $attemptNumber,
                'inspection_date'   => now()->toDateString(),
                'inspection_time'   => now()->toTimeString(),
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => $result,
                'safety_equipment'  => $safetyPassed,
                'brakes_steering'   => $brakesPassed,
                'lights_reflectors' => $lightsPassed,
                'tires_suspension'  => $tiresPassed,
                'emissions_test'    => $emissionsTest,
                'license_toda_docs' => $licenseDocs,
                'inspector_notes'   => $inspectorNotes,
            ]);

            $application->update([
                'status'       => $toStatus,
                'current_step' => $toStep,
                'remarks'      => $notes,
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => Auth::id(),
                'from_status'    => $fromStatus,
                'to_status'      => $toStatus,
                'from_step'      => $fromStep,
                'to_step'        => $toStep,
                'notes'          => $notes,
                'created_at'     => now(),
            ]);
        });

        if ($isApprove) {
            return redirect()->route('tmo.physical')
                ->with('success', 'Physical inspection approved! The application has proceeded to BPLO Releasing.');
        }

        return redirect()->route('tmo.physical')
            ->with('error', 'Inspection failed. Deficiency report logged and operator notified.');
    }
}
