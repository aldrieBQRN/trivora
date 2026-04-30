<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\OperatorAuthController;
use App\Http\Controllers\DocumentController;
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

// Unified System Login (Replaces Operator-only login)
Route::get('/login', [OperatorAuthController::class, 'showLoginForm'])->name('login');
Route::post('/login', [OperatorAuthController::class, 'login'])->name('login.submit');


/*
|--------------------------------------------------------------------------
| 2. PROTECTED MUNICIPAL & OPERATOR ROUTES
|--------------------------------------------------------------------------
*/

// 🔴 TEMPORARILY DISABLED 'auth' MIDDLEWARE FOR UI DEMO TESTING 🔴
Route::group([], function () {

    // Default System Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // ==========================================
    // TMO WORKFLOW (Traffic Management Office)
    // ==========================================


    // TMO Unit Registry (previously Active Fleet)
    Route::get('/tmo/registry', function () {
        return Inertia::render('TMODashboard/UnitRegistry');
    })->name('tmo.registry');

    // TMO Tricycle Details View
    Route::get('/tmo/tricycle/{id}', function ($id) {
        return Inertia::render('TMODashboard/TricycleDetails', [
            'tricycleId' => $id
        ]);
    })->name('tricycle.details');

    // TMO Violation Records
    Route::get('/violations', function () {
        return Inertia::render('TMODashboard/Violations/Violations');
    })->name('tmo.violations');

    // TMO Violation Details
    Route::get('/violations/{id}', function ($id) {
        return Inertia::render('TMODashboard/Violations/ViolationDetails', [
            'violationId' => $id
        ]);
    })->name('tmo.violations.details');

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

    // Document Preview Routes
    Route::get('/document/inspection-preview', [DocumentController::class, 'previewDocument'])->name('document.preview');
    Route::get('/document/orcr-preview', [DocumentController::class, 'previewORCR'])->name('document.orcr');

    // Fleet Monitoring (IoT Map Feature)
    Route::get('/tmo-dashboard', [DashboardController::class, 'index'])->name('tmo.dashboard');


    // ==========================================
    // TREASURER WORKFLOW (Treasurer's Office)
    // ==========================================

    Route::get('/treasurer/dashboard', function () {
        return Inertia::render('Treasurer/Dashboard');
    })->name('treasurer.dashboard');

    // Pending Payments Queue
    Route::get('/treasurer/pending', function () {
        return Inertia::render('Treasurer/PendingPayments');
    })->name('treasurer.pending');

    // Verify Specific Payment
    Route::get('/treasurer/verify/{id}', function ($id) {
        return Inertia::render('Treasurer/VerifyPayment', [
            'paymentId' => $id
        ]);
    })->name('treasurer.verify');

    // Transaction Ledger (Master list of online payments)
    Route::get('/treasurer/transactions', function () {
        return Inertia::render('Treasurer/TransactionRecord');
    })->name('treasurer.transactions');

    // Official Receipt Generation
    Route::get('/treasurer/receipt/{id}', function ($id) {
        return Inertia::render('Treasurer/Receipt', [
            'transactionId' => $id
        ]);
    })->name('treasurer.receipt');


    // ==========================================
    // BPLO WORKFLOW (Business Permits Office)
    // ==========================================

    // --- BPLO Dashboard ---
    Route::get('/bplo-dashboard', function () {
        return Inertia::render('BPLODashboard/Index');
    })->name('bplo.dashboard');

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
                'engine_number' => 'ENG-HON-67890',
                'chassis_number' => 'CHAS-HON-54321',
                'status' => 'passed_inspection'
            ]
        ]);
    })->name('bplo.issue');

    // --- Active Registry ---
    Route::get('/bplo/registry', function () {
        return Inertia::render('BPLODashboard/ActiveRegistry');
    })->name('bplo.registry');

    Route::get('/bplo/registry/{plateNo}', function ($plateNo) {
        return Inertia::render('BPLODashboard/RegistryDetails', [
            'registry' => [
                'plate_no' => $plateNo,
                'body_no' => 'N-142',
                'tricycle_id' => 'TRX-2026-0847',
                'operator' => 'Mario Dela Cruz',
                'contact' => '0917 123 4567',
                'toda' => 'TODA A (Poblacion)',
                'make' => 'Honda TMX 125',
                'engine_number' => 'ENG-HON-67890',
                'chassis_number' => 'CHAS-HON-54321',
                'issue_date' => 'April 5, 2026',
                'coding_day' => 'Monday',
                'status' => 'active',
                'requirements' => [
                    ['name' => 'Xerox Prangkisa (Kung Renew)', 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => 'Xerox OR/CR', 'preview_url' => '/sample-orcr-document.html'],
                    ['name' => 'Delivery Receipt (Kung walang OR/CR / New)', 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => "Driver's License Back-to-back (Prof/Restriction 1/A1)", 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => 'Barangay Clearance (Original)', 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => 'TODA/NAFTODA/ACTODAN Clearance (Original)', 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => "Driver's ID Issued by NAFTODA/ACTODAN", 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => 'List of Existing Tariff Fee (For sidecar)', 'preview_url' => '/sample-inspection-document.html'],
                    ['name' => "Authorization Letter & ID (Kung hindi may-ari)", 'preview_url' => '/sample-inspection-document.html'],
                ],
            ],
        ]);
    })->name('bplo.registry.details');


    // ==========================================
    // OPERATOR PORTAL (Tricycle Drivers)
    // ==========================================

    // --- Group 1: My Account ---
    Route::get('/operator/dashboard', [App\Http\Controllers\Operator\DashboardController::class, 'index'])
        ->name('operator.dashboard');

    Route::get('/operator/fleet', function () {
        return Inertia::render('Operator/Fleet');
    })->name('operator.fleet');

    Route::get('/operator/tracking', function () {
        return Inertia::render('Operator/LiveTracking');
    })->name('operator.tracking');

    Route::get('/operator/settings', function () {
        return Inertia::render('Operator/UnitSettings');
    })->name('operator.settings');


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

    // Operator Online Checkout Page
    Route::get('/operator/mtop/{id}/pay', function ($id) {
        return Inertia::render('Operator/Compliance/Checkout', [
            'applicationId' => $id
        ]);
    })->name('operator.mtop.pay');


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
