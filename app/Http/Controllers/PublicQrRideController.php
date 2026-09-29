<?php

namespace App\Http\Controllers;

use App\Services\QrRideService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public landing page for a printed QR (/ride/q/{token}) — what someone sees when they scan the
 * code with a normal phone camera. Shows only safe public unit details and whether the tricycle
 * is taking walk-in passengers right now; joining happens in the Passenger app.
 */
class PublicQrRideController extends Controller
{
    public function __construct(private readonly QrRideService $qrRides)
    {
    }

    public function show(Request $request, string $token): Response
    {
        $status = $this->qrRides->publicStatus($token);

        return Inertia::render('QrRideLanding', ['status' => $status])
            ->toResponse($request)
            ->setStatusCode($status['valid'] ? 200 : 404);
    }
}
