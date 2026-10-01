<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\BookingPaymentController;
use App\Http\Controllers\Api\DriverAuthController;
use App\Http\Controllers\Api\DriverGcashQrController;
use App\Http\Controllers\Api\DriverManualRideController;
use App\Http\Controllers\Api\DriverQrSessionController;
use App\Http\Controllers\Api\DriverTelematicsController;
use App\Http\Controllers\Api\DriverViolationController;
use App\Http\Controllers\Api\PassengerAuthController;
use App\Http\Controllers\Api\PassengerQrRideController;
use App\Http\Controllers\Api\ProfilePhotoController;
use App\Http\Controllers\Api\SavedPlaceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Trivora Mobile REST API Routes (v1)
|--------------------------------------------------------------------------
*/



// Public Health Check
Route::get('v1/health', fn() => response()->json(['status' => 'ok']));

// Driver Mobile API Routes
Route::prefix('v1/driver')->group(function () {

    // Public Auth Routes
    Route::post('/verify-eligibility', [DriverAuthController::class, 'verifyEligibility']);
    Route::post('/register', [DriverAuthController::class, 'register']);
    Route::post('/login', [DriverAuthController::class, 'login']);

    // Authenticated Driver Routes (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [DriverAuthController::class, 'me']);
        Route::post('/logout', [DriverAuthController::class, 'logout']);

        // Going Online/Offline is itself an "operate" action — a driver whose assigned franchise
        // is suspended/revoked must never be able to flip is_online=true, so this is gated by
        // franchise.operational too (see EnsureFranchiseIsOperational). Going Offline
        // (is_online=false) still passes the gate trivially since the middleware only blocks
        // based on the driver's FRANCHISE status, not the payload — a driver whose franchise is
        // suspended can always still turn themself off.
        Route::post('/status', [DriverAuthController::class, 'updateStatus'])->middleware('franchise.operational');

        // Driver Booking Dispatch Operations — every one of these resolves the driver strictly
        // from $request->user() (see BookingController), never a client-supplied driver_id/
        // user_id. Used to be registered outside auth:sanctum and trust query params instead,
        // which let any caller read/spoof another driver's requests, history, or location.
        // getPendingRequests/updateStatus/acceptBooking/updateDriverLocation are all "operate"
        // actions and gated by franchise.operational; getActiveBooking/history stay read-only and
        // available even when the driver's franchise is suspended/revoked (so they can still
        // see/settle history).
        Route::get('/bookings/pending', [BookingController::class, 'getPendingRequests'])->middleware('franchise.operational');
        Route::post('/bookings/{id}/status', [BookingController::class, 'updateStatus'])->middleware('franchise.operational');
        Route::get('/bookings/active', [BookingController::class, 'getActiveBooking']);
        Route::get('/bookings/history', [BookingController::class, 'history']);
        Route::post('/location', [BookingController::class, 'updateDriverLocation'])->middleware('franchise.operational');

        // Real-Time & Offline GPS Telematics — transmitting a real position is an "operate"
        // action; checking/changing the tracking MODE configuration is not, so only store/
        // batchStore are gated.
        Route::post('/telematics', [DriverTelematicsController::class, 'store'])->middleware('franchise.operational');
        Route::post('/telematics/batch', [DriverTelematicsController::class, 'batchStore'])->middleware('franchise.operational');
        Route::get('/telemetry-status', [DriverTelematicsController::class, 'getTrackingStatus']);
        Route::post('/telemetry-mode', [DriverTelematicsController::class, 'setTrackingMode']);

        // Accepting a ride must be tied to the authenticated driver's own account, not a
        // client-supplied id — this is also the endpoint whose acceptance race condition is
        // now resolved with row locking (see BookingController::acceptBooking).
        Route::post('/bookings/{id}/accept', [BookingController::class, 'acceptBooking'])->middleware('franchise.operational');

        // Declining does not change the booking itself — see BookingController::declineBooking —
        // it only records this driver's decline so getPendingRequests() stops re-offering it.
        // Left ungated: a driver whose franchise is suspended/revoked was never going to be
        // re-dispatched anyway (see BookingDispatchService::getEligibleDrivers()'s franchise
        // filter), so this is harmless.
        Route::post('/bookings/{id}/decline', [BookingController::class, 'declineBooking']);

        // Violations & Appeals — scoped to the authenticated driver's own tricycle only (see
        // DriverViolationController::resolveDriver). Approving/rejecting an appeal is a TMO/admin
        // action, not exposed here — see routes/web.php's TMO group.
        Route::get('/violations', [DriverViolationController::class, 'index']);
        Route::post('/violations/{id}/appeal', [DriverViolationController::class, 'storeAppeal']);

        // QR Ride / Walk-in Ride — the driver's own session only (see QrRideService). Only Start
        // Ride is an "operate" action gated by franchise.operational: removing waiting passengers,
        // dropping off passengers already aboard, and ending an empty session stay available after
        // a suspension/revocation so nobody is stranded mid-ride. {booking} is the booking_code.
        Route::get('/qr-session/active', [DriverQrSessionController::class, 'active']);
        Route::post('/qr-session/start', [DriverQrSessionController::class, 'start'])->middleware('franchise.operational');
        Route::post('/qr-session/passengers/{booking}/drop-off', [DriverQrSessionController::class, 'dropOff']);
        Route::post('/qr-session/passengers/{booking}/remove', [DriverQrSessionController::class, 'remove']);
        Route::post('/qr-session/end', [DriverQrSessionController::class, 'end']);

        // Manual Ride — the driver adds a walk-in passenger with no app to the tricycle's one open
        // ride session (see ManualRideService); from there the qr-session routes above run the
        // ride for QR and walk-in passengers alike. Quote/add are "operate" actions gated by
        // franchise.operational; complete/cancel only close a legacy stand-alone ride.
        // {booking} is the booking_code.
        Route::post('/manual-ride/quote', [DriverManualRideController::class, 'quote'])->middleware('franchise.operational');
        Route::post('/manual-ride/add', [DriverManualRideController::class, 'add'])->middleware('franchise.operational');
        Route::post('/manual-ride/start', [DriverManualRideController::class, 'add'])->middleware('franchise.operational');
        Route::get('/manual-ride/active', [DriverManualRideController::class, 'active']);
        Route::post('/manual-ride/{booking}/complete', [DriverManualRideController::class, 'complete']);
        Route::post('/manual-ride/{booking}/cancel', [DriverManualRideController::class, 'cancel']);

        // Profile photo — shared controller, see ProfilePhotoController (acts on
        // $request->user() only, no cross-app duplication needed).
        Route::post('/profile-photo', [ProfilePhotoController::class, 'update']);
        Route::delete('/profile-photo', [ProfilePhotoController::class, 'destroy']);

        // Driver GCash QR Management
        Route::get('/gcash-qr', [DriverGcashQrController::class, 'show']);
        Route::post('/gcash-qr', [DriverGcashQrController::class, 'update']);
        Route::delete('/gcash-qr', [DriverGcashQrController::class, 'destroy']);

        // Driver Payment Confirmation (Cash & GCash)
        Route::post('/bookings/{id}/payment/confirm-cash', [BookingPaymentController::class, 'confirmCash']);
        Route::post('/bookings/{id}/payment/confirm-gcash', [BookingPaymentController::class, 'confirmGcash']);
        Route::post('/bookings/{id}/payment/manual-gcash', [BookingPaymentController::class, 'recordManualGcash']);
        Route::post('/bookings/{id}/payment/record-manual-gcash', [BookingPaymentController::class, 'recordManualGcash']);
    });
});

