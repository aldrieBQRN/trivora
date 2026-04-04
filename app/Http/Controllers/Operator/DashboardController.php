<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // 1. Dummy Operator Data
        $operator = [
            'name' => 'Mario Dela Cruz',
            'email' => 'mario.operator@example.com',
        ];

        // 2. Dummy Quick Stats
        $stats = [
            'total_units' => 3,
            'active_units' => 2,
            'pending_violations' => 1,
        ];

        // 3. Dummy Fleet Data (Tricycles)
        $tricycles = [
            ['id' => 1, 'body_number' => 'TMO-001', 'plate_number' => 'ABC 1234', 'status' => 'Active', 'driver' => 'Juan Perez'],
            ['id' => 2, 'body_number' => 'TMO-045', 'plate_number' => 'XYZ 9876', 'status' => 'Maintenance', 'driver' => 'Pedro Santos'],
            ['id' => 3, 'body_number' => 'TMO-088', 'plate_number' => 'QWE 4567', 'status' => 'Active', 'driver' => 'Unassigned'],
        ];

        // 4. Dummy IoT Violation Logs
        $recentViolations = [
            ['id' => 101, 'body_number' => 'TMO-045', 'violation' => 'Out of Line', 'date' => '2026-03-30', 'status' => 'Pending Review'],
            ['id' => 102, 'body_number' => 'TMO-001', 'violation' => 'Overloading', 'date' => '2026-03-28', 'status' => 'Settled'],
        ];

        // 5. Dummy Expiration Alerts
        $expiringRegistrations = [
            ['body_number' => 'TMO-088', 'expiration_date' => '2026-04-15', 'days_left' => 15],
        ];

        return Inertia::render('Operator/Dashboard', [
            'operator' => $operator,
            'stats' => $stats,
            'tricycles' => $tricycles,
            'recentViolations' => $recentViolations,
            'expiringRegistrations' => $expiringRegistrations,
        ]);
    }
}
