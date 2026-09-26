<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\FranchiseScheme;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * BPLO Releasing Analytics & Reporting — a single-page report scoped to BPLO's own
 * responsibility: releasing the approved Franchise Number and plate/sticker number once TMO's
 * document review and physical inspection have cleared an application. Not a copy of TMO's
 * Reports & Analytics page (which covers the whole franchise pipeline) and not a rebuilt
 * dashboard/records browser — BPLO already has ReleasingQueue and ActiveRegistry for that.
 *
 * Every figure here is computed from real data:
 *   - Application.status = 'pending_bplo_release' is BPLO's own actionable queue (set by
 *     TMO\InspectionController::store() once physical inspection passes).
 *   - FranchiseScheme is the actual sticker/plate release ledger — BPLOController::release() is
 *     the ONLY place that ever creates a row, one row per release event, dated by issue_date.
 *   - "Released" = Application.status IN (awaiting_tmo_confirmation, completed) — the two
 *     real, currently-reachable post-release statuses. 'scheme_issued' is a legacy enum value
 *     no live code path sets anymore (confirmed by inspection) and is deliberately not used here.
 *   - BPLO has no reject/return action of its own (only release()), so no "Returned/Rejected"
 *     metric is fabricated — TMO's own document-review rejection is a different office's action.
 */
class BPLOReportController extends Controller
{
    use ExportsMunicipalExcelReports;

    private const PENDING_STATUS = 'pending_bplo_release';
    private const RELEASED_STATUSES = ['awaiting_tmo_confirmation', 'completed'];
    private const RECENT_ACTIVITY_LIMIT = 5;

    public function index(Request $request): Response
    {
        [$from, $to] = $this->resolveDateRange($request);
        $status = $request->query('status');

        return Inertia::render('BPLODashboard/Reports/Index', [
            'from'       => $from->toDateString(),
            'to'         => $to->toDateString(),
            'filters'    => ['status' => $status],
            'reportData' => $this->buildReport($from, $to, $status),
        ]);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $status = $request->query('status');
        $data = $this->buildReport($from, $to, $status);
        $records = $this->mapReleaseRecords($this->releaseLedger($from, $to, ! $status || $status === 'released'));

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('BPLO Releasing Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'BPLO Releasing Analytics Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y')
                . ($status ? ' | Status: ' . ucfirst($status) : ''),
            6,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total for BPLO Release' => number_format($data['overview']['total_for_bplo']),
            'Pending Release'        => number_format($data['overview']['pending_release']),
            'Released'               => number_format($data['overview']['released']),
            'Released in Period'     => number_format($data['overview']['activity_in_period']),
        ], [1, 1, 1, 1]);

