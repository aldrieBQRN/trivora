<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        // Realistic starting points in Nasugbu.
        // Distributed among Brgy. 2, Brgy. 10, Brgy. 11. Exactly ONE tricycle assigned to Bucana.
        $tricycles = [
            // 2 VIOLATORS (Red Pin - Moving)
            ['id' => 'TRV-992', 'plate' => '8812', 'operator' => 'Juan Dela Cruz', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0730, 'lng' => 120.6350, 'status' => 'violator'],
            ['id' => 'TRV-810', 'plate' => '4491', 'operator' => 'Ricardo Dalisay', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0745, 'lng' => 120.6380, 'status' => 'violator'],

            // 1 CODING (Orange Pin)
            ['id' => 'TRV-445', 'plate' => '1102', 'operator' => 'Arnaldo Baquiran', 'toda' => 'TODA C (Brgy. 11)', 'lat' => 14.0710, 'lng' => 120.6320, 'status' => 'coding_no_operation'],

            // COMPLIANT (Green Pins)
            // Exactly ONE tricycle in Bucana:
            ['id' => 'TRV-106', 'plate' => '2210', 'operator' => 'Ana Reyes', 'toda' => 'TODA D (Bucana)', 'lat' => 14.0720, 'lng' => 120.6330, 'status' => 'compliant'],

            // The rest are Brgy 2, 10, and 11
            ['id' => 'TRV-104', 'plate' => '9933', 'operator' => 'Maria Santos', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0690, 'lng' => 120.6300, 'status' => 'compliant'],
            ['id' => 'TRV-105', 'plate' => '5541', 'operator' => 'Pedro Penduko', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0760, 'lng' => 120.6400, 'status' => 'compliant'],
            ['id' => 'TRV-107', 'plate' => '3344', 'operator' => 'Carlos Mateo', 'toda' => 'TODA C (Brgy. 11)', 'lat' => 14.0750, 'lng' => 120.6290, 'status' => 'compliant'],
            ['id' => 'TRV-108', 'plate' => '7788', 'operator' => 'Diana Cruz', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0700, 'lng' => 120.6370, 'status' => 'compliant'],
            ['id' => 'TRV-109', 'plate' => '1234', 'operator' => 'Julio Valderama', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0680, 'lng' => 120.6280, 'status' => 'compliant'],
            ['id' => 'TRV-110', 'plate' => '5678', 'operator' => 'Lito Lapid', 'toda' => 'TODA C (Brgy. 11)', 'lat' => 14.0780, 'lng' => 120.6310, 'status' => 'compliant'],
            ['id' => 'TRV-111', 'plate' => '9012', 'operator' => 'Susan Roces', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0650, 'lng' => 120.6360, 'status' => 'compliant'],
            ['id' => 'TRV-112', 'plate' => '3456', 'operator' => 'Fernando Poe', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0790, 'lng' => 120.6390, 'status' => 'compliant'],
            ['id' => 'TRV-113', 'plate' => '7890', 'operator' => 'Vilma Santos', 'toda' => 'TODA C (Brgy. 11)', 'lat' => 14.0670, 'lng' => 120.6340, 'status' => 'compliant'],
            ['id' => 'TRV-114', 'plate' => '2345', 'operator' => 'Nora Aunor', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0715, 'lng' => 120.6260, 'status' => 'compliant'],
            ['id' => 'TRV-115', 'plate' => '6789', 'operator' => 'Coco Martin', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0735, 'lng' => 120.6420, 'status' => 'compliant'],
            ['id' => 'TRV-116', 'plate' => '0123', 'operator' => 'Vice Ganda', 'toda' => 'TODA C (Brgy. 11)', 'lat' => 14.0665, 'lng' => 120.6315, 'status' => 'compliant'],
            ['id' => 'TRV-117', 'plate' => '4567', 'operator' => 'Anne Curtis', 'toda' => 'TODA A (Brgy. 2)', 'lat' => 14.0755, 'lng' => 120.6335, 'status' => 'compliant'],
            ['id' => 'TRV-118', 'plate' => '8901', 'operator' => 'Sarah Geronimo', 'toda' => 'TODA B (Brgy. 10)', 'lat' => 14.0695, 'lng' => 120.6385, 'status' => 'compliant'],
        ];

        $stats = [
            'active_fleet' => 842,
            'on_duty' => 615,
            'violations_today' => 12,
            'coding_suspended' => 227
        ];

        return Inertia::render('TMODashboard/Index', [
            'initialTricycles' => $tricycles,
            'stats' => $stats
        ]);
    }
}
