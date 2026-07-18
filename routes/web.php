<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\OperatorAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC & GUEST ROUTES
|--------------------------------------------------------------------------
*/

// Landing Page
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

// Public MTOP Registration Wizard (Account Creation + First Application)
Route::get('/register-mtop', [RegistrationController::class, 'publicWizard'])->name('register.public');
Route::post('/register-mtop', [RegistrationController::class, 'store'])->name('register.public.submit');

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

    // Fleet Monitoring Dashboard (Map)
    Route::get('/tmo-dashboard', [DashboardController::class, 'index'])->name('tmo.dashboard');

    // Unit Registry
    Route::get('/tmo/registry', function () {
        return Inertia::render('TMODashboard/UnitRegistry');
    })->name('tmo.registry');

    // Tricycle Details
    Route::get('/tmo/tricycle/{id}', function ($id) {
        return Inertia::render('TMODashboard/TricycleDetails', ['tricycleId' => $id]);
    })->name('tricycle.details');

    // Violation Records
    Route::get('/violations', function () {
        return Inertia::render('TMODashboard/Violations/Violations');
    })->name('tmo.violations');

    Route::get('/violations/{id}', function ($id) {
        return Inertia::render('TMODashboard/Violations/ViolationDetails', ['violationId' => $id]);
    })->name('tmo.violations.details');

    // --- PHASE 1: DOCUMENT REVIEW ---
    Route::get('/tmo/docs', [App\Http\Controllers\TMO\ApplicationController::class, 'index'])->name('tmo.docs');
    Route::get('/tmo/review/docs/{application}', [App\Http\Controllers\TMO\ApplicationController::class, 'show'])->name('tmo.review.docs');
    Route::post('/tmo/review/docs/{application}', [App\Http\Controllers\TMO\ApplicationController::class, 'review'])->name('tmo.review.submit');

    // Step 2: Physical Inspection Queue
    Route::get('/tmo/physical', [App\Http\Controllers\TMO\InspectionController::class, 'index'])->name('tmo.physical');
    Route::get('/tmo/review/physical/{application}', [App\Http\Controllers\TMO\InspectionController::class, 'show'])->name('tmo.review.physical');
    Route::post('/tmo/review/physical/{application}', [App\Http\Controllers\TMO\InspectionController::class, 'store'])->name('tmo.review.physical.submit');

    // Document Preview Routes
    Route::get('/document/inspection-preview', [DocumentController::class, 'previewDocument'])->name('document.preview');
    Route::get('/document/orcr-preview', [DocumentController::class, 'previewORCR'])->name('document.orcr');
});


