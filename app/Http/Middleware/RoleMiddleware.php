<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Usage in routes:
     *   ->middleware('role:tmo_personnel')
     *   ->middleware('role:tmo_personnel,admin')
     *
     * @param  string  $roles  Comma-separated list of allowed roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Redirect unauthenticated users to login
        if (! Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // Block inactive accounts
        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->withErrors(['email' => 'Your account has been deactivated. Please contact the administrator.']);
        }

        // Allow if the user's role is in the permitted list
        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }

        // 403 for authenticated users who don't have the right role
        abort(403, 'You do not have permission to access this page.');
    }
}
