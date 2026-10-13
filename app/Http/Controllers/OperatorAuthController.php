<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OperatorAuthController extends Controller
{
    /**
     * Display the unified login view.
     */
    public function showLoginForm(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->to($this->getDashboardRoute(Auth::user()->role));
        }

        return Inertia::render('Login', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     * Email-only: resolves the person's EXISTING stored email address to the one account it
     * belongs to (never creating a duplicate user), then authenticates and redirects each role
     * to their respective dashboard.
     */
    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'login_id' => ['required', 'string', 'email', 'max:255'],
            'password'  => ['required', 'string'],
        ], [
            'login_id.required' => 'Please enter your email address.',
            'login_id.email'    => 'Please enter a valid email address.',
        ]);

        // At most 5 failed attempts per identifier + IP per minute (same policy as Laravel's
        // stock LoginRequest), so temporary and regular passwords can't be brute-forced.
        $throttleKey = 'web-login:' . Str::transliterate(Str::lower(trim($request->login_id))) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return back()->withErrors([
                'login_id' => 'Too many sign-in attempts. Please try again in ' . RateLimiter::availableIn($throttleKey) . ' seconds.',
            ])->onlyInput('login_id');
        }

        $email = $this->resolveLoginEmail(trim($request->login_id));

        if ($email === null) {
            RateLimiter::hit($throttleKey);

            return back()->withErrors([
                'login_id' => 'The provided credentials do not match our records.',
            ])->onlyInput('login_id');
        }

        $credentials = [
            'email'    => $email,
            'password' => $request->password,
        ];

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey);

            return back()->withErrors([
                'login_id' => 'The provided credentials do not match our records.',
            ])->onlyInput('login_id');
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        $user = Auth::user();

        // Block deactivated accounts immediately after login
        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors([
                'login_id' => 'Your account has been deactivated. Please contact the administrator.',
            ])->onlyInput('login_id');
        }

        // A temporary password (StaffCredentials) is only valid for a limited window — never
        // sign in with an expired one; the account recovers via resend or Forgot password.
        if ($user->temporaryPasswordExpired()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors([
                'login_id' => 'Your temporary password has expired. Ask your administrator to resend your credentials, or use Forgot password.',
            ])->onlyInput('login_id');
        }

        $roleLabel = match ($user->role) {
            'tmo_personnel'   => 'TMO Personnel',
            'bplo_staff'      => 'BPLO Staff',
            'tricycle_driver' => 'Tricycle Driver / Operator',
            'admin'           => 'Administrator',
            default           => ucwords(str_replace('_', ' ', (string) $user->role)),
        };

        AuditService::log(
            module: 'auth',
            action: 'auth.login',
            record: $user,
            description: "{$user->name} ({$roleLabel}) logged in successfully to the web portal.",
            oldValues: null,
            newValues: null,
            metadata: [
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ],
            actor: $user
        );

        // First sign-in with a temporary password: straight to the mandatory change screen.
        if ($user->must_change_password) {
            return redirect()->route('password.change');
        }

        // Redirect to the dashboard that matches the user's role
        return redirect()->to($this->getDashboardRoute($user->role));
    }

    /**
     * Resolve the entered email to the stored email of the ONE existing account it belongs to
     * (case-insensitively, since that's how email addresses are conventionally compared), as
     * the lookup key for Auth::attempt. Login is email-only. Returns null when nothing matches.
     */
    private function resolveLoginEmail(string $email): ?string
    {
        return User::whereRaw('LOWER(email) = ?', [strtolower($email)])->value('email');
    }

    /**
     * Destroy the authenticated session (logout).
     */
    public function logout(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if ($user) {
            $roleLabel = match ($user->role) {
                'tmo_personnel'   => 'TMO Personnel',
                'bplo_staff'      => 'BPLO Staff',
                'tricycle_driver' => 'Tricycle Driver / Operator',
                'admin'           => 'Administrator',
                default           => ucwords(str_replace('_', ' ', (string) $user->role)),
            };

            AuditService::log(
                module: 'auth',
                action: 'auth.logout',
                record: $user,
                description: "{$user->name} ({$roleLabel}) logged out of the web portal.",
                metadata: [
                    'ip_address'  => $request->ip(),
                    'logout_time' => now()->toIso8601String(),
                ],
                actor: $user
            );
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /**
     * Resolve the correct dashboard URL for each role.
     */
    private function getDashboardRoute(string $role): string
    {
        return match ($role) {
            'tmo_personnel'      => route('tmo.dashboard'),
            'bplo_staff'         => route('bplo.dashboard'),
            'tricycle_driver'    => route('operator.dashboard'),
            default              => route('dashboard'), // admin
        };
    }
}
