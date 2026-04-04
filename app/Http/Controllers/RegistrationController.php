<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    // For the Internal TMO Validation Dashboard
    public function create()
    {
        return Inertia::render('Registration/Apply');
    }

    // <-- ADD THIS NEW METHOD -->
    // For the Public Landing Page Registration
    public function publicWizard()
    {
        return Inertia::render('Registration/PublicApply');
    }
}
