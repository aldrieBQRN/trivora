<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetOtp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Forgot-password by emailed 6-digit code, for the passenger and driver apps (same endpoints are
 * mounted under both `v1/passenger` and `v1/driver`). Errors surface as 422 validation responses
 * whose `message` is shown directly by the apps.
 */
class PasswordResetOtpController extends Controller
{
    public function __construct(private PasswordResetOtp $otp)
    {
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|email']);

        $this->otp->send($validated['email']);

        return response()->json([
            'success' => true,
            'message' => 'We sent a 6-digit code to your email.',
            'expires_in_minutes' => PasswordResetOtp::EXPIRES_MINUTES,
            'resend_after_seconds' => PasswordResetOtp::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|digits:6',
        ]);

        $this->otp->verify($validated['email'], $validated['otp']);

        return response()->json(['success' => true, 'message' => 'Code verified.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|digits:6',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $this->otp->reset($validated['email'], $validated['otp'], $validated['password']);

        return response()->json([
            'success' => true,
            'message' => 'Your password has been reset. You can now log in with your new password.',
        ]);
    }
}
