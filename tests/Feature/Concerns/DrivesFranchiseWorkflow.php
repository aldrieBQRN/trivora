<?php

namespace Tests\Feature\Concerns;

use App\Models\Application;
use App\Models\ColorCodingScheme;
use App\Models\TodaZone;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Shared setup for the franchise-lifecycle feature tests (public registration through TMO Final
 * Confirmation). Builds on the real public registration endpoint rather than seeding an
 * Application directly, so the whole downstream workflow is exercised against data that actually
 * came from RegistrationController::store() — not a synthetic shortcut.
 */
trait DrivesFranchiseWorkflow
{
    /**
     * RegistrationController::store() resolves the TODA zone by matching TodaZone.name against
     * the exact string PublicApply.jsx's dropdown submits — 'TODA Bucana' here, matching that
     * dropdown's real option value (see registrationPayload()'s 'toda' default below).
     */
    protected function seedTodaAndColorScheme(): void
    {
        TodaZone::firstOrCreate(
            ['name' => 'TODA Bucana'],
            ['code' => 'TODA-WORKFLOW-TEST', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        // Sticker Numbers ending in 1 or 2 are Monday-restricted (ColorCodingRuleService) — this
        // scheme lets BPLOController::release() resolve a real match instead of falling back to
        // ColorCodingScheme::first().
        ColorCodingScheme::firstOrCreate(
            ['name' => 'Workflow Test Red'],
            ['color_hex' => '#FF0000', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
    }

    protected function fakeDocument(string $name): UploadedFile
    {
        return UploadedFile::fake()->create($name, 200, 'application/pdf');
    }

    protected function registrationPayload(array $overrides = []): array
    {
        $unique = uniqid();

        return array_merge([
            // Applicant (tricycle owner) info
            'first_name'              => 'Juan',
            'last_name'               => 'Dela Cruz',
            'birthday'                => '1990-05-20',
            'contact'                 => '09171234567',
            'barangay'                => 'Bucana', // must be one of NasugbuBarangays::values()
            'owner_is_driver'         => true,    // default scenario: owner drives their own unit
            'email'                   => "juan.delacruz.{$unique}@trivora.test",
            'password'                => 'password123',
            'plate_number'            => "WFL-{$unique}",
            'make_model'              => 'Honda TMX155',
            'year_model'              => 2021,
            'body_color'              => 'Red',
            'body_type'               => 'Standard',
            'engine_number'           => "ENG-{$unique}",
            'chassis_number'          => "CHS-{$unique}",
            'or_number'               => "OR-{$unique}",
            'cr_number'               => "CR-{$unique}",
            'terms_accepted'          => true,
            'privacy_policy_accepted' => true,
            'documents'      => [
                'police_clearance'   => [$this->fakeDocument('police_clearance.pdf')],
                'health_certificate' => [$this->fakeDocument('health_certificate.pdf')],
                'orcr_photocopy'     => [$this->fakeDocument('orcr_photocopy.pdf')],
                'drivers_license'    => [$this->fakeDocument('drivers_license.pdf')],
                'barangay_clearance' => [$this->fakeDocument('barangay_clearance.pdf')],
                'toda_clearance'     => [$this->fakeDocument('toda_clearance.pdf')],
                'cedula'             => [$this->fakeDocument('cedula.pdf')],
                'driver_id'          => [$this->fakeDocument('driver_id.pdf')],
                'tariff_list'        => [$this->fakeDocument('tariff_list.pdf')],
            ],
        ], $overrides);
    }

    /**
     * Submits the real public registration endpoint and returns [$response, $user, $application].
     * $application is freshly reloaded from the database, not the in-memory instance the
     * controller built, so every assertion downstream reflects what was actually persisted.
     */
    protected function registerNewApplication(array $overrides = []): array
    {
        $payload = $this->registrationPayload($overrides);

        $response = $this->post(route('register.public.submit'), $payload);

        $user = User::where('email', $payload['email'])->firstOrFail();
        $application = Application::where('operator_id', $user->operator->id)
            ->latest('id')
            ->firstOrFail();

        return [$response, $user, $application];
    }

    protected function makeTmoUser(): User
    {
        return User::create([
            'name'      => 'TMO Officer',
            'email'     => 'tmo.officer.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);
    }

    protected function makeBploUser(): User
    {
        return User::create([
            'name'      => 'BPLO Staff',
            'email'     => 'bplo.staff.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'bplo_staff',
            'is_active' => true,
        ]);
    }

    /** Every inspection checklist item marked "passed". */
    protected function allInspectionItemsPassed(): array
    {
        return [
            'mirrors' => 'passed', 'horn' => 'passed', 'plate' => 'passed',
            'headlights' => 'passed', 'taillights' => 'passed', 'signals' => 'passed',
            'brakes' => 'passed', 'sidecar' => 'passed',
        ];
    }
}
