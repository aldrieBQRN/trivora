<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TMO\DashboardController as TMODashboardController;
use App\Http\Controllers\TMO\TodaController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\OperatorAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\TMO\UserManagementController;
use App\Models\FranchiseScheme;
use App\Models\Payment;
use App\Models\TodaZone;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC & GUEST ROUTES
|--------------------------------------------------------------------------
*/

// Landing Page — overview numbers are real counts (not placeholders), using the same
// "active franchise" definition already used by the Operator dashboard (is_active + not
// yet expired) so this stays consistent with how "active" is defined elsewhere in the app.
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'overview' => [
            'activePermits' => FranchiseScheme::where('is_active', true)
                ->where('expiry_date', '>', now())
                ->count(),
            'todaCount' => TodaZone::where('is_active', true)->count(),
            'paymentsToday' => Payment::whereDate('payment_date', now()->toDateString())->count(),
        ],
    ]);
})->name('home');

// Public MTOP Registration Wizard (Account Creation + First Application)
Route::get('/register-mtop', [RegistrationController::class, 'publicWizard'])->name('register.public');
Route::post('/register-mtop', [RegistrationController::class, 'store'])->name('register.public.submit');

// Public Plate/Franchise Verification (no auth required)
Route::get('/api/public/verify-plate', function (Request $request) {
    $plate = strtoupper(trim($request->query('plate', '')));

    if (!$plate) {
        return response()->json(['found' => false, 'error' => 'No plate number provided.'], 400);
    }

    // Try exact match first, then suffix match (e.g. "8812" matches "AAA-8812")
    $tricycle = \App\Models\Tricycle::with(['operator', 'todaZone', 'franchiseScheme'])
        ->where('plate_number', $plate)
        ->orWhere('plate_number', 'LIKE', "%-{$plate}")
        ->orWhere('plate_number', 'LIKE', "{$plate}%")
        ->first();

    if (!$tricycle) {
        return response()->json(['found' => false]);
    }

    $fs = $tricycle->franchiseScheme;

    // Use tricycle.status as the primary source of truth
    $franchiseStatus = match(true) {
        $tricycle->status === 'active'       => 'Active',
        $tricycle->status === 'unregistered' => 'Unregistered',
        $fs && $fs->expiry_date && $fs->expiry_date->isPast() => 'Expired',
        default                              => 'Pending',
    };

    return response()->json([
        'found'          => true,
        'plate'          => $tricycle->plate_number,
        'operator'       => $tricycle->operator ? $tricycle->operator->full_name : 'N/A',
        'make_model'     => trim("{$tricycle->make} {$tricycle->model}"),
        'toda'           => $tricycle->todaZone ? $tricycle->todaZone->name : 'N/A',
        'status'         => $franchiseStatus,
        'expiry'         => $fs && $fs->expiry_date ? $fs->expiry_date->format('M d, Y') : null,
        'body_number'    => $tricycle->body_number ?: null,
    ]);
})->name('public.verify-plate');

