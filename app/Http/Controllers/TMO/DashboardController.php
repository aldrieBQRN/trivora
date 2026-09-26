<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Inspection;
use App\Models\Tricycle;
use App\Models\Violation;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * The TMO landing page — a real, application-focused overview of the
     * pipeline. Every count here reuses the exact status filter its own
     * queue controller already applies, so these numbers always agree with
     * what each queue page itself shows.
     */
    public function index(): Response
    {
        $pipeline = [
            'document_review'    => Application::whereIn('status', ['pending_review', 'under_review', 'rejected'])->count(),
            'physical'           => Application::whereIn('status', ['pending_inspection', 'under_inspection', 'failed_inspection'])->count(),
            'final_confirmation' => Application::where('status', 'awaiting_tmo_confirmation')->count(),
        ];

        // Per-stage breakdown so each pipeline card can show what's actually inside its count,
        // not just a single number — same underlying status groupings each queue page itself uses.
        $pipelineBreakdown = [
            'document_review' => [
                'new'          => Application::whereIn('status', ['pending_review', 'under_review'])->count(),
                'resubmission' => Application::where('status', 'rejected')->count(),
                'oldest'       => Application::whereIn('status', ['pending_review', 'under_review', 'rejected'])->oldest('submitted_at')->value('submitted_at'),
            ],
            'physical' => [
                'scheduled'    => Application::whereIn('status', ['pending_inspection', 'under_inspection'])->count(),
                'reinspection' => Application::where('status', 'failed_inspection')->count(),
                'oldest'       => Application::whereIn('status', ['pending_inspection', 'under_inspection', 'failed_inspection'])->oldest('submitted_at')->value('submitted_at'),
            ],
            'final_confirmation' => [
                'oldest' => Application::where('status', 'awaiting_tmo_confirmation')->oldest('submitted_at')->value('submitted_at'),
            ],
        ];
        foreach ($pipelineBreakdown as &$stage) {
            $stage['oldest'] = $stage['oldest'] ? \Illuminate\Support\Carbon::parse($stage['oldest'])->diffForHumans(null, true) : null;
        }
        unset($stage);

        // BPLO releasing stage — read-only visibility for TMO, not actionable here. Payment
        // itself happens entirely offline at the Municipal Treasurer's Office; the system never
        // verifies it, so there's only one count here now (not a separate "verified" sub-state).
        $bplo = [
            'pending_release' => Application::where('status', 'pending_bplo_release')->count(),
        ];

        // This officer's own activity today, mirroring each queue controller's Auth::id()-scoped "today" count.
        $myActivityToday = [
            'docs_reviewed' => ApplicationStatusHistory::where('changed_by', Auth::id())
                ->whereDate('created_at', now()->toDateString())
                ->whereIn('to_status', ['pending_inspection', 'rejected'])
                ->distinct('application_id')->count(),
            'inspections_completed' => Inspection::where('inspector_id', Auth::id())
                ->whereDate('created_at', now()->toDateString())->count(),
            'confirmations_completed' => ApplicationStatusHistory::where('changed_by', Auth::id())
                ->whereDate('created_at', now()->toDateString())
                ->where('to_status', 'completed')
                ->distinct('application_id')->count(),
        ];

        $fleet = [
            'active_fleet'     => Tricycle::where('status', 'active')->count(),
            'violations_today' => Violation::whereDate('detected_at', now()->toDateString())->count(),
            'open_violations'  => Violation::open()->count(),
        ];

        $recentActivity = ApplicationStatusHistory::with(['application.operator', 'changedBy'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($h) => [
                'id'          => $h->id,
                'reference'   => $h->application?->reference_number,
                'operator'    => $h->application?->operator?->full_name ?? 'N/A',
                'from_status' => $h->from_status,
                'to_status'   => $h->to_status,
                'changed_by'  => $h->changedBy?->name ?? 'System',
                'notes'       => $h->notes,
                'when'        => $h->created_at->diffForHumans(),
            ]);

        return Inertia::render('TMODashboard/Dashboard', compact('pipeline', 'pipelineBreakdown', 'bplo', 'myActivityToday', 'fleet', 'recentActivity'));
    }
}
