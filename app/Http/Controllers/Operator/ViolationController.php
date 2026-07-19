<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Violation;
use App\Models\Tricycle;

class ViolationController extends Controller
{
    /**
     * Display operator violations.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            return Inertia::render('Operator/Violations/Violations', [
                'violations' => [],
            ]);
        }

        $triIds = Tricycle::where('operator_id', $operator->id)->pluck('id');

        $violations = Violation::whereIn('tricycle_id', $triIds)
            ->with(['tricycle.franchiseScheme.colorCodingScheme', 'locationSnapshot'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(function ($v) {
                $location = 'Nasugbu Poblacion Area';
                if ($v->locationSnapshot) {
                    $location = "Nasugbu Poblacion Zone ({$v->locationSnapshot->latitude}, {$v->locationSnapshot->longitude})";
                } elseif ($v->violation_type === 'route_violation') {
                    $location = 'TODA Route Boundary — Border Gate';
                }

                return [
                    'id'         => 'VIO-2026-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                    'db_id'      => $v->id,
                    'type'       => ucwords(str_replace('_', ' ', $v->violation_type)),
                    'isIot'      => $v->detection_method === 'automated',
                    'date'       => $v->detected_at->format('M d, Y'),
                    'time'       => $v->detected_at->format('h:i A'),
                    'location'   => $location,
                    'notes'      => $v->notes,
                    'unit'       => $v->tricycle?->body_number ?: 'Pending',
                    'colorCode'  => $v->tricycle?->franchiseScheme?->colorCodingScheme ? $v->tricycle->franchiseScheme->colorCodingScheme->name : 'N/A',
                    'colorHex'   => $v->tricycle?->franchiseScheme?->colorCodingScheme ? $v->tricycle->franchiseScheme->colorCodingScheme->color_hex : '#94A3B8',
                    'fine'       => (float)$v->fine_amount,
                    'status'     => $v->status === 'open' ? 'unpaid' : 'paid',
                ];
            });

        return Inertia::render('Operator/Violations/Violations', [
            'violations' => $violations,
        ]);
    }

    /**
     * Show settlement page for a violation.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $v = Violation::where('id', $id)
            ->with(['tricycle.franchiseScheme.colorCodingScheme', 'locationSnapshot'])
            ->firstOrFail();

        $location = 'Nasugbu Poblacion Area';
        if ($v->locationSnapshot) {
            $location = "Nasugbu Poblacion Zone ({$v->locationSnapshot->latitude}, {$v->locationSnapshot->longitude})";
        } elseif ($v->violation_type === 'route_violation') {
            $location = 'TODA Route Boundary — Border Gate';
        }

        $violationData = [
            'id'            => 'VIO-2026-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'db_id'         => $v->id,
            'type'          => ucwords(str_replace('_', ' ', $v->violation_type)),
            'date'          => $v->detected_at->format('M d, Y'),
            'time'          => $v->detected_at->format('h:i A'),
            'location'      => $location,
            'notes'         => $v->notes,
            'unit'          => $v->tricycle?->body_number ?: 'Pending',
            'fine'          => (float)$v->fine_amount,
            'processingFee' => 15.00,
        ];

        return Inertia::render('Operator/Violations/SettleViolation', [
            'violation' => $violationData,
        ]);
    }
}