/*
|--------------------------------------------------------------------------
| 4. MUNICIPAL TREASURER
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:municipal_treasurer,admin'])->group(function () {
    Route::get('/treasurer/dashboard', [App\Http\Controllers\Treasurer\PaymentController::class, 'dashboard'])->name('treasurer.dashboard');
    Route::get('/treasurer/pending', [App\Http\Controllers\Treasurer\PaymentController::class, 'index'])->name('treasurer.pending');
    Route::get('/treasurer/verify/{application}', [App\Http\Controllers\Treasurer\PaymentController::class, 'show'])->name('treasurer.verify');
    Route::post('/treasurer/verify/{application}', [App\Http\Controllers\Treasurer\PaymentController::class, 'store'])->name('treasurer.verify.submit');
    Route::get('/treasurer/transactions', [App\Http\Controllers\Treasurer\PaymentController::class, 'transactions'])->name('treasurer.transactions');
    Route::get('/treasurer/receipt/{id}', [App\Http\Controllers\Treasurer\PaymentController::class, 'receipt'])->name('treasurer.receipt');
});


/*
|--------------------------------------------------------------------------
| 5. BPLO — Business Permits & Licensing Office
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'role:bplo_staff,admin'])->group(function () {

    Route::get('/bplo-dashboard', [App\Http\Controllers\BPLO\BPLOController::class, 'dashboard'])->name('bplo.dashboard');
    Route::get('/bplo/releasing', [App\Http\Controllers\BPLO\BPLOController::class, 'releasingQueue'])->name('bplo.releasing');
    Route::get('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'showReleaseForm'])->name('bplo.issue');
    Route::post('/bplo/issue/{application}', [App\Http\Controllers\BPLO\BPLOController::class, 'release'])->name('bplo.release.submit');
    Route::get('/bplo/registry', [App\Http\Controllers\BPLO\BPLOController::class, 'registry'])->name('bplo.registry');
    Route::get('/bplo/registry/{plateNo}', [App\Http\Controllers\BPLO\BPLOController::class, 'registryDetails'])->name('bplo.registry.details');
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

        $tricycle = null;
        if ($operator) {
            $tri = \App\Models\Tricycle::where('operator_id', $operator->id)
                ->with(['franchiseScheme.colorCodingScheme', 'locations'])
                ->first();

            if ($tri) {
                $latestLocation = $tri->locations()->latest('recorded_at')->first();
                $tricycle = [
                    'id'            => $tri->body_number ?: 'Pending Body No',
                    'applicationId' => $tri->franchiseScheme?->application_id ? 'APP-2026-' . str_pad($tri->franchiseScheme->application_id, 5, '0', STR_PAD_LEFT) : 'N/A',
                    'makeModel'     => "{$tri->make} {$tri->model}",
                    'plateNo'       => $tri->plate_number,
                    'driver'        => $operator->full_name,
                    'zone'          => $tri->todaZone ? $tri->todaZone->name : 'N/A',
                    'colorCode'     => $tri->franchiseScheme?->colorCodingScheme ? $tri->franchiseScheme->colorCodingScheme->name : 'N/A',
                    'colorHex'      => $tri->franchiseScheme?->colorCodingScheme ? $tri->franchiseScheme->colorCodingScheme->color_hex : '#94A3B8',
                    'status'        => $tri->status === 'active' ? 'online' : 'offline',
                    'lastPing'      => $latestLocation ? $latestLocation->recorded_at->diffForHumans() : 'Never',
                    'iotBattery'    => '100%',
                    'mtopStatus'    => $tri->status === 'active' ? 'Valid' : 'Pending',
                    'mtopExpiry'    => $tri->franchiseScheme?->expiry_date ? $tri->franchiseScheme->expiry_date->format('M d, Y') : 'N/A',
                ];
            }
        }

        return Inertia::render('Operator/Fleet', [
            'tricycle' => $tricycle,
        ]);
    })->name('operator.fleet');

    Route::get('/operator/tracking', function (Request $request) {
        $user = $request->user();
        $operator = $user->operator;

        $tricycleData = null;
        $positions = [];
        if ($operator) {
            $tri = \App\Models\Tricycle::where('operator_id', $operator->id)->first();
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

                $tricycleData = [
                    'body_no'    => $tri->body_number ?: 'Pending',
                    'make_model' => "{$tri->make} {$tri->model}",
                    'plate_no'   => $tri->plate_number,
                    'zone'       => $tri->todaZone ? $tri->todaZone->name : 'N/A',
                    'battery'    => '92%',
                    'speed'      => $latestLocation ? (float)$latestLocation->speed_kmh : 0,
                    'heading'    => $latestLocation ? (int)$latestLocation->heading_deg : 0,
                    'accuracy'   => $latestLocation ? (float)$latestLocation->accuracy_m : 5.0,
                    'last_ping'  => $latestLocation ? $latestLocation->recorded_at->diffForHumans() : 'Never',
                ];
            }
        }

        return Inertia::render('Operator/LiveTracking', [
            'tricycle'         => $tricycleData,
            'pathCoordinates'  => $positions,
        ]);
    })->name('operator.tracking');

    Route::get('/operator/settings', function () {
        return Inertia::render('Operator/UnitSettings');
    })->name('operator.settings');

    // MTOP Franchise Compliance
    Route::get('/operator/mtop', [App\Http\Controllers\Operator\MTOPController::class, 'index'])->name('operator.mtop');

    Route::get('/operator/mtop/create', function () {
        return Inertia::render('Operator/Compliance/MTOPWizard');
    })->name('operator.mtop.create');

    Route::get('/operator/mtop/{id}', [App\Http\Controllers\Operator\MTOPController::class, 'show'])->name('operator.mtop.details');

    Route::get('/operator/mtop/{id}/fix', [App\Http\Controllers\Operator\MTOPController::class, 'fix'])->name('operator.mtop.fix');
    Route::post('/operator/mtop/{id}/fix', [App\Http\Controllers\Operator\MTOPController::class, 'submitFix'])->name('operator.mtop.submit-fix');

    Route::get('/operator/mtop/{id}/pay', function ($id) {
        return Inertia::render('Operator/Compliance/Checkout', ['applicationId' => $id]);
    })->name('operator.mtop.pay');

    // Violations & Payments
    Route::get('/operator/violations', [App\Http\Controllers\Operator\ViolationController::class, 'index'])->name('operator.violations');
    Route::get('/operator/violations/{id}/pay', [App\Http\Controllers\Operator\ViolationController::class, 'show'])->name('operator.violations.pay');

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
