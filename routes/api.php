<?php

use App\Http\Controllers\Api\DriverAuthController;
use App\Http\Controllers\Api\DriverTelematicsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Trivora Mobile Driver API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/driver')->group(function () {

    // Public Gated Auth & Verification Routes
    Route::post('/verify-eligibility', [DriverAuthController::class, 'verifyEligibility']);
    Route::post('/register', [DriverAuthController::class, 'register']);
    Route::post('/login', [DriverAuthController::class, 'login']);

    // Authenticated Driver Routes (Guarded by Laravel Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [DriverAuthController::class, 'me']);
        Route::post('/logout', [DriverAuthController::class, 'logout']);

        // Real-Time & Offline GPS Telematics Ingestion
        Route::post('/telematics', [DriverTelematicsController::class, 'store']);
        Route::post('/telematics/batch', [DriverTelematicsController::class, 'batchStore']);

        // Dual Telemetry Control (IoT vs Mobile App GPS)
        Route::get('/telemetry-status', [DriverTelematicsController::class, 'getTrackingStatus']);
        Route::post('/telemetry-mode', [DriverTelematicsController::class, 'setTrackingMode']);
    });
});
