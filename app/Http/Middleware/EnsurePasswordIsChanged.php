<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side gate for accounts still on a temporary password (App\Services\StaffCredentials).
 * Appended to both the web and api groups, so neither a direct URL nor an API call (session or
 * Sanctum token) can reach anything until the password has been changed. Accounts whose
 * temporary password has expired are signed out instead.
 */
class EnsurePasswordIsChanged
{
    /** The only named routes a must-change-password account may use. */
    private const ALLOWED_ROUTES = ['password.change', 'password.change.update', 'logout'];

    public function handle(Request $request, Closure $next): Response
    {
        $isApi = $request->is('api/*');
        $user = $isApi ? Auth::guard('sanctum')->user() : $request->user();

        if (! $user || ! $user->must_change_password) {
            return $next($request);
        }

        if ($isApi) {
            return response()->json([
                'success' => false,
                'message' => 'You must sign in to the Trivora web portal and change your temporary password first.',
            ], 403);
        }

        if ($user->temporaryPasswordExpired()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'login_id' => 'Your temporary password has expired. Ask your administrator to resend your credentials, or use Forgot password.',
            ]);
        }

        if ($request->routeIs(...self::ALLOWED_ROUTES)) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'You must change your temporary password before continuing.'], 403);
        }

        return redirect()->route('password.change');
    }
}