// Passenger Mobile API Routes
Route::prefix('v1/passenger')->group(function () {

    // Public Auth Routes
    Route::post('/register', [PassengerAuthController::class, 'register']);
    Route::post('/login', [PassengerAuthController::class, 'login']);

    // Authenticated Passenger Routes (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [PassengerAuthController::class, 'me']);
        Route::put('/profile', [PassengerAuthController::class, 'updateProfile']);
        Route::post('/logout', [PassengerAuthController::class, 'logout']);

        // Creating a real booking, and rating one, must be tied to the authenticated
        // passenger's own account, not a client-supplied id — see
        // BookingController::requestBooking / rateRide.
        Route::post('/bookings/request', [BookingController::class, 'requestBooking']);
        Route::post('/bookings/{id}/rate', [BookingController::class, 'rateRide']);

        // Booking & Ride Operations — resolved strictly from $request->user() (see
        // BookingController::getActiveBooking / history / updateStatus). Used to be registered
        // outside auth:sanctum and trust client-supplied passenger_id/user_id query params
        // instead, which let any caller read another passenger's active ride or ride history.
        Route::get('/bookings/active', [BookingController::class, 'getActiveBooking']);
        Route::get('/bookings/history', [BookingController::class, 'history']);
        Route::post('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
        Route::post('/bookings/{id}/cancel', [BookingController::class, 'updateStatus']);

        // No passenger payment routes: the driver shows their own GCash QR, enters the reference
        // and confirms (driver routes above); the passenger app only reads payment status.

        // Saved Places — destination shortcuts tied to the authenticated passenger only,
        // never a client-supplied passenger id (see SavedPlaceController::resolvePassenger).
        Route::get('/saved-places', [SavedPlaceController::class, 'index']);
        Route::post('/saved-places', [SavedPlaceController::class, 'store']);
        Route::put('/saved-places/{id}', [SavedPlaceController::class, 'update']);
        Route::delete('/saved-places/{id}', [SavedPlaceController::class, 'destroy']);

        // QR Ride / Walk-in Ride — scan a tricycle's QR, get a server-computed quote, join, follow
        // the ride, or leave before it starts (see QrRideService). Scan and quote are throttled:
        // they resolve public tokens and make outbound routing calls. {booking} is the booking_code.
        Route::get('/qr-rides/tricycle/{token}', [PassengerQrRideController::class, 'tricycle'])->middleware('throttle:30,1');
        Route::post('/qr-rides/quote', [PassengerQrRideController::class, 'quote'])->middleware('throttle:30,1');
        Route::post('/qr-rides/join', [PassengerQrRideController::class, 'join']);
        Route::get('/qr-rides/active', [PassengerQrRideController::class, 'active']);
        Route::post('/qr-rides/{booking}/leave', [PassengerQrRideController::class, 'leave']);

        // Profile photo — shared controller, see ProfilePhotoController.
        Route::post('/profile-photo', [ProfilePhotoController::class, 'update']);
        Route::delete('/profile-photo', [ProfilePhotoController::class, 'destroy']);
    });
});
