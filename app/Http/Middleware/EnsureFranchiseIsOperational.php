<?php

namespace App\Http\Middleware;

use App\Models\Driver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks any endpoint that requires an OPERATIONAL driver (go Online, accept/perform bookings,
 * transmit GPS location) once the driver's ASSIGNED FRANCHISE has been suspended or revoked by
 * TMO (Driver::canOperate(), which resolves through Driver::franchise()->canOperate()) — this is
 * franchise-level authorization, not a status on the driver's own account. A driver whose
 * franchise is suspended can still authenticate and read their own account — this middleware
 * only ever runs on the specific routes that represent actually driving (see routes/api.php's
 * `v1/driver` group), never on /me, /logout, /violations, or /profile-photo.
 *
 * The backend is the enforcement boundary here, not the mobile app: even a driver holding a
 * still-valid Sanctum token from before their franchise was suspended/revoked is blocked the
 * moment they try to use it against one of these routes.
 */
class EnsureFranchiseIsOperational
{
    public function handle(Request $request, Closure $next): Response
    {
        // Explicitly going Offline is the opposite of "operate" — always allowed, even for a
        // driver whose franchise is suspended/revoked, so this middleware never traps someone
        // into a state where they can't even turn themselves off. Only this route
        // (POST /driver/status) ever sends an `is_online` key, so this never affects any other
        // gated route.
        if ($request->has('is_online') && $request->boolean('is_online') === false) {
            return $next($request);
        }

        $user = $request->user();
        $driver = $user ? Driver::where('user_id', $user->id)->first() : null;

        // No Driver row at all is a different, pre-existing failure mode each controller already
        // handles on its own (e.g. "No driver profile found for this account.") — this middleware
        // only ever blocks an EXISTING driver whose assigned franchise says they can't operate.
        if ($driver && !$driver->canOperate()) {
            $franchise = $driver->franchise();

            $message = match (true) {
                $franchise === null      => 'Your assigned tricycle has no active franchise. Please contact the Municipal Tricycle Office for assistance.',
                $franchise->isRevoked()  => 'Your assigned franchise has been revoked. You cannot go online or accept bookings. Please contact the Municipal Tricycle Office for assistance.',
                default                  => 'Your assigned franchise is currently suspended. You cannot go online or accept bookings while it is suspended.',
            };

            return response()->json([
                'success'          => false,
                'message'          => $message,
                'franchise_status' => $franchise?->status,
                'status_reason'    => $franchise?->status_reason,
            ], 403);
        }

        return $next($request);
    }
}
