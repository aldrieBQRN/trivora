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
        $applications = Application::with(['operator.todaZone', 'tricycle', 'inspections'])
            ->whereIn('status', ['pending_inspection', 'under_inspection', 'failed_inspection'])
            ->get()
            ->map(function ($app) {
                // If there's a failed attempt, it's a re-inspection
                $hasFailed = $app->status === 'failed_inspection' || $app->inspections->contains('result', 'failed');
                $statusLabel = $hasFailed ? 'Re-inspection' : 'Scheduled';
                
                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'operator'       => $app->operator ? $app->operator->full_name : 'N/A',
                    'toda'           => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
                    'make'           => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
                    'scheduled_date' => $app->updated_at->toDateString(),
                    'time_slot'      => $app->updated_at->format('h:i A'),
                    'status'         => $statusLabel,
                ];
            });

        $scheduledCount = $applications->where('status', 'Scheduled')->count();
        $reinspectionCount = $applications->where('status', 'Re-inspection')->count();
        
        // Count inspections completed today by the current inspector
        $completedTodayCount = Inspection::where('inspector_id', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->count();

        return Inertia::render('TMODashboard/PhysicalQueue', [
            'applications'        => $applications,
            'scheduledCount'      => $scheduledCount,
            'reinspectionCount'   => $reinspectionCount,
            'completedTodayCount' => $completedTodayCount,
        ]);
    }

    /**
     * Show physical inspection detail.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle', 'inspections']);

        $operator = $application->operator;
        $tricycle = $application->tricycle;
        $latestInspection = $application->inspections->sortByDesc('attempt_number')->first();

        // Load pre-existing state if any (useful for re-inspection)
        $inspectionStatuses = [];
        $defectNotes = [];
        if ($latestInspection && $latestInspection->inspector_notes) {
            $notesData = json_decode($latestInspection->inspector_notes, true);
            if (is_array($notesData)) {
                $inspectionStatuses = $notesData['statuses'] ?? [];
                $defectNotes = $notesData['defects'] ?? [];
            }
        }

        $appData = [
            'id'                 => $application->id,
            'reference'          => $application->reference_number,
            'operator'           => $operator ? $operator->full_name : 'N/A',
            'contact'            => $operator ? $operator->contact_number : 'N/A',
            'barangay'           => $operator ? $operator->barangay : 'N/A',
            'toda'               => ($operator && $operator->todaZone) ? $operator->todaZone->name : 'Unassigned',
            'make'               => $tricycle ? "{$tricycle->make} {$tricycle->model}" : 'N/A',
            'engine_number'      => $tricycle ? $tricycle->engine_number : 'N/A',
            'chassis_number'     => $tricycle ? $tricycle->chassis_number : 'N/A',
            'plate'              => $tricycle ? $tricycle->plate_number : 'N/A',
            'status'             => $application->status,
            'inspectionStatuses' => $inspectionStatuses,
            'defectNotes'        => $defectNotes,
        ];

        return Inertia::render('TMODashboard/PhysicalInspection', [
            'application' => $appData,
        ]);
    }

    /**
     * Submit physical inspection report.
     */
    public function store(Request $request, Application $application): RedirectResponse
    {
        $request->validate([
            'action'             => 'required|in:pass,fail',
            'inspectionStatuses' => 'required|array',
            'defectNotes'        => 'nullable|array',
        ]);

        $action = $request->input('action');
        $inspectionStatuses = $request->input('inspectionStatuses');
        $defectNotes = $request->input('defectNotes', []);

        DB::transaction(function () use ($application, $action, $inspectionStatuses, $defectNotes) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            $attemptNumber = $application->inspections()->count() + 1;

            // Map granular frontend checkboxes to aggregated DB columns
            $safetyPassed = ($inspectionStatuses['mirrors'] ?? '') === 'passed' 
                && ($inspectionStatuses['horn'] ?? '') === 'passed' 
                && ($inspectionStatuses['plate'] ?? '') === 'passed';
                
            $lightsPassed = ($inspectionStatuses['headlights'] ?? '') === 'passed' 
                && ($inspectionStatuses['taillights'] ?? '') === 'passed' 
                && ($inspectionStatuses['signals'] ?? '') === 'passed';

            $brakesPassed = ($inspectionStatuses['brakes'] ?? '') === 'passed';
            $tiresPassed = ($inspectionStatuses['sidecar'] ?? '') === 'passed';

            // Store detailed state in inspector_notes as JSON
            $inspectorNotes = json_encode([
                'statuses' => $inspectionStatuses,
                'defects'  => $defectNotes,
            ]);

            // Save Inspection
            Inspection::create([
                'application_id'    => $application->id,
                'inspector_id'      => Auth::id(),
                'attempt_number'    => $attemptNumber,
                'inspection_date'   => now()->toDateString(),
                'inspection_time'   => now()->toTimeString(),
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => $action === 'pass' ? 'passed' : 'failed',
                'safety_equipment'  => $safetyPassed,
                'brakes_steering'   => $brakesPassed,
                'lights_reflectors' => $lightsPassed,
                'tires_suspension'  => $tiresPassed,
                'emissions_test'    => true, // Assumed pass for core workflow
                'license_toda_docs' => true, // Assumed pass for core workflow
                'inspector_notes'   => $inspectorNotes,
            ]);

            // Save status history transition
            if ($action === 'pass') {
                $toStatus = 'pending_payment';
                $toStep = 4; // Step 4: Payment
                $notes = "Passed physical inspection attempt #{$attemptNumber}. Forwarded to Treasurer.";
            } else {
                $toStatus = 'failed_inspection';
                $toStep = 3; // Keep at step 3 for re-inspection
                $notes = "Failed physical inspection attempt #{$attemptNumber}. Defect notices sent to operator.";
            }

            $application->update([
                'status'       => $toStatus,
                'current_step' => $toStep,
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

        $message = $action === 'pass'
            ? 'Physical inspection passed. Application forwarded for payment.'
            : 'Inspection failed. Deficiency report logged.';

        return redirect()->route('tmo.physical')->with('success', $message);
    }
}
