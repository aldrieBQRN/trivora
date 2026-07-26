<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\DriverAuthController;
use App\Http\Controllers\Api\DriverTelematicsController;
use App\Http\Controllers\Api\PassengerAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Trivora Mobile REST API Routes (v1)
|--------------------------------------------------------------------------
*/

// Driver Mobile API Routes
Route::prefix('v1/driver')->group(function () {

    // Public Auth Routes
    Route::post('/verify-eligibility', [DriverAuthController::class, 'verifyEligibility']);
    Route::post('/register', [DriverAuthController::class, 'register']);
    Route::post('/login', [DriverAuthController::class, 'login']);

    // Driver Booking Dispatch Operations (Public / Guest accessible for mobile apps)
    Route::get('/bookings/pending', [BookingController::class, 'getPendingRequests']);
    Route::post('/bookings/{id}/accept', [BookingController::class, 'acceptBooking']);
    Route::post('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::get('/bookings/active', [BookingController::class, 'getActiveBooking']);
    Route::get('/bookings/history', [BookingController::class, 'history']);
    Route::post('/location', [BookingController::class, 'updateDriverLocation']);

    // Authenticated Driver Routes (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [DriverAuthController::class, 'me']);
        Route::post('/logout', [DriverAuthController::class, 'logout']);

        // Real-Time & Offline GPS Telematics
        Route::post('/telematics', [DriverTelematicsController::class, 'store']);
        Route::post('/telematics/batch', [DriverTelematicsController::class, 'batchStore']);
        Route::get('/telemetry-status', [DriverTelematicsController::class, 'getTrackingStatus']);
        Route::post('/telemetry-mode', [DriverTelematicsController::class, 'setTrackingMode']);
    });
});

// Passenger Mobile API Routes
Route::prefix('v1/passenger')->group(function () {

    // Public Auth Routes
    Route::post('/register', [PassengerAuthController::class, 'register']);
    Route::post('/login', [PassengerAuthController::class, 'login']);

    // Booking & Ride Operations (Public / Guest accessible for mobile apps)
    Route::post('/bookings/request', [BookingController::class, 'requestBooking']);
    Route::get('/bookings/active', [BookingController::class, 'getActiveBooking']);
    Route::get('/bookings/history', [BookingController::class, 'history']);
    Route::post('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::post('/bookings/{id}/cancel', [BookingController::class, 'updateStatus']);

    // Authenticated Passenger Routes (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [PassengerAuthController::class, 'me']);
        Route::post('/logout', [PassengerAuthController::class, 'logout']);
        Route::post('/bookings/{id}/rate', [BookingController::class, 'rateRide']);
    });
});
