<?php

namespace App\Http\Controllers;

use App\Support\NasugbuBarangays;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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

        // Whether the tricycle OWNER is also the tricycle driver. Persisted on the
        // application itself — never frontend-only state. An absent flag (legacy/other
        // client) is treated as "owner is also the driver", matching how every pre-existing
        // application is backfilled.
        $ownerIsDriver = $request->boolean('owner_is_driver', true);

        $rules = [
            // Applicant (tricycle OWNER) info
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'birthday'        => 'required|date|before_or_equal:today',
            'contact'         => 'required|string|max:20',
            'barangay'        => ['required', 'string', Rule::in(NasugbuBarangays::values())],
            'email'           => 'required|string|email|max:255|unique:users,email',
            'password'        => 'required|string|min:8',
            'owner_is_driver' => 'nullable|boolean',

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

            // Terms & Agreement — the single "I have read, understood, and agree to the
            // Terms & Conditions, including the Data Privacy Consent..." checkbox on Step 1.
            'terms_accepted'           => 'required|accepted',
            'privacy_policy_accepted'  => 'required|accepted',

            // Documents — required: police clearance, health certificate, OR/CR photocopy,
            // driver's license, barangay clearance, TODA clearance, cedula, driver's ID, tariff
            // list. Conditional (optional here, but validated for file type/size if provided):
            // delivery receipt (vehicles without OR/CR yet or new units), authorization letter
            // (claimed by someone other than the operator/owner).
            'documents'                         => 'required|array',
            'documents.police_clearance'        => 'required|array|min:1',
            'documents.police_clearance.*'      => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.health_certificate'      => 'required|array|min:1',
            'documents.health_certificate.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.orcr_photocopy'          => 'required|array|min:1',
            'documents.orcr_photocopy.*'        => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.drivers_license'         => 'required|array|min:1',
            'documents.drivers_license.*'       => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.barangay_clearance'      => 'required|array|min:1',
            'documents.barangay_clearance.*'    => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.toda_clearance'          => 'required|array|min:1',
            'documents.toda_clearance.*'        => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.cedula'                  => 'required|array|min:1',
            'documents.cedula.*'                => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.driver_id'               => 'required|array|min:1',
            'documents.driver_id.*'             => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.tariff_list'             => 'required|array|min:1',
            'documents.tariff_list.*'           => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.delivery_receipt'        => 'nullable|array',
            'documents.delivery_receipt.*'      => 'file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
            'documents.authorization_letter'    => 'nullable|array',
            'documents.authorization_letter.*'  => 'file|mimes:pdf,jpg,jpeg,png,webp|max:5120',
        ];

        // A separate Tricycle Driver is only collected (and only validated) when the owner
        // is NOT the driver. Explicit conditional rules instead of required_if:nullable, so
        // the requirement can't be slipped past with a stray null.
        if (! $ownerIsDriver) {
            $rules = array_merge($rules, [
                'driver_first_name' => 'required|string|max:100',
                'driver_last_name'  => 'required|string|max:100',
                'driver_birthday'   => 'required|date|before_or_equal:today',
                'driver_contact'    => 'required|string|max:20',
                'driver_barangay'   => ['required', 'string', Rule::in(NasugbuBarangays::values())],
            ]);
        }

        $request->validate($rules);

        [$user, $reference] = DB::transaction(function () use ($request, $ownerIsDriver) {
            // 1. Create User
            $user = \App\Models\User::create([
                'name'     => $request->input('first_name') . ' ' . $request->input('last_name'),
                'email'    => $request->input('email'),
                'password' => \Illuminate\Support\Facades\Hash::make($request->input('password')),
                'role'     => 'tricycle_driver',
            ]);

            // 2. Create Operator
            $operator = \App\Models\Operator::create([
                'user_id'                  => $user->id,
                'first_name'               => $request->input('first_name'),
                'last_name'                => $request->input('last_name'),
                'contact_number'           => $request->input('contact'),
                'address'                  => 'Brgy. ' . $request->input('barangay') . ', Nasugbu, Batangas',
                'barangay'                 => $request->input('barangay'),
                'date_of_birth'            => $request->date('birthday')->toDateString(), // Tricycle Owner's real birthday (date column)
                'license_number'           => 'N' . str_pad(rand(1, 99), 2, '0', STR_PAD_LEFT) . '-' . str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT), // Generated license placeholder
                'license_expiry_date'      => now()->addYears(3)->toDateString(),
                'toda_id'                  => null,
            ]);

            // 3. Create Tricycle
            $makeModel = $request->input('make_model');
            $parts = explode(' ', $makeModel, 2);
            $make = $parts[0] ?? 'Generic';
            $model = $parts[1] ?? 'Tricycle';

            $tricycle = \App\Models\Tricycle::create([
                'operator_id'    => $operator->id,
                'toda_zone_id'   => null,
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

            // 4. Create Application — reference derived from the highest existing
            //    suffix (not a row count), so seeded gaps can't cause a duplicate.
            $refNo = \App\Models\Application::generateReferenceNumber();

            $application = \App\Models\Application::create([
                'reference_number'        => $refNo,
                'operator_id'             => $operator->id,
                'tricycle_id'             => $tricycle->id,
                'owner_is_driver'         => $ownerIsDriver,
                'application_type'        => 'new',
                'current_step'            => 1, // Step 1: Document review
                'status'                  => 'pending_review',
                'submitted_at'            => now(),
                'terms_accepted'          => $request->boolean('terms_accepted'),
                'privacy_policy_accepted' => $request->boolean('privacy_policy_accepted'),
                'consent_accepted_at'     => now(),
                'terms_version'           => self::TERMS_VERSION,
            ]);

            // 5. Separate Tricycle Driver — only when the owner is NOT the driver. Stored as
            // application-scoped person data (no User/Driver account is created for them).
            if (! $ownerIsDriver) {
                \App\Models\ApplicationDriver::create([
                    'application_id' => $application->id,
                    'first_name'     => $request->input('driver_first_name'),
                    'last_name'      => $request->input('driver_last_name'),
                    'date_of_birth'  => $request->date('driver_birthday')->toDateString(),
                    'contact_number' => $request->input('driver_contact'),
                    'barangay'       => $request->input('driver_barangay'),
                ]);
            }

            // 6. Save Documents — the frontend key IS the stored document_type now (both are the
            // real, distinct requirement identifier; see the Sept 2026 document_type VARCHAR
            // migration). No more collapsing conditional documents into a generic 'other' value.
            $docKeys = [
                'police_clearance'     => 'police_clearance',
                'health_certificate'   => 'health_certificate',
                'orcr_photocopy'       => 'orcr_photocopy',
                'drivers_license'      => 'drivers_license',
                'delivery_receipt'     => 'delivery_receipt',
                'barangay_clearance'   => 'barangay_clearance',
                'toda_clearance'       => 'toda_clearance',
                'cedula'               => 'cedula',
                'driver_id'            => 'driver_id',
                'tariff_list'          => 'tariff_list',
                'authorization_letter' => 'authorization_letter',
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

            // 7. Log Status History
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