        $row = $this->writeSectionTitle($sheet, $row, 'Release Status Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Status', 'Applications Count'],
            collect($data['statusBreakdown'])->map(fn ($s) => [$s['label'], (int) $s['count']])->all()
        );

        // No frozen header here — this sheet is several stacked sections (KPIs, breakdown,
        // this table, the release records below), not one long table on its own. Freezing a
        // pane mid-sheet would pin everything above it in place while scrolling through the
        // rest of the report, which reads as the sheet being stuck/static.
        $row = $this->writeSectionTitle($sheet, $row, 'Releasing Activity (Daily)');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Date', 'Releases'],
            collect($data['activityTrend'])->map(fn ($a) => [$a['date'], (int) $a['count']])->all()
        );

        // The actual detailed records behind the summary — every sticker/plate release in the
        // selected period and status, not just the headline numbers shown on screen.
        $row = $this->writeSectionTitle($sheet, $row, 'Sticker & Plate Release Records');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Reference', 'Operator', 'Plate No.', 'Sticker Number', 'Franchise Number', 'Release Date'],
            $records->map(fn ($r) => [
                $r['reference'], $r['operator'], $r['plate'], $r['coding_scheme_number'], $r['sticker_no'], $r['release_date'],
            ])->all()
        );

        $filename = 'trivora_bplo_releasing_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    private function resolveDateRange(Request $request): array
    {
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->subDays(29)->startOfDay();

        return [$from, $to];
    }

    /** Every FranchiseScheme row IS one real BPLO release event, dated by issue_date — the
     * single query every period-scoped section below is built from. Empty (never matches) when
     * the "released" bucket has been excluded by the Status filter. */
    private function releaseLedger(Carbon $from, Carbon $to, bool $includeReleased): Builder
    {
        return $includeReleased
            ? FranchiseScheme::whereBetween('issue_date', [$from->toDateString(), $to->toDateString()])
            : FranchiseScheme::whereRaw('1 = 0');
    }

    /**
     * The single data builder behind the page — deliberately excludes the full release-record
     * list (unbounded, could be large); the page only ever needs the 5 most recent for its
     * "Recent release activity" insight, while the full list is fetched separately, only when
     * actually exporting (see mapReleaseRecords() + exportExcel() above).
     *
     * Two different time dimensions are deliberately in play:
     *   - "Pending"/"Released" counts are current-state totals (a queue depth and a cumulative
     *     count) — NOT date-filtered, the same way a live registry snapshot isn't.
     *   - Everything else (the activity trend, processing time, recent activity) is scoped to
     *     the selected date range, keyed by FranchiseScheme.issue_date — the actual day BPLO
     *     released that sticker/plate.
     *
     * $status narrows which bucket ('pending' or 'released') the report is about; when it
     * excludes a bucket entirely, every period-scoped section tied to that bucket reports empty
     * rather than silently mixing in data outside the selected status.
     */
    private function buildReport(Carbon $from, Carbon $to, ?string $status): array
    {
        $includePending = ! $status || $status === 'pending';
        $includeReleased = ! $status || $status === 'released';

        $pendingCount = $includePending ? Application::pendingBploRelease()->count() : 0;
        $releasedCount = $includeReleased ? Application::whereIn('status', self::RELEASED_STATUSES)->count() : 0;

        $activityInPeriod = (clone $this->releaseLedger($from, $to, $includeReleased))->count();

        $activityTrend = (clone $this->releaseLedger($from, $to, $includeReleased))
            ->selectRaw('issue_date as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => Carbon::parse($r->d)->toDateString(), 'count' => (int) $r->c])
            ->values();

        $recentActivity = $this->mapReleaseRecords(
            (clone $this->releaseLedger($from, $to, $includeReleased))->limit(self::RECENT_ACTIVITY_LIMIT)
        );

        return [
            'overview' => [
                // Every application that has ever reached BPLO's own stage of the pipeline —
                // a lifetime total, not scoped to the selected date range.
                'total_for_bplo'     => $pendingCount + $releasedCount,
                'pending_release'    => $pendingCount,
                'released'           => $releasedCount,
                'activity_in_period' => $activityInPeriod,
            ],
            'statusBreakdown' => [
                ['status' => 'pending', 'label' => 'Pending Release', 'count' => $pendingCount],
                ['status' => 'released', 'label' => 'Released', 'count' => $releasedCount],
            ],
            'activityTrend' => $activityTrend,
            'stickerPlate'  => [
                'total_releases'     => FranchiseScheme::count(),
                'released_in_period' => $activityInPeriod,
                'pending_release'    => $pendingCount,
            ],
            'processing'     => $this->processingSummary($from, $to, $includePending, $includeReleased, $pendingCount, $releasedCount),
            'recentActivity' => $recentActivity,
        ];
    }

    /**
     * Section 5 — Release Processing Summary. Average processing time is computed only from
     * applications actually released within the selected range, pairing each one's real
     * submitted_at against the ApplicationStatusHistory row that first recorded its transition
     * to 'awaiting_tmo_confirmation' — the same proven pairing pattern used elsewhere in this
     * codebase (see TMO\ReportController::applicationsReport's avg_time_in_stage). Never
     * fabricated: an application missing either timestamp is simply excluded from the average,
     * and the metric is omitted (avg_days_to_release: null) rather than shown as zero when no
     * released application in range has both timestamps.
     */
    private function processingSummary(Carbon $from, Carbon $to, bool $includePending, bool $includeReleased, int $pendingCount, int $releasedCount): array
    {
        $avgDaysToRelease = null;
        $sampleSize = 0;

        if ($includeReleased) {
            $releasedAppIds = (clone $this->releaseLedger($from, $to, true))->whereNotNull('application_id')->pluck('application_id');
            $submittedAtByAppId = Application::whereIn('id', $releasedAppIds)->pluck('submitted_at', 'id');

            $firstReleaseAt = ApplicationStatusHistory::whereIn('application_id', $releasedAppIds)
                ->where('to_status', 'awaiting_tmo_confirmation')
                ->orderBy('application_id')
                ->orderBy('created_at')
                ->get(['application_id', 'created_at'])
                ->groupBy('application_id')
                ->map(fn ($rows) => $rows->first()->created_at);

            $durations = [];
            foreach ($firstReleaseAt as $appId => $releasedAt) {
                $submittedAt = $submittedAtByAppId[$appId] ?? null;
                if ($submittedAt) {
                    $durations[] = $submittedAt->diffInDays($releasedAt);
                }
            }

            $sampleSize = count($durations);
            $avgDaysToRelease = $sampleSize > 0 ? round(array_sum($durations) / $sampleSize, 1) : null;
        }

        $oldestPending = null;
        if ($includePending) {
            $oldest = Application::pendingBploRelease()
                ->with(['operator', 'tricycle'])
                ->addSelect(['queue_entered_at' => ApplicationStatusHistory::select('created_at')
                    ->whereColumn('application_id', 'applications.id')
                    ->where('to_status', self::PENDING_STATUS)
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->limit(1),
                ])
                ->orderBy('queue_entered_at', 'asc')
                ->first();

            if ($oldest && $oldest->queue_entered_at) {
                $enteredAt = Carbon::parse($oldest->queue_entered_at);
                $oldestPending = [
                    'reference' => $oldest->reference_number,
                    'operator'  => $oldest->operator ? $oldest->operator->full_name : 'N/A',
                    'plate'     => $oldest->tricycle ? $oldest->tricycle->plate_number : 'N/A',
                    'days_ago'  => (int) $enteredAt->diffInDays(now()),
                    'since'     => $enteredAt->format('M d, Y'),
                ];
            }
        }

        return [
            'avg_days_to_release' => $avgDaysToRelease,
            'sample_size'         => $sampleSize,
            'pending_count'       => $pendingCount,
            'released_count'      => $releasedCount,
            'oldest_pending'      => $oldestPending,
        ];
    }

    /** Maps a FranchiseScheme query into the release-record shape shared by the page's "recent
     * activity" list and the Excel export — one mapping, so they can never drift apart. */
    private function mapReleaseRecords(Builder $query): Collection
    {
        return $query
            ->with(['application.operator', 'tricycle'])
            ->orderByDesc('issue_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (FranchiseScheme $scheme) => [
                'reference'    => $scheme->application?->reference_number ?: 'N/A',
                'operator'     => $scheme->application?->operator ? $scheme->application->operator->full_name : 'N/A',
                'plate'        => $scheme->tricycle ? $scheme->tricycle->plate_number : 'N/A',
                'coding_scheme_number' => $scheme->franchise_number,
                'sticker_no'   => $scheme->sticker_number ?: ($scheme->application?->sticker_number ?: 'N/A'),
                'release_date' => $scheme->issue_date->format('M d, Y'),
            ])
            ->values();
    }
}
