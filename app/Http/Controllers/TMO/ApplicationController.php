<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    /**
     * Display the initial online document queue.
     */
    public function index(): Response
    {
        // Fetch applications currently at Phase 1 (Online Document Review)
        // This includes pending_review, under_review, and rejected (awaiting resubmission)
        $applications = Application::with(['operator', 'documents'])
            ->whereIn('status', ['pending_review', 'under_review', 'rejected'])
            ->orderBy('submitted_at', 'asc')
            ->get()
            ->map(function ($app) {
                $statusLabel = in_array($app->status, ['pending_review', 'under_review']) ? 'Pending' : 'Re-submission';

                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'operator'       => $app->operator ? $app->operator->full_name : 'N/A',
                    'submitted_at'   => $app->submitted_at ? $app->submitted_at->diffForHumans() : 'N/A',
                    'submitted_date' => $app->submitted_at ? $app->submitted_at->format('F j, Y · g:i A') : 'N/A',
                    'docs_count'     => $app->documents->count(),
                    'status'         => $statusLabel,
                ];
            });

        $pendingCount = $applications->where('status', 'Pending')->count();
        $resubmissionCount = $applications->where('status', 'Re-submission')->count();

        // Count online applications reviewed today by current user
        $reviewedTodayCount = ApplicationStatusHistory::where('changed_by', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->whereIn('to_status', ['pending_inspection', 'rejected'])
            ->distinct('application_id')
            ->count();

        return Inertia::render('TMODashboard/DocumentQueue', [
            'applications'        => $applications,
            'pendingCount'        => $pendingCount,
            'reviewedTodayCount'  => $reviewedTodayCount,
            'resubmissionCount'   => $resubmissionCount,
        ]);
    }

    /**
     * Show the detailed online document review screen.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator', 'tricycle', 'tricycleDriver', 'documents' => function ($query) {
            // Oldest first, so a resubmission (a newer row for the same requirement) is
            // processed last below and its status/reason wins over the obsolete submission.
            $query->orderBy('created_at');
        }]);

        $operator = $application->operator;
        $tricycle = $application->tricycle;

        $docStatuses = [];
        $rejectionReasons = [];
        $mappedDocs = [];

        foreach ($application->documents as $doc) {
            $frontendId = ApplicationDocument::resolveRequirementKey($doc);

            $docStatuses[$frontendId] = $doc->review_status;
            if ($doc->review_status === 'rejected') {
                $rejectionReasons[$frontendId] = $doc->rejection_reason;
            } else {
                unset($rejectionReasons[$frontendId]);
            }
            $mappedDocs[] = [
                'id'            => $doc->id,
                'category'      => $frontendId,
                'file_name'     => $doc->file_name,
                'file_path'     => '/storage/' . ltrim($doc->file_path, '/'),
                'mime_type'     => $doc->mime_type,
                'review_status' => $doc->review_status,
            ];
        }

        $appData = [
            'id'             => $application->id,
            'reference'      => $application->reference_number,
            'operator'       => $operator ? $operator->full_name : 'N/A',
            // Tricycle Owner (the applicant) + optional separate Tricycle Driver. Lists keep
            // showing `operator` as the primary person; the driver only appears in details.
            'owner'          => $application->ownerDetails(),
            'ownerIsDriver'  => (bool) $application->owner_is_driver,
            'tricycleDriver' => $application->driverDetails(),
            'contact'        => $operator ? $operator->contact_number : 'N/A',
            'barangay'       => $operator ? $operator->barangay : 'N/A',
            'make'           => $tricycle ? trim("{$tricycle->make} {$tricycle->model}") : 'N/A',
            'make_name'      => $tricycle ? $tricycle->make : 'N/A',
            'model_name'     => $tricycle ? $tricycle->model : 'N/A',
            'year_model'     => $tricycle ? ($tricycle->year_model ?: 'N/A') : 'N/A',
            'body_color'     => $tricycle ? ($tricycle->body_color ?: 'N/A') : 'N/A',
            'body_type'      => $tricycle ? ($tricycle->body_type ?: 'N/A') : 'N/A',
            'engine_number'  => $tricycle ? ($tricycle->engine_number ?: 'N/A') : 'N/A',
            'chassis_number' => $tricycle ? ($tricycle->chassis_number ?: 'N/A') : 'N/A',
            'plate'          => $tricycle ? ($tricycle->plate_number ?: 'N/A') : 'N/A',
            'or_number'      => $tricycle ? ($tricycle->or_number ?: 'N/A') : 'N/A',
            'cr_number'      => $tricycle ? ($tricycle->cr_number ?: 'N/A') : 'N/A',
            'status'         => $application->status,
            'docStatuses'    => $docStatuses,
            'rejectionReasons' => $rejectionReasons,
            'documents'      => $mappedDocs,
        ];

        return Inertia::render('TMODashboard/DocumentReview', [
            'application' => $appData,
        ]);
    }

    /**
     * Submit initial online document review results.
     */
    public function review(Request $request, Application $application): RedirectResponse
    {
        $request->validate([
            'action'           => 'required|in:approve,reject',
            'docStatuses'      => 'required|array',
            'rejectionReasons' => 'nullable|array',
        ]);

        $action = $request->input('action');
        $docStatuses = $request->input('docStatuses');
        $rejectionReasons = $request->input('rejectionReasons', []);

        DB::transaction(function () use ($application, $action, $docStatuses, $rejectionReasons) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            // 1. Update review status on individual document records
            foreach ($application->documents as $doc) {
                $frontendKey = ApplicationDocument::resolveRequirementKey($doc);

                if ($frontendKey !== 'other' && isset($docStatuses[$frontendKey])) {
                    $status = $docStatuses[$frontendKey];
                    $doc->update([
                        'review_status'    => $status,
                        'reviewed_by'      => Auth::id(),
                        'reviewed_at'      => now(),
                        'rejection_reason' => $status === 'rejected' ? ($rejectionReasons[$frontendKey] ?? 'Invalid document.') : null,
                    ]);
                }
            }

            // 2. Transition workflow step and application status
            if ($action === 'approve') {
                $toStatus = 'pending_inspection';
                $toStep = 2; // Step 2: Physical Tricycle Inspection
                $notes = 'Uploaded requirements verified and approved. Unit endorsed for physical roadworthiness inspection.';
            } else {
                $toStatus = 'rejected';
                $toStep = 1; // Stay at step 1 for resubmission
                $notes = 'Online application rejected due to document verification issues. Correction required.';
            }

            $application->update([
                'status'       => $toStatus,
                'current_step' => $toStep,
                'remarks'      => $notes,
            ]);

            // 3. Log status change history
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

        $message = $action === 'approve'
            ? 'Application requirements approved. Unit scheduled for Physical Tricycle Inspection.'
            : 'Rejection notice sent successfully to the operator.';

        return redirect()->route('tmo.docs')->with('success', $message);
    }
}
