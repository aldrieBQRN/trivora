<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Services\AuditService;
use App\Services\ColorCodingRuleService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BPLOController extends Controller
{
    use ExportsMunicipalExcelReports;

    /**
     * Display BPLO Dashboard.
     */
    public function dashboard(): Response
    {
        $activeFranchisesCount = Tricycle::where('status', 'active')->count();
        $pendingReleasingCount = Application::where('status', 'pending_bplo_release')->count();
        $totalRegistriesCount  = Tricycle::count();
        $suspendedCount        = Tricycle::whereIn('status', ['suspended', 'revoked'])->count();
        $releasedTodayCount    = ApplicationStatusHistory::where('to_status', 'awaiting_tmo_confirmation')
            ->whereDate('created_at', today())
            ->count();

        // MTOP Issuance trend — rolling last 7 days ending today (not the Mon–Sun calendar week,
        // which on a Monday would be all future days and always read zero). A release is the
        // BPLO → awaiting_tmo_confirmation status transition, the same event Recent Releases uses.
        $trendStart = today()->subDays(6);
        $releasesPerDay = ApplicationStatusHistory::where('to_status', 'awaiting_tmo_confirmation')
            ->where('created_at', '>=', $trendStart)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $weeklyIssuanceTrend = [];
        for ($i = 0; $i < 7; $i++) {
            $dayDate = $trendStart->copy()->addDays($i);
            $weeklyIssuanceTrend[] = [
                'day'    => $dayDate->format('D'),
                'date'   => $dayDate->format('M d'),
                'issued' => (int) ($releasesPerDay[$dayDate->toDateString()] ?? 0),
            ];
        }

        // Recent releases — timed and ordered by the actual BPLO release event, not the
        // application's updated_at (which later TMO steps keep bumping).
        $recentReleases = Application::with(['operator', 'tricycle'])
            ->whereIn('status', ['awaiting_tmo_confirmation', 'completed', 'active'])
            ->whereNotNull('sticker_number')
            ->withMax(['statusHistories as released_at' => fn ($q) => $q->where('to_status', 'awaiting_tmo_confirmation')], 'created_at')
            ->orderByDesc('released_at')
            ->limit(5)
            ->get()
            ->map(function ($app) {
                $releasedAt = $app->released_at ? Carbon::parse($app->released_at) : $app->updated_at;

                return [
                    'id'             => $app->id,
                    'reference'      => $app->reference_number,
                    'sticker_number' => $app->sticker_number,
                    'operator_name'  => $app->operator ? $app->operator->full_name : 'N/A',
                    'plate_number'   => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
                    'released_at'    => $releasedAt ? $releasedAt->diffForHumans() : 'Recently',
                ];
            });

        return Inertia::render('BPLODashboard/Index', [
            'stats' => [
                'activeFranchisesCount'          => $activeFranchisesCount,
                'pendingReleasingCount'          => $pendingReleasingCount,
                'totalRegistriesCount'           => $totalRegistriesCount,
                'releasedTodayCount'             => $releasedTodayCount,
                'suspendedCount'                 => $suspendedCount,
            ],
            'weeklyIssuanceTrend' => $weeklyIssuanceTrend,
            'recentReleases'      => $recentReleases,
        ]);
    }

    /**
     * Display BPLO releasing queue (Applications that passed payment verification).
     */
    public function releasingQueue(): Response
    {
        // See TMO\InspectionController::index() for why this is the status-history timestamp
        // rather than updated_at — the true, immutable "entered this queue" moment, so an
        // unrelated edit can never silently bump an application to the back of the line.
        $applications = Application::with(['operator.user', 'tricycle', 'latestInspection'])
            ->where('status', 'pending_bplo_release')
            ->addSelect(['queue_entered_at' => ApplicationStatusHistory::select('created_at')
                ->whereColumn('application_id', 'applications.id')
                ->orderByDesc('created_at')
                ->orderByDesc('id') // tiebreaker when two transitions land in the same second
                ->limit(1),
            ])
            ->orderBy('queue_entered_at', 'asc')
            ->get()
            ->map(function ($app) {
                return [
                    'id'            => $app->id,
                    'reference'     => $app->reference_number,
                    'is_renewal'    => $app->application_type === 'renewal',
                    'operator'      => $app->operator ? $app->operator->full_name : 'N/A',
                    'operator_photo' => $app->operator?->profile_photo_url,
                    'contact'       => $app->operator?->contact_number ?: 'N/A',
                    'make'          => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
                    'plate'         => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
                    'tmo_passed_at' => $app->latestInspection?->inspection_date ? \Carbon\Carbon::parse($app->latestInspection->inspection_date)->format('M d, Y') : 'Passed',
                ];
            });

        $pendingCount = $applications->count();
        
        $issuedTodayCount = ApplicationStatusHistory::whereDate('created_at', now()->toDateString())
            ->where('to_status', 'completed')
            ->distinct('application_id')
            ->count();

        $activeRegistryCount = Tricycle::where('status', 'active')->count();

        return Inertia::render('BPLODashboard/ReleasingQueue', [
            'applications'        => $applications,
            'pendingCount'        => $pendingCount,
            'issuedTodayCount'    => $issuedTodayCount,
            'activeRegistryCount' => $activeRegistryCount,
        ]);
    }

    /**
     * Show release form for the sticker number, franchise number, and tracker assignment.
     */
    public function showReleaseForm(Application $application): Response|RedirectResponse
    {
        // operator.user: the owner's account email (ownerDetails()).
        $application->load(['operator.user', 'tricycle', 'tricycleDriver']);

        $isRenewal = $application->application_type === 'renewal';
        $suggestedCodingNo = $this->resolveCodingNumber($application);

        // Only an application still waiting for BPLO can be released — another staff member may
        // already have released it (or it isn't cleared yet).
        if ($application->status !== self::RELEASABLE_STATUS) {
            return redirect()->route('bplo.releasing')->with('error', "Application {$application->reference_number} has already been released or is not ready for BPLO release.");
        }

        // PREVIEW only: both numbers are allocated for real inside release(), under a lock, so
        // opening this page never reserves a number (no gaps, no clashes between staff).
        $franchiseNumber = $this->nextFranchiseNumber($application);

        $appData = [
            'id'                      => $application->id,
            'reference'               => $application->reference_number,
            'application_type'        => $application->application_type,
            'is_renewal'              => $isRenewal,
            'operator'                => $application->operator ? $application->operator->full_name : 'N/A',
            'owner'                   => $application->ownerDetails(),
            'ownerIsDriver'           => (bool) $application->owner_is_driver,
            'tricycleDriver'          => $application->driverDetails(),
            'make'                    => $application->tricycle ? "{$application->tricycle->make} {$application->tricycle->model}" : 'N/A',
            'plate_number'            => $application->tricycle ? $application->tricycle->plate_number : 'N/A',
            'engine_number'           => $application->tricycle ? $application->tricycle->engine_number : 'N/A',
            'chassis_number'          => $application->tricycle ? $application->tricycle->chassis_number : 'N/A',
            'year_model'              => $application->tricycle?->year_model,
            'body_color'              => $application->tricycle?->body_color,
            'body_type'               => $application->tricycle?->body_type,
            'or_number'               => $application->tricycle?->or_number,
            'cr_number'               => $application->tricycle?->cr_number,
            'suggested_coding_number' => $suggestedCodingNo,
            'suggested_sticker'       => $franchiseNumber,
            'sticker_number'          => $franchiseNumber,
        ];

        return Inertia::render('BPLODashboard/IssueStickerNumber', [
            'application'   => $appData,
            'codingSchemes' => ColorCodingScheme::where('is_active', true)->get(),
        ]);
    }

    /**
     * The Sticker Number (municipal coding scheme number) is always system-generated: a renewal keeps
     * the tricycle's existing number, a new unit gets the next free 4-digit sequence. Used by both the
     * release form (display) and release() (persist), so the officer never types it and a tampered
     * request can't override it.
     */
    /** Applications in this status are waiting in the BPLO Releasing Queue. */
    private const RELEASABLE_STATUS = 'pending_bplo_release';

    /**
     * The next Franchise Number (MTOP-YYYY-NNNN) on its own yearly counter, independent of the
     * Sticker Number: one past the highest number already ISSUED this year, skipping any value
     * another application holds (e.g. a legacy pre-release reservation). Used for the page's
     * preview and, under release()'s lock, for the real allocation.
     */
    private function nextFranchiseNumber(Application $application): string
    {
        $prefix = 'MTOP-' . date('Y') . '-';

        $highest = FranchiseScheme::where('franchise_number', 'like', "{$prefix}%")
            ->pluck('franchise_number')
            ->map(fn ($n) => (int) substr((string) $n, strlen($prefix)))
            ->max() ?? 0;

        $seq = $highest + 1;
        do {
            $candidate = sprintf('%s%04d', $prefix, $seq++);
            $taken = FranchiseScheme::where('franchise_number', $candidate)->where('application_id', '!=', $application->id)->exists()
                || Application::where('sticker_number', $candidate)->where('id', '!=', $application->id)->exists();
        } while ($taken);

        return $candidate;
    }

    private function resolveCodingNumber(Application $application): string
    {
        $isRenewal = $application->application_type === 'renewal';
        $suggestedCodingNo = null;

        // 1. If Renewal, preserve the tricycle's existing 4-digit municipal coding number
        if ($isRenewal && $application->tricycle && !empty($application->tricycle->coding_scheme_number)) {
            $suggestedCodingNo = str_pad($application->tricycle->coding_scheme_number, 4, '0', STR_PAD_LEFT);
        } elseif ($isRenewal && $application->tricycle_id) {
            $prevSchemeNo = FranchiseScheme::where('tricycle_id', $application->tricycle_id)
                ->latest()
                ->value('franchise_number');
            if (!empty($prevSchemeNo) && preg_match('/^\d+$/', (string)$prevSchemeNo)) {
                $suggestedCodingNo = str_pad($prevSchemeNo, 4, '0', STR_PAD_LEFT);
            }
        }

        // 2. For new units (or if no existing number found), auto-suggest next sequential 4-digit number (< 9000 to exclude test fixtures)
        if (!$suggestedCodingNo) {
            $schemeNumbers = FranchiseScheme::where('franchise_number', 'not like', '%-%')
                ->pluck('franchise_number')
                ->filter(fn ($n) => preg_match('/^\d+$/', (string)$n) && (int)$n < 9000)
                ->map(fn ($n) => (int)$n);

            $tricycleNumbers = Tricycle::whereNotNull('coding_scheme_number')
                ->pluck('coding_scheme_number')
                ->filter(fn ($n) => preg_match('/^\d+$/', (string)$n) && (int)$n < 9000)
                ->map(fn ($n) => (int)$n);

            $allNumbers = $schemeNumbers->merge($tricycleNumbers);
            $maxNum = $allNumbers->max() ?: 841;

            $candidate = $maxNum + 1;
            do {
                $candidatePadded = str_pad($candidate, 4, '0', STR_PAD_LEFT);
                $taken = FranchiseScheme::where('franchise_number', $candidatePadded)
                    ->where('is_active', true)
                    ->exists()
                    || Tricycle::where('coding_scheme_number', $candidatePadded)
                    ->where('status', 'active')
                    ->exists();
                if ($taken) {
                    $candidate++;
                }
            } while ($taken);

            $suggestedCodingNo = str_pad($candidate, 4, '0', STR_PAD_LEFT);
        }

        return $suggestedCodingNo;
    }

    /**
     * Finalize BPLO approval, issue the Sticker Number, and release the Franchise Number.
     * Note: BPLO does NOT issue the IoT device. Driver returns to TMO for Final Confirmation.
     */
    public function release(Request $request, Application $application): RedirectResponse
    {
        // Several BPLO staff work at once. Number allocation is serialized with a lock, and the
        // application row is locked and re-checked, so: the same application can never be
        // released twice, and two releases can never be given the same Sticker or Franchise
        // Number. Both numbers are always allocated here — never taken from the form.
        try {
            $result = Cache::lock('bplo:release-number-allocation', 30)->block(10, function () use ($application) {
                return DB::transaction(function () use ($application) {
                    $application = Application::whereKey($application->id)->lockForUpdate()->first();
                    if (! $application || $application->status !== self::RELEASABLE_STATUS) {
                        return null;
                    }

                    $tricycle = $application->tricycle;
                    $isRenewal = $application->application_type === 'renewal';
                    $codingNumber = $this->resolveCodingNumber($application);
                    $franchiseNumber = $this->nextFranchiseNumber($application);
                    $statusBeforeRelease = $application->status;

                    $this->persistRelease($application, $tricycle, $isRenewal, $codingNumber, $franchiseNumber);

                    return [$application, $statusBeforeRelease, $franchiseNumber, $codingNumber];
                });
            });
        } catch (LockTimeoutException $e) {
            return redirect()->route('bplo.releasing')->with('error', 'Another release is being processed right now. Please try again in a moment.');
        }

        if ($result === null) {
            return redirect()->route('bplo.releasing')->with('error', "Application {$application->reference_number} has already been released by another staff member.");
        }

        [$application, $statusBeforeRelease, $franchiseNumber, $codingNumber] = $result;

        // TMO: released by BPLO -> Final Confirmation & GPS setup pending.
        try {
            \App\Services\StaffNotifier::applicationStatusChanged($application->refresh(), $statusBeforeRelease, $application->status, $request->user()?->id);
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->route('bplo.releasing')->with('success', "Sticker Number #{$codingNumber} and Franchise Number #{$franchiseNumber} released! Driver instructed to return to TMO for Final Confirmation & GPS Setup.");
    }

    /**
     * Writes a release (tricycle sticker, pending franchise scheme, application status, history,
     * audit). Called only from release(), inside its locked transaction.
     */
    private function persistRelease(Application $application, $tricycle, bool $isRenewal, string $codingNumber, string $franchiseNumber): void
    {
        $fromStatus = $application->status;
        $fromStep = $application->current_step;

        if ($tricycle) {
            // 1. Assign the Sticker Number to the Tricycle
            $tricycle->update([
                'coding_scheme_number' => $codingNumber,
            ]);

            // 2. Setup Franchise Scheme with Color Coding Scheme based on last digit of the Sticker Number
            $lastDigit = (int)substr(trim($codingNumber), -1);
            $scheme = ColorCodingRuleService::schemeForLastDigit($lastDigit);
            $schemeId = $scheme ? $scheme->id : (ColorCodingScheme::where('is_active', true)->first()?->id ?? 1);

            // If renewal, deactivate prior active franchise scheme for this tricycle
            if ($isRenewal) {
                FranchiseScheme::where('tricycle_id', $tricycle->id)
                    ->where('is_active', true)
                    ->update([
                        'is_active' => false,
                        'notes'     => DB::raw("CONCAT(COALESCE(notes, ''), ' [Expired & Renewed on " . now()->toDateString() . "]')"),
                    ]);
            }

            // Create or update pending permit record (activated during TMO Final Confirmation)
            FranchiseScheme::updateOrCreate(
                ['application_id' => $application->id],
                [
                    'tricycle_id'            => $tricycle->id,
                    'color_coding_scheme_id' => $schemeId,
                    'issued_by'              => Auth::id() ?: 1,
                    'franchise_number'       => $franchiseNumber,
                    'sticker_number'         => $codingNumber,
                    'issue_date'             => now()->toDateString(),
                    'expiry_date'            => now()->addYear()->toDateString(),
                    'is_active'              => false, // Will become active upon TMO Final Confirmation
                    'notes'                  => "Franchise Number #{$franchiseNumber} released by BPLO. Awaiting TMO Final Confirmation.",
                ]
            );
        }

        // 3. Update Application status to awaiting_tmo_confirmation
        $toStatus = 'awaiting_tmo_confirmation';
        $toStep = 4; // Step 4: Awaiting TMO Final Confirmation
        $notes = "Franchise Number #{$franchiseNumber} and Sticker Number #{$codingNumber} released by BPLO. Driver instructed to return to TMO for Final Confirmation.";

        $application->update([
            'status'         => $toStatus,
            'current_step'   => $toStep,
            'sticker_number' => $franchiseNumber,
            'remarks'        => $notes,
        ]);

        // 4. Log status change history
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

        AuditService::log(
            module: 'franchise',
            action: 'bplo.franchise_released',
            record: $application,
            description: "BPLO released Franchise Number #{$franchiseNumber} with Sticker Number #{$codingNumber} for Application {$application->reference_number}",
            oldValues: [
                'status'       => $fromStatus,
                'current_step' => $fromStep,
            ],
            newValues: [
                'status'               => $toStatus,
                'current_step'         => $toStep,
                'franchise_number'     => $franchiseNumber,
                'coding_scheme_number' => $codingNumber,
            ],
            metadata: [
                'is_renewal'   => $isRenewal,
                'tricycle_id'  => $tricycle?->id,
                'plate_number' => $tricycle?->plate_number,
            ]
        );
    }

    /**
     * List active registry tricycles.
     */
    public function registry(): Response
    {
        $registryList = $this->activeRegistryList();

        $activeCount = $registryList->count();
        $revokedCount = Tricycle::where('status', 'inactive')->count();

        return Inertia::render('BPLODashboard/ActiveRegistry', [
            'registryList' => $registryList,
            'activeCount'  => $activeCount,
            'revokedCount' => $revokedCount,
        ]);
    }

    /**
     * Shared active-registry rows for the BPLO Active Registry page AND its Excel export —
     * one mapping, so the on-screen masterlist and the downloaded file can never drift apart.
     */
    private function activeRegistryList()
    {
        return Tricycle::with(['operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application'])
            ->where('status', 'active')
            ->get()
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->first();
                $issueDate = $scheme ? $scheme->issue_date->format('M d, Y') : $tri->created_at->format('M d, Y');

                return [
                    'plate_no'   => $tri->plate_number,
                    'coding_scheme_number' => $tri->coding_scheme_number ?: $scheme?->sticker_number,
                    'sticker_no' => $scheme?->franchise_number ?: $scheme?->sticker_number ?: $scheme?->application?->sticker_number ?: 'N/A', // Franchise Number — real stored value only, never fabricated
                    'operator'   => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'operator_photo' => $tri->operator?->profile_photo_url,
                    'contact'    => $tri->operator?->contact_number ?: 'N/A',
                    'make'       => "{$tri->make} {$tri->model}",
                    'issue_date' => $issueDate,
                    // issue_date is a date-only column, so the time comes from when the franchise record was created.
                    'issue_time' => ($scheme ?? $tri)->created_at?->format('h:i A'),
                    'status'     => 'active',
                ];
            });
    }

    /**
     * Excel export of the BPLO Active Registry — replaces the old client-side CSV
     * download (which produced non-Excel CSV with a fake "Exporting..." delay) with a
     * real server-side .xlsx, using the same municipal letterhead/KPI/table styling as
     * every other office export (shared ExportsMunicipalExcelReports trait), fed by the
     * exact same rows the on-screen masterlist renders.
     */
    public function exportActiveRegistryExcel(Request $request): StreamedResponse
    {
        $format = $request->query('format') === 'pdf' ? 'pdf' : 'excel';
        $registryList = $this->activeRegistryList();
        $revokedCount = Tricycle::where('status', 'inactive')->count();

        $title = 'BPLO Active Registry Masterlist';
        $asOf = 'As of: ' . now()->format('F d, Y \a\t h:i A');
        $kpis = [
            'Active Units'    => number_format($registryList->count()),
            'Revoked Units'   => number_format($revokedCount),
            'Issued This Yr'  => number_format($registryList->filter(fn ($u) => str_contains($u['issue_date'], (string) now()->year))->count()),
        ];
        $headers = ['Franchise Number', 'Sticker Number', 'Plate No.', 'Tricycle Owner', 'Contact No.', 'Make & Model', 'Issue Date', 'Status'];
        $rows = $registryList->map(fn ($u) => [
            $u['sticker_no'],
            $u['coding_scheme_number'],
            $u['plate_no'],
            $u['operator'],
            $u['contact'],
            $u['make'],
            trim($u['issue_date'] . ' ' . ($u['issue_time'] ?? '')),
            ucfirst($u['status']),
        ])->all();

        $filename = 'bplo_active_registry_' . now()->toDateString() . ($format === 'pdf' ? '.pdf' : '.xlsx');

        AuditService::log(
            module: 'reports',
            action: 'report.exported_' . $format,
            record: null,
            description: 'Exported BPLO Active Registry ' . ($format === 'pdf' ? 'PDF' : 'Excel') . ' Report (' . count($rows) . ' units)',
            oldValues: null,
            newValues: null,
            targetReference: $filename,
            metadata: ['report' => 'bplo_active_registry', 'filename' => $filename, 'format' => $format, 'row_count' => count($rows)]
        );

        if ($format === 'pdf') {
            return $this->streamMunicipalPdf([
                'officeName'  => 'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
                'footerCode'  => 'BPLO',
                'docRef'      => 'LGU-NAS-BPLO-REGISTRY',
                'reportTitle' => $title,
                'periodLabel' => $asOf,
                'kpis'        => $kpis,
                'sections'    => [['title' => 'Approved MTOP Masterlist', 'headers' => $headers, 'rows' => $rows]],
            ], $filename);
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('BPLO Active Registry');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader($sheet, $title, $asOf, count($headers), 'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)', 'BPLO');
        $row = $this->writeKpiRow($sheet, $row, $kpis, [3, 3, 2]);
        $row = $this->writeSectionTitle($sheet, $row, 'Approved MTOP Masterlist');
        // Non-sticky header: the table scrolls normally with the rest of the sheet.
        $this->writeTable($sheet, $row, $headers, $rows);

        return $this->streamExcel($spreadsheet, $filename);
    }

    /**
     * Display details of a specific active registry tricycle.
     */
    public function registryDetails($plateNo): Response
    {
        $tricycle = Tricycle::with(['operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'applications.documents'])
            ->where('plate_number', $plateNo)
            ->firstOrFail();

        $operator = $tricycle->operator;
        $scheme = $tricycle->franchiseSchemes->first();
        
        // Find application with documents: check tricycle's applications first, then operator's applications
        $app = $tricycle->applications()->whereHas('documents')->latest()->first()
            ?? ($operator ? $operator->applications()->whereHas('documents')->latest()->first() : null)
            ?? $tricycle->applications()->latest()->first();

        // The application that carries this unit's owner/driver distinction — prefer the one
        // that issued the active franchise, falling back to whatever application was found.
        $ownerApplication = $scheme?->application ?? $app;

        $requirements = [];
        if ($app && $app->documents->isNotEmpty()) {
            $requirements = $app->documents->map(function ($doc) {
                $labelsMap = [
                    'drivers_license'    => "Driver's License (Back-to-Back)",
                    'or_cr'              => "Official Receipt & Certificate of Registration (OR/CR)",
                    'proof_of_residence' => "Barangay Clearance",
                    'toda_clearance'     => "TODA Certificate of Membership",
                    'photo_id'           => "Driver's 2x2 Photo ID",
                    'prangkisa'          => "Franchise Certificate (Prangkisa)",
                    'tariff'             => "Approved Fare Tariff",
                ];
                return [
                    'name'        => $labelsMap[$doc->document_type] ?? ucwords(str_replace('_', ' ', $doc->document_type)),
                    'type'        => $doc->document_type,
                    'preview_url' => $doc->file_path ? "/storage/{$doc->file_path}" : '/document/orcr-preview',
                    'verified_at' => $doc->updated_at ? $doc->updated_at->format('M d, Y') : 'Verified',
                ];
            })->values()->all();
        }

        // Fallback to standard municipal registration documents if none explicitly attached to the seed
        if (empty($requirements)) {
            $requirements = [
                ['name' => "Driver's License (Back-to-Back)", 'type' => 'drivers_license', 'preview_url' => '/document/orcr-preview', 'verified_at' => 'Verified'],
                ['name' => "Official Receipt & Certificate of Registration (OR/CR)", 'type' => 'or_cr', 'preview_url' => '/document/orcr-preview', 'verified_at' => 'Verified'],
                ['name' => "Barangay Clearance", 'type' => 'proof_of_residence', 'preview_url' => '/document/orcr-preview', 'verified_at' => 'Verified'],
                ['name' => "TODA Certificate of Membership", 'type' => 'toda_clearance', 'preview_url' => '/document/orcr-preview', 'verified_at' => 'Verified'],
                ['name' => "Driver's 2x2 Photo ID", 'type' => 'photo_id', 'preview_url' => '/document/orcr-preview', 'verified_at' => 'Verified'],
            ];
        }

        $registry = [
            'plate_no'          => $tricycle->plate_number,
            'coding_scheme_number' => $tricycle->coding_scheme_number ?: $scheme?->sticker_number,
            'sticker_no'           => $scheme?->franchise_number ?: $scheme?->sticker_number ?: $scheme?->application?->sticker_number ?: 'N/A', // Franchise Number — real stored value only, never fabricated
            'operator'          => $operator ? $operator->full_name : 'N/A',
            'operator_photo'    => $operator?->profile_photo_url,
            'first_name'        => $operator ? $operator->first_name : '',
            'last_name'         => $operator ? $operator->last_name : '',
            'contact'           => $operator ? $operator->contact_number : 'N/A',
            'email'             => $operator?->user ? $operator->user->email : ($operator ? "driver.{$operator->last_name}@trivora.ph" : 'N/A'),
            'address'           => $operator ? ($operator->address ?: 'Nasugbu, Batangas') : 'Nasugbu, Batangas',
            'barangay'          => $operator ? ($operator->barangay ?: 'Poblacion') : 'Poblacion',
            'date_of_birth'     => $operator && $operator->date_of_birth ? $operator->date_of_birth->format('m/d/Y') : '12/12/1988',
            // Tricycle Owner (primary person — `operator` above is the same person) plus the
            // optional separate Tricycle Driver, only present when they are a different person.
            'owner'             => $ownerApplication?->ownerDetails() ?? ($operator ? $operator->personDetails() : null),
            'ownerIsDriver'     => $ownerApplication ? (bool) $ownerApplication->owner_is_driver : true,
            'tricycleDriver'    => $ownerApplication?->driverDetails(),
            'make'              => trim(($tricycle->make ?: '') . ' ' . ($tricycle->model ?: '')) ?: null,
            'year_model'        => $tricycle->year_model ?: null,
            'body_color'        => $tricycle->body_color ?: null,
            'body_type'         => $tricycle->body_type ?: null,
            'engine_number'     => $tricycle->engine_number ?: null,
            'chassis_number'    => $tricycle->chassis_number ?: null,
            'or_number'         => $tricycle->or_number ?: null,
            'cr_number'         => $tricycle->cr_number ?: null,
            'issue_date'        => $scheme ? $scheme->issue_date->format('F j, Y') : $tricycle->created_at->format('F j, Y'),
            'coding_day'        => $scheme ? ($scheme->colorCodingScheme ? $scheme->colorCodingScheme->coding_day : 'None') : 'None',
            'coding_status'     => ColorCodingRuleService::evaluateTricycle($tricycle),
            'status'            => $tricycle->status,
            'tracking_mode'     => $tricycle->active_tracking_mode ?: 'mobile_app',
            'requirements'      => $requirements,
        ];

        return Inertia::render('BPLODashboard/RegistryDetails', [
            'registry'      => $registry,
            'codingSchemes' => ColorCodingScheme::where('is_active', true)->get(),
        ]);
    }

    /**
     * Map Last Digit of the Sticker Number to coding day using DB-backed rule service.
     */
    private function getCodingDay(int $lastDigit): string
    {
        return ColorCodingRuleService::codingDayForLastDigit($lastDigit) ?? 'Monday';
    }
}
