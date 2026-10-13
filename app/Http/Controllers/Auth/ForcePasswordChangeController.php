<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\StaffCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The mandatory "set your own password" step after signing in with a temporary password issued
 * by App\Services\StaffCredentials. EnsurePasswordIsChanged keeps such accounts here until it's
 * done. Rendered inside the Login page (mode="change") to match the sign-in screen.
 */
class ForcePasswordChangeController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->must_change_password) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Login', [
            'mode' => 'change',
            'email' => $user->email,
            'expiresAt' => $user->temporary_password_expires_at?->timezone(config('app.timezone'))->format('M d, Y g:i A'),
            'expiryHours' => StaffCredentials::TTL_HOURS,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->must_change_password) {
            return redirect()->route('dashboard');
        }

        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults(), 'different:current_password'],
        ], [
            'current_password.current_password' => 'The temporary password is incorrect.',
            'password.different' => 'Your new password must be different from the temporary password.',
        ]);

        // Replacing the hash invalidates the temporary password; the new remember token and the
        // session regeneration drop anything issued while the temporary password was in use.
        $user->forceFill([
            'password' => Hash::make($request->password),
            'must_change_password' => false,
            'temporary_password_expires_at' => null,
            'remember_token' => Str::random(60),
        ])->save();

        $user->tokens()->delete();
        $request->session()->regenerate();

        AuditService::log(
            module: 'auth',
            action: 'auth.temporary_password_changed',
            record: $user,
            description: "{$user->name} replaced their temporary password with their own password.",
        );

        // /dashboard dispatches to the dashboard for the user's role.
        return redirect()->route('dashboard')->with('success', 'Your password has been updated.');
    }
}
