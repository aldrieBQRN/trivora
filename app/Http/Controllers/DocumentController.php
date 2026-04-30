<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class DocumentController extends Controller
{
    /**
     * Generate a sample inspection document
     */
    public function generateInspectionPDF()
    {
        $data = [
            'application_id' => 'NSB-26-8812',
            'operator_name' => 'Juan Dela Cruz',
            'contact' => '09171234567',
            'barangay' => 'Poblacion 1',
            'vehicle' => [
                'make' => 'Kawasaki Barako 175',
                'engine_number' => 'ENG-KAW-12345',
                'chassis_number' => 'CHAS-KAW-98765',
                'plate' => 'NSB-2024-ABC',
                'toda' => 'TODA A (Poblacion)',
            ],
            'inspection_date' => now()->format('M d, Y'),
            'inspector_name' => 'Maria Santos',
            'findings' => [
                'Safety Equipment' => true,
                'Brakes and Steering' => true,
                'Lights and Reflectors' => true,
                'Tires and Suspension' => true,
                'Emissions Test' => true,
                'Driver License Valid' => true,
            ],
        ];

        return view('documents.inspection-report', compact('data'));
    }

    /**
     * Display sample document for preview
     */
    public function previewDocument()
    {
        $data = [
            'application_id' => 'NSB-26-8812',
            'operator_name' => 'Juan Dela Cruz',
            'contact' => '09171234567',
            'barangay' => 'Poblacion 1',
            'vehicle' => [
                'make' => 'Kawasaki Barako 175',
                'engine_number' => 'ENG-KAW-12345',
                'chassis_number' => 'CHAS-KAW-98765',
                'plate' => 'NSB-2024-ABC',
                'toda' => 'TODA A (Poblacion)',
            ],
            'inspection_date' => now()->format('M d, Y'),
            'inspector_name' => 'Maria Santos',
            'findings' => [
                'Safety Equipment' => true,
                'Brakes and Steering' => true,
                'Lights and Reflectors' => true,
                'Tires and Suspension' => true,
                'Emissions Test' => true,
                'Driver License Valid' => true,
            ],
        ];

        return view('documents.inspection-report-html', compact('data'));
    }

    /**
     * Preview OR/CR (Certificate of Registration) document
     */
    public function previewORCR()
    {
        $data = [
            'make' => 'Kawasaki Barako 175',
            'engine_number' => 'ENG-KAW-12345',
            'chassis_number' => 'CHAS-KAW-98765',
            'plate' => 'NSB-2024-ABC',
            'owner' => 'Juan Dela Cruz',
            'barangay' => '123 Main Street, Poblacion 1',
            'contact' => '09171234567',
        ];

        return view('documents.orcr-document', compact('data'));
    }
}
