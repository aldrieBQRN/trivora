<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\FareConfiguration;
use App\Services\AuditService;
use App\Services\FareService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FareManagementController extends Controller
{
    /**
     * Display the Fare Management dashboard with active fare and complete history.
     */
    public function index(Request $request): Response
    {
        $now = now();
        $activeConfig = FareService::getActiveFare();

        $allConfigurations = FareConfiguration::with('creator')
            ->orderBy('effective_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $fareHistory = $allConfigurations->map(function (FareConfiguration $item) use ($activeConfig, $now) {
            $effectiveDateTime = $item->effective_date;
            $isActive = $activeConfig->id && $activeConfig->id === $item->id;
            $isScheduled = $item->is_active && $effectiveDateTime && $effectiveDateTime->gt($now) && !$isActive;

            if ($isActive) {
                $status = 'active';
                $statusLabel = 'Active';
            } elseif ($isScheduled) {
                $status = 'scheduled';
                $statusLabel = 'Scheduled';
            } else {
                $status = 'historical';
                $statusLabel = 'Historical';
            }

            return [
                'id' => $item->id,
                'base_fare' => (float) $item->base_fare,
                'base_fare_per_passenger' => (float) $item->base_fare_per_passenger,
                'included_distance_km' => (float) $item->included_distance_km,
                'rate_per_km' => (float) $item->rate_per_km,
                'effective_date' => $effectiveDateTime ? $effectiveDateTime->format('Y-m-d H:i') : '',
                'effective_date_label' => $effectiveDateTime ? $effectiveDateTime->format('M d, Y') : 'N/A',
                'effective_time_label' => $effectiveDateTime ? $effectiveDateTime->format('g:i A') : '',
                'effective_datetime_label' => $effectiveDateTime ? $effectiveDateTime->format('M d, Y • g:i A') : 'N/A',
                'status' => $status,
                'status_label' => $statusLabel,
                'created_at_label' => $item->created_at ? $item->created_at->format('M d, Y • g:i A') : 'N/A',
                'created_by' => $item->creator?->name ?? 'System Default',
            ];
        });

        $effectiveDate = $activeConfig->effective_date;
        $currentFare = [
            'id' => $activeConfig->id,
            'base_fare' => (float) $activeConfig->base_fare,
            'base_fare_per_passenger' => (float) $activeConfig->base_fare_per_passenger,
            'included_distance_km' => (float) $activeConfig->included_distance_km,
            'rate_per_km' => (float) $activeConfig->rate_per_km,
            'effective_date_label' => $effectiveDate ? $effectiveDate->format('M d, Y') : 'Jan 01, 2026',
            'effective_time_label' => $effectiveDate ? $effectiveDate->format('g:i A') : '12:00 AM',
            'effective_datetime_label' => $effectiveDate ? $effectiveDate->format('M d, Y • g:i A') : 'Jan 01, 2026 • 12:00 AM',
            'created_at_label' => $activeConfig->created_at ? $activeConfig->created_at->format('M d, Y • g:i A') : 'N/A',
            'status' => 'active',
            'status_label' => 'Active',
        ];

        return Inertia::render('TMODashboard/FareManagement', [
            'currentFare' => $currentFare,
            'fareHistory' => $fareHistory,
        ]);
    }

    /**
     * Store a new fare configuration in history.
     */
    public function store(Request $request): RedirectResponse
    {
        // Enforce TMO / Admin authorization
        abort_unless(
            in_array($request->user()?->role, ['tmo_personnel', 'admin'], true),
            403,
            'Only authorized TMO personnel can create fare configurations.'
        );

        $validated = $request->validate([
            'base_fare' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            'base_fare_per_passenger' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            'included_distance_km' => ['required', 'numeric', 'min:0', 'max:999.99'],
            'rate_per_km' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            'effective_date' => [
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    if (!$value) {
                        return;
                    }
                    $targetDate = Carbon::parse($value);

                    // Prevent duplicate effective date times
                    if (FareConfiguration::where('effective_date', $targetDate)->exists()) {
                        $fail('A fare configuration with this effective date and time already exists.');
                        return;
                    }

                    // Prevent backdating before the active fare configuration
                    $active = FareConfiguration::activeAsOf(now());
                    if ($active && $active->effective_date) {
                        if ($targetDate->lt($active->effective_date)) {
                            $fail('The effective date cannot be earlier than the current active fare configuration.');
                        }
                    }
                },
            ],
        ], [
            'base_fare.required' => 'Base fare is required.',
            'base_fare.min' => 'Base fare cannot be negative.',
            'base_fare_per_passenger.required' => '2+ passenger rate is required.',
            'base_fare_per_passenger.min' => '2+ passenger rate cannot be negative.',
            'included_distance_km.required' => 'Included distance is required.',
            'included_distance_km.min' => 'Included distance cannot be negative.',
            'rate_per_km.required' => 'Additional distance rate is required.',
            'rate_per_km.min' => 'Additional distance rate cannot be negative.',
            'effective_date.required' => 'Effective date and time is required.',
            'effective_date.date' => 'Please provide a valid effective date and time.',
        ]);

        $targetDate = Carbon::parse($validated['effective_date']);
        $previousFare = FareService::getActiveFare();

        DB::transaction(function () use ($validated, $targetDate, $request, $previousFare) {
            $newFare = FareConfiguration::create([
                'base_fare' => $validated['base_fare'],
                'base_fare_per_passenger' => $validated['base_fare_per_passenger'],
                'included_distance_km' => $validated['included_distance_km'],
                'rate_per_km' => $validated['rate_per_km'],
                'effective_date' => $targetDate,
                'is_active' => true,
                'created_by' => $request->user()?->id,
            ]);

            AuditService::log(
                module: 'fare',
                action: 'fare.updated',
                record: $newFare,
                description: "Updated municipal tricycle fare rates (Base: ₱{$newFare->base_fare}, +₱{$newFare->rate_per_km}/km).",
                oldValues: [
                    'base_fare'               => (float) $previousFare->base_fare,
                    'base_fare_per_passenger' => (float) $previousFare->base_fare_per_passenger,
                    'included_distance_km'    => (float) $previousFare->included_distance_km,
                    'rate_per_km'             => (float) $previousFare->rate_per_km,
                ],
                newValues: [
                    'base_fare'               => (float) $newFare->base_fare,
                    'base_fare_per_passenger' => (float) $newFare->base_fare_per_passenger,
                    'included_distance_km'    => (float) $newFare->included_distance_km,
                    'rate_per_km'             => (float) $newFare->rate_per_km,
                ],
                targetReference: 'Fare #' . $newFare->id
            );
        });

        return redirect()->route('tmo.fares')
            ->with('success', 'New fare rates saved successfully.');
    }
}
