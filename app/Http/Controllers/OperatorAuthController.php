<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class OperatorAuthController extends Controller
{
    /**
     * Display the operator login view.
     */
    public function showLoginForm()
    {
        return Inertia::render('Operator/Login');
    }

    /**
     * Handle an incoming authentication request.
     * (We will wire up the actual database logic later)
     */
    public function login(Request $request)
    {
        $request->validate([
            'mobile_number' => 'required|string',
            'password' => 'required|string',
        ]);

        // For now, let's just pretend it's successful and redirect them to a placeholder dashboard
        // In the future, this will use Auth::guard('operator')->attempt(...)

        return redirect()->route('home')->with('success', 'Logged in successfully!');
    }
}
