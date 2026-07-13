<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Inspection;
use App\Models\Payment;
use App\Models\FranchiseScheme;

class MTOPController extends Controller
{
    /**
     * Display all applications for the logged in operator.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            return Inertia::render('Operator/Compliance/MTOP', [
                'applications' => [],
            ]);
        }

        $applications = Application::where('operator_id', $operator->id)
            ->with(['tricycle', 'statusHistories'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($app) {
                $phase = 'tmo-docs';
                $status = 'in-progress';
                $message = 'Undergoing document review.';

                switch ($app->status) {
                    case 'draft':
                        $phase = 'tmo-docs';
                        $status = 'in-progress';
                        $message = 'Draft application.';
                        break;
                    case 'pending_review':
                    case 'under_review':
                        $phase = 'tmo-docs';
                        $status = 'in-progress';
                        $message = 'Awaiting Traffic Management Office validation of your requirements.';
                        break;
                    case 'rejected':
                        $phase = 'tmo-docs';
                        $status = 'action-req';
                        $lastHistory = $app->statusHistories()->where('to_status', 'rejected')->latest()->first();
                        $message = $lastHistory ? $lastHistory->notes : 'Requirements rejected. Please correct files.';
                        break;
                    case 'pending_inspection':
                    case 'under_inspection':
                        $phase = 'tmo-phys';
                        $status = 'in-progress';
                        $message = 'Please bring your tricycle to the physical inspection center.';
                        break;
                    case 'failed_inspection':
                        $phase = 'tmo-phys';
                        $status = 'action-req';
                        $lastHistory = $app->statusHistories()->where('to_status', 'failed_inspection')->latest()->first();
                        $message = $lastHistory ? $lastHistory->notes : 'Physical inspection failed. Fix defects and request re-inspection.';
                        break;
                    case 'pending_payment':
                        $phase = 'cashier-pay';
                        $status = 'in-progress';
                        $message = 'Awaiting payment. Proceed to Cashier walk-in counter.';
                        break;
                    case 'paid':
                        $phase = 'bplo-release';
                        $status = 'in-progress';
                        $message = 'Awaiting BPLO final releasing and Body Number assignment.';
                        break;
                    case 'completed':
                    case 'scheme_issued':
                        $phase = 'completed';
                        $status = 'completed';
                        $message = 'Franchise issued and active.';
                        break;
                }

                return [
                    'id'      => $app->reference_number,
                    'db_id'   => $app->id,
                    'type'    => $app->application_type === 'new' ? 'New Franchise' : 'Renewal',
                    'unit'    => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
                    'date'    => $app->created_at->format('M d, Y'),
                    'status'  => $status,
                    'phase'   => $phase,
                    'message' => $message,
                ];
            });

        return Inertia::render('Operator/Compliance/MTOP', [
            'applications' => $applications,
        ]);
    }

    /**
     * Display a single application's tracking details.
     */
    public function show(Request $request, $refNo)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $app = Application::where('operator_id', $operator->id)
            ->where('reference_number', $refNo)
            ->with(['tricycle.todaZone', 'statusHistories', 'documents', 'inspections'])
            ->firstOrFail();

        // 1. Process documents mapping
        $docLabels = [
            'drivers_license'    => "Driver's License Copy",
            'or_cr'              => 'OR/CR Registration Copy',
            'proof_of_residence' => 'Barangay Clearance Certificate',
            'toda_clearance'     => 'TODA Clearance Certificate',
            'photo_id'           => "Driver's Photo ID",
            'other'              => 'Supporting Files',
        ];
        $documents = $app->documents->map(function ($doc) use ($docLabels) {
            return [
                'id'     => $doc->id,
                'name'   => $docLabels[$doc->document_type] ?? 'Document',
                'status' => $doc->review_status, // approved, pending, rejected
                'note'   => $doc->rejection_reason ?: '',
            ];
        })->toArray();

        // 2. Process inspection details mapping
        $inspections = [];
        $latestInspection = $app->inspections()->orderByDesc('attempt_number')->first();
        if ($latestInspection) {
            $checklist = [
                'safety_equipment'  => 'Safety Equipment',
                'brakes_steering'   => 'Brakes & Steering',
                'lights_reflectors' => 'Lights & Reflectors',
                'tires_suspension'  => 'Tires & Suspension',
                'emissions_test'    => 'Emissions Test',
                'license_toda_docs' => 'License & TODA Docs',
            ];

            foreach ($checklist as $col => $label) {
                $passed = (bool)$latestInspection->$col;
                $inspections[] = [
                    'id'     => $col,
                    'name'   => $label,
                    'status' => $passed ? 'approved' : 'rejected',
                    'note'   => $passed ? '' : 'Defective component identified.',
                ];
            }
        }

        // 3. Process payment mapping
        $payment = null;
        $paymentRecord = Payment::where('application_id', $app->id)->first();
        if ($paymentRecord && $paymentRecord->is_verified) {
            $payment = [
                'method' => ucwords($paymentRecord->payment_method),
                'ref'    => $paymentRecord->official_receipt_number ?: 'OR-PENDING',
                'amount' => (float)$paymentRecord->amount,
                'date'   => $paymentRecord->verified_at ? $paymentRecord->verified_at->format('M d, Y') : $paymentRecord->payment_date->format('M d, Y'),
            ];
        }

        // 4. BPLO Assigned Body mapping
        $bplo = null;
        $franchiseScheme = FranchiseScheme::where('application_id', $app->id)->first();
        if ($franchiseScheme) {
            $bplo = [
                'assignedBody' => $franchiseScheme->franchise_number,
            ];
        }

        // Determine current phase and state
        $phase = 'tmo-docs';
        $status = 'in-progress';
        switch ($app->status) {
            case 'rejected':
                $phase = 'tmo-docs';
                $status = 'action-req';
                break;
            case 'pending_inspection':
            case 'under_inspection':
                $phase = 'tmo-phys';
                $status = 'in-progress';
                break;
            case 'failed_inspection':
                $phase = 'tmo-phys';
                $status = 'action-req';
                break;
            case 'pending_payment':
                $phase = 'cashier-pay';
                $status = 'in-progress';
                break;
            case 'paid':
                $phase = 'bplo-release';
                $status = 'in-progress';
                break;
            case 'completed':
            case 'scheme_issued':
                $phase = 'completed';
                $status = 'completed';
                break;
        }

        $appData = [
            'id'           => $app->reference_number,
            'type'         => $app->application_type === 'new' ? 'New Franchise' : 'Renewal',
            'status'       => $status,
            'phase'        => $phase,
            'date'         => $app->created_at->format('F d, Y'),
            'toda'         => $app->tricycle?->todaZone ? $app->tricycle->todaZone->name : 'N/A',
            'make'         => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
            'plate'        => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
            'engine'       => $app->tricycle ? $app->tricycle->engine_number : 'N/A',
            'chassis'      => $app->tricycle ? $app->tricycle->chassis_number : 'N/A',
            'operatorName' => $operator->full_name,
            'documents'    => $documents,
            'inspections'  => $inspections,
            'payment'      => $payment,
            'payment_due'  => $paymentRecord ? (float)$paymentRecord->amount : 1500.00,
            'bplo'         => $bplo,
        ];

        return Inertia::render('Operator/Compliance/MTOPDetails', [
            'application' => $appData,
        ]);
    }
}