// Unified Login
Route::middleware('guest')->group(function () {
    Route::get('/login', [OperatorAuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [OperatorAuthController::class, 'login'])->name('login.submit');
});



/*
|--------------------------------------------------------------------------
| 2. ADMIN — General Dashboard
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
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

    // Tricycle Details
    Route::get('/tmo/tricycle/{id}', [DashboardController::class, 'tricycleDetails'])->name('tricycle.details');

    // TODA Management
    Route::get('/tmo/toda', [TodaController::class, 'index'])->name('tmo.toda');
    Route::post('/tmo/toda', [TodaController::class, 'store'])->name('tmo.toda.store');
    Route::get('/tmo/toda/{id}', [TodaController::class, 'show'])->name('tmo.toda.show');
    Route::put('/tmo/toda/{id}', [TodaController::class, 'update'])->name('tmo.toda.update');
    Route::patch('/tmo/toda/{id}/toggle-status', [TodaController::class, 'toggleStatus'])->name('tmo.toda.toggle-status');

    // Violation Records
    Route::get('/violations', [DashboardController::class, 'violations'])->name('tmo.violations');
    Route::get('/violations/{id}', [DashboardController::class, 'violationDetails'])->name('tmo.violations.details');
    Route::get('/tmo/violations/create', [DashboardController::class, 'createViolation'])->name('tmo.violations.create');
    Route::post('/tmo/violations/store', [DashboardController::class, 'storeViolation'])->name('tmo.violations.store');

    // Offline treasury payment confirmation — driver pays the fine in person at the
    // Municipal Treasurer's cashier, then presents the official receipt to TMO, who
    // confirms it directly from the violation's own details page.
    Route::post('/tmo/violations/{violation}/confirm-payment', [App\Http\Controllers\TMO\ViolationPaymentController::class, 'confirm'])->name('tmo.violations.confirm-payment');

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
    Route::get('/tmo/ticket/{application}', [App\Http\Controllers\Operator\MTOPController::class, 'paymentTicket'])->name('tmo.ticket');

    // --- PHASE 2.5: MUNICIPAL TREASURER PAYMENT VERIFICATION ---
    // Driver pays offline at the Municipal Treasurer's Office, then returns to TMO with the
    // Official Receipt for verification. There is no in-system cashier/payment gateway.
    Route::get('/tmo/payments', [App\Http\Controllers\TMO\PaymentVerificationController::class, 'index'])->name('tmo.payments');
    Route::get('/tmo/verify-payment/{application}', [App\Http\Controllers\TMO\PaymentVerificationController::class, 'show'])->name('tmo.verify-payment');
    Route::post('/tmo/verify-payment/{application}', [App\Http\Controllers\TMO\PaymentVerificationController::class, 'verify'])->name('tmo.verify-payment.submit');

    // --- PHASE 3: FINAL CONFIRMATION & GPS SETUP ---
    Route::get('/tmo/final-confirmation', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'index'])->name('tmo.final-confirmation');
    Route::get('/tmo/final-confirmation/{application}', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'show'])->name('tmo.final-confirmation.show');
    Route::post('/tmo/final-confirmation/{application}', [App\Http\Controllers\TMO\FinalConfirmationController::class, 'confirm'])->name('tmo.final-confirmation.confirm');

    // --- REPORTS & ANALYTICS ---
    Route::get('/tmo/reports', [App\Http\Controllers\TMO\ReportController::class, 'index'])->name('tmo.reports');
    Route::get('/tmo/reports/export/violations-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportViolationsExcel'])->name('tmo.reports.export-violations-excel');
    Route::get('/tmo/reports/export/applications-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportApplicationsExcel'])->name('tmo.reports.export-applications-excel');
    Route::get('/tmo/reports/export/fleet-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportFleetExcel'])->name('tmo.reports.export-fleet-excel');
    Route::get('/tmo/reports/export/collections-excel', [App\Http\Controllers\TMO\ReportController::class, 'exportCollectionsExcel'])->name('tmo.reports.export-collections-excel');

    // --- STAFF MANAGEMENT (TMO PERSONNEL) ---
    Route::get('/tmo/users', [App\Http\Controllers\TMO\TMOUserController::class, 'index'])->name('tmo.users');
    Route::post('/tmo/users', [App\Http\Controllers\TMO\TMOUserController::class, 'store'])->name('tmo.users.store');
    Route::put('/tmo/users/{user}', [App\Http\Controllers\TMO\TMOUserController::class, 'update'])->name('tmo.users.update');
    Route::patch('/tmo/users/{user}/toggle-status', [App\Http\Controllers\TMO\TMOUserController::class, 'toggleStatus'])->name('tmo.users.toggle-status');
    Route::delete('/tmo/users/{user}', [App\Http\Controllers\TMO\TMOUserController::class, 'destroy'])->name('tmo.users.destroy');

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
    // only reviews and releases the franchise sticker once payment has already been verified.

    // Franchise Sticker Releasing Queue & Issuance
    Route::get('/bplo/releasing', [App\Http\Controllers\BPLO\BPLOController::class, 'releasingQueue'])->name('bplo.releasing');
    Route::get('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'showReleaseForm'])->name('bplo.issue');
    Route::post('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'release'])->name('bplo.release.submit');
    Route::get('/bplo/registry', [App\Http\Controllers\BPLO\BPLOController::class, 'registry'])->name('bplo.registry');
    Route::get('/bplo/registry/{plateNo}', [App\Http\Controllers\BPLO\BPLOController::class, 'registryDetails'])->name('bplo.registry.details');
    Route::get('/bplo/ticket/{application}', [App\Http\Controllers\Operator\MTOPController::class, 'paymentTicket'])->name('bplo.ticket');

    // --- STAFF MANAGEMENT (BPLO STAFF) ---
    Route::get('/bplo/users', [App\Http\Controllers\BPLO\BPLOUserController::class, 'index'])->name('bplo.users');
    Route::post('/bplo/users', [App\Http\Controllers\BPLO\BPLOUserController::class, 'store'])->name('bplo.users.store');
    Route::put('/bplo/users/{user}', [App\Http\Controllers\BPLO\BPLOUserController::class, 'update'])->name('bplo.users.update');
    Route::patch('/bplo/users/{user}/toggle-status', [App\Http\Controllers\BPLO\BPLOUserController::class, 'toggleStatus'])->name('bplo.users.toggle-status');
    Route::delete('/bplo/users/{user}', [App\Http\Controllers\BPLO\BPLOUserController::class, 'destroy'])->name('bplo.users.destroy');
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
                ->with(['franchiseScheme.colorCodingScheme', 'todaZone'])
                ->orderBy('id')
                ->get();

            $tricycles = $units->map(function ($tri) use ($operator) {
                $latestLocation = $tri->locations()->latest('recorded_at')->first();

                // Real signal freshness — which method (device/app) last actually reported a
                // location, and how recently. Only fields the DB actually stores; no
                // fabricated battery/signal-strength/accuracy telemetry.
                $lastSignal = $latestLocation ? [
                    'source'    => $latestLocation->source,
                    'latitude'  => (float) $latestLocation->latitude,
                    'longitude' => (float) $latestLocation->longitude,
                    'at'        => $latestLocation->recorded_at->diffForHumans(),
                    'isRecent'  => $latestLocation->recorded_at->gt(now()->subMinutes(15)),
                ] : null;

                // Franchise application status/history has its own dedicated pages (My
                // Tricycles just needs the currently assigned color-coding scheme).
                $colorScheme = $tri->franchiseScheme?->colorCodingScheme;

                return [
                    'id'                   => $tri->body_number ?: 'Pending Body No',
                    'db_id'                => $tri->id,
                    'makeModel'            => "{$tri->make} {$tri->model}",
                    'plateNo'              => $tri->plate_number,
                    'driver'               => $operator->full_name,
                    'zone'                 => $tri->todaZone ? $tri->todaZone->name : 'N/A',
                    // Registered vehicle specs from the Tricycle Registration record — read-only
                    // here; the driver enters these once during MTOP registration, never again.
                    'yearModel'            => $tri->year_model ?: null,
                    'bodyColor'            => $tri->body_color ?: null,
                    'bodyType'             => $tri->body_type ?: null,
                    'engineNumber'         => $tri->engine_number ?: null,
                    'chassisNumber'        => $tri->chassis_number ?: null,
                    'orNumber'             => $tri->or_number ?: null,
                    'crNumber'             => $tri->cr_number ?: null,
                    'colorCode'            => $colorScheme ? $colorScheme->name : 'N/A',
                    'colorHex'             => $colorScheme ? $colorScheme->color_hex : '#94A3B8',
                    // The tricycle's registration/operational status (unregistered / active /
                    // suspended / revoked) — distinct from tracking connectivity, which is
                    // derived purely from lastSignal below.
                    'vehicleStatus'        => $tri->status,
                    'trackingCapability'   => $tri->tracking_capability,
                    'activeTrackingMode'   => $tri->active_tracking_mode,
                    'iotDeviceId'          => $tri->iot_device_id,
                    'lastSignal'           => $lastSignal,
                ];
            })->values()->toArray();
        }

        $requestedUnit = $request->query('unit');
        $selectedId = null;
        if (!empty($tricycles)) {
            $match = collect($tricycles)->firstWhere('db_id', (int) $requestedUnit);
            $selectedId = $match ? $match['db_id'] : $tricycles[0]['db_id'];
        }

        return Inertia::render('Operator/Fleet', [
            'tricycles'  => $tricycles,
            'selectedId' => $selectedId,
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
                // Get all tracking locations for this tricycle
                $locs = $tri->locations()->orderBy('recorded_at', 'asc')->get();
                foreach ($locs as $l) {
                    $positions[] = [(float)$l->latitude, (float)$l->longitude];
                }

                // Default fallback if no locations recorded yet
                if (empty($positions)) {
                    $positions[] = [14.0725, 120.6355];
                }

                $latestLocation = $tri->locations()->latest('recorded_at')->first();
                $isRecentPing = $latestLocation && $latestLocation->recorded_at->gt(now()->subMinutes(15));

                $tricycleData = [
                    'db_id'                => $tri->id,
                    'body_no'              => $tri->body_number ?: 'Pending',
                    'make_model'           => "{$tri->make} {$tri->model}",
                    'plate_no'             => $tri->plate_number,
                    'zone'                 => $tri->todaZone ? $tri->todaZone->name : 'N/A',
                    'active_tracking_mode' => $tri->active_tracking_mode,
                    'iot_device_id'        => $tri->iot_device_id,
                    'speed'                => $latestLocation ? (float)$latestLocation->speed_kmh : 0,
                    'heading'              => $latestLocation ? (int)$latestLocation->heading_deg : 0,
                    'accuracy'             => $latestLocation ? (float)$latestLocation->accuracy_m : null,
                    'last_ping'            => $latestLocation ? $latestLocation->recorded_at->diffForHumans() : 'Never',
                    'is_recent_ping'       => $isRecentPing,
                    'other_units_count'    => \App\Models\Tricycle::where('operator_id', $operator->id)->count() - 1,
                ];
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

    Route::get('/operator/mtop/{id}/ticket', [App\Http\Controllers\Operator\MTOPController::class, 'paymentTicket'])
        ->name('operator.mtop.ticket');

    // Violations & Payments
    Route::get('/operator/violations', [App\Http\Controllers\Operator\ViolationController::class, 'index'])->name('operator.violations');
    Route::get('/operator/violations/{id}/ticket', [App\Http\Controllers\Operator\ViolationController::class, 'ticket'])->name('operator.violations.ticket');
    Route::post('/operator/violations/{id}/appeal', [App\Http\Controllers\Operator\ViolationController::class, 'storeAppeal'])->name('operator.violations.appeal');

    Route::get('/operator/payments', [App\Http\Controllers\Operator\PaymentController::class, 'index'])->name('operator.payments');
    Route::get('/operator/payments/{id}/receipt', [App\Http\Controllers\Operator\PaymentController::class, 'receipt'])->name('operator.payments.receipt');
});


/*
|--------------------------------------------------------------------------
| 7. PROFILE & ACCOUNT SETTINGS (any authenticated role)
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| 8. INFINITYFREE UTILITY & ARTISAN ENDPOINT
|--------------------------------------------------------------------------
| Token-protected route to run migrations, seeders, and clear caches
| URL: /artisan-migrate?token=YOUR_TOKEN[&seed=1][&fresh=1][&class=SeederName]
*/
Route::get('/artisan-migrate', function (\Illuminate\Http\Request $request) {
    $expectedToken = env('MIGRATION_TOKEN', config('app.key'));
    $providedToken = $request->query('token');

    if (empty($providedToken) || empty($expectedToken) || !hash_equals((string) $expectedToken, (string) $providedToken)) {
        return response("<div style='font-family:sans-serif;padding:30px;max-width:700px;margin:auto;'>"
            . "<h2 style='color:#e11d48;'>403 - Invalid or Missing Migration Token</h2>"
            . "<p>The token provided in the URL did not match the <code>MIGRATION_TOKEN</code> (or <code>APP_KEY</code>) on the server.</p>"
            . "<p><strong>Your URL token:</strong> <code>" . htmlspecialchars($providedToken ?: '(empty)') . "</code></p>"
            . "</div>", 403, ['Content-Type' => 'text/html']);
    }

    $output = [];

    // 1. Test Database Connection First
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $output[] = "=== Database Connection: SUCCESSFUL (" . \Illuminate\Support\Facades\DB::connection()->getDatabaseName() . ") ===\n";
    } catch (\Throwable $e) {
        return response("<div style='font-family:sans-serif;padding:30px;max-width:800px;margin:auto;'>"
            . "<h2 style='color:#e11d48;'>Database Connection Failed</h2>"
            . "<p>Laravel could not connect to MySQL. Please check your InfinityFree database credentials in <code>env.php</code> or <code>.env</code>.</p>"
            . "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>"
            . "</div>", 500, ['Content-Type' => 'text/html']);
    }

    try {
        // 2. Clear cache
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        $output[] = "=== Optimize & Cache Clear ===\n" . \Illuminate\Support\Facades\Artisan::output();

        // 3. Storage link
        if ($request->boolean('storage')) {
            try {
                $target = storage_path('app/public');
                $link = public_path('storage');
                if (!file_exists($link)) {
                    if (function_exists('symlink') && is_dir($target)) {
                        @symlink($target, $link);
                    } else {
                        @mkdir($link, 0775, true);
                    }
                }
                $output[] = "=== Storage Link: Checked / Handled ===\n";
            } catch (\Throwable $e) {
                $output[] = "=== Storage Link Skipped: " . $e->getMessage() . " ===\n";
            }
        }

        // 4. Base Schema loader (bypasses proc_open on shared hosting)
        if (!\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
            $schemaFile = database_path('schema/mysql-schema.sql');
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                \Illuminate\Support\Facades\DB::unprepared($sql);
                $output[] = "=== Base Schema Loaded via PDO ===\n";
            }
        }

        // 5. Migrations & Seeders
        $seedClass = $request->query('class');
        $seedParams = ['--force' => true];
        if ($seedClass) {
            $seedParams['--class'] = $seedClass;
        }

        if ($request->boolean('fresh')) {
            $params = ['--force' => true];
            if ($request->boolean('seed') && !$seedClass) {
                $params['--seed'] = true;
            }
            \Illuminate\Support\Facades\Artisan::call('migrate:fresh', $params);
            $output[] = "=== Migrate Fresh ===\n" . \Illuminate\Support\Facades\Artisan::output();

            if ($request->boolean('seed') && $seedClass) {
                \Illuminate\Support\Facades\Artisan::call('db:seed', $seedParams);
                $output[] = "=== DB Seed ({$seedClass}) ===\n" . \Illuminate\Support\Facades\Artisan::output();
            }
        } else {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $output[] = "=== Database Migration ===\n" . \Illuminate\Support\Facades\Artisan::output();

            if ($request->boolean('seed')) {
                \Illuminate\Support\Facades\Artisan::call('db:seed', $seedParams);
                $output[] = "=== DB Seed ===\n" . \Illuminate\Support\Facades\Artisan::output();
            }
        }

        return response("<div style='font-family:sans-serif;padding:30px;max-width:850px;margin:auto;'>"
            . "<h2 style='color:#0d9488;'>✓ Artisan Operation Completed</h2>"
            . "<pre style='background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;line-height:1.5;overflow:auto;'>"
            . htmlspecialchars(implode("\n", $output))
            . "</pre></div>", 200, ['Content-Type' => 'text/html']);

    } catch (\Throwable $e) {
        return response("<div style='font-family:sans-serif;padding:30px;max-width:850px;margin:auto;'>"
            . "<h2 style='color:#e11d48;'>Operation Failed</h2>"
            . "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>"
            . "<pre style='background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;line-height:1.5;overflow:auto;'>"
            . htmlspecialchars($e->getTraceAsString())
            . "</pre></div>", 500, ['Content-Type' => 'text/html']);
    }
});
