<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Inspection;
use App\Models\TodaZone;
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
        $applications = Application::with(['operator.todaZone', 'tricycle.todaZone', 'inspections'])
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
                if ($app->status === 'failed_inspection' || $app->inspections->contains('result', 'failed')) {
                    $statusLabel = 'Re-inspection';
                } else {
                    $statusLabel = 'Scheduled';
                }

                $todaName = $app->tricycle?->todaZone?->name 
                    ?? $app->operator?->todaZone?->name 
                    ?? 'Unassigned';
                
                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'operator'       => $app->operator ? $app->operator->full_name : 'N/A',
                    'contact'        => $app->operator ? $app->operator->contact_number : 'N/A',
                    'toda'           => $todaName,
                    'toda_id'        => $app->tricycle?->toda_zone_id ?? $app->operator?->toda_zone_id,
                    'make'           => $app->tricycle ? trim("{$app->tricycle->make} {$app->tricycle->model}") : 'N/A',
                    'plate'          => $app->tricycle ? ($app->tricycle->plate_number ?: '—') : '—',
                    'scheduled_date' => $app->updated_at->toDateString(),
                    'time_slot'      => $app->updated_at->format('h:i A'),
                    'status'         => $statusLabel,
                    'raw_status'     => $app->status,
                ];
            });

        $scheduledCount = $applications->where('status', 'Scheduled')->count();
        $reinspectionCount = $applications->where('status', 'Re-inspection')->count();
        
        // Count inspections passed today by the current inspector
        $passedTodayCount = Inspection::where('inspector_id', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->where('result', 'passed')
            ->count();

        // Count total inspections completed today by the current inspector
        $completedTodayCount = Inspection::where('inspector_id', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->count();

        // Get all TODA zones from the database for filter dropdown
        $todaZones = TodaZone::orderBy('name')->get(['id', 'name']);

        return Inertia::render('TMODashboard/PhysicalQueue', [
            'applications'        => $applications,
            'todaZones'           => $todaZones,
            'scheduledCount'      => $scheduledCount,
            'reinspectionCount'   => $reinspectionCount,
            'passedTodayCount'    => $passedTodayCount,
            'completedTodayCount' => $completedTodayCount,
        ]);
    }

    /**
     * Show physical inspection detail.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle.todaZone', 'inspections']);

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

        $todaName = $tricycle?->todaZone?->name 
            ?? $operator?->todaZone?->name 
            ?? 'Unassigned';

        $appData = [
            'id'                 => $application->id,
            'reference'          => $application->reference_number,
            'operator'           => $operator ? $operator->full_name : 'N/A',
            'contact'            => $operator ? $operator->contact_number : 'N/A',
            'barangay'           => $operator ? $operator->barangay : 'N/A',
            'toda'               => $todaName,
            'make'               => $tricycle ? trim("{$tricycle->make} {$tricycle->model}") : 'N/A',
            'make_name'          => $tricycle ? $tricycle->make : 'N/A',
            'model_name'         => $tricycle ? $tricycle->model : 'N/A',
            'year_model'         => $tricycle ? ($tricycle->year_model ?: '—') : '—',
            'body_color'         => $tricycle ? ($tricycle->body_color ?: '—') : '—',
            'body_type'          => $tricycle ? ($tricycle->body_type ?: '—') : '—',
            'engine_number'      => $tricycle ? ($tricycle->engine_number ?: '—') : '—',
            'chassis_number'     => $tricycle ? ($tricycle->chassis_number ?: '—') : '—',
            'plate'              => $tricycle ? ($tricycle->plate_number ?: '—') : '—',
            'or_number'          => $tricycle ? ($tricycle->or_number ?: '—') : '—',
            'cr_number'          => $tricycle ? ($tricycle->cr_number ?: '—') : '—',
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
                $toStep = 4; // Step 4: Payment Ticket & Cashier Payment
                $notes = "Passed physical tricycle inspection attempt #{$attemptNumber}. Official Payment Ticket generated for Municipal Cashier settlement.";
            } else {
                $toStatus = 'failed_inspection';
                $toStep = 3; // Keep at inspection step for re-inspection
                $notes = "Failed physical tricycle inspection attempt #{$attemptNumber}. Defect notices sent to operator.";
            }

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

        if ($action === 'pass') {
            return redirect()->route('tmo.ticket', $application->id)
                ->with('success', 'Physical inspection passed! Official Payment Ticket generated. Please print this ticket for the driver.');
        }

        return redirect()->route('tmo.physical')
            ->with('error', 'Inspection failed. Deficiency report logged and operator notified.');
    }
}
