<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\TodaZone;
use App\Models\Tricycle;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * BPLO Reports & Analytics — historical/trend view of the franchise application pipeline from
 * BPLO's own vantage point (releasing), distinct from the live-snapshot dashboard and the plain
 * releasing queue. Every figure is computed straight from Application, ApplicationStatusHistory,
 * FranchiseScheme, and Tricycle — no fabricated numbers.
 *
 * Tabbed the same way as TMO\ReportController — only the active tab's data is computed per
 * request, not all four every time.
 *
 * "Released by BPLO" is defined as status IN (awaiting_tmo_confirmation, completed,
 * scheme_issued) — exactly the statuses BPLOController::release() and the TMO final-
 * confirmation step transition an application through/past. This matches (and was verified
 * against) the count of applications that actually have a franchiseScheme row.
 */
class BPLOReportController extends Controller
{
    use ExportsMunicipalExcelReports;

    private const RELEASED_STATUSES = ['awaiting_tmo_confirmation', 'completed', 'scheme_issued'];
    private const PENDING_BPLO_STATUSES = ['payment_verified', 'paid'];

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'overview');
        [$from, $to] = $this->resolveDateRange($request);

        $reportData = match ($tab) {
            'trends'    => $this->trendsReport($from, $to),
            'releasing' => $this->releasingReport($from, $to),
            'records'   => $this->recordsReport($request),
            default     => $this->overviewReport(),
        };

        return Inertia::render('BPLODashboard/Reports/Index', [
            'tab'           => $tab,
            'from'          => $from->toDateString(),
            'to'            => $to->toDateString(),
            'filters'       => [
                'toda_zone_id' => $request->query('toda_zone_id'),
                'status'       => $request->query('status'),
                'search'       => $request->query('search'),
            ],
            'todaZones'     => TodaZone::orderBy('name')->get(['id', 'name']),
            'statusOptions' => $this->statusOptions(),
            'reportData'    => $reportData,
        ]);
    }

    public function exportOverviewExcel(): StreamedResponse
    {
        $data = $this->overviewReport();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Overview Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Franchise Application Overview Report',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            5,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Applications'  => number_format($data['overview']['total_applications']),
            'Pending BPLO Action' => number_format($data['overview']['pending_bplo_action']),
            'Released'            => number_format($data['overview']['released']),
            'Rejected'            => number_format($data['overview']['rejected']),
            'Active Franchises'   => number_format($data['overview']['active_franchises']),
        ], [1, 1, 1, 1, 1]);

        $row = $this->writeSectionTitle($sheet, $row, 'Application Status Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Status', 'Applications Count'],
            $data['statusBreakdown']->map(fn ($s) => [$s['status'], (int) $s['count']])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'TODA / Area Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['TODA Zone', 'Applications', 'Active Franchises'],
            $data['todaBreakdown']->map(fn ($t) => [$t['toda'], (int) $t['application_count'], (int) $t['active_franchise_count']])->all()
        );

        $filename = 'trivora_bplo_overview_report_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportTrendsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->trendsReport($from, $to);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Processing Trends Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Application Processing Trends Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            3,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Avg. Days to Release' => $data['processing']['avg_days_to_release'] !== null ? number_format($data['processing']['avg_days_to_release'], 1) . ' days' : 'N/A',
            'Waiting for BPLO'     => number_format($data['processing']['waiting_for_bplo']),
            'Fully Completed'      => number_format($data['processing']['completed']),
        ], [1, 1, 1]);

        $byDate = [];
        foreach ($data['trends']['received'] as $r) {
            $byDate[$r['date']]['received'] = $r['count'];
        }
        foreach ($data['trends']['released'] as $r) {
            $byDate[$r['date']]['released'] = $r['count'];
        }
        ksort($byDate);

        $row = $this->writeSectionTitle($sheet, $row, 'Applications Received vs. Released by BPLO (Daily)');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Date', 'Received', 'Released'],
            collect($byDate)->map(fn ($v, $date) => [$date, (int) ($v['received'] ?? 0), (int) ($v['released'] ?? 0)])->values()->all(),
            true
        );

        $filename = 'trivora_bplo_trends_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportReleasingExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->releasingReport($from, $to);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Releasing Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Sticker / Plate Releasing Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            4,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Released'  => number_format($data['total_released']),
            'Pending Release' => number_format($data['pending_release']),
        ], [2, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Releasing Status Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Status', 'Applications Count'],
            collect($data['by_status'])->map(fn ($s) => [$s['label'], (int) $s['count']])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Releasing Activity (Daily)');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Date', 'Releases'],
            collect($data['activity'])->map(fn ($a) => [$a['date'], (int) $a['count']])->all(),
            true
        );

        $filename = 'trivora_bplo_releasing_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportRecordsExcel(Request $request): StreamedResponse
    {
        $data = $this->recordsReport($request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Detailed Records');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Detailed Application Records',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            7,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Records' => number_format($data['records']->count()),
        ], [7]);

        $row = $this->writeSectionTitle($sheet, $row, 'Application Records');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Reference', 'Driver', 'TODA', 'Plate', 'Status', 'Submitted', 'Released'],
            $data['records']->map(fn ($r) => [
                $r['reference'],
                $r['driver'],
                $r['toda'],
                $r['plate'],
                $r['status'],
                $r['submitted_at'],
                $r['release_date'] ?? '—',
            ])->all(),
            true
        );

        $filename = 'trivora_bplo_records_report_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    private function resolveDateRange(Request $request): array
    {
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->subDays(29)->startOfDay();
        return [$from, $to];
    }

    private function statusLabel(string $status): string
    {
        $labels = [
            'draft'                     => 'Draft',
            'pending_review'            => 'Pending Document Review',
            'under_review'              => 'Under Document Review',
            'rejected'                  => 'Rejected',
            'pending_inspection'        => 'Pending Physical Inspection',
            'under_inspection'          => 'Under Physical Inspection',
            'failed_inspection'         => 'Failed Inspection',
            'pending_payment'           => 'Pending Payment',
            'payment_issue'             => 'Payment Issue',
            'payment_verified'          => 'Payment Verified (Pending BPLO)',
            'paid'                      => 'Paid (Pending BPLO)',
            'awaiting_tmo_confirmation' => 'Released — Awaiting TMO Confirmation',
            'completed'                 => 'Completed',
            'scheme_issued'             => 'Scheme Issued',
            'cancelled'                 => 'Cancelled',
        ];

        return $labels[$status] ?? ucwords(str_replace('_', ' ', $status));
    }

    /** Every status actually present in the table — filter dropdown never offers a dead option. */
    private function statusOptions(): array
    {
        return Application::select('status')->distinct()->pluck('status')
            ->map(fn ($s) => ['value' => $s, 'label' => $this->statusLabel($s)])
            ->values()
            ->all();
    }

    // -------------------------------------------------------------------------
    // Tab 1: Overview — current-state snapshot, not date-filtered
    // -------------------------------------------------------------------------

    private function overviewReport(): array
    {
        $overview = [
            'total_applications'  => Application::count(),
            'pending_bplo_action' => Application::whereIn('status', self::PENDING_BPLO_STATUSES)->count(),
            'released'            => Application::whereIn('status', self::RELEASED_STATUSES)->count(),
            'rejected'            => Application::where('status', 'rejected')->count(),
            'active_franchises'   => Tricycle::where('status', 'active')->count(),
        ];

        $statusBreakdown = Application::select('status', DB::raw('count(*) as c'))
            ->groupBy('status')
            ->orderByDesc('c')
            ->get()
            ->map(fn ($r) => [
                'status'     => $this->statusLabel($r->status),
                'raw_status' => $r->status,
                'count'      => (int) $r->c,
            ])
            ->values();

        // Applications and active franchises grouped by TODA zone — same join pattern already
        // used in BPLOController::dashboard()'s todaStats and TMO ReportController's fleet-by-toda.
        $todaBreakdown = DB::table('toda_zones')
            ->leftJoin('operators', 'operators.toda_id', '=', 'toda_zones.id')
            ->leftJoin('applications', 'applications.operator_id', '=', 'operators.id')
            ->leftJoin('tricycles', function ($j) {
                $j->on('tricycles.toda_zone_id', '=', 'toda_zones.id')
                    ->where('tricycles.status', 'active');
            })
            ->select(
                'toda_zones.name',
                DB::raw('COUNT(DISTINCT applications.id) as application_count'),
                DB::raw('COUNT(DISTINCT tricycles.id) as active_franchise_count')
            )
            ->groupBy('toda_zones.id', 'toda_zones.name')
            ->orderBy('toda_zones.name')
            ->get()
            ->map(fn ($r) => [
                'toda'                   => $r->name,
                'application_count'      => (int) $r->application_count,
                'active_franchise_count' => (int) $r->active_franchise_count,
            ])
            ->values();

        return [
            'overview'        => $overview,
            'statusBreakdown' => $statusBreakdown,
            'todaBreakdown'   => $todaBreakdown,
        ];
    }

    // -------------------------------------------------------------------------
    // Tab 2: Processing Trends — date-range filtered
    // -------------------------------------------------------------------------

    private function trendsReport(Carbon $from, Carbon $to): array
    {
        $received = Application::whereBetween('submitted_at', [$from, $to])
            ->selectRaw('DATE(submitted_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        // Deduped per application (see releasingReport's activity for why) — a clean "first time
        // this application was released" count per day.
        $released = ApplicationStatusHistory::where('to_status', 'awaiting_tmo_confirmation')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as d, COUNT(DISTINCT application_id) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        // Average processing time from submission to BPLO release, computed only over
        // applications that actually reached that transition within the range.
        $releasedIds = Application::whereIn('status', self::RELEASED_STATUSES)
            ->whereBetween('submitted_at', [$from, $to])
            ->pluck('submitted_at', 'id');

        $firstReleaseAt = ApplicationStatusHistory::where('to_status', 'awaiting_tmo_confirmation')
            ->whereIn('application_id', $releasedIds->keys())
            ->orderBy('application_id')
            ->orderBy('created_at')
            ->get(['application_id', 'created_at'])
            ->groupBy('application_id')
            ->map(fn ($rows) => $rows->first()->created_at);

        $durations = [];
        foreach ($firstReleaseAt as $appId => $releasedAt) {
            $submittedAt = $releasedIds[$appId] ?? null;
            if ($submittedAt) {
                $durations[] = $submittedAt->diffInDays($releasedAt);
            }
        }

        $avgDays = count($durations) > 0 ? round(array_sum($durations) / count($durations), 1) : null;

        return [
            'trends'     => ['received' => $received, 'released' => $released],
            'processing' => [
                'avg_days_to_release' => $avgDays,
                'sample_size'         => count($durations),
                'waiting_for_bplo'    => Application::whereIn('status', self::PENDING_BPLO_STATUSES)->count(),
                'completed'           => Application::whereIn('status', ['completed', 'scheme_issued'])->count(),
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Tab 3: Sticker / Plate Releasing — date-range filtered
    // -------------------------------------------------------------------------

    private function releasingReport(Carbon $from, Carbon $to): array
    {
        $totalReleased = Application::whereIn('status', self::RELEASED_STATUSES)->count();
        $pendingRelease = Application::whereIn('status', self::PENDING_BPLO_STATUSES)->count();

        // Of applications BPLO has already released, how many has TMO since finalized vs still
        // awaiting TMO's own confirmation step — a real, currently-visible breakdown.
        $awaitingTmo = Application::where('status', 'awaiting_tmo_confirmation')->count();
        $tmoFinalized = Application::whereIn('status', ['completed', 'scheme_issued'])->count();

        // Deduped per application_id — this dev dataset has repeated test transitions on the
        // same application, which would otherwise inflate a single day's count (see
        // BPLOController::releasingQueue's issuedTodayCount for the same distinct() pattern).
        $activity = ApplicationStatusHistory::where('to_status', 'awaiting_tmo_confirmation')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as d, COUNT(DISTINCT application_id) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        return [
            'total_released'  => $totalReleased,
            'pending_release' => $pendingRelease,
            'by_status'       => [
                ['label' => 'Awaiting TMO Confirmation', 'count' => $awaitingTmo],
                ['label' => 'Finalized by TMO', 'count' => $tmoFinalized],
            ],
            'activity' => $activity,
        ];
    }

    // -------------------------------------------------------------------------
    // Tab 4: Detailed Records — searchable/filterable table
    // -------------------------------------------------------------------------

    private function recordsReport(Request $request): array
    {
        $todaId = $request->query('toda_zone_id');
        $statusFilter = $request->query('status');
        $search = $request->query('search');

        $records = Application::with(['operator.todaZone', 'tricycle', 'franchiseScheme'])
            ->when($statusFilter, fn ($q) => $q->where('status', $statusFilter))
            ->when($todaId, fn ($q) => $q->whereHas('operator', fn ($o) => $o->where('toda_id', $todaId)))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('reference_number', 'like', "%{$search}%")
                        ->orWhereHas('operator', fn ($o) => $o->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%"))
                        ->orWhereHas('tricycle', fn ($t) => $t->where('plate_number', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn ($app) => [
                'id'           => $app->id,
                'reference'    => $app->reference_number,
                'driver'       => $app->operator ? $app->operator->full_name : 'N/A',
                'toda'         => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
                'plate'        => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
                'status'       => $this->statusLabel($app->status),
                'raw_status'   => $app->status,
                'submitted_at' => $app->submitted_at ? $app->submitted_at->format('M d, Y') : 'N/A',
                'release_date' => $app->franchiseScheme?->issue_date ? $app->franchiseScheme->issue_date->format('M d, Y') : null,
            ])
            ->values();

        return ['records' => $records];
    }
}
