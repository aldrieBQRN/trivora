<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\OperatorAuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC & GUEST ROUTES
|--------------------------------------------------------------------------
*/

// The Landing Page
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

// Phase 0: Public MTOP Registration Wizard (Account Creation + First Application)
Route::get('/register-mtop', [RegistrationController::class, 'publicWizard'])->name('register.public');

// Operator Authentication
Route::get('/operator/login', [OperatorAuthController::class, 'showLoginForm'])->name('operator.login');
Route::post('/operator/login', [OperatorAuthController::class, 'login'])->name('operator.login.submit');


/*
|--------------------------------------------------------------------------
| 2. PROTECTED MUNICIPAL & OPERATOR ROUTES (Auth Required)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {

    // Default System Dashboard (Redirect logic usually handled in Controller)
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // ==========================================
    // TMO WORKFLOW (Traffic Management Office)
    // ==========================================

    // TMO Master Hub
    Route::get('/tmo/validations', function () {
        return Inertia::render('TMODashboard/ValidationQueue');
    })->name('tmo.validations');

    // --- PHASE 1: DOCUMENT REVIEW ---
    Route::get('/tmo/docs', function () {
        return Inertia::render('TMODashboard/DocumentQueue');
    })->name('tmo.docs');

    Route::get('/tmo/review/docs/{id}', function ($id) {
        return Inertia::render('TMODashboard/DocumentReview', [
            'application' => [
                'id' => $id,
                'operator' => 'Juan Dela Cruz',
                'contact' => '0917 123 4567',
                'barangay' => 'Wawa',
                'toda' => 'TODA A',
                'make' => 'Honda TMX 125',
                'status' => 'pending_review'
            ]
        ]);
    })->name('tmo.review.docs');


    // --- PHASE 2: PHYSICAL INSPECTION ---
    Route::get('/tmo/physical', function () {
        return Inertia::render('TMODashboard/PhysicalQueue');
    })->name('tmo.physical');

    Route::get('/tmo/review/physical/{id}', function ($id) {
        return Inertia::render('TMODashboard/PhysicalInspection', [
            'application' => [
                'id' => $id,
                'operator' => 'Ricardo Dalisay',
                'make' => 'Kawasaki Barako 175',
                'status' => 'scheduled'
            ]
        ]);
    })->name('tmo.review.physical');

    // Fleet Monitoring (IoT Map Feature)
    Route::get('/tmo-dashboard', [DashboardController::class, 'index'])->name('tmo.dashboard');


    // ==========================================
    // TREASURER WORKFLOW (Municipal Cashier)
    // ==========================================

    // --- PHASE 3: PAYMENT VERIFICATION ---
    Route::get('/treasurer/dashboard', function () {
        return Inertia::render('Treasurer/Dashboard');
    })->name('treasurer.dashboard');

    Route::get('/treasurer/verify/{id}', function ($id) {
        return Inertia::render('Treasurer/VerifyPayment', [
            'transactionId' => $id
        ]);
    })->name('treasurer.verify');


    // ==========================================
    // BPLO WORKFLOW (Business Permits Office)
    // ==========================================

    // --- PHASE 4: FINAL ISSUANCE ---
    Route::get('/bplo/releasing', function () {
        return Inertia::render('BPLODashboard/ReleasingQueue');
    })->name('bplo.releasing');

    Route::get('/bplo/issue/{id}', function ($id) {
        return Inertia::render('BPLODashboard/IssueBodyNumber', [
            'application' => [
                'id' => $id,
                'operator' => 'Juan Dela Cruz',
                'toda' => 'TODA A',
                'make' => 'Honda TMX 125',
                'status' => 'passed_inspection'
            ]
        ]);
    })->name('bplo.issue');


    // ==========================================
    // OPERATOR PORTAL (Tricycle Drivers)
    // ==========================================

    // --- Group 1: My Account ---
    Route::get('/operator/dashboard', [App\Http\Controllers\Operator\DashboardController::class, 'index'])
        ->name('operator.dashboard');

    Route::get('/operator/fleet', function () {
        return Inertia::render('Operator/Fleet');
    })->name('operator.fleet');


    // --- Group 2: MTOP Franchise Compliance ---

    // MTOP Tracker List
    Route::get('/operator/mtop', function () {
        return Inertia::render('Operator/Compliance/MTOP', [
            'operatorName' => 'Mario Dela Cruz'
        ]);
    })->name('operator.mtop');

    // New Unit Wizard
    Route::get('/operator/mtop/create', function () {
        return Inertia::render('Operator/Compliance/MTOPWizard');
    })->name('operator.mtop.create');

    // Application Details
    Route::get('/operator/mtop/{id}', function ($id) {
        return Inertia::render('Operator/Compliance/MTOPDetails', [
            'applicationId' => $id
        ]);
    })->name('operator.mtop.details');

    // Fix Rejected Application
    Route::get('/operator/mtop/{id}/fix', function ($id) {
        return Inertia::render('Operator/Compliance/MTOPFix', [
            'applicationId' => $id
        ]);
    })->name('operator.mtop.fix');


    // --- Group 3: Violations & Payments ---

    // IoT Active Violation Records
    Route::get('/operator/violations', function () {
        return Inertia::render('Operator/Violations/Violations');
    })->name('operator.violations');

    // Settle Specific Violation (Payment Page)
    Route::get('/operator/violations/{id}/pay', function ($id) {
        return Inertia::render('Operator/Violations/SettleViolation', [
            'violationId' => $id
        ]);
    })->name('operator.violations.pay');

    // Payment/Billing History Ledger
    Route::get('/operator/payments', function () {
        return Inertia::render('Operator/Payments/PaymentHistory');
    })->name('operator.payments');

    // View Official Receipt (From Payment History)
    Route::get('/operator/payments/{id}/receipt', function ($id) {
        return Inertia::render('Operator/Payments/Receipt', [
            'transactionId' => $id
        ]);
    })->name('operator.payments.receipt');


    // ==========================================
    // PROFILE & SYSTEM SETTINGS
    // ==========================================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
