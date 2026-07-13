<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Models\Tricycle;
use App\Models\Violation;
use App\Models\FranchiseScheme;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $operatorModel = $user->operator;

        if (!$operatorModel) {
            return Inertia::render('Operator/Dashboard', [
                'operator' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'stats' => [
                    'total_units' => 0,
                    'active_units' => 0,
                    'pending_violations' => 0,
                ],
                'tricycles' => [],
                'recentViolations' => [],
                'expiringRegistrations' => [],
            ]);
        }

        // 1. Operator Details
        $operator = [
            'name' => $operatorModel->full_name,
            'email' => $user->email,
        ];

        // 2. Load operator tricycles
        $operatorTricycles = Tricycle::where('operator_id', $operatorModel->id)
            ->with(['franchiseScheme'])
            ->get();

        $triIds = $operatorTricycles->pluck('id');

        // 3. Quick Stats
        $totalUnits = $operatorTricycles->count();
        $activeUnits = $operatorTricycles->where('status', 'active')->count();
        $pendingViolations = Violation::whereIn('tricycle_id', $triIds)
            ->where('status', 'open')
            ->count();

        $stats = [
            'total_units' => $totalUnits,
            'active_units' => $activeUnits,
            'pending_violations' => $pendingViolations,
        ];

        // 4. Fleet Data (Tricycles)
        $tricycles = $operatorTricycles->map(function ($tri) {
            return [
                'id'           => $tri->id,
                'body_number'  => $tri->body_number ?: 'N/A',
                'plate_number' => $tri->plate_number,
                'status'       => ucfirst($tri->status),
                'driver'       => 'Self / Unassigned',
            ];
        });

        // 5. IoT Violation Logs
        $recentViolations = Violation::whereIn('tricycle_id', $triIds)
            ->with('tricycle')
            ->orderByDesc('detected_at')
            ->take(5)
            ->get()
            ->map(function ($v) {
                return [
                    'id'          => $v->id,
                    'body_number' => $v->tricycle?->body_number ?: 'N/A',
                    'violation'   => ucwords(str_replace('_', ' ', $v->violation_type)),
                    'date'        => $v->detected_at->toDateString(),
                    'status'      => $v->status === 'open' ? 'Pending Review' : 'Settled',
                ];
            });

        // 6. Expiration Alerts
        $expiringRegistrations = FranchiseScheme::whereIn('tricycle_id', $triIds)
            ->where('is_active', true)
            ->get()
            ->map(function ($scheme) {
                $daysLeft = now()->diffInDays($scheme->expiry_date, false);
                return [
                    'body_number'     => $scheme->franchise_number,
                    'expiration_date' => $scheme->expiry_date->toDateString(),
                    'days_left'       => $daysLeft,
                ];
            });

        return Inertia::render('Operator/Dashboard', [
            'operator' => $operator,
            'stats' => $stats,
            'tricycles' => $tricycles,
            'recentViolations' => $recentViolations,
            'expiringRegistrations' => $expiringRegistrations,
        ]);
    }
}
