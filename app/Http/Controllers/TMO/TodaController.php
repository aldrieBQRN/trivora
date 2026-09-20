<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\TodaZone;
use App\Models\Tricycle;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodaController extends Controller
{
    /**
     * Display a listing of all TODAs with search, status filtering, and statistics.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status', 'all');

        $query = TodaZone::withCount(['tricycles', 'operators'])->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('barangay', 'like', "%{$search}%")
                  ->orWhere('terminal_name', 'like', "%{$search}%")
                  ->orWhere('president_name', 'like', "%{$search}%");
            });
        }

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        } elseif ($status === 'configured') {
            $query->whereNotNull('latitude')->whereNotNull('longitude');
        } elseif ($status === 'unconfigured') {
            $query->where(function ($q) {
                $q->whereNull('latitude')->orWhereNull('longitude');
            });
        }

        $todas = $query->get()->map(function ($tz) {
            $isConfigured = $tz->latitude !== null && $tz->longitude !== null;
            return [
                'id'                  => $tz->id,
                'name'                => $tz->name,
                'code'                => $tz->code,
                'barangay'            => $tz->barangay,
                'terminal_name'       => $tz->terminal_name,
                'address'             => $tz->address,
                'latitude'            => $tz->latitude,
                'longitude'           => $tz->longitude,
                'is_configured'       => $isConfigured,
                'president_name'      => $tz->president_name,
                'contact_number'      => $tz->contact_number,
                'description'         => $tz->description,
                'is_active'           => (bool) $tz->is_active,
                'tricycles_count'     => (int) $tz->tricycles_count,
                'operators_count'     => (int) $tz->operators_count,
                'created_at'          => $tz->created_at?->format('M d, Y'),
            ];
        });

        $allZones = TodaZone::all();
        $stats = [
            'total_todas'          => $allZones->count(),
            'active_todas'         => $allZones->where('is_active', true)->count(),
            'assigned_tricycles'   => Tricycle::whereNotNull('toda_zone_id')->count(),
            'configured_locations' => $allZones->whereNotNull('latitude')->whereNotNull('longitude')->count(),
        ];

        return Inertia::render('TMODashboard/Toda/Index', [
            'todas'     => $todas,
            'filters'   => [
                'search' => $search,
                'status' => $status,
            ],
            'stats'     => $stats,
            'next_code' => TodaZone::generateNextCode(),
        ]);
    }

    /**
     * Display the specified TODA along with its assigned tricycles and map terminal.
     */
    public function show(int $id): Response
    {
        $toda = TodaZone::withCount(['tricycles', 'operators'])->findOrFail($id);

        $assignedTricycles = $toda->tricycles()
            ->with(['operator', 'franchiseScheme.colorCodingScheme'])
            ->orderBy('plate_number')
            ->get()
            ->map(function ($tri) {
                return [
                    'id'            => $tri->id,
                    'body_number'   => $tri->coding_scheme_number ?: $tri->body_number ?: 'N/A',
                    'plate_number'  => $tri->plate_number,
                    'operator_name' => $tri->operator?->full_name ?: 'Unassigned',
                    'contact_number'=> $tri->operator?->contact_number ?: 'N/A',
                    'status'        => $tri->status,
                    'make_model'    => trim(($tri->make ?: '') . ' ' . ($tri->model ?: '')),
                    'color_scheme'  => $tri->franchiseScheme?->colorCodingScheme?->name,
                ];
            });

        return Inertia::render('TMODashboard/Toda/Details', [
            'toda' => [
                'id'              => $toda->id,
                'name'            => $toda->name,
                'code'            => $toda->code,
                'barangay'        => $toda->barangay,
                'terminal_name'   => $toda->terminal_name,
                'address'         => $toda->address,
                'latitude'        => $toda->latitude,
                'longitude'       => $toda->longitude,
                'is_configured'   => $toda->latitude !== null && $toda->longitude !== null,
                'president_name'  => $toda->president_name,
                'contact_number'  => $toda->contact_number,
                'description'     => $toda->description,
                'is_active'       => (bool) $toda->is_active,
                'tricycles_count' => (int) $toda->tricycles_count,
                'operators_count' => (int) $toda->operators_count,
                'created_at'      => $toda->created_at?->format('F j, Y'),
            ],
            'assignedTricycles' => $assignedTricycles,
        ]);
    }

    /**
     * Store a newly created TODA.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'code'           => 'nullable|string|max:20|unique:toda_zones,code',
            'barangay'       => 'required|string|max:100',
            'terminal_name'  => 'nullable|string|max:150',
            'address'        => 'nullable|string|max:255',
            'latitude'       => 'nullable|numeric|between:-90,90',
            'longitude'      => 'nullable|numeric|between:-180,180',
            'president_name' => 'nullable|string|max:150',
            'contact_number' => 'nullable|string|max:30',
            'description'    => 'nullable|string|max:1000',
            'is_active'      => 'boolean',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = TodaZone::generateNextCode();
        }

        $toda = TodaZone::create($validated);

        return redirect()->route('tmo.toda')->with('success', "TODA '{$toda->name}' ({$toda->code}) created successfully.");
    }

    /**
     * Update the specified TODA.
     */
    public function update(Request $request, int $id)
    {
        $toda = TodaZone::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'code'           => 'nullable|string|max:20|unique:toda_zones,code,' . $id,
            'barangay'       => 'required|string|max:100',
            'terminal_name'  => 'nullable|string|max:150',
            'address'        => 'nullable|string|max:255',
            'latitude'       => 'nullable|numeric|between:-90,90',
            'longitude'      => 'nullable|numeric|between:-180,180',
            'president_name' => 'nullable|string|max:150',
            'contact_number' => 'nullable|string|max:30',
            'description'    => 'nullable|string|max:1000',
            'is_active'      => 'boolean',
        ]);

        // TODA code is system-generated and immutable unless explicitly supplied
        if (empty($validated['code'])) {
            unset($validated['code']);
        }

        $toda->update($validated);

        return back()->with('success', "TODA '{$toda->name}' updated successfully.");
    }

    /**
     * Toggle active/inactive status of the specified TODA.
     */
    public function toggleStatus(int $id)
    {
        $toda = TodaZone::findOrFail($id);
        $toda->update(['is_active' => !$toda->is_active]);

        $statusLabel = $toda->is_active ? 'activated' : 'deactivated';
        return back()->with('success', "TODA '{$toda->name}' has been {$statusLabel}.");
    }
}
