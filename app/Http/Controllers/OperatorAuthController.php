<?php

namespace App\Http\Controllers;

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
    public function showLoginForm(): Response
    {
        return Inertia::render('Login');
    }

    /**
     * Handle an incoming authentication request.
     * Authenticates against the database and redirects each role
     * to their respective dashboard.
     */
    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'login_id' => ['required', 'string', 'email'],
            'password'  => ['required', 'string'],
        ]);

        $credentials = [
            'email'    => $request->login_id,
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
            'municipal_treasurer'=> route('treasurer.dashboard'),
            'tricycle_driver'    => route('operator.dashboard'),
            default              => route('dashboard'), // admin
        };
    }
}
