<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Tricycle;
use App\Models\Violation;
use App\Models\FranchiseScheme;
use App\Models\ColorCodingScheme;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the TMO map command center.
     */
    public function index()
    {
        $todayDay = now()->format('l');
        $restrictedEndings = $this->getRestrictedEndings($todayDay);

        // Fetch active tricycles
        $activeTricycles = Tricycle::with(['operator.todaZone', 'franchiseScheme.colorCodingScheme', 'locations'])
            ->where('status', 'active')
            ->get();

        // Calculate coding suspended count based on Assigned Tricycle Number (franchise_number) last digit
        $codingSuspended = 0;
        if (!empty($restrictedEndings)) {
            $codingSuspended = Tricycle::where('status', 'active')
                ->whereHas('franchiseScheme', function ($q) use ($restrictedEndings) {
                    $q->where(function ($sub) use ($restrictedEndings) {
                        foreach ($restrictedEndings as $digit) {
                            $sub->orWhere('franchise_number', 'like', "%{$digit}");
                        }
                    });
                })->count();
        }

        // Map tricycles for the enforcement map (Only tricycles with real location telemetry from mobile app)
        $tricyclesData = $activeTricycles->map(function ($tri) use ($restrictedEndings) {
            $latestLoc = $tri->locations()->latest('recorded_at')->first();
            if (!$latestLoc) {
                return null;
            }

            // Check if there is an active violation
            $hasUnresolvedViolation = $tri->violations()->where('status', 'open')->exists();

            // Check if restricted today based on Assigned Tricycle Number (body_number) last digit
            $bodyNo = $tri->body_number;
            $lastDigit = $bodyNo ? (int)substr(trim($bodyNo), -1) : null;
            $isRestrictedToday = ($lastDigit !== null) && in_array($lastDigit, $restrictedEndings);

            $status = 'compliant';
            if ($hasUnresolvedViolation) {
                $status = 'violator';
            } elseif ($isRestrictedToday) {
                $status = 'coding_no_operation';
            }

            return [
                'id'         => $tri->body_number ?: ('TRV-' . $tri->id),
                'plate'      => $tri->plate_number,
                'operator'   => $tri->operator ? $tri->operator->full_name : 'N/A',
                'toda'       => $tri->todaZone ? $tri->todaZone->name : 'Unassigned',
                'lat'        => (float)$latestLoc->latitude,
                'lng'        => (float)$latestLoc->longitude,
                'status'     => $status,
                'hasRealGPS' => true,
                'speed_kmh'  => $latestLoc->speed_kmh,
                'last_seen'  => $latestLoc->recorded_at->diffForHumans(),
            ];
        })->filter()->values()->toArray();

        $stats = [
            'active_fleet'     => Tricycle::where('status', 'active')->count(),
            'on_duty'          => Tricycle::where('status', 'active')->count(),
            'violations_today' => Violation::whereDate('detected_at', now()->toDateString())->count(),
            'coding_suspended' => $codingSuspended,
        ];

        return Inertia::render('TMODashboard/Index', [
            'initialTricycles' => $tricyclesData,
            'stats'            => $stats,
        ]);
    }

    /**
     * Display unit registry.
     */
    public function registry()
    {
        $registryList = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme'])
            ->get()
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->first();
                $restrictedDays = $scheme?->colorCodingScheme?->restricted_days ?: [];

                // 4-digit Tricycle Number Coding Scheme format (e.g., 0142, 0089)
                $rawBody = $tri->coding_scheme_number ?: $tri->body_number ?: str_pad($tri->id * 14, 4, '0', STR_PAD_LEFT);
                if (preg_match('/\d+$/', $rawBody, $matches)) {
                    $fourDigitSticker = str_pad($matches[0], 4, '0', STR_PAD_LEFT);
                } else {
                    $fourDigitSticker = str_pad($tri->id, 4, '0', STR_PAD_LEFT);
                }

                // Calculate BPLO Color Coding Scheme based on 4-digit sticker number's last digit
                $lastDigit = (int)substr($fourDigitSticker, -1);
                $codingMeta = match (true) {
                    in_array($lastDigit, [1, 2]) => ['color' => 'Red',    'hex' => '#EF4444', 'bg' => 'rgba(239,68,68,.12)',  'day' => 'Monday'],
                    in_array($lastDigit, [3, 4]) => ['color' => 'Blue',   'hex' => '#3B82F6', 'bg' => 'rgba(59,130,246,.12)', 'day' => 'Tuesday'],
                    in_array($lastDigit, [5, 6]) => ['color' => 'Yellow', 'hex' => '#D97706', 'bg' => 'rgba(245,158,11,.12)', 'day' => 'Wednesday'],
                    in_array($lastDigit, [7, 8]) => ['color' => 'Green',  'hex' => '#10B981', 'bg' => 'rgba(16,185,129,.12)', 'day' => 'Thursday'],
                    default                       => ['color' => 'White',  'hex' => '#64748B', 'bg' => 'rgba(100,116,139,.12)','day' => 'Friday'],
                };

                return [
                    'id'                    => $tri->id,
                    'unit_code'             => 'TRV-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT),
                    'iot_id'                => $tri->iot_device_id ?: ('TRV-GPS-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT)),
                    'coding_scheme_number'  => $fourDigitSticker,
                    'body_no'               => $fourDigitSticker,
                    'sticker_no'            => $fourDigitSticker,
                    'plate_no'              => $tri->plate_number,
                    'operator'              => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'contact'               => $tri->operator ? $tri->operator->contact_number : 'N/A',
                    'toda'                  => $tri->todaZone ? $tri->todaZone->name : 'Unassigned',
                    'coding_color'          => $scheme?->colorCodingScheme?->name ?: $codingMeta['color'],
                    'coding_hex'            => $codingMeta['hex'],
                    'coding_bg'             => $codingMeta['bg'],
                    'coding_day'            => $codingMeta['day'],
                    'status'                => $tri->status === 'active' ? 'active' : 'suspended',
                ];
            });

        return Inertia::render('TMODashboard/UnitRegistry', [
            'initialUnits' => $registryList,
        ]);
    }

    /**
     * Show tricycle profile details.
     */
    public function tricycleDetails($id)
    {
        $tri = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'locations', 'violations.colorCodingScheme'])
            ->where('id', $id)
            ->orWhere('iot_device_id', $id)
            ->orWhere('coding_scheme_number', $id)
            ->orWhere('plate_number', $id)
            ->first();

        if (!$tri) {
            $tri = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'locations', 'violations.colorCodingScheme'])->firstOrFail();
        }

        $lastDigit = (int)substr($tri->coding_scheme_number ?: $tri->id, -1);
        $codingDayName = match (true) {
            in_array($lastDigit, [1, 2]) => 'Monday',
            in_array($lastDigit, [3, 4]) => 'Tuesday',
            in_array($lastDigit, [5, 6]) => 'Wednesday',
            in_array($lastDigit, [7, 8]) => 'Thursday',
            default                       => 'Friday',
        };

        $scheme = $tri->franchiseSchemes->first();

        $tricycleData = [
            'id'                   => $tri->id,
            'coding_scheme_number' => $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT),
            'body_no'              => $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT),
            'plate_no'             => $tri->plate_number,
            'operator'             => $tri->operator ? $tri->operator->full_name : 'N/A',
            'contact'              => $tri->operator ? $tri->operator->contact_number : 'N/A',
            'toda'                 => $tri->todaZone ? $tri->todaZone->name : 'Unassigned',
            'coding_day'           => $codingDayName,
            'status'               => $tri->status === 'active' ? 'active' : 'suspended',
            'model'                => "{$tri->make} {$tri->model}",
            'color'                => $scheme?->colorCodingScheme?->name ?: 'N/A',
            'cityOfRegistration'   => 'Nasugbu',
            'registrationDate'     => $tri->created_at->format('F j, Y'),
        ];

        // Fetch documents linked to application
        $app = $tri->applications()->latest()->first();
        $mappedDocs = [];
        if ($app) {
            $requirementsMap = [
                'drivers_license'    => "Driver's License Back-to-back",
                'or_cr'              => "Xerox OR/CR",
                'proof_of_residence' => "Barangay Clearance",
                'toda_clearance'     => "TODA Clearance",
                'photo_id'           => "Driver's ID",
            ];
            foreach ($app->documents as $doc) {
                $mappedDocs[] = [
                    'id'     => $doc->id,
                    'name'   => $requirementsMap[$doc->document_type] ?? 'Requirement',
                    'status' => $doc->review_status === 'approved' ? 'verified' : ($doc->review_status === 'rejected' ? 'rejected' : 'pending'),
                    'date'   => $doc->updated_at->format('M d, Y'),
                ];
            }
        }

        // Fetch violations from database
        $mappedViolations = $tri->violations->map(function ($v) {
            return [
                'id'            => $v->id,
                'title'         => ucwords(str_replace('_', ' ', $v->violation_type)),
                'date'          => $v->detected_at->format('M d, Y \a\t h:i A'),
                'paymentStatus' => $v->status === 'open' ? 'unsettled' : 'settled',
                'codingDay'     => $v->day_of_week ?: 'N/A',
                'details'       => $v->notes ?: 'Coding restriction violation detected.',
            ];
        });

        // Dynamic stats
        $violationsToday = $tri->violations()->whereDate('detected_at', now()->toDateString())->count();
        $complianceScore = $tri->violations()->count() > 0 ? max(50, 100 - ($tri->violations()->count() * 10)) : 100;
        
        $metrics = [
            ['label' => 'Violations Today', 'value' => (string)$violationsToday, 'icon' => 'AlertTriangle', 'color' => 'td-metric-indigo'],
            ['label' => 'Compliance Score', 'value' => $complianceScore . '%', 'icon' => 'TrendingUp', 'color' => 'td-metric-emerald'],
            ['label' => 'Documents Verified', 'value' => count(array_filter($mappedDocs, fn($d) => $d['status'] === 'verified')) . '/' . count($mappedDocs), 'icon' => 'FileCheck', 'color' => 'td-metric-indigo'],
            ['label' => 'Total Violations', 'value' => (string)$tri->violations()->count(), 'icon' => 'CheckCircle2', 'color' => 'td-metric-emerald']
        ];

        return Inertia::render('TMODashboard/TricycleDetails', [
            'tricycleId'       => $id,
            'initialTricycle'  => $tricycleData,
            'initialDocs'      => $mappedDocs,
            'initialVios'      => $mappedViolations,
            'initialMetrics'   => $metrics,
        ]);
    }

    /**
     * Display violations records.
     */
    public function violations()
    {
        $violations = Violation::with(['tricycle.operator.todaZone'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(function ($v) {
                return [
                    'id'       => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                    'db_id'    => $v->id,
                    'date'     => $v->detected_at->toDateString(),
                    'time'     => $v->detected_at->format('h:i A'),
                    'operator' => $v->tricycle?->operator ? $v->tricycle->operator->full_name : 'N/A',
                    'plate_no' => $v->tricycle?->plate_number ?: 'N/A',
                    'toda'     => $v->tricycle?->todaZone ? $v->tricycle->todaZone->name : 'N/A',
                    'type'     => ucwords(str_replace('_', ' ', $v->violation_type)),
                    'source'   => ucfirst($v->detection_method),
                    'fine'     => (float)$v->fine_amount,
                    'status'   => $v->status === 'open' ? 'unsettled' : 'settled',
                ];
            });

        return Inertia::render('TMODashboard/Violations/Violations', [
            'initialViolations' => $violations,
        ]);
    }

    /**
     * Show detailed violation details.
     */
    public function violationDetails($id)
    {
        $v = Violation::with(['tricycle.operator.todaZone', 'locationSnapshot'])->findOrFail($id);

        $record = [
            'id'            => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'db_id'         => $v->id,
            'date'          => $v->detected_at->format('F j, Y'),
            'time'          => $v->detected_at->format('h:i A'),
            'lat'           => $v->locationSnapshot ? (float)$v->locationSnapshot->latitude : 14.0725,
            'lng'           => $v->locationSnapshot ? (float)$v->locationSnapshot->longitude : 120.6355,
            'location_desc' => $v->locationSnapshot 
                ? "Nasugbu Poblacion Zone ({$v->locationSnapshot->latitude}, {$v->locationSnapshot->longitude})" 
                : ($v->violation_type === 'route_violation' ? 'TODA Route Boundary — Border Gate' : 'Nasugbu Poblacion Area'),
            'operator'      => $v->tricycle?->operator ? $v->tricycle->operator->full_name : 'N/A',
            'toda'          => $v->tricycle?->todaZone ? $v->tricycle->todaZone->name : 'N/A',
            'plate_no'      => $v->tricycle?->plate_number ?: 'N/A',
            'type'          => ucwords(str_replace('_', ' ', $v->violation_type)),
            'source'        => ucfirst($v->detection_method),
            'fine'          => (float)$v->fine_amount,
            'status'        => $v->status === 'open' ? 'unsettled' : 'settled',
            'notes'         => $v->notes ?: 'Tracker detected movement during restricted day.',
        ];

        return Inertia::render('TMODashboard/Violations/ViolationDetails', [
            'violationId'   => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'initialRecord' => $record,
        ]);
    }

    /**
     * Show the manual violation ticket creation form.
     */
    public function createViolation(Request $request): Response
    {
        $selectedTricycleId = $request->query('tricycle_id');

        $units = Tricycle::with(['operator'])
            ->where('status', 'active')
            ->get()
            ->map(function ($tri) {
                return [
                    'id'    => $tri->id,
                    'label' => "Unit #" . ($tri->body_number ?: 'Pending') . " (Plate: {$tri->plate_number}) - " . ($tri->operator ? $tri->operator->full_name : 'N/A'),
                ];
            });

        return Inertia::render('TMODashboard/Violations/CreateViolation', [
            'units'              => $units,
            'selectedTricycleId' => $selectedTricycleId ? (int)$selectedTricycleId : null,
        ]);
    }

    /**
     * Store a manually logged violation in the database.
     */
    public function storeViolation(Request $request)
    {
        $request->validate([
            'tricycle_id'    => 'required|exists:tricycles,id',
            'violation_type' => 'required|in:color_coding,route_violation,expired_franchise,other',
            'fine_amount'    => 'required|numeric|min:0',
            'location'       => 'required|string|max:255',
            'notes'          => 'nullable|string',
        ]);

        DB::transaction(function () use ($request) {
            $tricycle = Tricycle::findOrFail($request->input('tricycle_id'));
            
            // Get active franchise scheme
            $franchise = FranchiseScheme::where('tricycle_id', $tricycle->id)
                ->where('is_active', true)
                ->first();

            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise ? $franchise->id : 1, // fallback
                'color_coding_scheme_id'  => $franchise ? $franchise->color_coding_scheme_id : 1, // fallback
                'location_snapshot_id'    => null, // manual
                'detected_by'             => auth()->id(),
                'violation_type'          => $request->input('violation_type'),
                'detected_at'             => now(),
                'day_of_week'             => now()->format('l'),
                'detection_method'        => 'manual',
                'status'                  => 'open',
                'fine_amount'             => $request->input('fine_amount'),
                'notes'                   => $request->input('location') . ' — ' . ($request->input('notes') ?: 'Manual infraction logging.'),
            ]);
        });

        return redirect()->route('tmo.violations')->with('success', 'Manual violation ticket successfully logged.');
    }

    /**
     * Helper to retrieve plate number endings for a given day.
     */
    private function getRestrictedEndings(string $day): array
    {
        return match ($day) {
            'Monday'    => [1, 2],
            'Tuesday'   => [3, 4],
            'Wednesday' => [5, 6],
            'Thursday'  => [7, 8],
            'Friday'    => [9, 0],
            default     => []
        };
    }
}
