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
use App\Services\ColorCodingRuleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
        $totalRegistriesCount = Tricycle::count();

        // TODA distribution stats
        $todaStats = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->select('toda_zones.name', 'toda_zones.code', DB::raw('count(tricycles.id) as unit_count'))
            ->groupBy('toda_zones.id', 'toda_zones.name', 'toda_zones.code')
            ->get();

        return Inertia::render('BPLODashboard/Index', [
            'stats' => [
                'activeFranchisesCount'          => $activeFranchisesCount,
                'pendingReleasingCount'          => $pendingReleasingCount,
                'totalRegistriesCount'           => $totalRegistriesCount,
            ],
            'todaStats' => $todaStats,
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
        $applications = Application::with(['operator.todaZone', 'tricycle', 'latestInspection'])
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
                    'operator'      => $app->operator ? $app->operator->full_name : 'N/A',
                    'toda'          => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
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
    public function showReleaseForm(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle', 'tricycleDriver']);

        // Auto-suggest next sticker number
        $maxFranchise = FranchiseScheme::where('franchise_number', 'not like', '%-%')->max('franchise_number');
        $maxCodingNo = 0;
        if ($maxFranchise) {
            preg_match('/\d+$/', $maxFranchise, $matches);
            $maxCodingNo = isset($matches[0]) ? (int)$matches[0] : 0;
        }
        if ($maxCodingNo === 0) {
            $maxCodingNo = 841;
        }
        $suggestedCodingNo = str_pad($maxCodingNo + 1, 4, '0', STR_PAD_LEFT);

        // Auto-generate the unique Franchise Number (STK-YYYY-NNNN) if not yet persisted
        if (!empty($application->sticker_number)) {
            $franchiseNumber = $application->sticker_number;
        } else {
            $year = date('Y');
            $prefix = "STK-{$year}-";

            $maxAppSeq = 0;
            $appStickers = Application::where('sticker_number', 'like', "{$prefix}%")->pluck('sticker_number');
            foreach ($appStickers as $sn) {
                $parts = explode('-', (string)$sn);
                $num = (int)end($parts);
                if ($num > $maxAppSeq) {
                    $maxAppSeq = $num;
                }
            }

            $schemeStickers = FranchiseScheme::where('sticker_number', 'like', "{$prefix}%")->pluck('sticker_number');
            foreach ($schemeStickers as $sn) {
                $parts = explode('-', (string)$sn);
                $num = (int)end($parts);
                if ($num > $maxAppSeq) {
                    $maxAppSeq = $num;
                }
            }

            $nextSeq = max($maxAppSeq, (int)$suggestedCodingNo) + 1;
            do {
                $franchiseNumber = sprintf('%s%04d', $prefix, $nextSeq);
                $exists = Application::where('sticker_number', $franchiseNumber)->where('id', '!=', $application->id)->exists()
                    || FranchiseScheme::where('sticker_number', $franchiseNumber)->exists();
                if ($exists) {
                    $nextSeq++;
                }
            } while ($exists);

            $application->update(['sticker_number' => $franchiseNumber]);
        }

        $appData = [
            'id'                => $application->id,
            'reference'         => $application->reference_number,
            'operator'          => $application->operator ? $application->operator->full_name : 'N/A',
            'owner'             => $application->ownerDetails(),
            'ownerIsDriver'     => (bool) $application->owner_is_driver,
            'tricycleDriver'    => $application->driverDetails(),
            'toda'              => ($application->operator && $application->operator->todaZone) ? $application->operator->todaZone->name : 'Unassigned',
            'make'              => $application->tricycle ? "{$application->tricycle->make} {$application->tricycle->model}" : 'N/A',
            'engine_number'     => $application->tricycle ? $application->tricycle->engine_number : 'N/A',
            'chassis_number'    => $application->tricycle ? $application->tricycle->chassis_number : 'N/A',
            'suggested_coding_number' => $suggestedCodingNo,
            'suggested_sticker' => $franchiseNumber,
            'sticker_number'    => $franchiseNumber,
        ];

        return Inertia::render('BPLODashboard/IssueStickerNumber', [
            'application' => $appData,
        ]);
    }

    /**
     * Finalize BPLO approval, issue the Sticker Number, and release the Franchise Number.
     * Note: BPLO does NOT issue the IoT device. Driver returns to TMO for Final Confirmation.
     */
    public function release(Request $request, Application $application): RedirectResponse
    {
        $tricycle = $application->tricycle;
        $isRenewal = $application->application_type === 'renewal';

        // ── Identifier terminology map (terminology audit) ──────────────────────────
        //   "Sticker Number"   = tricycles.coding_scheme_number — the 4-digit municipal
        //                         number. Stored in the legacy-named column
        //                         franchise_schemes.franchise_number, carried below as
        //                         $codingNumber.
        //   "Franchise Number" = the STK-YYYY-NNNN serial held in applications.sticker_number
        //                         and franchise_schemes.sticker_number, carried below as
        //                         $franchiseNumber.
        //   franchise_schemes.franchise_number therefore holds the Sticker Number — that
        //   column name predates the terminology decision. Never read it as the Franchise
        //   Number, and never invent one when no serial has been issued.
        //
        // franchise_schemes.franchise_number identifies the ONE currently-operating unit
        // holding that Sticker Number municipality-wide, so only currently-ACTIVE schemes
        // must stay unique (enforced at the DB level too — see the active_franchise_number
        // generated column/index). A genuine renewal is explicitly allowed to reuse the SAME
        // number this tricycle's own (about to be deactivated) active scheme already holds;
        // any other still-active use of that number — this tricycle's for a non-renewal, or
        // any other tricycle's — is still rejected.
        $franchiseNumberRule = Rule::unique('franchise_schemes', 'franchise_number')->where('is_active', true);
        if ($isRenewal && $tricycle) {
            $franchiseNumberRule->where(fn ($query) => $query->where('tricycle_id', '!=', $tricycle->id));
        }

        // `coding_scheme_number` is the canonical key for the Sticker Number; `body_number`
        // is its legacy alias, still accepted through the deprecation cycle. Validate
        // whichever key the client actually sent, so the error bag matches that key.
        $numberKey = $request->has('coding_scheme_number') ? 'coding_scheme_number' : 'body_number';

        $request->validate([
            $numberKey       => ['required', 'string', 'max:20', $franchiseNumberRule],
            'sticker_number' => 'nullable|string|max:50',
        ]);

        $codingNumber = $request->input($numberKey);
        $franchiseNumber = $application->sticker_number ?: $request->input('sticker_number');

        if (empty($franchiseNumber)) {
            $year = date('Y');
            $franchiseNumber = 'STK-' . $year . '-' . str_pad($codingNumber, 4, '0', STR_PAD_LEFT);
        }

        DB::transaction(function () use ($application, $codingNumber, $franchiseNumber, $tricycle, $isRenewal) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            if ($tricycle) {
                // 1. Assign the Sticker Number to the Tricycle
                $tricycle->update([
                    'coding_scheme_number' => str_pad($codingNumber, 4, '0', STR_PAD_LEFT),
                ]);

                // 2. Setup Franchise Scheme with Color Coding Scheme based on last digit of the Sticker Number
                $lastDigit = (int)substr(trim($codingNumber), -1);
                $codingDay = $this->getCodingDay($lastDigit);
                $scheme = ColorCodingScheme::whereJsonContains('restricted_days', $codingDay)->first();
                $schemeId = $scheme ? $scheme->id : ColorCodingScheme::first()->id;

                // Only a genuine renewal supersedes the tricycle's existing active franchise. A
                // "new" application must never deactivate an active scheme just because the
                // tricycle happens to have one.
                if ($isRenewal) {
                    FranchiseScheme::where('tricycle_id', $tricycle->id)
                        ->where('is_active', true)
                        ->update([
                            'is_active' => false,
                            'notes'     => DB::raw("CONCAT(COALESCE(notes, ''), ' [Expired & Renewed on " . now()->toDateString() . "]')"),
                        ]);
                }

                // Create pending permit record (activated during TMO Final Confirmation)
                FranchiseScheme::create([
                    'application_id'         => $application->id,
                    'tricycle_id'            => $tricycle->id,
                    'color_coding_scheme_id' => $schemeId,
                    'issued_by'              => Auth::id() ?: 1,
                    'franchise_number'       => str_pad($codingNumber, 4, '0', STR_PAD_LEFT),
                    'sticker_number'         => $franchiseNumber,
                    'issue_date'             => now()->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => false, // Will become active upon TMO Final Confirmation
                    'notes'                  => "Franchise Number #{$franchiseNumber} released by BPLO. Awaiting TMO Final Confirmation.",
                ]);
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
        });

        return redirect()->route('bplo.releasing')->with('success', "Franchise Number #{$franchiseNumber} released! Driver instructed to return to TMO for Final Confirmation & GPS Setup.");
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
        return Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application'])
            ->where('status', 'active')
            ->get()
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->first();
                $issueDate = $scheme ? $scheme->issue_date->format('M d, Y') : $tri->created_at->format('M d, Y');

                return [
                    'plate_no'   => $tri->plate_number,
                    'coding_scheme_number' => $tri->coding_scheme_number,
                    'sticker_no' => $scheme?->sticker_number ?: $scheme?->application?->sticker_number ?: 'N/A', // Franchise Number — real stored value only, never fabricated
                    'operator'   => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'toda'       => $tri->todaZone ? $tri->todaZone->name : 'Unassigned',
                    'make'       => "{$tri->make} {$tri->model}",
                    'issue_date' => $issueDate,
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
    public function exportActiveRegistryExcel(): StreamedResponse
    {
        $registryList = $this->activeRegistryList();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('BPLO Active Registry');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $revokedCount = Tricycle::where('status', 'inactive')->count();

        $row = $this->writeReportHeader(
            $sheet,
            'BPLO Active Registry Masterlist',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            8,
            'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)',
            'BPLO'
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Active Units'    => number_format($registryList->count()),
            'Revoked Units'   => number_format($revokedCount),
            'Issued This Yr'  => number_format($registryList->filter(fn ($u) => str_contains($u['issue_date'], (string) now()->year))->count()),
        ], [3, 3, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Approved MTOP Masterlist');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Sticker Number', 'Plate No.', 'Tricycle Owner', 'Make & Model', 'TODA Zone', 'Franchise Number', 'Issue Date', 'Status'],
            $registryList->map(fn ($u) => [
                $u['coding_scheme_number'],
                $u['plate_no'],
                $u['operator'],
                $u['make'],
                $u['toda'],
                $u['sticker_no'],
                $u['issue_date'],
                ucfirst($u['status']),
            ])->all(),
            true
        );

        $filename = 'bplo_active_registry_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    /**
     * Display details of a specific active registry tricycle.
     */
    public function registryDetails($plateNo): Response
    {
        $tricycle = Tricycle::with(['operator.todaZone', 'operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'applications.documents'])
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
            'coding_scheme_number' => $tricycle->coding_scheme_number,
            'sticker_no'           => $scheme?->sticker_number ?: $scheme?->application?->sticker_number ?: 'N/A', // Franchise Number — real stored value only, never fabricated
            'operator'          => $operator ? $operator->full_name : 'N/A',
            'first_name'        => $operator ? $operator->first_name : '',
            'last_name'         => $operator ? $operator->last_name : '',
            'contact'           => $operator ? $operator->contact_number : 'N/A',
            'email'             => $operator?->user ? $operator->user->email : ($operator ? "driver.{$operator->last_name}@trivora.ph" : 'N/A'),
            'address'           => $operator ? ($operator->address ?: 'Nasugbu, Batangas') : 'Nasugbu, Batangas',
            'barangay'          => $operator ? ($operator->barangay ?: 'Poblacion') : 'Poblacion',
            'date_of_birth'     => $operator && $operator->date_of_birth ? $operator->date_of_birth->format('M d, Y') : 'Dec 12, 1988',
            // Tricycle Owner (primary person — `operator` above is the same person) plus the
            // optional separate Tricycle Driver, only present when they are a different person.
            'owner'             => $ownerApplication?->ownerDetails() ?? ($operator ? $operator->personDetails() : null),
            'ownerIsDriver'     => $ownerApplication ? (bool) $ownerApplication->owner_is_driver : true,
            'tricycleDriver'    => $ownerApplication?->driverDetails(),
            'license_no'        => $operator ? ($operator->license_number ?: 'N01-88-567890') : 'N01-88-567890',
            'license_expiry'    => $operator && $operator->license_expiry_date ? $operator->license_expiry_date->format('M d, Y') : 'Dec 11, 2027',
            'license_codes'     => $operator ? ($operator->license_restriction_code ?: '1, 2') : '1, 2',
            'toda'              => $tricycle->todaZone ? $tricycle->todaZone->name : 'Unassigned',
            'make'              => "{$tricycle->make} {$tricycle->model}",
            'year_model'        => $tricycle->year_model ?: '2022',
            'body_color'        => $tricycle->body_color ?: 'Blue',
            'body_type'         => $tricycle->body_type ?: 'Standard Side Car',
            'engine_number'     => $tricycle->engine_number ?: 'ENG-MOBGPS-888',
            'chassis_number'    => $tricycle->chassis_number ?: 'CHS-MOBGPS-888',
            'or_number'         => $tricycle->or_number ?: "OR-" . date('Y') . "-000" . $tricycle->id,
            'cr_number'         => $tricycle->cr_number ?: "CR-" . date('Y') . "-000" . $tricycle->id,
            'issue_date'        => $scheme ? $scheme->issue_date->format('F j, Y') : $tricycle->created_at->format('F j, Y'),
            'coding_day'        => $scheme ? ($scheme->colorCodingScheme ? $scheme->colorCodingScheme->coding_day : 'None') : 'None',
            'status'            => $tricycle->status,
            'tracking_mode'     => $tricycle->active_tracking_mode ?: 'mobile_app',
            'requirements'      => $requirements,
        ];

        return Inertia::render('BPLODashboard/RegistryDetails', [
            'registry' => $registry,
        ]);
    }

    /**
     * Map Last Digit of the Sticker Number to coding day.
     */
    private function getCodingDay(int $lastDigit): string
    {
        return ColorCodingRuleService::codingDayForLastDigit($lastDigit) ?? 'Monday';
    }
}
