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
     * Show the wizard for filing a new application or renewing an existing franchise.
     */
    public function create(Request $request)
    {
        $user = $request->user();
        $operator = $user ? $user->operator : null;
        $type = $request->query('type', 'new');
        $unitId = $request->query('unit_id');

        $tricycleData = null;

        if ($unitId && $operator) {
            $tri = \App\Models\Tricycle::where('id', $unitId)
                ->where('operator_id', $operator->id)
                ->with('todaZone')
                ->first();

            if ($tri) {
                $tricycleData = [
                    'id'             => $tri->id,
                    'plate_number'   => $tri->plate_number,
                    'engine_number'  => $tri->engine_number,
                    'chassis_number' => $tri->chassis_number,
                    'make'           => $tri->make,
                    'model'          => $tri->model,
                    'make_model'     => "{$tri->make} {$tri->model}",
                    'toda'           => $tri->todaZone ? "Zone {$tri->todaZone->code} ({$tri->todaZone->name})" : 'A (Poblacion)',
                ];
            }
        }

        return Inertia::render('Operator/Compliance/MTOPWizard', [
            'applicationType' => $type,
            'tricycleUnit'    => $tricycleData,
        ]);
    }

    /**
     * Store a new or renewal MTOP application.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $operator = $user ? $user->operator : null;

        if (!$operator) {
            return redirect()->back()->withErrors(['operator' => 'No operator profile found.']);
        }

        $appType = $request->input('application_type', 'new');
        $unitId  = $request->input('unit_id');

        // For a renewal, resolve and authorize the tricycle, and enforce the SAME server-side
        // eligibility rule the tracker UI uses to decide whether to show the "Renew" button —
        // a direct POST must not be able to bypass it. This must happen BEFORE the transaction
        // below, so a rejected request creates no Application/Payment/Inspection/Documents at all.
        if ($appType === 'renewal') {
            if (!$unitId) {
                return redirect()->back()->withErrors(['unit_id' => 'Select the tricycle unit you want to renew.']);
            }

            $tricycle = \App\Models\Tricycle::where('id', $unitId)
                ->where('operator_id', $operator->id)
                ->first();

            if (!$tricycle) {
                return redirect()->back()->withErrors(['unit_id' => 'That tricycle unit was not found on your account.']);
            }

            if (!$this->renewalEligibility($tricycle)['can_renew']) {
                return redirect()->back()->withErrors([
                    'application_type' => 'This tricycle does not currently have a franchise that is eligible for renewal.',
                ]);
            }
        }

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $user, $operator, $appType, $unitId) {
            $tricycle = null;

            // 1. Resolve Tricycle Unit
            if ($unitId) {
                $tricycle = \App\Models\Tricycle::where('id', $unitId)
                    ->where('operator_id', $operator->id)
                    ->first();
            }

            // Renewal always targets an existing, operator-owned unit resolved above (and
            // re-authorized/re-validated here since we're inside a fresh transaction) — it must
            // never fall back to a global plate/engine lookup or create a brand-new tricycle.
            if ($appType !== 'renewal' && !$tricycle) {
                // Find by plate or engine if already registered
                $plate = $request->input('plate');
                $engine = $request->input('engine_number');

                if ($plate) {
                    $tricycle = \App\Models\Tricycle::where('plate_number', $plate)->first();
                }

                if (!$tricycle && $engine) {
                    $tricycle = \App\Models\Tricycle::where('engine_number', $engine)->first();
                }
            }

            if (!$tricycle && $appType !== 'renewal') {
                // Create a new Tricycle record
                $makeModel = $request->input('make_model', 'Generic Tricycle');
                $parts = explode(' ', $makeModel, 2);
                $make = $parts[0] ?? 'Generic';
                $model = $parts[1] ?? 'Tricycle';

                $todaCode = $request->input('toda', 'A (Poblacion)');
                $todaZone = \App\Models\TodaZone::where('name', 'LIKE', "%{$todaCode}%")
                    ->orWhere('code', 'LIKE', "%{$todaCode}%")
                    ->first();

                $plate   = $request->input('plate') ?: ('TEMP-' . rand(1000, 9999));
                $engine  = $request->input('engine_number') ?: ('ENG-' . rand(10000, 99999));
                $chassis = $request->input('chassis_number') ?: ('CHAS-' . rand(10000, 99999));

                $tricycle = \App\Models\Tricycle::create([
                    'operator_id'    => $operator->id,
                    'toda_zone_id'   => $todaZone ? $todaZone->id : null,
                    'plate_number'   => $plate,
                    'engine_number'  => $engine,
                    'chassis_number' => $chassis,
                    'make'           => $make,
                    'model'          => $model,
                    'year_model'     => 2024,
                    'body_color'     => 'Red',
                    'status'         => 'unregistered',
                ]);
            }

            if (!$tricycle) {
                // Should be unreachable — the renewal path above already validated and returned
                // early if no eligible, owned tricycle was found — but never proceed without one.
                abort(422, 'No tricycle unit could be resolved for this application.');
            }

            // 2. Create Application
            $appCount = \App\Models\Application::count();
            $refNo = 'APP-2026-' . str_pad($appCount + 1, 5, '0', STR_PAD_LEFT);

            $application = \App\Models\Application::create([
                'reference_number' => $refNo,
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType === 'renewal' ? 'renewal' : 'new',
                'current_step'     => 1, // Step 1: Document review (TMO)
                'status'           => 'pending_review',
                'submitted_at'     => now(),
                'remarks'          => $appType === 'renewal'
                    ? 'Franchise Renewal Application submitted online by Operator.'
                    : 'New Unit Registration Application submitted online by Operator.',
            ]);

            // 3. Save Uploaded Documents
            $docKeys = [
                'receipt'   => 'other',
                'prangkisa' => 'other',
                'police'    => 'other',
                'health'    => 'other',
                'orcr'      => 'or_cr',
                'license'   => 'drivers_license',
                'brgy'      => 'proof_of_residence',
                'toda'      => 'toda_clearance',
                'cedula'    => 'other',
                'driver_id' => 'photo_id',
                'tariff'    => 'other',
                'auth'      => 'other',
            ];

            if ($request->file('documents')) {
                foreach ($request->file('documents') as $key => $fileOrFiles) {
                    if (isset($docKeys[$key])) {
                        $files = is_array($fileOrFiles) ? $fileOrFiles : [$fileOrFiles];
                        foreach ($files as $file) {
                            $path = $file->store('applications/documents', 'public');
                            \App\Models\ApplicationDocument::create([
                                'application_id' => $application->id,
                                'document_type'  => $docKeys[$key],
                                'file_name'      => $key . '_' . $file->getClientOriginalName(),
                                'file_path'      => $path,
                                'file_size_kb'   => round($file->getSize() / 1024),
                                'mime_type'      => $file->getMimeType(),
                                'review_status'  => 'pending',
                            ]);
                        }
                    }
                }
            }

            // 4. Log Status History for Document Review Phase
            \App\Models\ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => $user->id,
                'from_status'    => 'draft',
                'to_status'      => 'pending_review',
                'from_step'      => 1,
                'to_step'        => 1,
                'notes'          => $appType === 'renewal'
                    ? 'Franchise Renewal application submitted. Phase 1: Document Review.'
                    : 'New Unit Registration application submitted. Phase 1: Document Review.',
                'created_at'     => now(),
            ]);

            return redirect()->route('operator.mtop.details', ['id' => $application->id]);
        });
    }

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
            ->with(['tricycle', 'franchiseScheme', 'statusHistories'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($app) {
                $phase = 'tmo-docs';
                $status = 'in-progress';
                $message = 'Undergoing document review.';

                // This application's OWN franchise period (application_id-scoped), not simply the
                // tricycle's currently active one — an old, superseded renewal must keep showing
                // its own historical expiry, not whatever period is active on the unit today.
                $fs = $app->franchiseScheme;
                $isCompletedApp = in_array($app->status, ['completed', 'scheme_issued']);
                $isExpired = $isCompletedApp && $fs && $fs->expiry_date ? $fs->expiry_date->isPast() : false;

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
                        $message = 'Awaiting Traffic Management Office validation of your online documents.';
                        break;
                    case 'rejected':
                        $phase = 'tmo-docs';
                        $status = 'action-req';
                        $lastHistory = $app->statusHistories()->where('to_status', 'rejected')->latest()->first();
                        $message = $lastHistory ? $lastHistory->notes : 'Online requirements rejected. Please correct files.';
                        break;
                    case 'pending_inspection':
                    case 'under_inspection':
                        $phase = 'tmo-phys-inspect';
                        $status = 'in-progress';
                        $message = 'Requirements approved! Please bring your tricycle unit to the TMO inspection compound.';
                        break;
                    case 'failed_inspection':
                        $phase = 'tmo-phys-inspect';
                        $status = 'action-req';
                        $lastHistory = $app->statusHistories()->where('to_status', 'failed_inspection')->latest()->first();
                        $message = $lastHistory ? $lastHistory->notes : 'Physical inspection failed. Fix defects and request re-inspection.';
                        break;
                    case 'pending_payment':
                        $phase = 'cashier-pay';
                        $status = 'action-req';
                        $message = 'Inspection cleared! Payment ticket issued. Pay ₱750.00 in person (cash) at the Municipal Treasurer\'s cashier counter.';
                        break;
                    case 'payment_issue':
                        $phase = 'tmo-payment';
                        $status = 'action-req';
                        $lastHistory = $app->statusHistories()->where('to_status', 'payment_issue')->latest()->first();
                        $message = $lastHistory ? $lastHistory->notes : 'TMO flagged an issue with your payment receipt. Please visit TMO with your Official Receipt.';
                        break;
                    case 'payment_verified':
                    case 'paid':
                        $phase = 'bplo-release';
                        $status = 'in-progress';
                        $message = 'Payment verified by TMO! Awaiting BPLO release of franchise sticker and number coding.';
                        break;
                    case 'awaiting_tmo_confirmation':
                        $phase = 'tmo-final-confirm';
                        $status = 'action-req';
                        $message = 'Franchise sticker and plate released by BPLO! Return to TMO with your signed payment ticket for GPS tracking setup and final activation.';
                        break;
                    case 'completed':
                    case 'scheme_issued':
                        $phase = 'completed';
                        if ($isExpired) {
                            $status = 'expired';
                            $message = 'Franchise Expired on ' . ($fs->expiry_date ? $fs->expiry_date->format('M d, Y') : 'N/A') . '. Renewal required.';
                        } else {
                            $status = 'completed';
                            $message = 'Franchise issued and active (Valid until ' . ($fs->expiry_date ? $fs->expiry_date->format('M d, Y') : 'N/A') . ').';
                        }
                        break;
                }

                // Eligibility (can this UNIT be renewed right now?) is inherently about the
                // tricycle's current state, not this specific historical application — reuse the
                // exact same rule enforced server-side in store().
                $eligibility = $app->tricycle ? $this->renewalEligibility($app->tricycle, $app->id) : null;
                $hasActiveValidFranchise = $eligibility['has_active_valid'] ?? false;
                $hasPendingRenewal = $eligibility['has_pending_renewal'] ?? false;
                // Same rule enforced server-side in store() — reuse its result directly rather
                // than recomputing from this application's own (possibly historical) $isExpired.
                $canRenew = $eligibility['can_renew'] ?? false;

                $cardColor = 'standard';
                if ($app->status === 'completed' || $app->status === 'scheme_issued') {
                    if ($isExpired) {
                        if ($hasPendingRenewal || $hasActiveValidFranchise) {
                            $cardColor = 'yellow';
                            $status = 'expired-renewed';
                            $message = $hasPendingRenewal
                                ? 'Franchise Expired. Renewal application is currently in progress.'
                                : 'Franchise Expired (Already renewed with active permit).';
                        } else {
                            $cardColor = 'red';
                            $status = 'expired-unrenewed';
                            $message = 'Franchise Expired on ' . ($fs->expiry_date ? $fs->expiry_date->format('M d, Y') : 'N/A') . '. Renewal required.';
                        }
                    } else {
                        $cardColor = 'green';
                    }
                }

                return [
                    'id'                     => $app->reference_number,
                    'db_id'                  => $app->id,
                    'tricycle_id'            => $app->tricycle_id,
                    'type'                   => $app->application_type === 'new' ? 'New Franchise' : 'Franchise Renewal',
                    'unit'                   => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model} (Plate: {$app->tricycle->plate_number})" : 'N/A',
                    'date'                   => $app->created_at->format('M d, Y'),
                    'status'                 => $status,
                    'phase'                  => $phase,
                    'message'                => $message,
                    'is_expired'             => $isExpired,
                    'can_renew'              => $canRenew,
                    'card_color'             => $cardColor,
                    'has_pending_renewal'    => $hasPendingRenewal,
                    'has_active_valid'       => $hasActiveValidFranchise,
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
            ->where(function ($query) use ($refNo) {
                $query->where('id', $refNo)
                      ->orWhere('reference_number', $refNo);
            })
            ->with(['tricycle.todaZone', 'statusHistories', 'documents', 'inspections'])
            ->firstOrFail();

        // 1. Process documents mapping
        $requirementsMap = [
            'drivers_license'    => 'license',
            'or_cr'              => 'orcr',
            'proof_of_residence' => 'brgy',
            'toda_clearance'     => 'toda',
            'photo_id'           => 'driver_id',
        ];

        $docLabels = [
            'license'   => "Driver's License Back-to-back (Prof/Restriction 1/A1)",
            'orcr'      => 'Xerox OR/CR',
            'brgy'      => 'Barangay Clearance (Original)',
            'toda'      => 'TODA/NAFTODA/ACTODAN Clearance (Original)',
            'driver_id' => "Driver's ID Issued by NAFTODA/ACTODAN",
            'prangkisa' => 'Xerox Prangkisa (Kung Renew)',
            'receipt'   => 'Delivery Receipt (Kung walang OR/CR / New)',
            'tariff'    => 'List of Existing Tariff Fee (For sidecar)',
            'auth'      => 'Authorization Letter & ID (Kung hindi may-ari)',
        ];

        $categoryStatuses = [];
        $categoryNotes = [];

        foreach ($app->documents as $doc) {
            $category = $requirementsMap[$doc->document_type] ?? 'other';
            if ($category === 'other') {
                $parts = explode('_', $doc->file_name, 2);
                if (count($parts) > 1 && in_array($parts[0], ['prangkisa', 'receipt', 'tariff', 'auth'])) {
                    $category = $parts[0];
                }
            }

            if (!isset($categoryStatuses[$category]) || $categoryStatuses[$category] !== 'rejected') {
                $categoryStatuses[$category] = $doc->review_status;
            }
            if ($doc->review_status === 'rejected') {
                $categoryNotes[$category] = $doc->rejection_reason;
            }
        }

        $documents = [];
        foreach ($docLabels as $catId => $label) {
            $hasAny = $app->documents->contains(function ($doc) use ($requirementsMap, $catId) {
                $category = $requirementsMap[$doc->document_type] ?? 'other';
                if ($category === 'other') {
                    $parts = explode('_', $doc->file_name, 2);
                    if (count($parts) > 1 && in_array($parts[0], ['prangkisa', 'receipt', 'tariff', 'auth'])) {
                        $category = $parts[0];
                    }
                }
                return $category === $catId;
            });

            if ($hasAny) {
                $status = $categoryStatuses[$catId] ?? 'pending';
                $documents[] = [
                    'id'     => $catId,
                    'name'   => $label,
                    'status' => $status,
                    'note'   => $categoryNotes[$catId] ?? '',
                ];
            }
        }

        // 2. Process inspection details mapping
        $inspections = [];
        $checklist = [
            'headlights' => 'Headlights (High/Low Beam)',
            'taillights' => 'Tail Lights & Brake Lights',
            'signals'    => 'Signal Lights (Left/Right)',
            'horn'       => 'Horn (Working/Loud)',
            'mirrors'    => 'Side Mirrors (Complete Pair)',
            'brakes'     => 'Brakes & Drive Chain',
            'plate'      => 'Body Plate Attachment',
            'sidecar'    => 'Sidecar Structural Integrity',
        ];

        $latestInspection = $app->inspections()->orderByDesc('attempt_number')->first();
        $decoded = null;
        if ($latestInspection) {
            $decoded = json_decode($latestInspection->inspector_notes, true);
        }

        foreach ($checklist as $key => $label) {
            $status = 'pending';
            $note = '';
            
            if ($latestInspection) {
                if ($decoded && isset($decoded['statuses'])) {
                    // Real dynamic details from TMO inspection
                    $itemStatus = $decoded['statuses'][$key] ?? 'passed';
                    $status = $itemStatus === 'passed' ? 'approved' : ($itemStatus === 'failed' ? 'rejected' : 'pending');
                    $note = $decoded['defects'][$key] ?? '';
                } else {
                    // Seeded fallback / Legacy fallback using aggregated columns
                    if ($key === 'headlights' || $key === 'taillights' || $key === 'signals') {
                        $passed = (bool)$latestInspection->lights_reflectors;
                    } elseif ($key === 'mirrors' || $key === 'horn' || $key === 'plate') {
                        $passed = (bool)$latestInspection->safety_equipment;
                    } elseif ($key === 'brakes') {
                        $passed = (bool)$latestInspection->brakes_steering;
                    } else { // sidecar
                        $passed = (bool)$latestInspection->tires_suspension;
                    }
                    $status = $passed ? 'approved' : 'rejected';
                    $note = $passed ? '' : 'Defective component identified.';
                }
            }

            $inspections[] = [
                'id'     => $key,
                'name'   => $label,
                'status' => $status,
                'note'   => $note,
            ];
        }

        // 3. Process payment mapping
        $payment = null;
        $paymentRecord = Payment::where('application_id', $app->id)->first();
        if ($paymentRecord && $paymentRecord->is_verified) {
            $dateStr = '';
            if ($paymentRecord->verified_at) {
                $dateStr = $paymentRecord->verified_at->format('M d, Y - h:i A');
            } else {
                $dateStr = $paymentRecord->payment_date->format('M d, Y');
                if ($paymentRecord->payment_time) {
                    $dateStr .= ' - ' . date('h:i A', strtotime($paymentRecord->payment_time));
                }
            }
            $payment = [
                'method' => ucwords($paymentRecord->payment_method),
                'ref'    => $paymentRecord->official_receipt_number ?: 'OR-PENDING',
                'amount' => (float)$paymentRecord->amount,
                'date'   => $dateStr,
            ];
        }

        // 4. BPLO Assigned Body mapping
        $bplo = null;
        $franchiseScheme = FranchiseScheme::with('colorCodingScheme')->where('application_id', $app->id)->first();
        if ($franchiseScheme) {
            $bplo = [
                'assignedBody' => $franchiseScheme->franchise_number,
                'issueDate'    => $franchiseScheme->issue_date ? $franchiseScheme->issue_date->format('M d, Y') : null,
                'expiryDate'   => $franchiseScheme->expiry_date ? $franchiseScheme->expiry_date->format('M d, Y') : null,
                'colorCoding'  => $franchiseScheme->colorCodingScheme ? [
                    'name'            => $franchiseScheme->colorCodingScheme->name,
                    'colorHex'        => $franchiseScheme->colorCodingScheme->color_hex,
                    'restrictedDays'  => $franchiseScheme->colorCodingScheme->restricted_days,
                ] : null,
                'notes'        => $franchiseScheme->notes,
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
                $phase = 'tmo-phys-inspect';
                $status = 'in-progress';
                break;
            case 'failed_inspection':
                $phase = 'tmo-phys-inspect';
                $status = 'action-req';
                break;
            case 'pending_payment':
                $phase = 'cashier-pay';
                $status = 'action-req';
                break;
            case 'payment_issue':
                $phase = 'tmo-payment';
                $status = 'action-req';
                break;
            case 'payment_verified':
            case 'paid':
                $phase = 'bplo-release';
                $status = 'in-progress';
                break;
            case 'awaiting_tmo_confirmation':
                $phase = 'tmo-final-confirm';
                $status = 'action-req';
                break;
            case 'completed':
            case 'scheme_issued':
                $phase = 'completed';
                $status = 'completed';
                break;
        }

        // This application's OWN franchise period, not simply the tricycle's currently active
        // one — see the identical comment in index() for why.
        $fs = $app->franchiseScheme;
        $isCompletedApp = in_array($app->status, ['completed', 'scheme_issued']);
        $isExpired = $isCompletedApp && $fs && $fs->expiry_date ? $fs->expiry_date->isPast() : false;

        $eligibility = $app->tricycle ? $this->renewalEligibility($app->tricycle, $app->id) : null;
        $hasActiveValidFranchise = $eligibility['has_active_valid'] ?? false;
        $hasPendingRenewal = $eligibility['has_pending_renewal'] ?? false;
        $canRenew = $eligibility['can_renew'] ?? false;

        if ($isCompletedApp) {
            $phase = 'completed';
            if ($isExpired) {
                if ($hasPendingRenewal || $hasActiveValidFranchise) {
                    $status = 'expired-renewed';
                } else {
                    $status = 'expired-unrenewed';
                }
            } else {
                $status = 'completed';
            }
        }

        $appData = [
            'id'                     => $app->reference_number,
            'db_id'                  => $app->id,
            'type'                   => $app->application_type === 'new' ? 'New Franchise' : 'Renewal',
            'status'                 => $status,
            'phase'                  => $phase,
            'raw_status'             => $app->status,
            'date'                   => $app->created_at->format('F d, Y'),
            'toda'                   => $app->tricycle?->todaZone ? $app->tricycle->todaZone->name : 'N/A',
            'make'                   => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
            'plate'                  => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
            'engine'                 => $app->tricycle ? $app->tricycle->engine_number : 'N/A',
            'chassis'                => $app->tricycle ? $app->tricycle->chassis_number : 'N/A',
            'operatorName'           => $operator->full_name,
            'documents'              => $documents,
            'inspections'            => $inspections,
            'payment'                => $payment,
            'payment_due'            => $paymentRecord ? (float)$paymentRecord->amount : 750.00,
            'payment_ticket'         => $app->payment_ticket,
            'sticker_number'         => $app->sticker_number,
            'bplo'                   => $bplo,
            'tricycle_id'            => $app->tricycle_id,
            'is_expired'             => $isExpired,
            'can_renew'              => $canRenew,
            'has_pending_renewal'    => $hasPendingRenewal,
            'has_active_valid'       => $hasActiveValidFranchise,
        ];

        return Inertia::render('Operator/Compliance/MTOPDetails', [
            'application' => $appData,
        ]);
    }

    /**
     * Display the fix application screen.
     */
    public function fix(Request $request, $id)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $app = \App\Models\Application::where('operator_id', $operator->id)
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                      ->orWhere('reference_number', $id);
            })
            ->with(['tricycle.todaZone', 'statusHistories', 'documents', 'inspections'])
            ->firstOrFail();

        $requirementsMap = [
            'drivers_license'    => 'license',
            'or_cr'              => 'orcr',
            'proof_of_residence' => 'brgy',
            'toda_clearance'     => 'toda',
            'photo_id'           => 'driver_id',
        ];

        $docLabels = [
            'license'   => "Driver's License Back-to-back (Prof/Restriction 1/A1)",
            'orcr'      => 'Xerox OR/CR',
            'brgy'      => 'Barangay Clearance (Original)',
            'toda'      => 'TODA/NAFTODA/ACTODAN Clearance (Original)',
            'driver_id' => "Driver's ID Issued by NAFTODA/ACTODAN",
            'prangkisa' => 'Xerox Prangkisa (Kung Renew)',
            'receipt'   => 'Delivery Receipt (Kung walang OR/CR / New)',
            'tariff'    => 'List of Existing Tariff Fee (For sidecar)',
            'auth'      => 'Authorization Letter & ID (Kung hindi may-ari)',
        ];

        $categoryStatuses = [];
        $categoryNotes = [];

        foreach ($app->documents as $doc) {
            $category = $requirementsMap[$doc->document_type] ?? 'other';
            if ($category === 'other') {
                $parts = explode('_', $doc->file_name, 2);
                if (count($parts) > 1 && in_array($parts[0], ['prangkisa', 'receipt', 'tariff', 'auth'])) {
                    $category = $parts[0];
                }
            }

            if (!isset($categoryStatuses[$category]) || $categoryStatuses[$category] !== 'rejected') {
                $categoryStatuses[$category] = $doc->review_status;
            }
            if ($doc->review_status === 'rejected') {
                $categoryNotes[$category] = $doc->rejection_reason;
            }
        }

        $mappedDocs = [];
        foreach ($docLabels as $catId => $label) {
            $hasAny = $app->documents->contains(function ($doc) use ($requirementsMap, $catId) {
                $category = $requirementsMap[$doc->document_type] ?? 'other';
                if ($category === 'other') {
                    $parts = explode('_', $doc->file_name, 2);
                    if (count($parts) > 1 && in_array($parts[0], ['prangkisa', 'receipt', 'tariff', 'auth'])) {
                        $category = $parts[0];
                    }
                }
                return $category === $catId;
            });

            if ($hasAny) {
                $status = $categoryStatuses[$catId] ?? 'pending';
                $mappedDocs[] = [
                    'id'     => $catId,
                    'name'   => $label,
                    'status' => $status,
                    'note'   => $categoryNotes[$catId] ?? '',
                ];
            }
        }

        $inspections = [];
        $checklist = [
            'headlights' => 'Headlights (High/Low Beam)',
            'taillights' => 'Tail Lights & Brake Lights',
            'signals'    => 'Signal Lights (Left/Right)',
            'horn'       => 'Horn (Working/Loud)',
            'mirrors'    => 'Side Mirrors (Complete Pair)',
            'brakes'     => 'Brakes & Drive Chain',
            'plate'      => 'Body Plate Attachment',
            'sidecar'    => 'Sidecar Structural Integrity',
        ];

        $latestInspection = $app->inspections->sortByDesc('attempt_number')->first();
        $decoded = null;
        if ($latestInspection) {
            $decoded = json_decode($latestInspection->inspector_notes, true);
        }

        foreach ($checklist as $key => $label) {
            $status = 'pending';
            $note = '';
            
            if ($latestInspection) {
                if ($decoded && isset($decoded['statuses'])) {
                    $itemStatus = $decoded['statuses'][$key] ?? 'passed';
                    $status = $itemStatus === 'passed' ? 'approved' : ($itemStatus === 'failed' ? 'rejected' : 'pending');
                    $note = $decoded['defects'][$key] ?? '';
                } else {
                    if ($key === 'headlights' || $key === 'taillights' || $key === 'signals') {
                        $passed = (bool)$latestInspection->lights_reflectors;
                    } elseif ($key === 'mirrors' || $key === 'horn' || $key === 'plate') {
                        $passed = (bool)$latestInspection->safety_equipment;
                    } elseif ($key === 'brakes') {
                        $passed = (bool)$latestInspection->brakes_steering;
                    } else { // sidecar
                        $passed = (bool)$latestInspection->tires_suspension;
                    }
                    $status = $passed ? 'approved' : 'rejected';
                    $note = $passed ? '' : 'Defective component identified.';
                }
            }

            $inspections[] = [
                'id'     => $key,
                'name'   => $label,
                'status' => $status,
                'note'   => $note,
            ];
        }

        $appData = [
            'id'             => $app->id,
            'reference'      => $app->reference_number,
            'operatorName'   => $operator->full_name,
            'phase'          => in_array($app->status, ['failed_inspection']) ? 'tmo-phys' : 'tmo-docs',
            'documents'      => $mappedDocs,
            'inspections'    => $inspections,
        ];

        return Inertia::render('Operator/Compliance/MTOPFix', [
            'application' => $appData,
        ]);
    }

    /**
     * Handle the correction submission from the operator portal.
     */
    public function submitFix(Request $request, $id)
    {
        $user = $request->user();
        $operator = $user->operator;

        if (!$operator) {
            abort(403);
        }

        $app = \App\Models\Application::where('operator_id', $operator->id)
            ->where(function ($query) use ($id) {
                $query->where('id', $id)
                      ->orWhere('reference_number', $id);
            })
            ->with(['documents', 'inspections'])
            ->firstOrFail();

        $isPhysFix = in_array($app->status, ['failed_inspection']);

        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $app, $isPhysFix, $user) {
            $fromStatus = $app->status;

            if ($isPhysFix) {
                // Update the latest inspection's rejected items to pending
                $latestInspection = $app->inspections->sortByDesc('attempt_number')->first();
                if ($latestInspection) {
                    $decoded = json_decode($latestInspection->inspector_notes, true);
                    if ($decoded && isset($decoded['statuses'])) {
                        $updatedStatuses = $decoded['statuses'];
                        $updatedDefects = $decoded['defects'] ?? [];

                        // Reset lights
                        if (($updatedStatuses['headlights'] ?? '') === 'failed' || ($updatedStatuses['taillights'] ?? '') === 'failed' || ($updatedStatuses['signals'] ?? '') === 'failed') {
                            $latestInspection->lights_reflectors = null;
                        }
                        // Reset safety
                        if (($updatedStatuses['mirrors'] ?? '') === 'failed' || ($updatedStatuses['horn'] ?? '') === 'failed' || ($updatedStatuses['plate'] ?? '') === 'failed') {
                            $latestInspection->safety_equipment = null;
                        }
                        // Reset brakes
                        if (($updatedStatuses['brakes'] ?? '') === 'failed') {
                            $latestInspection->brakes_steering = null;
                        }
                        // Reset sidecar
                        if (($updatedStatuses['sidecar'] ?? '') === 'failed') {
                            $latestInspection->tires_suspension = null;
                        }

                        // Set item statuses in JSON to pending (which clears the red and displays them as pending recheck)
                        foreach ($updatedStatuses as $key => $status) {
                            if ($status === 'failed') {
                                $updatedStatuses[$key] = 'pending';
                                unset($updatedDefects[$key]);
                            }
                        }

                        $latestInspection->inspector_notes = json_encode([
                            'statuses' => $updatedStatuses,
                            'defects'  => $updatedDefects,
                        ]);
                        $latestInspection->save();
                    }
                }

                $toStatus = 'pending_inspection';
                $app->update([
                    'status'       => $toStatus,
                    'current_step' => 2,
                    'remarks'      => 'Operator requested re-inspection after fixing safety defects.',
                ]);

                \App\Models\ApplicationStatusHistory::create([
                    'application_id' => $app->id,
                    'changed_by'     => $user->id,
                    'from_status'    => $fromStatus,
                    'to_status'      => $toStatus,
                    'notes'          => 'Operator confirmed defect repairs and requested re-inspection.',
                ]);
            } else {
                // Document review fix
                $requirementsMap = [
                    'license'   => 'drivers_license',
                    'orcr'      => 'or_cr',
                    'brgy'      => 'proof_of_residence',
                    'toda'      => 'toda_clearance',
                    'driver_id' => 'photo_id',
                    'prangkisa' => 'other',
                    'receipt'   => 'other',
                    'tariff'    => 'other',
                    'auth'      => 'other',
                ];

                if ($request->file('documents')) {
                    foreach ($request->file('documents') as $key => $fileOrFiles) {
                        if (isset($requirementsMap[$key])) {
                            // 1. Find and delete the old rejected files in this category
                            $oldDocs = $app->documents->filter(function ($doc) use ($requirementsMap, $key) {
                                $category = $requirementsMap[$doc->document_type] ?? 'other';
                                if ($category === 'other') {
                                    $parts = explode('_', $doc->file_name, 2);
                                    if (count($parts) > 1 && in_array($parts[0], ['prangkisa', 'receipt', 'tariff', 'auth'])) {
                                        $category = $parts[0];
                                    }
                                }
                                return $category === $key;
                            });

                            foreach ($oldDocs as $oldDoc) {
                                // Optional: Delete physical file if exists
                                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldDoc->file_path);
                                $oldDoc->delete();
                            }

                            // 2. Store the new files under this category
                            $files = is_array($fileOrFiles) ? $fileOrFiles : [$fileOrFiles];
                            foreach ($files as $file) {
                                $path = $file->store('applications/documents', 'public');
                                \App\Models\ApplicationDocument::create([
                                    'application_id' => $app->id,
                                    'document_type'  => $requirementsMap[$key],
                                    'file_name'      => $key . '_' . $file->getClientOriginalName(),
                                    'file_path'      => $path,
                                    'file_size_kb'   => round($file->getSize() / 1024),
                                    'mime_type'      => $file->getMimeType(),
                                    'review_status'  => 'pending',
                                ]);
                            }
                        }
                    }
                }

                $toStatus = 'pending_review';
                $app->update([
                    'status'       => $toStatus,
                    'current_step' => 1,
                    'remarks'      => 'Operator submitted replacement files for rejected documents.',
                ]);

                \App\Models\ApplicationStatusHistory::create([
                    'application_id' => $app->id,
                    'changed_by'     => $user->id,
                    'from_status'    => $fromStatus,
                    'to_status'      => $toStatus,
                    'notes'          => 'Operator submitted corrected/replacement documents.',
                ]);
            }
        });

        return redirect()->route('operator.mtop.details', ['id' => $app->id]);
    }

    /**
     * Display the official Payment Ticket for an application.
     */
    public function paymentTicket(Request $request, $id)
    {
        $user = $request->user();

        // Staff members (TMO, BPLO, Admin) can view any application's ticket
        if (in_array($user->role, ['tmo_personnel', 'bplo_staff', 'admin'])) {
            $app = Application::where(function ($query) use ($id) {
                    $query->where('id', $id)
                          ->orWhere('reference_number', $id);
                })
                ->with(['tricycle.todaZone', 'operator'])
                ->firstOrFail();
        } else {
            $operator = $user->operator;
            if (!$operator) {
                abort(403);
            }

            $app = Application::where('operator_id', $operator->id)
                ->where(function ($query) use ($id) {
                    $query->where('id', $id)
                          ->orWhere('reference_number', $id);
                })
                ->with(['tricycle.todaZone', 'operator'])
                ->firstOrFail();
        }

        return Inertia::render('Operator/Compliance/PaymentTicket', [
            'application' => [
                'id'               => $app->id,
                'reference_number' => $app->reference_number,
                'status'           => $app->status,
                'payment_ticket'   => $app->payment_ticket,
                'operator_name'    => $app->operator?->full_name ?? 'N/A',
            ],
        ]);
    }

    /**
     * The single source of truth for whether a tricycle currently has a franchise eligible for
     * renewal — the exact same business rule the tracker UI already used to compute `can_renew`
     * (index()/show()), now also enforced server-side in store() so a direct POST can't bypass it.
     *
     * A tricycle is renewable when its current active franchise scheme exists and has expired,
     * there is no OTHER currently-valid active scheme on the unit, and no renewal application for
     * it is already in progress.
     *
     * @param  int|null  $excludeApplicationId  Exclude this application from the "pending renewal
     *         already in progress" check — used when evaluating can_renew for that same application.
     */
    private function renewalEligibility(\App\Models\Tricycle $tricycle, ?int $excludeApplicationId = null): array
    {
        $scheme = $tricycle->franchiseScheme; // is_active = true scoped relation
        $isExpired = $scheme && $scheme->expiry_date ? $scheme->expiry_date->isPast() : false;

        $hasActiveValidFranchise = FranchiseScheme::where('tricycle_id', $tricycle->id)
            ->where('is_active', true)
            ->where('expiry_date', '>', now())
            ->exists();

        $pendingRenewalQuery = Application::where('tricycle_id', $tricycle->id)
            ->where('application_type', 'renewal')
            ->whereNotIn('status', ['completed', 'rejected']);

        if ($excludeApplicationId) {
            $pendingRenewalQuery->where('id', '!=', $excludeApplicationId);
        }

        $hasPendingRenewal = $pendingRenewalQuery->exists();

        return [
            'can_renew'           => $isExpired && !$hasActiveValidFranchise && !$hasPendingRenewal,
            'is_expired'          => $isExpired,
            'has_active_valid'    => $hasActiveValidFranchise,
            'has_pending_renewal' => $hasPendingRenewal,
            'scheme'              => $scheme,
        ];
    }
}
