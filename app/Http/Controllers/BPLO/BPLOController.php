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

        // Auto-generate the unique Franchise Number (STK-YYYY-NNNN) if not yet persisted or if collision exists
        $year = date('Y');
        $prefix = "STK-{$year}-";

        $currentFranchise = $application->sticker_number;
        $isCurrentValid = !empty($currentFranchise)
            && !Application::where('sticker_number', $currentFranchise)->where('id', '!=', $application->id)->exists()
            && !FranchiseScheme::where('sticker_number', $currentFranchise)->where('application_id', '!=', $application->id)->exists();

        if ($isCurrentValid) {
            $franchiseNumber = $currentFranchise;
        } else {
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
                $candidateFranchise = sprintf('%s%04d', $prefix, $nextSeq);
                $exists = Application::where('sticker_number', $candidateFranchise)->where('id', '!=', $application->id)->exists()
                    || FranchiseScheme::where('sticker_number', $candidateFranchise)->where('application_id', '!=', $application->id)->exists();
                if ($exists) {
                    $nextSeq++;
                }
            } while ($exists);

            $franchiseNumber = $candidateFranchise;
            $application->update(['sticker_number' => $franchiseNumber]);
        }

        $appData = [
            'id'                      => $application->id,
            'reference'               => $application->reference_number,
            'application_type'        => $application->application_type,
            'is_renewal'              => $isRenewal,
            'operator'                => $application->operator ? $application->operator->full_name : 'N/A',
            'owner'                   => $application->ownerDetails(),
            'ownerIsDriver'           => (bool) $application->owner_is_driver,
            'tricycleDriver'          => $application->driverDetails(),
            'toda'                    => ($application->operator && $application->operator->todaZone) ? $application->operator->todaZone->name : 'Unassigned',
            'make'                    => $application->tricycle ? "{$application->tricycle->make} {$application->tricycle->model}" : 'N/A',
            'plate_number'            => $application->tricycle ? $application->tricycle->plate_number : 'N/A',
            'engine_number'           => $application->tricycle ? $application->tricycle->engine_number : 'N/A',
            'chassis_number'          => $application->tricycle ? $application->tricycle->chassis_number : 'N/A',
            'suggested_coding_number' => $suggestedCodingNo,
            'suggested_sticker'       => $franchiseNumber,
            'sticker_number'          => $franchiseNumber,
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

        // Uniqueness check for sticker / coding number:
        // Only OTHER currently-active tricycles should block this assignment.
        // If this tricycle already holds that number (e.g. renewal or re-processing), it is permitted.
        $franchiseNumberRule = Rule::unique('franchise_schemes', 'franchise_number')->where('is_active', true);
        if ($tricycle) {
            $franchiseNumberRule->where(fn ($query) => $query->where('tricycle_id', '!=', $tricycle->id));
        }

        $numberKey = $request->has('coding_scheme_number') ? 'coding_scheme_number' : 'body_number';

        $request->validate([
            $numberKey       => ['required', 'string', 'max:20', $franchiseNumberRule],
            'sticker_number' => 'nullable|string|max:50',
        ], [
            "{$numberKey}.required" => 'The Sticker / Coding Scheme Number is required.',
            "{$numberKey}.unique"   => 'This Sticker / Coding Scheme Number is already actively assigned to another tricycle.',
        ]);

        $codingNumber = str_pad(trim($request->input($numberKey)), 4, '0', STR_PAD_LEFT);
        $franchiseNumber = trim($request->input('sticker_number') ?: ($application->sticker_number ?: ''));

        $year = date('Y');
        $prefix = "STK-{$year}-";

        // Validate or resolve Franchise Number (STK-YYYY-NNNN) to ensure it is unique across applications/schemes
        $hasConflict = empty($franchiseNumber)
            || Application::where('sticker_number', $franchiseNumber)->where('id', '!=', $application->id)->exists()
            || FranchiseScheme::where('sticker_number', $franchiseNumber)->where('application_id', '!=', $application->id)->exists();

        if ($hasConflict) {
            $maxAppSeq = 0;
            foreach (Application::where('sticker_number', 'like', "{$prefix}%")->pluck('sticker_number') as $sn) {
                $p = explode('-', (string)$sn);
                $maxAppSeq = max($maxAppSeq, (int)end($p));
            }
            foreach (FranchiseScheme::where('sticker_number', 'like', "{$prefix}%")->pluck('sticker_number') as $sn) {
                $p = explode('-', (string)$sn);
                $maxAppSeq = max($maxAppSeq, (int)end($p));
            }
            $nextSeq = max($maxAppSeq, (int)$codingNumber) + 1;
            do {
                $candidate = sprintf('%s%04d', $prefix, $nextSeq);
                $exists = Application::where('sticker_number', $candidate)->where('id', '!=', $application->id)->exists()
                    || FranchiseScheme::where('sticker_number', $candidate)->where('application_id', '!=', $application->id)->exists();
                if ($exists) {
                    $nextSeq++;
                }
            } while ($exists);
            $franchiseNumber = $candidate;
        }

        $statusBeforeRelease = $application->status;

        DB::transaction(function () use ($application, $codingNumber, $franchiseNumber, $tricycle, $isRenewal) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            if ($tricycle) {
                // 1. Assign the Sticker Number to the Tricycle
                $tricycle->update([
                    'coding_scheme_number' => $codingNumber,
                ]);

                // 2. Setup Franchise Scheme with Color Coding Scheme based on last digit of the Sticker Number
                $lastDigit = (int)substr(trim($codingNumber), -1);
                $codingDay = $this->getCodingDay($lastDigit);
                $scheme = ColorCodingScheme::whereJsonContains('restricted_days', $codingDay)->first();
                $schemeId = $scheme ? $scheme->id : (ColorCodingScheme::first()?->id ?? 1);

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
                        'franchise_number'       => $codingNumber,
                        'sticker_number'         => $franchiseNumber,
                        'issue_date'             => now()->toDateString(),
                        'expiry_date'            => now()->addYears(3)->toDateString(),
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
        });

        // TMO: released by BPLO -> Final Confirmation & GPS setup pending.
        try {
            \App\Services\StaffNotifier::applicationStatusChanged($application->refresh(), $statusBeforeRelease, $application->status, $request->user()?->id);
        } catch (\Throwable $e) {
            report($e);
        }

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
