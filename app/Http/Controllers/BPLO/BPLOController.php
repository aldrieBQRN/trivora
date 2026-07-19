<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        $pendingReleasingCount = Application::where('status', 'paid')->count();
        $totalRegistriesCount = Tricycle::count();

        // TODA distribution stats
        $todaStats = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->select('toda_zones.name', 'toda_zones.code', DB::raw('count(tricycles.id) as unit_count'))
            ->groupBy('toda_zones.id', 'toda_zones.name', 'toda_zones.code')
            ->get();

        return Inertia::render('BPLODashboard/Index', [
            'stats' => [
                'activeFranchisesCount' => $activeFranchisesCount,
                'pendingReleasingCount' => $pendingReleasingCount,
                'totalRegistriesCount'  => $totalRegistriesCount,
            ],
            'todaStats' => $todaStats,
        ]);
    }

    /**
     * Display BPLO releasing queue.
     */
    public function releasingQueue(): Response
    {
        // Applications that are Paid and ready for releasing (Step 5)
        $applications = Application::with(['operator.todaZone', 'tricycle'])
            ->where('status', 'paid')
            ->get()
            ->map(function ($app) {
                return [
                    'id'            => $app->id,
                    'reference'     => $app->reference_number,
                    'operator'      => $app->operator ? $app->operator->full_name : 'N/A',
                    'toda'          => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
                    'make'          => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
                    'tmo_passed_at' => $app->updated_at->diffForHumans(),
                ];
            });

        $pendingCount = $applications->count();
        
        // Count issued today (applications completed / scheme_issued today)
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
     * Show release form for final plate/body number and tracker assignment.
     */
    public function showReleaseForm(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle']);

        // Auto-suggest next body number (max franchise_number + 1, ignoring seeded hyphenated values)
        $maxFranchise = FranchiseScheme::where('franchise_number', 'not like', '%-%')->max('franchise_number');
        $maxBodyNo = 0;
        if ($maxFranchise) {
            preg_match('/\d+$/', $maxFranchise, $matches);
            $maxBodyNo = isset($matches[0]) ? (int)$matches[0] : 0;
        }
        if ($maxBodyNo === 0) {
            $maxBodyNo = 841; // Default starting count matching mockup
        }
        $suggestedBodyNo = str_pad($maxBodyNo + 1, 4, '0', STR_PAD_LEFT);

        $appData = [
            'id'                => $application->id,
            'reference'         => $application->reference_number,
            'operator'          => $application->operator ? $application->operator->full_name : 'N/A',
            'toda'              => ($application->operator && $application->operator->todaZone) ? $application->operator->todaZone->name : 'Unassigned',
            'make'              => $application->tricycle ? "{$application->tricycle->make} {$application->tricycle->model}" : 'N/A',
            'engine_number'     => $application->tricycle ? $application->tricycle->engine_number : 'N/A',
            'chassis_number'    => $application->tricycle ? $application->tricycle->chassis_number : 'N/A',
            'suggested_body_no' => $suggestedBodyNo,
        ];

        return Inertia::render('BPLODashboard/IssueBodyNumber', [
            'application' => $appData,
        ]);
    }

    /**
     * Finalize registration, link tracker, and activate franchise.
     */
    public function release(Request $request, Application $application): RedirectResponse
    {
        $request->validate([
            'body_number' => 'required|string|max:20|unique:franchise_schemes,franchise_number',
            'tracker_id'  => 'required|string|max:50',
        ]);

        $bodyNumber = $request->input('body_number');
        $trackerId = $request->input('tracker_id');

        DB::transaction(function () use ($application, $bodyNumber, $trackerId) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            $tricycle = $application->tricycle;

            if ($tricycle) {
                // 1. Update Tricycle status to active
                $tricycle->update([
                    'status' => 'active',
                ]);

                // 2. Pair GPS Tracker
                TricycleLocation::updateOrCreate(
                    ['tricycle_id' => $tricycle->id],
                    [
                        'latitude'     => 14.0725, // Default Nasugbu coordinates
                        'longitude'    => 120.6355,
                        'recorded_at'  => now(),
                        'source'       => 'gps_device',
                    ]
                );

                // 3. Setup Franchise Scheme (Default Coding color scheme based on Assigned Tricycle Number last digit)
                $lastDigit = (int)substr(trim($bodyNumber), -1);
                // Map last digit of Assigned Tricycle Number to standard color coding scheme day
                $codingDay = $this->getCodingDay($lastDigit);
                $scheme = ColorCodingScheme::whereJsonContains('restricted_days', $codingDay)->first();
                $schemeId = $scheme ? $scheme->id : ColorCodingScheme::first()->id;

                FranchiseScheme::create([
                    'application_id'         => $application->id,
                    'tricycle_id'            => $tricycle->id,
                    'color_coding_scheme_id' => $schemeId,
                    'issued_by'              => Auth::id(),
                    'franchise_number'       => $bodyNumber,
                    'route_details'          => 'Nasugbu Poblacion & Border Routes',
                    'issue_date'             => now()->toDateString(),
                    'expiry_date'            => now()->addYear()->toDateString(),
                    'is_active'              => true,
                    'notes'                  => "Smart GPS Tracker Linked: {$trackerId}.",
                ]);
            }

            // 4. Update Application status to completed
            $toStatus = 'completed';
            $toStep = 5;
            $notes = "Franchise released. Assigned Body No: {$bodyNumber}, Tracker ID: {$trackerId}.";

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

        return redirect()->route('bplo.releasing')->with('success', "Franchise successfully released. Body Number {$bodyNumber} is now active.");
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
                    'body_no'    => $tri->body_number,
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
        $tricycle = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'applications.documents'])
            ->where('plate_number', $plateNo)
            ->firstOrFail();

        $operator = $tricycle->operator;
        $scheme = $tricycle->franchiseSchemes->first();
        
        // Load documents from application if any
        $app = $tricycle->applications->sortByDesc('created_at')->first();
        $requirements = [];
        if ($app) {
            $requirements = $app->documents->map(function ($doc) {
                $labelsMap = [
                    'drivers_license'    => "Driver's License Back-to-back",
                    'or_cr'              => "Xerox OR/CR",
                    'proof_of_residence' => "Barangay Clearance",
                    'toda_clearance'     => "TODA Clearance",
                    'photo_id'           => "Driver's ID",
                ];
                return [
                    'name'        => $labelsMap[$doc->document_type] ?? 'Other Requirement',
                    'preview_url' => $doc->file_path ? "/storage/{$doc->file_path}" : '/sample-inspection-document.html',
                ];
            });
        }

        $registry = [
            'plate_no'    => $tricycle->plate_number,
            'body_no'     => $tricycle->body_number,
            'operator'    => $operator ? $operator->full_name : 'N/A',
            'contact'     => $operator ? $operator->contact_number : 'N/A',
            'toda'        => $tricycle->todaZone ? $tricycle->todaZone->name : 'Unassigned',
            'make'        => "{$tricycle->make} {$tricycle->model}",
            'engine_number'  => $tricycle->engine_number,
            'chassis_number' => $tricycle->chassis_number,
            'issue_date'  => $scheme ? $scheme->issue_date->format('F j, Y') : $tricycle->created_at->format('F j, Y'),
            'coding_day'  => $scheme ? ($scheme->colorCodingScheme ? $scheme->colorCodingScheme->coding_day : 'None') : 'None',
            'status'      => $tricycle->status,
            'requirements'=> $requirements,
        ];

        return Inertia::render('BPLODashboard/RegistryDetails', [
            'registry' => $registry,
        ]);
    }

    /**
     * Map Last Digit of Plate to coding day.
     */
    private function getCodingDay(int $lastDigit): string
    {
        return match ($lastDigit) {
            1, 2 => 'Monday',
            3, 4 => 'Tuesday',
            5, 6 => 'Wednesday',
            7, 8 => 'Thursday',
            9, 0 => 'Friday',
            default => 'Monday',
        };
    }
}
