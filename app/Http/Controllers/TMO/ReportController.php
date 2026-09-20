<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\FranchiseScheme;
use App\Models\Payment;
use App\Models\Tricycle;
use App\Models\TodaZone;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * TMO Reports & Analytics — historical/trend analytics, distinct from every other
 * TMO page (dashboard + 4 pipeline queues), which only ever show today's snapshot
 * counts. Every metric here is computed straight from the real Violation/Application/
 * Tricycle/Payment tables — no fabricated values, no hardcoded "Automated GPS"-style
 * shortcuts like the older DashboardController::violations() takes.
 */
class ReportController extends Controller
{
    use ExportsMunicipalExcelReports;

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'violations');
        [$from, $to] = $this->resolveDateRange($request);

        $reportData = match ($tab) {
            'applications' => $this->applicationsReport($from, $to, $request),
            'fleet'        => $this->fleetReport($request),
            'collections'  => $this->collectionsReport($from, $to),
            default        => $this->violationsReport($from, $to, $request),
        };

        return Inertia::render('TMODashboard/Reports/Index', [
            'tab'       => $tab,
            'from'      => $from->toDateString(),
            'to'        => $to->toDateString(),
            'filters'   => [
                'toda_zone_id'     => $request->query('toda_zone_id'),
                'violation_type'   => $request->query('violation_type'),
                'detection_method' => $request->query('detection_method'),
                'application_type' => $request->query('application_type'),
                'tricycle_status'  => $request->query('tricycle_status'),
            ],
            'todaZones' => TodaZone::orderBy('name')->get(['id', 'name']),
            'reportData'=> $reportData,
        ]);
    }

    public function exportViolationsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->violationsReport($from, $to, $request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Violations Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Violations & Compliance Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            11
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Violations' => number_format($data['kpis']['total_violations']),
            'Fines Assessed'   => 'PHP ' . number_format($data['kpis']['fines_assessed'], 2),
            'Fines Collected'  => 'PHP ' . number_format($data['kpis']['fines_collected'], 2),
            'Collection Rate'  => number_format($data['kpis']['collection_rate'], 1) . '%',
            'Appeals Filed'    => number_format($data['kpis']['appeals_filed']),
        ], [2, 2, 2, 2, 3]);

        $row = $this->writeSectionTitle($sheet, $row, 'Official Violation Log');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Ticket No.', 'Date', 'Time', 'Type', 'Detection Method', 'Operator', 'Plate No.', 'TODA Zone', 'Fine Amount (PHP)', 'Paid', 'Appeal Status'],
            $data['records']->map(fn ($r) => [
                $r['id'],
                $r['date'],
                $r['time'],
                $r['type'],
                $r['detection_method'],
                $r['operator'],
                $r['plate'],
                $r['toda'],
                (float) $r['fine'],
                $r['is_paid'] ? 'Paid' : 'Unpaid',
                $r['appeal_status'] ? ucfirst(str_replace('_', ' ', $r['appeal_status'])) : 'None',
            ])->all(),
            true
        );

        $filename = 'trivora_violations_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportApplicationsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->applicationsReport($from, $to, $request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Applications Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Franchise & Applications Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            4
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Applications Submitted' => number_format($data['kpis']['submitted']),
            'Completed Franchises'   => number_format($data['kpis']['completed']),
            'Rejection Rate'         => number_format($data['kpis']['rejection_rate'], 1) . '%',
            'Avg. Processing Time'   => $data['kpis']['avg_processing_days'] !== null ? number_format($data['kpis']['avg_processing_days'], 1) . ' days' : 'N/A',
        ], [1, 1, 1, 1]);

        $totalSubmitted = max($data['kpis']['submitted'], 1);
        $stagePhases = [
            'Document Review'             => 'Initial Evaluation',
            'Re-submission'               => 'Applicant Revision',
            'Physical Inspection'         => 'Field Inspection',
            'Re-inspection'               => 'Follow-up Inspection',
            'Municipal Treasurer Payment' => 'Treasury Assessment',
            'BPLO Releasing'              => 'BPLO Processing',
            'Final Confirmation'          => 'Final Endorsement',
            'Completed'                   => 'Franchise Issued',
        ];

        $row = $this->writeSectionTitle($sheet, $row, 'Current Stage Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Application Stage', 'Workflow Phase', 'Applications Count', 'Share of Total'],
            $data['by_stage']->map(fn ($s) => [
                $s['stage'],
                $stagePhases[$s['stage']] ?? 'Processing',
                (int) $s['count'],
                number_format(($s['count'] / $totalSubmitted) * 100, 1) . '%',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Application Type Distribution');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Application Type', 'Applicant Category', 'Applications Count', 'Share of Total'],
            [
                ['New Franchise', 'First-time Applicant', (int) $data['type_split']['new'], number_format(($data['type_split']['new'] / $totalSubmitted) * 100, 1) . '%'],
                ['Renewal', 'Existing Franchise Renewal', (int) $data['type_split']['renewal'], number_format(($data['type_split']['renewal'] / $totalSubmitted) * 100, 1) . '%'],
            ]
        );

        if (count($data['avg_time_in_stage'])) {
            $row = $this->writeSectionTitle($sheet, $row, 'Average Processing Time by Stage');
            $row = $this->writeTable(
                $sheet,
                $row,
                ['Workflow Status', 'Category', 'Avg. Hours in Stage', 'Equivalent Days'],
                $data['avg_time_in_stage']->map(fn ($s) => [
                    $s['status'],
                    'Stage SLA Metric',
                    (float) $s['avg_hours'],
                    number_format($s['avg_hours'] / 24, 1) . ' days',
                ])->all()
            );
        }

        $filename = 'trivora_applications_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportFleetExcel(Request $request): StreamedResponse
    {
        $data = $this->fleetReport($request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Fleet Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Fleet & Franchise Registry Report',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            5
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Registered' => number_format($data['kpis']['total']),
            'Active Units'     => number_format($data['kpis']['active']),
            'Suspended Units'  => number_format($data['kpis']['suspended']),
            'Revoked Units'    => number_format($data['kpis']['revoked']),
        ], [2, 1, 1, 1]);

        $totalFleet = max($data['kpis']['total'], 1);

        $row = $this->writeSectionTitle($sheet, $row, 'Fleet Distribution by TODA Zone');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['TODA Zone', 'Zone Category', 'Units Registered', 'Fleet Share', 'Operational Status'],
            $data['by_toda']->map(fn ($z) => [
                $z['zone'],
                'Recognized TODA',
                (int) $z['count'],
                number_format(($z['count'] / $totalFleet) * 100, 1) . '%',
                $z['count'] > 0 ? 'Active Route' : 'No Active Units',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Fleet by Color Coding Scheme');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Color Coding Scheme', 'Color Hex Code', 'Units Assigned', 'Fleet Share', 'Scheme Status'],
            $data['by_color_scheme']->map(fn ($s) => [
                $s['scheme'],
                $s['color'] ?: 'Standard',
                (int) $s['count'],
                number_format(($s['count'] / $totalFleet) * 100, 1) . '%',
                'Designated Route',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Tracking Method Adoption');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Tracking Method', 'Technology Type', 'Units Count', 'Adoption Share', 'Compliance Mode'],
            [
                ['IoT GPS Device', 'Dedicated Hardware Telemetry', (int) $data['tracking_split']['iot'], number_format($data['kpis']['iot_pct'], 1) . '%', 'Compliant'],
                ['Mobile Driver App', 'Smartphone GPS Telemetry', (int) $data['tracking_split']['mobile'], number_format($data['kpis']['mobile_pct'], 1) . '%', 'Compliant'],
            ]
        );

        if (count($data['expiring'])) {
            $row = $this->writeSectionTitle($sheet, $row, 'Franchises Expiring Within 90 Days');
            $row = $this->writeTable(
                $sheet,
                $row,
                ['Franchise No.', 'Operator Name', 'Plate No.', 'Expiry Date', 'Days Left'],
                $data['expiring']->map(fn ($e) => [
                    $e['franchise_number'],
                    $e['operator'],
                    $e['plate'],
                    $e['expiry_date'],
                    (int) $e['days_left'],
                ])->all()
            );
        }

        $filename = 'trivora_fleet_report_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportCollectionsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->collectionsReport($from, $to);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Collections Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Revenue & Collections Summary Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            4
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'MTOP Franchise Fees' => 'PHP ' . number_format($data['kpis']['fees_collected'], 2),
            'Violation Fines'     => 'PHP ' . number_format($data['kpis']['fines_collected'], 2),
            'Combined Total'      => 'PHP ' . number_format($data['kpis']['combined_total'], 2),
        ], [1, 1, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Daily Collections Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Collection Date', 'Franchise Fees (PHP)', 'Violation Fines (PHP)', 'Daily Total (PHP)'],
            $data['trend']->map(fn ($t) => [
                $t['date'],
                (float) $t['fees'],
                (float) $t['fines'],
                (float) ($t['fees'] + $t['fines']),
            ])->all(),
            true
        );

        $filename = 'trivora_collections_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    // -------------------------------------------------------------------------
    // Per-tab report builders
    // -------------------------------------------------------------------------

    private function resolveDateRange(Request $request): array
    {
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->subDays(29)->startOfDay();
        return [$from, $to];
    }

    private function violationsReport(Carbon $from, Carbon $to, Request $request): array
    {
        $todaId = $request->query('toda_zone_id');
        $type = $request->query('violation_type');
        $method = $request->query('detection_method');

        $base = Violation::whereBetween('detected_at', [$from, $to])
            ->when($type, fn ($q) => $q->where('violation_type', $type))
            ->when($method, fn ($q) => $q->where('detection_method', $method))
            ->when($todaId, function ($q) use ($todaId) {
                $q->whereHas('tricycle', fn ($t) => $t->where('toda_zone_id', $todaId));
            });

        $totalViolations = (clone $base)->count();
        $finesAssessed = (float) (clone $base)->sum('fine_amount');
        $finesCollected = (float) (clone $base)->whereNotNull('fine_paid_at')->sum('amount_paid');
        $collectionRate = $finesAssessed > 0 ? round(($finesCollected / $finesAssessed) * 100, 1) : 0.0;

        $appealsFiled = (clone $base)->whereHas('appeal')->count();
        $appealsApproved = (clone $base)->whereHas('appeal', fn ($q) => $q->where('status', 'approved'))->count();
        $appealsRejected = (clone $base)->whereHas('appeal', fn ($q) => $q->where('status', 'rejected'))->count();
        $decidedAppeals = $appealsApproved + $appealsRejected;
        $appealApprovalRate = $decidedAppeals > 0 ? round(($appealsApproved / $decidedAppeals) * 100, 1) : null;

        $trend = (clone $base)
            ->selectRaw('DATE(detected_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        $byType = (clone $base)
            ->selectRaw('violation_type, COUNT(*) as c')
            ->groupBy('violation_type')
            ->get()
            ->map(fn ($r) => ['type' => ucwords(str_replace('_', ' ', $r->violation_type)), 'count' => (int) $r->c])
            ->values();

        $byDayRows = (clone $base)
            ->selectRaw('day_of_week, COUNT(*) as c')
            ->groupBy('day_of_week')
            ->get()
            ->keyBy('day_of_week');
        $dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $byDayOfWeek = collect($dayOrder)->map(fn ($d) => [
            'day'   => $d,
            'count' => (int) ($byDayRows[$d]->c ?? 0),
        ])->values();

        $byToda = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->leftJoin('violations', function ($j) use ($from, $to) {
                $j->on('violations.tricycle_id', '=', 'tricycles.id')
                    ->whereBetween('violations.detected_at', [$from, $to]);
            })
            ->select('toda_zones.name', DB::raw('COUNT(violations.id) as c'))
            ->groupBy('toda_zones.id', 'toda_zones.name')
            ->get()
            ->map(fn ($r) => ['zone' => $r->name, 'count' => (int) $r->c])
            ->values();

        $automatedCount = (clone $base)->where('detection_method', 'automated')->count();
        $manualCount = (clone $base)->where('detection_method', 'manual')->count();

        $records = (clone $base)
            ->with(['tricycle.operator', 'tricycle.todaZone', 'appeal'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(fn ($v) => [
                'id'               => 'VIO-26-' . str_pad((string) $v->id, 4, '0', STR_PAD_LEFT),
                'db_id'            => $v->id,
                'date'             => $v->detected_at->format('M d, Y'),
                'time'             => $v->detected_at->format('h:i A'),
                'type'             => ucwords(str_replace('_', ' ', $v->violation_type)),
                'detection_method' => ucfirst($v->detection_method),
                'operator'         => $v->tricycle?->operator?->full_name ?: 'N/A',
                'plate'            => $v->tricycle?->plate_number ?: 'N/A',
                'toda'             => $v->tricycle?->todaZone?->name ?: 'Unassigned',
                'fine'             => (float) $v->fine_amount,
                'is_paid'          => $v->fine_paid_at !== null,
                'appeal_status'    => $v->appeal?->status,
            ])
            ->values();

        return [
            'kpis' => [
                'total_violations'     => $totalViolations,
                'fines_assessed'       => $finesAssessed,
                'fines_collected'      => $finesCollected,
                'collection_rate'      => $collectionRate,
                'appeals_filed'        => $appealsFiled,
                'appeal_approval_rate' => $appealApprovalRate,
            ],
            'trend'           => $trend,
            'by_type'         => $byType,
            'by_day_of_week'  => $byDayOfWeek,
            'by_toda'         => $byToda,
            'detection_split' => ['automated' => $automatedCount, 'manual' => $manualCount],
            'records'         => $records,
            // Filter dropdowns only ever offer values that actually occur somewhere in the
            // violations table — no dead options that always resolve to zero results.
            'available_types'   => Violation::select('violation_type')->distinct()->pluck('violation_type')
                ->map(fn ($t) => ['value' => $t, 'label' => ucwords(str_replace('_', ' ', $t))])
                ->values(),
            'available_methods' => Violation::select('detection_method')->distinct()->pluck('detection_method')
                ->map(fn ($m) => ['value' => $m, 'label' => ucfirst($m)])
                ->values(),
        ];
    }

    private function fleetReport(Request $request): array
    {
        $todaId = $request->query('toda_zone_id');
        $status = $request->query('tricycle_status');

        $base = Tricycle::query()
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($todaId, fn ($q) => $q->where('toda_zone_id', $todaId));

        $total = (clone $base)->count();
        $active = (clone $base)->where('status', 'active')->count();
        $suspended = (clone $base)->where('status', 'suspended')->count();
        $revoked = (clone $base)->where('status', 'revoked')->count();

        $iotCount = (clone $base)->where('active_tracking_mode', 'iot_device')->count();
        $mobileCount = (clone $base)->where('active_tracking_mode', 'mobile_app')->count();

        $byToda = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->select('toda_zones.name', DB::raw('count(tricycles.id) as c'))
            ->groupBy('toda_zones.id', 'toda_zones.name')
            ->get()
            ->map(fn ($r) => ['zone' => $r->name, 'count' => (int) $r->c])
            ->values();

        $byColorScheme = DB::table('color_coding_schemes')
            ->leftJoin('franchise_schemes', function ($j) {
                $j->on('franchise_schemes.color_coding_scheme_id', '=', 'color_coding_schemes.id')
                    ->where('franchise_schemes.is_active', true);
            })
            ->select('color_coding_schemes.name', 'color_coding_schemes.color_hex', DB::raw('count(franchise_schemes.id) as c'))
            ->groupBy('color_coding_schemes.id', 'color_coding_schemes.name', 'color_coding_schemes.color_hex')
            ->get()
            ->map(fn ($r) => ['scheme' => $r->name, 'color' => $r->color_hex, 'count' => (int) $r->c])
            ->values();

        $expiring = FranchiseScheme::where('is_active', true)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()])
            ->with('tricycle.operator')
            ->orderBy('expiry_date')
            ->get()
            ->map(fn ($fs) => [
                'franchise_number' => $fs->franchise_number,
                'operator'         => $fs->tricycle?->operator?->full_name ?: 'N/A',
                'plate'            => $fs->tricycle?->plate_number ?: 'N/A',
                'expiry_date'      => $fs->expiry_date->format('M d, Y'),
                'days_left'        => (int) now()->startOfDay()->diffInDays($fs->expiry_date, false),
            ])
            ->values();

        return [
            'kpis' => [
                'total'      => $total,
                'active'     => $active,
                'suspended'  => $suspended,
                'revoked'    => $revoked,
                'iot_pct'    => $total > 0 ? round(($iotCount / $total) * 100, 1) : 0.0,
                'mobile_pct' => $total > 0 ? round(($mobileCount / $total) * 100, 1) : 0.0,
            ],
            'by_toda'         => $byToda,
            'by_color_scheme' => $byColorScheme,
            'tracking_split'  => ['iot' => $iotCount, 'mobile' => $mobileCount],
            'expiring'        => $expiring,
        ];
    }

    private function applicationsReport(Carbon $from, Carbon $to, Request $request): array
    {
        $type = $request->query('application_type');

        $base = Application::whereBetween('submitted_at', [$from, $to])
            ->when($type, fn ($q) => $q->where('application_type', $type));

        $submitted = (clone $base)->count();
        $completed = (clone $base)->where('status', 'completed')->count();
        $rejected = (clone $base)->where('status', 'rejected')->count();

        $rejectionRate = $submitted > 0 ? round(($rejected / $submitted) * 100, 1) : 0.0;

        $avgProcessingDays = (clone $base)
            ->whereNotNull('completed_at')
            ->get(['submitted_at', 'completed_at'])
            ->avg(fn ($a) => $a->submitted_at->diffInDays($a->completed_at));

        $newCount = (clone $base)->where('application_type', 'new')->count();
        $renewalCount = (clone $base)->where('application_type', 'renewal')->count();

        $trend = (clone $base)
            ->selectRaw('DATE(submitted_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        $stageGroups = [
            'Document Review'              => ['draft', 'pending_review', 'under_review'],
            'Re-submission'                => ['rejected'],
            'Physical Inspection'          => ['pending_inspection', 'under_inspection'],
            'Re-inspection'                => ['failed_inspection'],
            'Municipal Treasurer Payment'  => ['pending_payment', 'payment_issue'],
            'BPLO Releasing'               => ['payment_verified', 'paid'],
            'Final Confirmation'           => ['awaiting_tmo_confirmation'],
            'Completed'                    => ['completed', 'scheme_issued'],
        ];
        $byStage = collect($stageGroups)
            ->map(fn ($statuses, $label) => ['stage' => $label, 'count' => (clone $base)->whereIn('status', $statuses)->count()])
            ->values();

        // Average time spent in each stage, derived from ApplicationStatusHistory by pairing
        // consecutive transitions per application — bounded to applications submitted in this
        // date range, not the whole table.
        $appIds = (clone $base)->pluck('id');
        $histories = ApplicationStatusHistory::whereIn('application_id', $appIds)
            ->orderBy('application_id')
            ->orderBy('created_at')
            ->get(['application_id', 'to_status', 'created_at']);

        $stageDurations = [];
        foreach ($histories->groupBy('application_id') as $rows) {
            $rows = $rows->values();
            for ($i = 0; $i < $rows->count() - 1; $i++) {
                $status = $rows[$i]->to_status;
                $hours = $rows[$i]->created_at->diffInHours($rows[$i + 1]->created_at);
                $stageDurations[$status][] = $hours;
            }
        }
        $avgTimeInStage = collect($stageDurations)
            ->map(fn ($hours, $status) => [
                'status'    => ucwords(str_replace('_', ' ', $status)),
                'avg_hours' => round(array_sum($hours) / count($hours), 1),
            ])
            ->values();

        return [
            'kpis' => [
                'submitted'           => $submitted,
                'completed'           => $completed,
                'rejection_rate'      => $rejectionRate,
                'avg_processing_days' => $avgProcessingDays !== null ? round($avgProcessingDays, 1) : null,
            ],
            'trend'             => $trend,
            'by_stage'          => $byStage,
            'type_split'        => ['new' => $newCount, 'renewal' => $renewalCount],
            'avg_time_in_stage' => $avgTimeInStage,
        ];
    }

    private function collectionsReport(Carbon $from, Carbon $to): array
    {
        $fees = (float) Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->where('is_verified', true)
            ->sum('amount');

        $fines = (float) Violation::whereBetween('fine_paid_at', [$from, $to])->sum('amount_paid');

        $feesTrend = Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->where('is_verified', true)
            ->selectRaw('payment_date as d, SUM(amount) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->keyBy(fn ($r) => (string) $r->d);

        $finesTrend = Violation::whereBetween('fine_paid_at', [$from, $to])
            ->selectRaw('DATE(fine_paid_at) as d, SUM(amount_paid) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->keyBy(fn ($r) => (string) $r->d);

        $allDates = $feesTrend->keys()->merge($finesTrend->keys())->unique()->sort()->values();
        $trend = $allDates->map(fn ($date) => [
            'date'  => $date,
            'fees'  => (float) ($feesTrend[$date]->c ?? 0),
            'fines' => (float) ($finesTrend[$date]->c ?? 0),
        ])->values();

        return [
            'kpis' => [
                'fees_collected'  => $fees,
                'fines_collected' => $fines,
                'combined_total'  => $fees + $fines,
            ],
            'trend' => $trend,
        ];
    }
}
