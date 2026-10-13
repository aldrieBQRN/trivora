<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetOtp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the forgot password (request a code) step inside the Login page.
     */
    public function create(): Response
    {
        return Inertia::render('Login', [
            'mode' => 'forgot',
        ]);
    }

    /**
     * Email a 6-digit reset code to a registered account, then move on to the code entry page.
     *
     * @throws ValidationException
     */
    public function store(Request $request, PasswordResetOtp $otp): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $otp->send($request->email);

        return redirect()
            ->route('password.reset', ['email' => strtolower(trim($request->email))])
            ->with('status', 'We sent a 6-digit code to your email. It expires in ' . PasswordResetOtp::EXPIRES_MINUTES . ' minutes.');
    }
}
