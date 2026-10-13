<?php

namespace App\Http\Controllers;

use App\Services\RegistrationEmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON endpoints behind the "Verify your email" modal on public MTOP registration (Applicant
 * Information → Continue). Validation errors come back as 422 with a `message`.
 */
class RegistrationEmailVerificationController extends Controller
{
    public function __construct(private RegistrationEmailVerification $verification)
    {
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|string|email|max:255']);

        $this->verification->send($validated['email']);

        return response()->json([
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

        $this->verification->verify($validated['email'], $validated['code']);

        return response()->json(['message' => 'Email verified.', 'email' => strtolower(trim($validated['email']))]);
    }
}
