<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
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
     * Display the document queue.
     */
    public function index(): Response
    {
        // Fetch applications currently at Step 1 (Document Review)
        // This includes pending_review, under_review, and rejected (awaiting resubmission)
        $applications = Application::with(['operator.todaZone', 'documents'])
            ->whereIn('status', ['pending_review', 'under_review', 'rejected'])
            ->orderBy('submitted_at', 'asc')
            ->get()
            ->map(function ($app) {
                $statusLabel = in_array($app->status, ['pending_review', 'under_review']) ? 'Pending' : 'Re-submission';
                
                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'operator'       => $app->operator ? $app->operator->full_name : 'N/A',
                    'toda'           => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
                    'submitted_at'   => $app->submitted_at ? $app->submitted_at->diffForHumans() : 'N/A',
                    'submitted_date' => $app->submitted_at ? $app->submitted_at->format('F j, Y · g:i A') : 'N/A',
                    'docs_count'     => $app->documents->count(),
                    'status'         => $statusLabel,
                ];
            });

        // Calculate queue counts
        $pendingCount = $applications->where('status', 'Pending')->count();
        $resubmissionCount = $applications->where('status', 'Re-submission')->count();
        
        // Count applications processed today (status changes to pending_inspection, failed_inspection, etc. made today)
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
     * Show the detailed document review screen.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle.todaZone', 'documents']);

        $operator = $application->operator;
        $tricycle = $application->tricycle;

        // Map database documents to frontend expectation
        $requirementsMap = [
            'drivers_license'    => 'license',
            'or_cr'              => 'orcr',
            'proof_of_residence' => 'brgy',
            'toda_clearance'     => 'toda',
            'photo_id'           => 'driver_id',
        ];

        $docStatuses = [];
        $rejectionReasons = [];

        foreach ($application->documents as $doc) {
            $frontendId = $requirementsMap[$doc->document_type] ?? 'other';
            $docStatuses[$frontendId] = $doc->review_status;
            if ($doc->review_status === 'rejected') {
                $rejectionReasons[$frontendId] = $doc->rejection_reason;
            }
        }

        $appData = [
            'id'             => $application->id,
            'reference'      => $application->reference_number,
            'operator'       => $operator ? $operator->full_name : 'N/A',
            'contact'        => $operator ? $operator->contact_number : 'N/A',
            'barangay'       => $operator ? $operator->barangay : 'N/A',
            'toda'           => ($operator && $operator->todaZone) ? $operator->todaZone->name : 'Unassigned',
            'make'           => $tricycle ? "{$tricycle->make} {$tricycle->model}" : 'N/A',
            'engine_number'  => $tricycle ? $tricycle->engine_number : 'N/A',
            'chassis_number' => $tricycle ? $tricycle->chassis_number : 'N/A',
            'plate'          => $tricycle ? $tricycle->plate_number : 'N/A',
            'status'         => $application->status,
            'docStatuses'    => $docStatuses,
            'rejectionReasons' => $rejectionReasons,
        ];

        return Inertia::render('TMODashboard/DocumentReview', [
            'application' => $appData,
        ]);
    }

    /**
     * Submit document review results.
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

        $requirementsMap = [
            'license'   => 'drivers_license',
            'orcr'      => 'or_cr',
            'brgy'      => 'proof_of_residence',
            'toda'      => 'toda_clearance',
            'driver_id' => 'photo_id',
        ];

        DB::transaction(function () use ($application, $action, $docStatuses, $rejectionReasons, $requirementsMap) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            // 1. Update review status on individual document records
            foreach ($application->documents as $doc) {
                // Find matching frontend key
                $frontendKey = array_search($doc->document_type, $requirementsMap, true);
                if ($frontendKey && isset($docStatuses[$frontendKey])) {
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
                $toStep = 2; // Step 2: Physical Inspection
                $notes = 'All mandatory documents verified and approved. Moved to Inspection phase.';
            } else {
                $toStatus = 'rejected';
                $toStep = 1; // Stay at step 1 for resubmission
                $notes = 'Application rejected due to document verification issues.';
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
            ? 'Application approved and moved to Physical Inspection phase.'
            : 'Rejection notice sent successfully to the operator.';

        return redirect()->route('tmo.docs')->with('success', $message);
    }
}
