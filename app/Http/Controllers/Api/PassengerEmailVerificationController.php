<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RegistrationEmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Passenger app sign-up email check: send a 6-digit code, then exchange the correct code for a
 * one-time verification token that POST /passenger/register requires. Errors are 422 with a
 * `message` the app shows as-is.
 */
class PassengerEmailVerificationController extends Controller
{
    public function __construct(private RegistrationEmailVerification $verification)
    {
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|string|email|max:255']);

        $this->verification->send($validated['email'], RegistrationEmailVerification::CONTEXT_PASSENGER);

        return response()->json([
            'success' => true,
            'message' => 'We sent a 6-digit code to your email.',
            'resend_after_seconds' => RegistrationEmailVerification::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email|max:255',
            'code' => 'required|digits:6',
        ]);

        $token = $this->verification->verifyForToken($validated['email'], $validated['code']);

        return response()->json([
            'success' => true,
            'message' => 'Email verified.',
            'verification_token' => $token,
            'expires_in_minutes' => RegistrationEmailVerification::API_TOKEN_MINUTES,
        ]);
    }
}
