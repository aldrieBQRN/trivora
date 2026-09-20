<?php

namespace App\Http\Controllers\BPLO;

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

class BPLOController extends Controller
{
    /**
     * Display BPLO Dashboard.
     */
    public function dashboard(): Response
    {
        $activeFranchisesCount = Tricycle::where('status', 'active')->count();
        $pendingReleasingCount = Application::whereIn('status', ['payment_verified', 'paid'])->count();
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
        $applications = Application::with(['operator.todaZone', 'tricycle', 'payment', 'latestInspection'])
            ->whereIn('status', ['payment_verified', 'paid'])
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
                    'or_number'     => $app->payment ? $app->payment->official_receipt_number : 'OR-VERIFIED',
                    'verified_at'   => $app->updated_at->diffForHumans(),
                    'tmo_passed_at' => $app->latestInspection?->inspection_date ? \Carbon\Carbon::parse($app->latestInspection->inspection_date)->format('M d, Y') : 'Verified',
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
     * Show release form for final plate/body number, franchise sticker, and tracker assignment.
     */
    public function showReleaseForm(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle', 'payment']);

        // Auto-suggest next body number
        $maxFranchise = FranchiseScheme::where('franchise_number', 'not like', '%-%')->max('franchise_number');
        $maxBodyNo = 0;
        if ($maxFranchise) {
            preg_match('/\d+$/', $maxFranchise, $matches);
            $maxBodyNo = isset($matches[0]) ? (int)$matches[0] : 0;
        }
        if ($maxBodyNo === 0) {
            $maxBodyNo = 841;
        }
        $suggestedBodyNo = str_pad($maxBodyNo + 1, 4, '0', STR_PAD_LEFT);
        $suggestedSticker = 'STK-' . date('Y') . '-' . $suggestedBodyNo;

        $appData = [
            'id'                => $application->id,
            'reference'         => $application->reference_number,
            'operator'          => $application->operator ? $application->operator->full_name : 'N/A',
            'toda'              => ($application->operator && $application->operator->todaZone) ? $application->operator->todaZone->name : 'Unassigned',
            'make'              => $application->tricycle ? "{$application->tricycle->make} {$application->tricycle->model}" : 'N/A',
            'engine_number'     => $application->tricycle ? $application->tricycle->engine_number : 'N/A',
            'chassis_number'    => $application->tricycle ? $application->tricycle->chassis_number : 'N/A',
            'suggested_body_no' => $suggestedBodyNo,
            'suggested_sticker' => $suggestedSticker,
            'payment'           => $application->payment ? [
                'or_number' => $application->payment->official_receipt_number,
                'amount'    => (float)$application->payment->amount,
                'date'      => $application->payment->payment_date ? $application->payment->payment_date->format('M d, Y') : 'N/A',
            ] : null,
        ];

        return Inertia::render('BPLODashboard/IssueBodyNumber', [
            'application' => $appData,
        ]);
    }

    /**
     * Finalize BPLO approval, issue body number, and release franchise sticker.
     * Note: BPLO does NOT issue the IoT device. Driver returns to TMO for Final Confirmation.
     */
    public function release(Request $request, Application $application): RedirectResponse
    {
        $tricycle = $application->tricycle;
        $isRenewal = $application->application_type === 'renewal';

        // franchise_number identifies the ONE currently-operating unit holding that body number
        // municipality-wide, so only currently-ACTIVE schemes must stay unique (enforced at the DB
        // level too — see the active_franchise_number generated column/index). A genuine renewal is
        // explicitly allowed to reuse the SAME number this tricycle's own (about to be deactivated)
        // active scheme already holds; any other still-active use of that number — this tricycle's
        // for a non-renewal, or any other tricycle's — is still rejected.
        $franchiseNumberRule = Rule::unique('franchise_schemes', 'franchise_number')->where('is_active', true);
        if ($isRenewal && $tricycle) {
            $franchiseNumberRule->where(fn ($query) => $query->where('tricycle_id', '!=', $tricycle->id));
        }

        $request->validate([
            'body_number'    => ['required', 'string', 'max:20', $franchiseNumberRule],
            'sticker_number' => 'required|string|max:50',
        ]);

        $bodyNumber = $request->input('body_number');
        $stickerNumber = $request->input('sticker_number');

        DB::transaction(function () use ($application, $bodyNumber, $stickerNumber, $tricycle, $isRenewal) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            if ($tricycle) {
                // 1. Assign Body / Coding Scheme Number to Tricycle
                $tricycle->update([
                    'coding_scheme_number' => str_pad($bodyNumber, 4, '0', STR_PAD_LEFT),
                ]);

                // 2. Setup Franchise Scheme with Color Coding Scheme based on last digit of Body Number
                $lastDigit = (int)substr(trim($bodyNumber), -1);
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
                    'franchise_number'       => str_pad($bodyNumber, 4, '0', STR_PAD_LEFT),
                    'sticker_number'         => $stickerNumber,
                    'route_details'          => 'Nasugbu Poblacion & Border Routes',
                    'issue_date'             => now()->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => false, // Will become active upon TMO Final Confirmation
                    'notes'                  => "Franchise Sticker #{$stickerNumber} released by BPLO. Awaiting TMO Final Confirmation.",
                ]);
            }

            // 3. Update Application status to awaiting_tmo_confirmation
            $toStatus = 'awaiting_tmo_confirmation';
            $toStep = 5; // Step 5: TMO Final Confirmation
            $notes = "Franchise Sticker #{$stickerNumber} and Body Number #{$bodyNumber} released by BPLO. Driver instructed to return to TMO for Final Confirmation.";

            $application->update([
                'status'         => $toStatus,
                'current_step'   => $toStep,
                'sticker_number' => $stickerNumber,
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

        return redirect()->route('bplo.releasing')->with('success', "Franchise Sticker #{$stickerNumber} released! Driver instructed to return to TMO for Final Confirmation & GPS Setup.");
    }

    /**
     * List active registry tricycles.
     */
    public function registry(): Response
    {
        $registryList = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme'])
            ->where('status', 'active')
            ->get()
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->first();
                $issueDate = $scheme ? $scheme->issue_date->format('M d, Y') : $tri->created_at->format('M d, Y');
                
                return [
                    'plate_no'   => $tri->plate_number,
                    'body_no'    => $tri->body_number ?: $tri->coding_scheme_number,
                    'sticker_no' => $scheme?->sticker_number ?: 'N/A',
                    'operator'   => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'toda'       => $tri->todaZone ? $tri->todaZone->name : 'Unassigned',
                    'make'       => "{$tri->make} {$tri->model}",
                    'issue_date' => $issueDate,
                    'status'     => 'active',
                ];
            });

        $activeCount = $registryList->count();
        $revokedCount = Tricycle::where('status', 'inactive')->count();

        return Inertia::render('BPLODashboard/ActiveRegistry', [
            'registryList' => $registryList,
            'activeCount'  => $activeCount,
            'revokedCount' => $revokedCount,
        ]);
    }

