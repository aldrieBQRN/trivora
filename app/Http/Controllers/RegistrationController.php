<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    // Bumped only when the terms/privacy copy in Registration/PublicApply.jsx materially changes.
    private const TERMS_VERSION = '2026.1';

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

    /**
     * Submit public tricycle application wizard.
     */
    public function store(Request $request)
    {
        $currentYear = (int) now()->format('Y');

        $request->validate([
            // Driver info
            'first_name'     => 'required|string|max:100',
            'last_name'      => 'required|string|max:100',
            'contact'        => 'required|string|max:20',
            'barangay'       => 'required|string|max:100',
            'email'          => 'required|string|email|max:255|unique:users,email',
            'password'       => 'required|string|min:8',

            // Vehicle specs
            'plate_number'   => 'required|string|max:20|unique:tricycles,plate_number',
            'make_model'     => 'required|string|max:100',
            'year_model'     => 'required|integer|min:1980|max:' . ($currentYear + 1),
            'body_color'     => 'required|string|max:50',
            'body_type'      => 'required|string|max:100',
            'engine_number'  => 'required|string|max:50|unique:tricycles,engine_number',
            'chassis_number' => 'required|string|max:50|unique:tricycles,chassis_number',
            'or_number'      => 'required|string|max:50',
            'cr_number'      => 'required|string|max:50',
            'toda'           => 'required|string|max:20',

            // Terms & Agreement — the single "I have read, understood, and agree to the
            // Terms & Conditions, including the Data Privacy Consent..." checkbox on Step 1.
            'terms_accepted'           => 'required|accepted',
            'privacy_policy_accepted'  => 'required|accepted',

            // Documents
            'documents'           => 'required|array',
            'documents.orcr'      => 'required|array|min:1',
            'documents.orcr.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.license'   => 'required|array|min:1',
            'documents.license.*' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.brgy'      => 'required|array|min:1',
            'documents.brgy.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.toda'      => 'required|array|min:1',
            'documents.toda.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
        ]);

        [$user, $reference] = DB::transaction(function () use ($request) {
            // 1. Create User
            $user = \App\Models\User::create([
                'name'     => $request->input('first_name') . ' ' . $request->input('last_name'),
                'email'    => $request->input('email'),
                'password' => \Illuminate\Support\Facades\Hash::make($request->input('password')),
                'role'     => 'tricycle_driver',
            ]);

            // Registration/PublicApply.jsx's TODA Assignment dropdown submits the zone's full
            // display name directly (e.g. "TODA Bucana", "TODA Brgy. 10") — resolve by that
            // name, matching exactly what's sent. (This used to map through single-letter
            // codes 'A'-'D' to TodaZone codes 'TODA-01'..'TODA-04', but the frontend never sent
            // those letters and no zone in this database is coded that way either — the lookup
            // always missed and silently fell back to a zone that doesn't exist, so every
            // registration ended up with a NULL TODA regardless of what was picked.)
            $todaZone = \App\Models\TodaZone::where('name', $request->input('toda'))->first();

            // 2. Create Operator
            $operator = \App\Models\Operator::create([
                'user_id'                  => $user->id,
                'first_name'               => $request->input('first_name'),
                'last_name'                => $request->input('last_name'),
                'contact_number'           => $request->input('contact'),
                'address'                  => 'Brgy. ' . $request->input('barangay') . ', Nasugbu, Batangas',
                'barangay'                 => $request->input('barangay'),
                'date_of_birth'            => now()->subYears(25)->toDateString(), // Default DOB placeholder
                'license_number'           => 'N' . str_pad(rand(1, 99), 2, '0', STR_PAD_LEFT) . '-' . str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT), // Generated license placeholder
                'license_expiry_date'      => now()->addYears(3)->toDateString(),
                'toda_id'                  => $todaZone?->id,
            ]);

            // 3. Create Tricycle
            $makeModel = $request->input('make_model');
            $parts = explode(' ', $makeModel, 2);
            $make = $parts[0] ?? 'Generic';
            $model = $parts[1] ?? 'Tricycle';

            $tricycle = \App\Models\Tricycle::create([
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $todaZone?->id,
                'plate_number'   => $request->input('plate_number'),
                'engine_number'  => $request->input('engine_number'),
                'chassis_number' => $request->input('chassis_number'),
                'make'           => $make,
                'model'          => $model,
                'year_model'     => $request->input('year_model'),
                'body_color'     => $request->input('body_color'),
                'body_type'      => $request->input('body_type'),
                'or_number'      => $request->input('or_number'),
                'cr_number'      => $request->input('cr_number'),
                'status'         => 'unregistered',
            ]);

            // 4. Create Application
            $appCount = \App\Models\Application::count();
            $refNo = 'APP-2026-' . str_pad($appCount + 1, 5, '0', STR_PAD_LEFT);

            $application = \App\Models\Application::create([
                'reference_number'        => $refNo,
                'operator_id'             => $operator->id,
                'tricycle_id'             => $tricycle->id,
                'application_type'        => 'new',
                'current_step'            => 1, // Step 1: Document review
                'status'                  => 'pending_review',
                'submitted_at'            => now(),
                'terms_accepted'          => $request->boolean('terms_accepted'),
                'privacy_policy_accepted' => $request->boolean('privacy_policy_accepted'),
                'consent_accepted_at'     => now(),
                'terms_version'           => self::TERMS_VERSION,
            ]);

            // 5. Save Documents
            $docKeys = [
                'orcr'      => 'or_cr',
                'license'   => 'drivers_license',
                'brgy'      => 'proof_of_residence',
                'toda'      => 'toda_clearance',
                'driver_id' => 'photo_id',
                'prangkisa'  => 'other',
                'receipt'   => 'other',
                'tariff'    => 'other',
                'auth'      => 'other',
            ];

            if ($request->file('documents')) {
                foreach ($request->file('documents') as $key => $fileOrFiles) {
                    if (isset($docKeys[$key])) {
                        $files = is_array($fileOrFiles) ? $fileOrFiles : [$fileOrFiles];
                        foreach ($files as $file) {
                            $path = $file->store('applications/documents', 'public');
                            \App\Models\ApplicationDocument::create([
                                'application_id' => $application->id,
                                'document_type'  => $docKeys[$key],
                                'file_name'      => $key . '_' . $file->getClientOriginalName(),
                                'file_path'      => $path,
                                'file_size_kb'   => round($file->getSize() / 1024),
                                'mime_type'      => $file->getMimeType(),
                                'review_status'  => 'pending',
                            ]);
                        }
                    }
                }
            }

            // 6. Log Status History
            \App\Models\ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => $user->id,
                'from_status'    => 'draft',
                'to_status'      => 'pending_review',
                'from_step'      => 1,
                'to_step'        => 1,
                'notes'          => 'Public application submitted online by Operator.',
                'created_at'     => now(),
            ]);

            return [$user, $refNo];
        });

        // Automatically authenticate user session
        auth()->login($user);

        // Redirect back with reference parameter
        return redirect()->route('register.public', [
            'success'   => 1,
            'reference' => $reference,
        ]);
    }
}
