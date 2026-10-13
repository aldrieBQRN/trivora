<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetOtp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Steps 2 and 3 of the web forgot-password flow, both rendered inside the Login page:
 * verify the emailed code, then create the new password. A verified email + code pair is
 * kept in the session between the two steps; the code is checked again on the final submit
 * so it still can't be used once expired.
 */
class NewPasswordController extends Controller
{
    private const SESSION_KEY = 'password_reset_verified';

    /**
     * Display the enter-code step.
     */
    public function create(Request $request, PasswordResetOtp $otp): Response|RedirectResponse
    {
        if (! $request->filled('email')) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Login', [
            'mode' => 'verify',
            'email' => $request->email,
            'status' => session('status'),
            'resendAfterSeconds' => $otp->secondsUntilResend($request->email),
        ]);
    }

    /**
     * Check the emailed code, then move on to the new password step.
     *
     * @throws ValidationException
     */
    public function verify(Request $request, PasswordResetOtp $otp): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|digits:6',
        ]);

        $otp->verify($request->email, $request->otp);

        $request->session()->put(self::SESSION_KEY, [
            'email' => $request->email,
            'otp' => $request->otp,
        ]);

        return redirect()->route('password.new');
    }

    /**
     * Display the create-new-password step (only after a code has been verified).
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $verified = $request->session()->get(self::SESSION_KEY);

        if (! $verified) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Login', [
            'mode' => 'reset',
            'email' => $verified['email'],
        ]);
    }

    /**
     * Set the new password using the verified code.
     *
     * @throws ValidationException
     */
    public function store(Request $request, PasswordResetOtp $otp): RedirectResponse
    {
        $verified = $request->session()->get(self::SESSION_KEY);

        if (! $verified) {
            return redirect()->route('password.request');
        }

        $request->validate([
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $otp->reset($verified['email'], $verified['otp'], $request->password);

        $request->session()->forget(self::SESSION_KEY);

        return redirect()->route('login')->with('status', 'Your password has been reset. You can now sign in with your new password.');
    }
}
