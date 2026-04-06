<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class OperatorAuthController extends Controller
{
    /**
     * Display the unified login view.
     */
    public function showLoginForm()
    {
        // Points directly to resources/js/Pages/Login.jsx
        return Inertia::render('Login');
    }

    /**
     * Handle an incoming authentication request.
     * (Currently wired for Demo Accounts routing)
     */
    public function login(Request $request)
    {
        // Updated to match the 'login_id' field sent from React
        $request->validate([
            'login_id' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginId = strtolower($request->login_id);

        // 🔴 DEMO ROUTING LOGIC 🔴
        // Redirects to the specific dashboard based on the demo account used
        if ($loginId === 'tmo@nasugbu.gov.ph') {
            // Redirects to Live Monitoring map
            return redirect()->route('tmo.dashboard')->with('success', 'Logged in as TMO Officer');
        }

        if ($loginId === 'cashier@nasugbu.gov.ph') {
            return redirect()->route('treasurer.dashboard')->with('success', 'Logged in as Cashier');
        }

        if ($loginId === 'bplo@nasugbu.gov.ph') {
            return redirect()->route('bplo.releasing')->with('success', 'Logged in as BPLO Head');
        }

        if ($loginId === 'mario.delacruz@operator.ph') {
            return redirect()->route('operator.dashboard')->with('success', 'Logged in as Operator');
        }

        // Fallback for any other login attempts
        return redirect()->route('home')->with('success', 'Logged in successfully!');
    }
}
