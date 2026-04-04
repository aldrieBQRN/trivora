<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        // Realistic starting points in Nasugbu, Batangas
        $tricycles = [
            ['id' => 'TRI-101', 'operator' => 'Juan Dela Cruz', 'toda' => 'A', 'lat' => 14.0730, 'lng' => 120.6350, 'status' => 'compliant'],
            ['id' => 'TRI-102', 'operator' => 'Ricardo Dalisay', 'toda' => 'B', 'lat' => 14.0745, 'lng' => 120.6380, 'status' => 'violation_coding'],
            ['id' => 'TRI-103', 'operator' => 'Arnaldo Baquiran', 'toda' => 'C', 'lat' => 14.0710, 'lng' => 120.6320, 'status' => 'compliant'],
            ['id' => 'TRI-104', 'operator' => 'Maria Santos', 'toda' => 'D', 'lat' => 14.0690, 'lng' => 120.6300, 'status' => 'compliant'],
            ['id' => 'TRI-105', 'operator' => 'Pedro Penduko', 'toda' => 'A', 'lat' => 14.0760, 'lng' => 120.6400, 'status' => 'violation_coding'],
        ];

        return Inertia::render('TMODashboard/Index', [
            'tricycles' => $tricycles
        ]);
    }
}