    /**
     * Display details of a specific active registry tricycle.
     */
    public function registryDetails($plateNo): Response
    {
        $tricycle = Tricycle::with(['operator.todaZone', 'operator.user', 'franchiseSchemes.colorCodingScheme', 'applications.documents'])
            ->where('plate_number', $plateNo)
            ->firstOrFail();

        $operator = $tricycle->operator;
        $scheme = $tricycle->franchiseSchemes->first();
        
        // Find application with documents: check tricycle's applications first, then operator's applications
        $app = $tricycle->applications()->whereHas('documents')->latest()->first()
            ?? ($operator ? $operator->applications()->whereHas('documents')->latest()->first() : null)
            ?? $tricycle->applications()->latest()->first();

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
            'body_no'           => $tricycle->body_number ?: $tricycle->coding_scheme_number,
            'sticker_no'        => $scheme?->sticker_number ?: ($tricycle->body_number ? "STK-" . date('Y') . "-{$tricycle->body_number}" : 'STK-2026-0141'),
            'operator'          => $operator ? $operator->full_name : 'N/A',
            'first_name'        => $operator ? $operator->first_name : '',
            'last_name'         => $operator ? $operator->last_name : '',
            'contact'           => $operator ? $operator->contact_number : 'N/A',
            'email'             => $operator?->user ? $operator->user->email : ($operator ? "driver.{$operator->last_name}@trivora.ph" : 'N/A'),
            'address'           => $operator ? ($operator->address ?: 'Nasugbu, Batangas') : 'Nasugbu, Batangas',
            'barangay'          => $operator ? ($operator->barangay ?: 'Poblacion') : 'Poblacion',
            'date_of_birth'     => $operator && $operator->date_of_birth ? $operator->date_of_birth->format('M d, Y') : 'Dec 12, 1988',
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
     * Map Last Digit of Body Number to coding day.
     */
    private function getCodingDay(int $lastDigit): string
    {
        return ColorCodingRuleService::codingDayForLastDigit($lastDigit) ?? 'Monday';
    }
}
