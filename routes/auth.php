<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\ForcePasswordChangeController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    // 🔴 COMMENTED OUT TO ALLOW CUSTOM UNIFIED LOGIN IN routes/web.php 🔴
    // Route::get('login', [AuthenticatedSessionController::class, 'create'])
    //     ->name('login');
    //
    // Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    // Password reset by emailed 6-digit code (App\Services\PasswordResetOtp)
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('password.email');

    Route::get('reset-password', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password/verify', [NewPasswordController::class, 'verify'])
        ->middleware('throttle:10,1')
        ->name('password.verify');

    Route::get('reset-password/new', [NewPasswordController::class, 'edit'])
        ->name('password.new');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    // First sign-in with a server-generated temporary password (staff accounts) — the only
    // pages EnsurePasswordIsChanged lets such an account reach, besides logout.
    Route::get('change-password', [ForcePasswordChangeController::class, 'show'])
        ->name('password.change');

    Route::put('change-password', [ForcePasswordChangeController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.change.update');

    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');
});

// Logout handles both GET and POST requests safely regardless of session state
Route::match(['get', 'post'], 'logout', [AuthenticatedSessionController::class, 'destroy'])
    ->name('logout');
