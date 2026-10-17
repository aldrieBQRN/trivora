<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TMO\DashboardController as TMODashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\OperatorAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\TMO\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC & GUEST ROUTES
|--------------------------------------------------------------------------
*/

// Landing Page — no server-computed stats needed (the "Status" band that used them was removed).
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

// Landing page "Send a Direct Inquiry" form → emails VIOLATION_TMO_EMAIL.
Route::post('/inquiry', [\App\Http\Controllers\PublicInquiryController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('public.inquiry');


// QR Ride — the public page a printed tricycle QR opens (/ride/q/{token}). Shows safe unit
// details and whether it is taking walk-in passengers; joining happens in the Passenger app.
Route::get('/ride/q/{token}', [\App\Http\Controllers\PublicQrRideController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('qr-ride.landing');

// Driver QR Code Printable Sheet (accessible for driver's assigned unit token)
Route::get('/driver/qr/print/{token}', [\App\Http\Controllers\Api\DriverQrCodeController::class, 'printSheet'])
    ->name('driver.qr.print');

// Public MTOP Registration Wizard (Account Creation + First Application)
Route::get('/register-mtop', [RegistrationController::class, 'publicWizard'])->name('register.public');
Route::post('/register-mtop', [RegistrationController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('register.public.submit');
// Email verification code for the applicant's email (Applicant Information → Continue).
Route::post('/register-mtop/email/send-code', [\App\Http\Controllers\RegistrationEmailVerificationController::class, 'send'])
    ->middleware('throttle:10,1')->name('register.public.email.send');
Route::post('/register-mtop/email/verify', [\App\Http\Controllers\RegistrationEmailVerificationController::class, 'verify'])
    ->middleware('throttle:10,1')->name('register.public.email.verify');



// Public Plate/Franchise Verification (no auth required)
Route::get('/api/public/verify-plate', function (Request $request) {
    $plate = strtoupper(trim($request->query('plate', '')));

    if (!$plate) {
        return response()->json(['found' => false, 'error' => 'No plate number provided.'], 400);
    }

    // Exact plate first. A partial entry (e.g. "8812" for "AAA-8812") is only accepted when it
    // identifies exactly ONE unit — several matches are reported as ambiguous rather than showing
    // an arbitrary unit's record. LIKE wildcards typed by the user are matched literally.
    $tricycle = \App\Models\Tricycle::with(['operator', 'franchiseScheme'])
        ->where('plate_number', $plate)
        ->first();

    if (!$tricycle) {
        $like = addcslashes($plate, '%_\\');
        $matches = \App\Models\Tricycle::with(['operator', 'franchiseScheme'])
            ->where(function ($q) use ($like) {
                $q->where('plate_number', 'LIKE', "%-{$like}")
                  ->orWhere('plate_number', 'LIKE', "{$like}%");
            })
            ->limit(2)
            ->get();

        if ($matches->count() > 1) {
            return response()->json(['found' => false, 'ambiguous' => true]);
        }
        $tricycle = $matches->first();
    }

    if (!$tricycle) {
        return response()->json(['found' => false]);
    }

    $fs = $tricycle->franchiseScheme;
    $app = $tricycle->applications()->with('statusHistories')->latest()->first();
    $isAppCompleted = $app && in_array($app->status, ['completed', 'scheme_issued'], true);
    $isAppInProgress = $app && !$isAppCompleted && $app->status !== 'cancelled';

    // Franchise standing, most serious first. An application in progress cannot be reported
    // as an active franchise — sticker release and permit activation are only valid after
    // final confirmation.
    if ($isAppInProgress) {
        $franchiseStatus = match (true) {
            $fs && $fs->isRevoked()                                  => 'Revoked',
            ($fs && $fs->isSuspended()) || $tricycle->status === 'suspended' => 'Suspended',
            $app->status === 'rejected'                              => 'Rejected',
            $app->status === 'failed_inspection'                     => 'Reinspection Required',
            $app->application_type === 'renewal' && $fs && $fs->expiry_date && $fs->expiry_date->isPast() => 'Expired',
            $app->application_type === 'renewal' && $fs && $fs->is_active && $fs->expiry_date && $fs->expiry_date->isFuture() => 'Active',
            default                                                  => 'Pending',
        };
    } else {
        $franchiseStatus = match (true) {
            $fs && $fs->isRevoked()                                  => 'Revoked',
            ($fs && $fs->isSuspended()) || $tricycle->status === 'suspended' => 'Suspended',
            $fs && $fs->expiry_date && $fs->expiry_date->isPast()    => 'Expired',
            $fs && $fs->is_active && $tricycle->status === 'active'  => 'Active',
            $tricycle->status === 'active' && (!$app || $isAppCompleted) => 'Active',
            $tricycle->status === 'unregistered'                     => 'Unregistered',
            default                                                  => 'Pending',
        };
    }

    // Current application status for this unit, in plain public language — never the
    // internal status codes (pending_review, failed_inspection, …). A resubmission is
    // distinguished from a first pass by the unit's own status history: rejected at least
    // once, then back under review, really means "resubmission in process".
    $applicationStatus = null;
    if ($app) {
        $wasRejectedBefore = $app->statusHistories->contains('to_status', 'rejected');

        $applicationStatus = match (true) {
            $app->status === 'rejected'       => 'Rejected — Resubmission Required',
            $app->status === 'failed_inspection' => 'Reinspection Required',
            in_array($app->status, ['pending_review', 'under_review'], true)
                => $wasRejectedBefore ? 'Resubmission — In Process' : 'In Process',
            in_array($app->status, ['pending_inspection', 'under_inspection'], true)
                => 'In Process — Pending Inspection',
            in_array($app->status, ['pending_payment', 'payment_issue'], true)
                => 'In Process — Pending Payment',
            in_array($app->status, ['payment_verified', 'paid', 'pending_bplo_release'], true)
                => 'In Process — Pending Release',
            $app->status === 'awaiting_tmo_confirmation' => 'In Process — Awaiting TMO Confirmation',
            // A completed application behind an expired permit is not a current approval.
            in_array($app->status, ['completed', 'scheme_issued'], true)
                => $franchiseStatus === 'Expired' ? 'Renewal Required' : 'Approved',
            $app->status === 'cancelled'      => 'Cancelled',
            default                           => 'In Process',
        };
    }

    return response()->json([
        'found'              => true,
        'plate'              => $tricycle->plate_number,
        'operator'           => $tricycle->operator ? $tricycle->operator->full_name : 'N/A',
        'make_model'         => trim("{$tricycle->make} {$tricycle->model}"),
        'status'             => $franchiseStatus,
        'application_status' => $applicationStatus,
        'expiry'             => ($isAppInProgress && $app->application_type !== 'renewal') ? null : ($fs && $fs->expiry_date ? $fs->expiry_date->format('M d, Y') : null),
        // Sticker and franchise numbers are only displayed for completed, valid permits — never while an application is in progress.
        'franchise_number'   => $isAppInProgress ? null : ($fs?->franchise_number ?: null),
        'sticker_number'     => $isAppInProgress ? null : ($fs?->sticker_number ?: null),
    ]);
})->name('public.verify-plate');

// Unified Login
Route::get('/login', [OperatorAuthController::class, 'showLoginForm'])->name('login');
Route::post('/login', [OperatorAuthController::class, 'login'])->name('login.submit');

/*
|--------------------------------------------------------------------------
| 2. ADMIN & ROLE-DISPATCHER — Dashboard
|--------------------------------------------------------------------------
*/

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        $user = Auth::user();
        return match ($user?->role) {
            'tmo_personnel'      => redirect()->route('tmo.dashboard'),
            'bplo_staff'         => redirect()->route('bplo.dashboard'),
            'tricycle_driver'    => redirect()->route('operator.dashboard'),
            'admin'              => Inertia::render('Dashboard'),
            default              => redirect()->route('login'),
        };
    })->name('dashboard');
});


/*
|--------------------------------------------------------------------------
| 3. TMO — Traffic Management Office
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:tmo_personnel,admin'])->group(function () {

    // TMO Landing Dashboard (real pipeline overview)
    Route::get('/tmo-dashboard', [TMODashboardController::class, 'index'])->name('tmo.dashboard');
    // Fleet Monitoring (live map)
    Route::get('/tmo/live', [DashboardController::class, 'index'])->name('tmo.live');

    // Unit Registry
    Route::get('/tmo/registry', [DashboardController::class, 'registry'])->name('tmo.registry');
    // Excel export of the Active Tricycle Registry — same shared municipal styling as
    // the Reports exports (ExportsMunicipalExcelReports trait).
    Route::get('/tmo/registry/export/excel', [DashboardController::class, 'exportRegistryExcel'])->name('tmo.registry.export-excel');

    // Tricycle Details
    Route::get('/tmo/tricycle/{id}', [DashboardController::class, 'tricycleDetails'])->name('tricycle.details');

    // Franchise Status Management (Active/Suspended/Revoked) — operational authorization for
    // this tricycle's franchise permit, shown on the Tricycle Details page. Bound on the
    // Tricycle (not the FranchiseScheme directly) since that's what this page already keys on;
    // the controller resolves the tricycle's current scheme itself. See
    // App\Models\FranchiseScheme::transitionStatus() for the state machine.
    Route::post('/tmo/tricycles/{tricycle}/franchise/suspend', [\App\Http\Controllers\TMO\FranchiseStatusController::class, 'suspend'])->name('tmo.franchise.suspend');
    Route::post('/tmo/tricycles/{tricycle}/franchise/revoke', [\App\Http\Controllers\TMO\FranchiseStatusController::class, 'revoke'])->name('tmo.franchise.revoke');
    Route::post('/tmo/tricycles/{tricycle}/franchise/reinstate', [\App\Http\Controllers\TMO\FranchiseStatusController::class, 'reinstate'])->name('tmo.franchise.reinstate');

    // QR management (Tricycle Details page) — QR regeneration and the printable "Scan to Ride"
    // sheet. Passenger capacity is NOT configured here: it is read-only in TMO and is configured
    // by the driver in the Driver App (see Api\DriverQrCodeController). See
    // TMO\QrRideController / QrRideService::tmoSummary().
    Route::post('/tmo/tricycles/{tricycle}/qr-ride/regenerate', [\App\Http\Controllers\TMO\QrRideController::class, 'regenerate'])->name('tmo.qr-ride.regenerate');
    Route::get('/tmo/tricycles/{tricycle}/qr-ride/print', [\App\Http\Controllers\TMO\QrRideController::class, 'print'])->name('tmo.qr-ride.print');

    // Violation Records
    Route::get('/violations', [DashboardController::class, 'violations'])->name('tmo.violations');
    // Excel export of the Violation Records list — same shared municipal styling as the
    // Reports exports (ExportsMunicipalExcelReports trait). Placed before /violations/{id}
    // so the static "export/excel" segments can't be swallowed by the {id} placeholder.
    Route::get('/violations/export/excel', [DashboardController::class, 'exportViolationRecordsExcel'])->name('tmo.violations.export-excel');
    Route::get('/violations/{id}', [DashboardController::class, 'violationDetails'])->name('tmo.violations.details');
    Route::get('/tmo/violations/create', [DashboardController::class, 'createViolation'])->name('tmo.violations.create');
    Route::post('/tmo/violations/store', [DashboardController::class, 'storeViolation'])->name('tmo.violations.store');

    // Offline treasury payment confirmation — driver pays the fine in person at the
    // Municipal Treasurer's cashier, then presents the official receipt to TMO, who
    // confirms it directly from the violation's own details page.
    Route::post('/tmo/violations/{violation}/confirm-payment', [App\Http\Controllers\TMO\ViolationPaymentController::class, 'confirm'])->name('tmo.violations.confirm-payment');

    // Municipal ordinance enforcement confirmation (3rd offense impoundment/suspension, 4th offense revocation)
    Route::post('/tmo/violations/{violation}/confirm-enforcement', [\App\Http\Controllers\TMO\ViolationEnforcementController::class, 'confirm'])->name('tmo.violations.confirm-enforcement');

    // Appeal review — approving/rejecting a driver's appeal is a TMO/admin-only decision,
    // enforced by this same role middleware; the driver mobile API never exposes these.
    Route::post('/tmo/appeals/{id}/approve', [DashboardController::class, 'approveAppeal'])->name('tmo.appeals.approve');
    Route::post('/tmo/appeals/{id}/reject', [DashboardController::class, 'rejectAppeal'])->name('tmo.appeals.reject');

    // --- PHASE 1: DOCUMENT REVIEW ---
    Route::get('/tmo/docs', [App\Http\Controllers\TMO\ApplicationController::class, 'index'])->name('tmo.docs');
    Route::get('/tmo/review/docs/{application}', [App\Http\Controllers\TMO\ApplicationController::class, 'show'])->name('tmo.review.docs');
    Route::post('/tmo/review/docs/{application}', [App\Http\Controllers\TMO\ApplicationController::class, 'review'])->name('tmo.review.submit');

    // --- PHASE 2: PHYSICAL TRICYCLE INSPECTION ---
    Route::get('/tmo/physical', [App\Http\Controllers\TMO\InspectionController::class, 'index'])->name('tmo.physical');
    Route::get('/tmo/review/physical/{application}', [App\Http\Controllers\TMO\InspectionController::class, 'show'])->name('tmo.review.physical');
    Route::post('/tmo/review/physical/{application}', [App\Http\Controllers\TMO\InspectionController::class, 'store'])->name('tmo.review.physical.submit');

    // Payment (Municipal Treasurer's Office) happens entirely offline — the system never
    // verifies or records it. See BPLO\BPLOController::release() for the instructional-only
    // notice shown before BPLO releases the sticker/plate.

    // --- PHASE 3: FINAL CONFIRMATION & GPS SETUP ---
    Route::get('/tmo/final-confirmation', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'index'])->name('tmo.final-confirmation');
    Route::get('/tmo/final-confirmation/{application}', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'show'])->name('tmo.final-confirmation.show');
    Route::post('/tmo/final-confirmation/{application}', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'confirm'])->name('tmo.final-confirmation.confirm');

    // --- REPORTS & ANALYTICS ---
    Route::get('/tmo/reports', [App\Http\Controllers\TMO\ReportController::class, 'index'])->name('tmo.reports');
    Route::get('/tmo/reports/export/violations-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportViolationsExcel'])->name('tmo.reports.export-violations-excel');
    Route::get('/tmo/reports/export/applications-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportApplicationsExcel'])->name('tmo.reports.export-applications-excel');
    Route::get('/tmo/reports/export/fleet-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportFleetExcel'])->name('tmo.reports.export-fleet-excel');

    // --- STAFF MANAGEMENT (TMO PERSONNEL) ---
    Route::get('/tmo/users', [App\Http\Controllers\TMO\TMOUserController::class, 'index'])->name('tmo.users');
    Route::post('/tmo/users', [App\Http\Controllers\TMO\TMOUserController::class, 'store'])->name('tmo.users.store');
    Route::put('/tmo/users/{user}', [App\Http\Controllers\TMO\TMOUserController::class, 'update'])->name('tmo.users.update');
    Route::patch('/tmo/users/{user}/toggle-status', [App\Http\Controllers\TMO\TMOUserController::class, 'toggleStatus'])->name('tmo.users.toggle-status');
    Route::post('/tmo/users/{user}/resend-credentials', [App\Http\Controllers\TMO\TMOUserController::class, 'resendCredentials'])->middleware('throttle:6,1')->name('tmo.users.resend-credentials');
    Route::delete('/tmo/users/{user}', [App\Http\Controllers\TMO\TMOUserController::class, 'destroy'])->name('tmo.users.destroy');

    // --- FARE MANAGEMENT ---
    Route::get('/tmo/fares', [App\Http\Controllers\TMO\FareManagementController::class, 'index'])->name('tmo.fares');
    Route::post('/tmo/fares', [App\Http\Controllers\TMO\FareManagementController::class, 'store'])->name('tmo.fares.store');

    // --- SYSTEM ACTIVITY / AUDIT LOGS ---
    Route::get('/tmo/activity-logs', [\App\Http\Controllers\AuditLogController::class, 'index'])->name('tmo.activity-logs');
    Route::get('/tmo/activity-logs/export', [\App\Http\Controllers\AuditLogController::class, 'export'])->name('tmo.activity-logs.export');
    Route::get('/tmo/activity-logs/export/excel', [\App\Http\Controllers\AuditLogController::class, 'exportExcel'])->name('tmo.activity-logs.export-excel');

    // Document Preview Routes
    Route::get('/document/inspection-preview', [DocumentController::class, 'previewDocument'])->name('document.preview');
    Route::get('/document/orcr-preview', [DocumentController::class, 'previewORCR'])->name('document.orcr');
});


/*
|--------------------------------------------------------------------------
| 4. BPLO — Business Permits & Licensing Office
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:bplo_staff,admin'])->group(function () {

    Route::get('/bplo-dashboard', [App\Http\Controllers\BPLO\BPLOController::class, 'dashboard'])->name('bplo.dashboard');

    // Note: Payment Verification is a TMO responsibility (see /tmo/payments above) — BPLO
    // only reviews and releases the Franchise Number once payment has already been verified.

    // Franchise Releasing Queue & Issuance
    Route::get('/bplo/releasing', [App\Http\Controllers\BPLO\BPLOController::class, 'releasingQueue'])->name('bplo.releasing');
    Route::get('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'showReleaseForm'])->name('bplo.issue');
    Route::post('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'release'])->name('bplo.release.submit');
    Route::get('/bplo/registry', [App\Http\Controllers\BPLO\BPLOController::class, 'registry'])->name('bplo.registry');
    // Real server-side .xlsx export — replaces the old client-side CSV button (fake
    // "Exporting..." delay + non-Excel CSV). Uses the shared ExportsMunicipalExcelReports
    // trait. Declared before /bplo/registry/{plateNo} so "export" isn't read as a plateNo.
    Route::get('/bplo/registry/export/excel', [App\Http\Controllers\BPLO\BPLOController::class, 'exportActiveRegistryExcel'])->name('bplo.registry.export-excel');
    Route::get('/bplo/registry/{plateNo}', [App\Http\Controllers\BPLO\BPLOController::class, 'registryDetails'])->name('bplo.registry.details');

    // Reports & Analytics — a single-page BPLO Releasing report (see BPLOReportController), not
    // the old 4-tab overview/trends/releasing/records layout.
    Route::get('/bplo/reports', [App\Http\Controllers\BPLO\BPLOReportController::class, 'index'])->name('bplo.reports');
    Route::get('/bplo/reports/export/excel', [App\Http\Controllers\BPLO\BPLOReportController::class, 'exportExcel'])->name('bplo.reports.export-excel');

    // --- STAFF MANAGEMENT (BPLO STAFF) ---
    Route::get('/bplo/users', [App\Http\Controllers\BPLO\BPLOUserController::class, 'index'])->name('bplo.users');
    Route::post('/bplo/users', [App\Http\Controllers\BPLO\BPLOUserController::class, 'store'])->name('bplo.users.store');
    Route::put('/bplo/users/{user}', [App\Http\Controllers\BPLO\BPLOUserController::class, 'update'])->name('bplo.users.update');
    Route::patch('/bplo/users/{user}/toggle-status', [App\Http\Controllers\BPLO\BPLOUserController::class, 'toggleStatus'])->name('bplo.users.toggle-status');
    Route::post('/bplo/users/{user}/resend-credentials', [App\Http\Controllers\BPLO\BPLOUserController::class, 'resendCredentials'])->middleware('throttle:6,1')->name('bplo.users.resend-credentials');
    Route::delete('/bplo/users/{user}', [App\Http\Controllers\BPLO\BPLOUserController::class, 'destroy'])->name('bplo.users.destroy');

    // --- SYSTEM ACTIVITY / AUDIT LOGS (BPLO staff activity only) ---
    Route::get('/bplo/activity-logs', [\App\Http\Controllers\AuditLogController::class, 'index'])->name('bplo.activity-logs');
    Route::get('/bplo/activity-logs/export', [\App\Http\Controllers\AuditLogController::class, 'export'])->name('bplo.activity-logs.export');
});


/*
|--------------------------------------------------------------------------
| 6. TRICYCLE DRIVER / OPERATOR PORTAL
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:tricycle_driver,admin'])->group(function () {

    Route::get('/operator/dashboard', [App\Http\Controllers\Operator\DashboardController::class, 'index'])
        ->name('operator.dashboard');

    Route::get('/operator/fleet', function (Request $request) {
        $user = $request->user();
        $operator = $user->operator;

        $tricycles = [];
        if ($operator) {
            $units = \App\Models\Tricycle::where('operator_id', $operator->id)
                ->with(['franchiseScheme.colorCodingScheme', 'applications.tricycleDriver', 'applications.operator'])
                ->orderBy('id')
                ->get();

            // One source of truth: Driver → Application → Approved/Active Franchise →
            // Registered Tricycle. A unit only counts as a registered tricycle once THIS
            // driver's own application for it reached an approved state (completed /
            // scheme_issued). Applications still pending — document review, physical
            // inspection, BPLO release, final confirmation, resubmission, or reinspection —
            // are returned with isRegistered=false so the page can present them in a
            // clearly separate "pending application" section instead of misrepresenting
            // them as active registered units. A unit with no application relationship at
            // all isn't part of this driver's application/franchise chain, so it is not
            // this driver's registered or in-application unit and is not shown at all.
            $tricycles = $units->map(function ($tri) use ($operator) {
                $driverApps = $tri->applications
                    ->where('operator_id', $operator->id)
                    ->values();

                if ($driverApps->isEmpty()) {
                    return null;
                }

                $approvedApp = $driverApps
                    ->whereIn('status', ['completed', 'scheme_issued'])
                    ->sortByDesc('id')
                    ->first();

                $isRegistered = $approvedApp !== null;
                $sourceApp = $approvedApp
                    ?? $driverApps->whereNotIn('status', ['completed', 'scheme_issued'])->sortByDesc('id')->first();

                // The unit's current active franchise period drives the expired state —
                // the same permit record the TMO/BPLO registries show for this unit.
                $scheme = $tri->franchiseScheme;
                $isExpired = $scheme && $scheme->expiry_date ? $scheme->expiry_date->isPast() : false;

                $vehicleStatus = match (true) {
                    ! $isRegistered                              => 'pending',
                    in_array($tri->status, ['suspended', 'revoked'], true) => $tri->status,
                    $isExpired                                   => 'expired',
                    default                                      => 'active',
                };

                // A tricycle only has real tracking/franchise data worth showing once it is
                // registered through an approved application. Before that, the unit is still
                // mid-application: no real GPS history normally exists yet, and showing
                // tracking/franchise UI for a pending unit is misleading. Redact those fields
                // at the source here, not just in the frontend, so a pending unit never
                // receives them at all.
                $isFinalized = $isRegistered;

                $lastSignal = null;
                $colorScheme = null;
                if ($isFinalized) {
                    $latestLocation = $tri->locations()->latest('recorded_at')->first();

                    // Real signal freshness — which method (device/app) last actually reported a
                    // location, and how recently. Only fields the DB actually stores; no
                    // fabricated battery/signal-strength/accuracy telemetry. "Recent" is the
                    // configured Live Monitoring no-signal threshold (fleet_signal_lost_seconds),
                    // so My Tricycles / Live Tracking agree with TMO Live Monitoring on how old a
                    // ping can be before the unit reads as lost.
                    $recentSeconds = (int) config('tracking.fleet_signal_lost_seconds', 60);

                    $lastSignal = $latestLocation ? [
                        'source'    => $latestLocation->source,
                        'latitude'  => (float) $latestLocation->latitude,
                        'longitude' => (float) $latestLocation->longitude,
                        'at'        => $latestLocation->recorded_at->diffForHumans(),
                        'isRecent'  => $latestLocation->recorded_at->diffInSeconds(now()) <= $recentSeconds,
                    ] : null;

                    $colorScheme = $tri->franchiseScheme?->colorCodingScheme;
                }

                return [
                    // Pending units have not been issued a Sticker Number by BPLO —
                    // never present a pre-application Sticker Number as if it were one.
                    'id'                   => $isRegistered ? ($tri->coding_scheme_number ?: 'Pending Sticker No') : 'Pending Sticker No',
                    'db_id'                => $tri->id,
                    'makeModel'            => "{$tri->make} {$tri->model}",
                    'plateNo'              => $tri->plate_number,
                    'driver'               => $operator->full_name,
                    // Tricycle Owner (this operator — always the primary person for the unit)
                    // + the optional separate Tricycle Driver from this unit's application.
                    'owner'                => $sourceApp->ownerDetails(),
                    'ownerIsDriver'        => (bool) $sourceApp->owner_is_driver,
                    'tricycleDriver'       => $sourceApp->driverDetails(),
                    // Registered vehicle specs from the Tricycle Registration record — read-only
                    // here; the driver enters these once during MTOP registration, never again.
                    // Always shown, regardless of application status.
                    'yearModel'            => $tri->year_model ?: null,
                    'bodyColor'            => $tri->body_color ?: null,
                    'bodyType'             => $tri->body_type ?: null,
                    'engineNumber'         => $tri->engine_number ?: null,
                    'chassisNumber'        => $tri->chassis_number ?: null,
                    'orNumber'             => $tri->or_number ?: null,
                    'crNumber'             => $tri->cr_number ?: null,
                    // The unit's registration/operational display status — derived from the
                    // application/franchise relationship above (active / expired / suspended /
                    // revoked, or 'pending' while still mid-application) — distinct from
                    // tracking connectivity, which is derived purely from lastSignal below.
                    'vehicleStatus'        => $vehicleStatus,
                    'isRegistered'         => $isRegistered,
                    'applicationReference' => $sourceApp->reference_number,
                    'applicationStatus'    => $sourceApp->status,
                    // Compact workflow-stage key for a not-yet-registered unit's badge —
                    // mirrors Operator\MTOPController::index()'s status categories.
                    'pendingStage'         => $isRegistered ? null : match ($sourceApp->status) {
                        'draft'                                     => 'draft',
                        'rejected'                                  => 'rejected',
                        'pending_inspection', 'under_inspection'    => 'inspection',
                        'failed_inspection'                         => 'reinspection',
                        'pending_bplo_release'                      => 'bplo',
                        'awaiting_tmo_confirmation'                 => 'final',
                        default                                      => 'review',
                    },
                    'franchiseExpiry'      => $isRegistered && $scheme?->expiry_date ? $scheme->expiry_date->toDateString() : null,
                    'franchiseExpired'     => $isRegistered && $isExpired,
                    'isFinalized'          => $isFinalized,
                    // Everything below is registered-only — null/N/A until then.
                    'colorCode'            => $colorScheme ? $colorScheme->name : ($isFinalized ? 'N/A' : null),
                    'colorHex'             => $colorScheme ? $colorScheme->color_hex : null,
                    'trackingCapability'   => $isFinalized ? $tri->tracking_capability : null,
                    'activeTrackingMode'   => $isFinalized ? $tri->active_tracking_mode : null,
                    'iotDeviceId'          => $isFinalized ? $tri->iot_device_id : null,
                    'lastSignal'           => $lastSignal,
                ];
            })->filter()->values()->toArray();
        }

        return Inertia::render('Operator/Fleet', [
            'tricycles' => $tricycles,
        ]);
    })->name('operator.fleet');

    Route::get('/operator/tracking', function (Request $request) {
        $user = $request->user();
        $operator = $user->operator;

        $tricycleData = null;
        $positions = [];
        if ($operator) {
            $unitQuery = \App\Models\Tricycle::where('operator_id', $operator->id);
            $tri = $request->query('unit')
                ? $unitQuery->clone()->where('id', $request->query('unit'))->first()
                : null;
            $tri = $tri ?: $unitQuery->orderBy('id')->first();
            if ($tri) {
                // Same "franchise finalized" definition as operator.fleet above — live tracking
                // only makes sense once TMO Final Confirmation has activated the unit. A
                // still-pending application gets no coordinates/telemetry at all, not even the
                // demo fallback path, since there's nothing real to show yet.
                $isFinalized = $tri->status === 'active';

                if ($isFinalized) {
                    // Get all tracking locations for this tricycle
                    $locs = $tri->locations()->orderBy('recorded_at', 'asc')->get();
                    foreach ($locs as $l) {
                        $positions[] = [(float)$l->latitude, (float)$l->longitude];
                    }

                    // No fabricated fallback coordinates: with zero recorded pings the frontend
                    // renders an explicit "no GPS ping recorded yet" state instead of a demo point.

                    $latestLocation = $tri->locations()->latest('recorded_at')->first();
                    // Same "recent" definition as operator.fleet above: the configured Live
                    // Monitoring no-signal threshold (fleet_signal_lost_seconds), so the two
                    // operator pages never disagree with each other or TMO Live Monitoring.
                    $recentSeconds = (int) config('tracking.fleet_signal_lost_seconds', 60);
                    $isRecentPing = $latestLocation && $latestLocation->recorded_at->diffInSeconds(now()) <= $recentSeconds;

                    $tricycleData = [
                        'db_id'                => $tri->id,
                        'coding_scheme_number' => $tri->coding_scheme_number ?: 'Pending',
                        'make_model'           => "{$tri->make} {$tri->model}",
                        'plate_no'             => $tri->plate_number,
                        'isFinalized'          => true,
                        'active_tracking_mode' => $tri->active_tracking_mode,
                        'iot_device_id'        => $tri->iot_device_id,
                        'heading'              => $latestLocation ? (int)$latestLocation->heading_deg : 0,
                        'accuracy'             => $latestLocation ? (float)$latestLocation->accuracy_m : null,
                        'last_ping'            => $latestLocation ? $latestLocation->recorded_at->diffForHumans() : 'Never',
                        'is_recent_ping'       => $isRecentPing,
                    ];
                } else {
                    $tricycleData = [
                        'db_id'        => $tri->id,
                        'coding_scheme_number' => $tri->coding_scheme_number ?: 'Pending',
                        'make_model'   => "{$tri->make} {$tri->model}",
                        'plate_no'     => $tri->plate_number,
                        'isFinalized'  => false,
                    ];
                }
            }
        }

        return Inertia::render('Operator/LiveTracking', [
            'tricycle'         => $tricycleData,
            'pathCoordinates'  => $positions,
        ]);
    })->name('operator.tracking');

    // MTOP Franchise Compliance
    Route::get('/operator/mtop', [App\Http\Controllers\Operator\MTOPController::class, 'index'])->name('operator.mtop');

    Route::get('/operator/mtop/create', [App\Http\Controllers\Operator\MTOPController::class, 'create'])->name('operator.mtop.create');
    Route::post('/operator/mtop/store', [App\Http\Controllers\Operator\MTOPController::class, 'store'])->name('operator.mtop.store');

    Route::get('/operator/mtop/{id}', [App\Http\Controllers\Operator\MTOPController::class, 'show'])->name('operator.mtop.details');

    Route::get('/operator/mtop/{id}/fix', [App\Http\Controllers\Operator\MTOPController::class, 'fix'])->name('operator.mtop.fix');
    Route::post('/operator/mtop/{id}/fix', [App\Http\Controllers\Operator\MTOPController::class, 'submitFix'])->name('operator.mtop.submit-fix');

    // Violations (traffic-fine payment confirmation is a separate, preserved subsystem — see
    // TMO\ViolationPaymentController — not the franchise/MTOP payment flow removed from this app)
    Route::get('/operator/violations', [App\Http\Controllers\Operator\ViolationController::class, 'index'])->name('operator.violations');
    Route::get('/operator/violations/{id}/ticket', [App\Http\Controllers\Operator\ViolationController::class, 'ticket'])->name('operator.violations.ticket');
    Route::post('/operator/violations/{id}/appeal', [App\Http\Controllers\Operator\ViolationController::class, 'storeAppeal'])->name('operator.violations.appeal');
});


/*
|--------------------------------------------------------------------------
| 7. PROFILE & ACCOUNT SETTINGS (any authenticated role)
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {
    // Account Settings is read-only for profile details (managed by each office's staff
    // management); only the password can be changed here (PUT /password).
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile/photo', [ProfileController::class, 'updatePhoto'])->name('profile.photo.update');
    Route::delete('/profile/photo', [ProfileController::class, 'destroyPhoto'])->name('profile.photo.destroy');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Header notification bell — always the signed-in user's own notifications.
    Route::get('/notifications/{id}/open', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
});

/*
|--------------------------------------------------------------------------
| 8. CONFIDENTIAL DOCUMENTS & EVIDENCE ACCESS
|--------------------------------------------------------------------------
*/

Route::get('/documents/application/{id}', [\App\Http\Controllers\SecureDocumentController::class, 'showApplicationDocument'])
    ->name('documents.application.show');
Route::get('/documents/violation-appeal/{id}', [\App\Http\Controllers\SecureDocumentController::class, 'showViolationAppealEvidence'])
    ->name('documents.violation_appeal.show');

require __DIR__ . '/auth.php';


