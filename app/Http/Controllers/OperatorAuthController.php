<?php

namespace App\Http\Controllers;

use App\Models\Operator;
use App\Models\User;
use App\Support\MobileNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        return Inertia::render('Login');
    }

    /**
     * Handle an incoming authentication request.
     * Accepts either the person's EXISTING stored email address or mobile number, resolves it
     * to the one existing account it belongs to (never creating a duplicate user), then
     * authenticates and redirects each role to their respective dashboard.
     */
    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'login_id' => ['required', 'string', 'max:255'],
            'password'  => ['required', 'string'],
        ]);

        $email = $this->resolveLoginEmail(trim($request->login_id));

        if ($email === null) {
            return back()->withErrors([
                'login_id' => 'The provided credentials do not match our records.',
            ])->onlyInput('login_id');
        }

        $credentials = [
            'email'    => $email,
            'password' => $request->password,
        ];

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'login_id' => 'The provided credentials do not match our records.',
            ])->onlyInput('login_id');
        }

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

        // Redirect to the dashboard that matches the user's role
        return redirect()->to($this->getDashboardRoute($user->role));
    }

    /**
     * Resolve the entered identifier (email or mobile number) to the email of the ONE existing
     * account it belongs to (the email is only an internal lookup key for Auth::attempt — an
     * email-typing user still just gets their own stored email back unchanged). Returns null
     * when nothing matches, so login fails instead of ever creating a second account for the
     * same person.
     */
    private function resolveLoginEmail(string $loginId): ?string
    {
        // Email identifiers match directly against users.email — the only place an email is
        // ever stored — case-insensitively, since that's how email addresses are conventionally
        // compared.
        if (str_contains($loginId, '@')) {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($loginId)])->first();

            return $user?->email;
        }

        // Mobile lookup matches both places a number is actually stored — `users.contact_number`
        // (staff profiles) and `operators.contact_number` (owner/driver registration) — after
        // normalizing separators and the 0/9/+63/63 prefixes via the shared MobileNumber helper.
        $variants = MobileNumber::variants($loginId);
        if ($variants === []) {
            return null;
        }

        $inClause = implode(',', array_fill(0, count($variants), '?'));
        $normalized = MobileNumber::normalizedSql('contact_number');

        // 1. Staff accounts keep their mobile on users.contact_number.
        $user = User::whereNotNull('contact_number')
            ->whereRaw("{$normalized} IN ({$inClause})", $variants)
            ->first();

        // 2. Owners/drivers register their mobile on operators.contact_number — resolve
        //    through the linked user, so the same person never needs a duplicate account.
        if (! $user) {
            $operator = Operator::whereNotNull('contact_number')
                ->whereRaw("{$normalized} IN ({$inClause})", $variants)
                ->first();

            $user = $operator?->user;
        }

        return $user?->email;
    }

    /**
     * Destroy the authenticated session (logout).
     */
    public function logout(Request $request): RedirectResponse
    {
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
