<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

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
        }

        $fallback = match ($user?->role) {
            'tmo_personnel'      => route('tmo.dashboard'),
            'bplo_staff'         => route('bplo.dashboard'),
            'tricycle_driver'    => route('operator.dashboard'),
            default              => route('dashboard'),
        };

        return redirect()->intended($fallback);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
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

        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
        }

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
