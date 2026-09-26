<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationDriver;
use App\Models\Inspection;
use App\Models\Payment;
use App\Models\FranchiseScheme;
use Illuminate\Validation\Rule;

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
                ->first();

            if ($tri) {
                // Same 9 vehicle fields as Public Registration, so a renewal's Vehicle Details
                // step pre-fills identically to what a fresh registration would collect.
                $tricycleData = [
                    'id'             => $tri->id,
                    'plate_number'   => $tri->plate_number,
                    'make_model'     => trim("{$tri->make} {$tri->model}"),
                    'year_model'     => $tri->year_model,
                    'body_color'     => $tri->body_color,
                    'body_type'      => $tri->body_type,
                    'engine_number'  => $tri->engine_number,
                    'chassis_number' => $tri->chassis_number,
                    'or_number'      => $tri->or_number,
                    'cr_number'      => $tri->cr_number,
                ];
            }
        }

        return Inertia::render('Operator/Compliance/MTOPWizard', [
            'applicationType' => $type,
            'tricycleUnit'    => $tricycleData,
            // The Tricycle Owner (this portal account) — same person Public Registration's
            // applicant block collects, rendered read-only in the wizard's owner/driver split.
            'owner'           => $operator ? $operator->personDetails() : null,
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
        $currentYear = (int) date('Y');

        // Whether the tricycle OWNER (this portal account) is also the tricycle driver —
        // identical contract to RegistrationController::store(): an absent flag is treated
        // as "owner is also the driver", and a separate driver is only collected/validated
        // when the owner is NOT the driver.
        $ownerIsDriver = $request->boolean('owner_is_driver', true);

        // Same vehicle-field rules as Public Registration (RegistrationController::store()),
        // plus the same canonical document vocabulary — enforced server-side here, not just via
        // the wizard's client-side step gates. Xerox Prangkisa is required only for a renewal;
        // never shown or required for a new unit registration.
        $rules = [
            'application_type' => 'required|in:new,renewal',
            'owner_is_driver'  => 'nullable|boolean',

            'plate_number'   => 'required|string|max:20',
            'make_model'     => 'required|string|max:100',
            'year_model'     => 'required|integer|min:1980|max:' . ($currentYear + 1),
            'body_color'     => 'required|string|max:50',
            'body_type'      => 'required|string|max:100',
            'engine_number'  => 'required|string|max:50',
            'chassis_number' => 'required|string|max:50',
            'or_number'      => 'required|string|max:50',
            'cr_number'      => 'required|string|max:50',

            'documents'                         => 'required|array',
            'documents.police_clearance'        => 'required|array|min:1',
            'documents.police_clearance.*'      => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.health_certificate'      => 'required|array|min:1',
            'documents.health_certificate.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.orcr_photocopy'          => 'required|array|min:1',
            'documents.orcr_photocopy.*'        => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.drivers_license'         => 'required|array|min:1',
            'documents.drivers_license.*'       => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.barangay_clearance'      => 'required|array|min:1',
            'documents.barangay_clearance.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.toda_clearance'          => 'required|array|min:1',
            'documents.toda_clearance.*'        => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.cedula'                  => 'required|array|min:1',
            'documents.cedula.*'                => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.driver_id'               => 'required|array|min:1',
            'documents.driver_id.*'             => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.tariff_list'             => 'required|array|min:1',
            'documents.tariff_list.*'           => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.delivery_receipt'        => 'nullable|array',
            'documents.delivery_receipt.*'      => 'file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.authorization_letter'    => 'nullable|array',
            'documents.authorization_letter.*'  => 'file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            // Renewal-only requirement (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS
            // 'prangkisa', renewal_only => true).
            'documents.prangkisa'               => 'required_if:application_type,renewal|array|min:1',
            'documents.prangkisa.*'             => 'file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
        ];

        // A separate Tricycle Driver is only collected (and only validated) when the owner
        // is NOT the driver — same explicit conditional rules as RegistrationController.
        if (! $ownerIsDriver) {
            $rules = array_merge($rules, [
                'driver_first_name' => 'required|string|max:100',
                'driver_last_name'  => 'required|string|max:100',
                'driver_birthday'   => 'required|date|before_or_equal:today',
                'driver_contact'    => 'required|string|max:20',
                'driver_barangay'   => ['required', 'string', Rule::in(\App\Support\NasugbuBarangays::values())],
            ]);
        }

        $request->validate($rules);

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

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $user, $operator, $appType, $unitId, $ownerIsDriver) {
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
                $plate = $request->input('plate_number');
                $engine = $request->input('engine_number');

                if ($plate) {
                    $tricycle = \App\Models\Tricycle::where('plate_number', $plate)->first();
                }

                if (!$tricycle && $engine) {
                    $tricycle = \App\Models\Tricycle::where('engine_number', $engine)->first();
                }
            }

            if (!$tricycle && $appType !== 'renewal') {
                // Create a new Tricycle record from the validated vehicle details — same fields
                // Public Registration collects. No TODA zone assignment here: TODA is only a
                // registration document requirement (the TODA/NAFTODA/ACTODAN Clearance), never
                // an operational zone/route relationship set during registration.
                $makeModel = $request->input('make_model');
                $parts = explode(' ', $makeModel, 2);
                $make = $parts[0] ?? $makeModel;
                $model = $parts[1] ?? '';

                $tricycle = \App\Models\Tricycle::create([
                    'operator_id'    => $operator->id,
                    'toda_zone_id'   => null,
                    'plate_number'   => $request->input('plate_number'),
                    'engine_number'  => $request->input('engine_number'),
                    'chassis_number' => $request->input('chassis_number'),
                    'make'           => $make,
                    'model'          => $model,
                    'year_model'     => $request->input('year_model'),
                    'body_color'     => $request->input('body_color'),
                    'body_type'      => $request->input('body_type'),
                    'or_number'      => $request->input('or_number'),
                    'cr_number'      => $request->input('cr_number'),
                    'status'         => 'unregistered',
                ]);
            }

            if (!$tricycle) {
                // Should be unreachable — the renewal path above already validated and returned
                // early if no eligible, owned tricycle was found — but never proceed without one.
                abort(422, 'No tricycle unit could be resolved for this application.');
            }

            // 2. Create Application — reference derived from the highest existing
            //    suffix (not a row count), so seeded gaps can't cause a duplicate.
            $refNo = \App\Models\Application::generateReferenceNumber();

            $application = \App\Models\Application::create([
                'reference_number' => $refNo,
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'owner_is_driver'  => $ownerIsDriver,
                'application_type' => $appType === 'renewal' ? 'renewal' : 'new',
                'current_step'     => 1, // Step 1: Document review (TMO)
                'status'           => 'pending_review',
                'submitted_at'     => now(),
                'remarks'          => $appType === 'renewal'
                    ? 'Franchise Renewal Application submitted online by Operator.'
                    : 'New Unit Registration Application submitted online by Operator.',
            ]);

            // Separate Tricycle Driver — only when the owner is NOT the driver. Same
            // application-scoped person data as Public Registration (no User/Driver account
            // is created for them).
            if (! $ownerIsDriver) {
                \App\Models\ApplicationDriver::create([
                    'application_id' => $application->id,
                    'first_name'     => $request->input('driver_first_name'),
                    'last_name'      => $request->input('driver_last_name'),
                    'date_of_birth'  => $request->date('driver_birthday')->toDateString(),
                    'contact_number' => $request->input('driver_contact'),
                    'barangay'       => $request->input('driver_barangay'),
                ]);
            }

            // 3. Save Uploaded Documents — same canonical vocabulary as Public Registration
            // (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS): the frontend key IS the
            // stored document_type directly, no more collapsing into a generic 'other' value.
            $validDocKeys = array_keys(\App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS);

            if ($request->file('documents')) {
                foreach ($request->file('documents') as $key => $fileOrFiles) {
                    if (in_array($key, $validDocKeys, true)) {
                        $files = is_array($fileOrFiles) ? $fileOrFiles : [$fileOrFiles];
                        foreach ($files as $file) {
                            $path = $file->store('applications/documents', 'public');
                            \App\Models\ApplicationDocument::create([
                                'application_id' => $application->id,
                                'document_type'  => $key,
                                'file_name'      => $file->getClientOriginalName(),
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
            ->with(['tricycle', 'franchiseScheme', 'statusHistories', 'inspections'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($app) {
                $phase = 'tmo-docs';
                $status = 'in-progress';
                $message = 'Undergoing document review.';

                // Latest real status-history timestamp — "Status updated" on the card, so the
                // tracker always shows when the application last actually moved, never a
                // hardcoded/demo date.
                $lastUpdated = $app->statusHistories->sortByDesc('created_at')->first()?->created_at
                    ?? $app->created_at;

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
                        $hasFailedInspection = $app->inspections->contains('result', 'failed');
                        if ($hasFailedInspection) {
                            $message = 'Vehicle confirmed ready for reinspection. Please bring your tricycle unit to the TMO inspection compound.';
                        } else {
                            $message = 'Requirements approved! Please bring your tricycle unit to the TMO inspection compound for physical roadworthiness and safety inspection.';
                        }
                        break;
                    case 'failed_inspection':
                        $phase = 'tmo-phys-inspect';
                        $status = 'action-req';
                        $latestFailedInspection = $app->inspections->where('result', 'failed')->sortByDesc('attempt_number')->first()
                            ?? $app->inspections->sortByDesc('attempt_number')->first();
                        $lastHistory = $app->statusHistories()->where('to_status', 'failed_inspection')->latest()->first();
                        $reason = $latestFailedInspection?->overall_notes ?: ($lastHistory?->notes ?: 'Defects identified during physical inspection.');
                        $message = "Reinspection Required: {$reason}";
                        break;
                    case 'pending_bplo_release':
                        $phase = 'bplo-release';
                        $status = 'action-req';
                        $message = 'Physical inspection passed! Please proceed to the Municipal Treasurer\'s Office, present your TMO ticket, and complete the required payment before proceeding to BPLO for sticker and plate release.';
                        break;
                    case 'awaiting_tmo_confirmation':
                        $phase = 'tmo-final-confirm';
                        $status = 'action-req';
                        $message = 'Franchise Number and plate released by BPLO! Return to TMO with your signed payment ticket for GPS tracking setup and final activation.';
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
                    // Real status-history-derived dates: when the application last moved,
                    // and when each workflow step was actually completed (null until reached).
                    'last_updated'           => $lastUpdated->format('M d, Y'),
                    'step_dates'             => $this->trackerStepDates($app),
                    'status'                 => $status,
                    'phase'                  => $phase,
                    'message'                => $message,
                    'is_expired'             => $isExpired,
                    'can_renew'              => $canRenew,
                    'card_color'             => $cardColor,
                    'has_pending_renewal'    => $hasPendingRenewal,
                    'has_active_valid'       => $hasActiveValidFranchise,
                    'is_ready_for_reinspection' => in_array($app->status, ['pending_inspection', 'under_inspection']) && $app->inspections->contains('result', 'failed'),
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
            ->with(['tricycle.todaZone', 'statusHistories', 'tricycleDriver', 'documents' => function ($query) {
                $query->orderBy('created_at');
            }, 'inspections'])
            ->firstOrFail();

        // 1. Process documents mapping — same canonical requirement resolution used by TMO's
        // Document Review and Tricycle Registry Details (ApplicationDocument::
        // resolveRequirementKey()), so a document submitted via this Driver Portal wizard is
        // recognized identically everywhere. Oldest-first eager load above means the LATEST
        // submission for a requirement (e.g. after a resubmission) is the one that wins below.
        $latestPerRequirement = [];
        foreach ($app->documents as $doc) {
            $latestPerRequirement[ApplicationDocument::resolveRequirementKey($doc)] = $doc;
        }

        $documents = [];
        foreach (ApplicationDocument::CANONICAL_REQUIREMENTS as $key => $meta) {
            $doc = $latestPerRequirement[$key] ?? null;
            if (!$doc) {
                continue; // only list requirements the driver has actually submitted something for
            }

            $documents[] = [
                'id'     => $key,
                'name'   => $meta['label'],
                'status' => $doc->review_status,
                'note'   => $doc->review_status === 'rejected' ? $doc->rejection_reason : '',
                // Openable link to the file the driver actually uploaded (only present when
                // a file exists), matching TMO Document Review's '/storage/' URL shape.
                'url'    => $doc->file_path ? '/storage/' . ltrim($doc->file_path, '/') : null,
                'file_name' => $doc->file_name,
            ];
        }

        // 2. Physical inspection is a single overall decision, not a per-item checklist — the
        // canonical 13-item list is purely descriptive/reference information and lives once,
        // client-side, in resources/js/data/physicalInspectionItems.js. Only the overall
        // result (rejection_reason / is_reinspection_required below) matters here.

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
                'assignedStickerNumber' => $franchiseScheme->franchise_number,
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
            case 'pending_bplo_release':
                $phase = 'bplo-release';
                $status = 'action-req';
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

        $latestFailedInspection = $app->inspections->where('result', 'failed')->sortByDesc('attempt_number')->first();
        $latestInspection = $app->inspections->sortByDesc('attempt_number')->first();
        $lastHistory = $app->statusHistories->where('to_status', 'failed_inspection')->last();
        $latestRejectionReason = $latestFailedInspection?->overall_notes ?: ($latestInspection?->overall_notes ?: ($lastHistory?->notes ?: ''));

        $appData = [
            'id'                     => $app->reference_number,
            'db_id'                  => $app->id,
            'type'                   => $app->application_type === 'new' ? 'New Franchise' : 'Renewal',
            'status'                 => $status,
            'phase'                  => $phase,
            'raw_status'             => $app->status,
            'date'                   => $app->created_at->format('F d, Y'),
            // Real status-history-derived dates — same fields the tracker list shows.
            'last_updated'           => ($app->statusHistories->sortByDesc('created_at')->first()?->created_at ?? $app->created_at)->format('F d, Y'),
            'step_dates'             => $this->trackerStepDates($app),
            'toda'                   => $app->tricycle?->todaZone ? $app->tricycle->todaZone->name : 'N/A',
            'make'                   => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
            'plate'                  => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
            'engine'                 => $app->tricycle ? $app->tricycle->engine_number : 'N/A',
            'chassis'                => $app->tricycle ? $app->tricycle->chassis_number : 'N/A',
            'operatorName'           => $operator->full_name,
            // Tricycle Owner (this applicant) + optional separate Tricycle Driver — the
            // tracker's own applicant section renders these; list rows keep operatorName.
            'owner'                  => $app->ownerDetails(),
            'ownerIsDriver'          => (bool) $app->owner_is_driver,
            'tricycleDriver'         => $app->driverDetails(),
            'documents'              => $documents,
            'rejection_reason'       => $latestRejectionReason,
            'is_reinspection_required' => $app->status === 'failed_inspection',
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
            'is_ready_for_reinspection' => in_array($app->status, ['pending_inspection', 'under_inspection']) && $app->inspections->contains('result', 'failed'),
        ];

        return Inertia::render('Operator/Compliance/MTOPDetails', [
            'application' => $appData,
        ]);
    }

    /**
     * The date (M d, Y) each workflow step was COMPLETED, derived purely from this
     * application's append-only status history — never hardcoded, so the tracker's
     * completed-step dates always match what actually happened. Keys are the same
     * phase keys the frontend pipeline uses. A step the application has not reached
     * yet stays null. First recorded completion wins: a later return to an earlier
     * queue (e.g. the driver confirming reinspection readiness) must not rewrite when
     * the step in front of it was actually cleared.
     */
    private function trackerStepDates(Application $app): array
    {
        $dates = [
            'tmo-docs'          => null,
            'tmo-phys-inspect'  => null,
            'bplo-release'      => null,
            'tmo-final-confirm' => null,
        ];

        foreach ($app->statusHistories->sortBy('created_at') as $history) {
            if ($dates['tmo-docs'] === null && in_array($history->to_status, ['pending_inspection', 'under_inspection'], true)) {
                $dates['tmo-docs'] = $history->created_at->format('M d, Y');
            }
            if ($dates['tmo-phys-inspect'] === null && $history->to_status === 'pending_bplo_release') {
                $dates['tmo-phys-inspect'] = $history->created_at->format('M d, Y');
            }
            if ($dates['bplo-release'] === null && $history->to_status === 'awaiting_tmo_confirmation') {
                $dates['bplo-release'] = $history->created_at->format('M d, Y');
            }
            if ($dates['tmo-final-confirm'] === null && in_array($history->to_status, ['completed', 'scheme_issued'], true)) {
                $dates['tmo-final-confirm'] = $history->created_at->format('M d, Y');
            }
        }

        return $dates;
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
            ->with(['tricycle.todaZone', 'statusHistories', 'documents' => function ($query) {
                $query->orderBy('created_at');
            }, 'inspections'])
            ->firstOrFail();

        // Same canonical requirement resolution as show() — see the identical comment there.
        $latestPerRequirement = [];
        foreach ($app->documents as $doc) {
            $latestPerRequirement[ApplicationDocument::resolveRequirementKey($doc)] = $doc;
        }

        $mappedDocs = [];
        foreach (ApplicationDocument::CANONICAL_REQUIREMENTS as $key => $meta) {
            $doc = $latestPerRequirement[$key] ?? null;
            if (!$doc) {
                continue;
            }

            $mappedDocs[] = [
                'id'     => $key,
                'name'   => $meta['label'],
                'status' => $doc->review_status,
                'note'   => $doc->review_status === 'rejected' ? $doc->rejection_reason : '',
            ];
        }

        // Physical inspection is a single overall decision, not a per-item checklist — see the
        // identical comment in show().
        $latestFailedInspection = $app->inspections->where('result', 'failed')->sortByDesc('attempt_number')->first();
        $latestInspection = $app->inspections->sortByDesc('attempt_number')->first();
        $lastHistory = $app->statusHistories->where('to_status', 'failed_inspection')->last();
        $latestRejectionReason = $latestFailedInspection?->overall_notes ?: ($latestInspection?->overall_notes ?: ($lastHistory?->notes ?: ''));

        $appData = [
            'id'               => $app->id,
            'reference'        => $app->reference_number,
            'operatorName'     => $operator->full_name,
            'phase'            => in_array($app->status, ['failed_inspection']) ? 'tmo-phys' : 'tmo-docs',
            'documents'        => $mappedDocs,
            'rejection_reason' => $latestRejectionReason,
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
                $toStatus = 'pending_inspection';
                $app->update([
                    'status'       => $toStatus,
                    'current_step' => 2,
                    'remarks'      => 'Driver confirmed vehicle is ready for reinspection after addressing inspection issues.',
                ]);

                \App\Models\ApplicationStatusHistory::create([
                    'application_id' => $app->id,
                    'changed_by'     => $user->id,
                    'from_status'    => $fromStatus,
                    'to_status'      => $toStatus,
                    'from_step'      => 2,
                    'to_step'        => 2,
                    'notes'          => 'Driver confirmed vehicle is ready for reinspection (all inspection issues addressed).',
                    'created_at'     => now(),
                ]);
            } else {
                // Document review fix — same canonical vocabulary as store()/show()/fix(): the
                // frontend key (from app.documents[].id, itself resolved via
                // ApplicationDocument::resolveRequirementKey()) IS the document_type to store.
                $validDocKeys = array_keys(\App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS);

                if ($request->file('documents')) {
                    foreach ($request->file('documents') as $key => $fileOrFiles) {
                        if (in_array($key, $validDocKeys, true)) {
                            // 1. Find and delete the old rejected files for this requirement
                            $oldDocs = $app->documents->filter(
                                fn ($doc) => \App\Models\ApplicationDocument::resolveRequirementKey($doc) === $key
                            );

                            foreach ($oldDocs as $oldDoc) {
                                // Optional: Delete physical file if exists
                                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldDoc->file_path);
                                $oldDoc->delete();
                            }

                            // 2. Store the new files under this requirement
                            $files = is_array($fileOrFiles) ? $fileOrFiles : [$fileOrFiles];
                            foreach ($files as $file) {
                                $path = $file->store('applications/documents', 'public');
                                \App\Models\ApplicationDocument::create([
                                    'application_id' => $app->id,
                                    'document_type'  => $key,
                                    'file_name'      => $file->getClientOriginalName(),
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
