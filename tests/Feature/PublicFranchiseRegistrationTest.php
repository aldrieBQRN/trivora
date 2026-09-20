<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusHistory;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers the real public franchise registration endpoint (RegistrationController::store(), POST
 * /register-mtop, route `register.public.submit`) — the entry point of the franchise lifecycle.
 * Field names and behavior here are taken directly from the controller, not assumed from the UI.
 */
class PublicFranchiseRegistrationTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function a_complete_submission_creates_the_full_application_record(): void
    {
        [$response, $user, $application] = $this->registerNewApplication();

        $response->assertRedirect(route('register.public', [
            'success'   => 1,
            'reference' => $application->reference_number,
        ]));
        $this->assertTrue(auth()->check());
        $this->assertSame($user->id, auth()->id());

        // User
        $this->assertSame('tricycle_driver', $user->role);
        $this->assertSame('Juan Dela Cruz', $user->name);

        // Operator
        $operator = Operator::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('Juan', $operator->first_name);
        $this->assertSame('Poblacion', $operator->barangay);
        // Regression guard: RegistrationController::store() must resolve the exact TodaZone the
        // dropdown submitted (by name) — not just "some" zone, and not silently null.
        $this->assertNotNull($operator->toda_id);
        $this->assertSame('TODA Bucana', $operator->todaZone->name);

        // Tricycle
        $tricycle = Tricycle::where('operator_id', $operator->id)->firstOrFail();
        $this->assertSame('unregistered', $tricycle->status);
        $this->assertSame('Honda', $tricycle->make);
        $this->assertSame('TMX155', $tricycle->model);
        $this->assertSame(2021, $tricycle->year_model);
        $this->assertSame('Red', $tricycle->body_color);
        $this->assertSame('Standard', $tricycle->body_type);
        $this->assertSame($operator->toda_id, $tricycle->toda_zone_id);
        $this->assertNotNull($tricycle->or_number);
        $this->assertNotNull($tricycle->cr_number);

        // Application
        $this->assertSame($tricycle->id, $application->tricycle_id);
        $this->assertSame('new', $application->application_type);
        $this->assertSame('pending_review', $application->status);
        $this->assertSame(1, $application->current_step);
        $this->assertNotNull($application->submitted_at);
        $this->assertStringStartsWith('APP-2026-', $application->reference_number);

        // Terms & consent — the frontend's single combined "I agree" checkbox.
        $this->assertTrue($application->terms_accepted);
        $this->assertTrue($application->privacy_policy_accepted);
        $this->assertNotNull($application->consent_accepted_at);
        $this->assertSame('2026.1', $application->terms_version);

        // Documents — one per required category, all pending review.
        $docs = ApplicationDocument::where('application_id', $application->id)->get();
        $this->assertCount(4, $docs);
        $this->assertEqualsCanonicalizing(
            ['or_cr', 'drivers_license', 'proof_of_residence', 'toda_clearance'],
            $docs->pluck('document_type')->all()
        );
        $this->assertTrue($docs->every(fn ($d) => $d->review_status === 'pending'));

        // Status history — the workflow's very first transition.
        $history = ApplicationStatusHistory::where('application_id', $application->id)->get();
        $this->assertCount(1, $history);
        $this->assertSame('draft', $history->first()->from_status);
        $this->assertSame('pending_review', $history->first()->to_status);
    }

    #[Test]
    public function it_does_not_create_duplicate_records_for_a_single_submission(): void
    {
        [, $user] = $this->registerNewApplication();

        $this->assertSame(1, User::where('email', $user->email)->count());
        $this->assertSame(1, Operator::where('user_id', $user->id)->count());
        $this->assertSame(1, Application::where('operator_id', $user->operator->id)->count());
    }

    /**
     * Regression test for the fix: RegistrationController::store() used to hardcode
     * year_model=2024/body_color='Red' and silently discard body_type/or_number/cr_number even
     * though PublicApply.jsx collects and client-requires all five. It now validates and persists
     * the real submitted values.
     */
    #[Test]
    public function all_five_vehicle_spec_fields_are_persisted_from_the_submitted_values(): void
    {
        [, , $application] = $this->registerNewApplication([
            'year_model' => 2019,
            'body_color' => 'Blue',
            'body_type'  => 'Extended',
            'or_number'  => 'OR-SUBMITTED-001',
            'cr_number'  => 'CR-SUBMITTED-001',
        ]);

        $tricycle = $application->tricycle;
        $this->assertSame(2019, $tricycle->year_model);
        $this->assertSame('Blue', $tricycle->body_color);
        $this->assertSame('Extended', $tricycle->body_type);
        $this->assertSame('OR-SUBMITTED-001', $tricycle->or_number);
        $this->assertSame('CR-SUBMITTED-001', $tricycle->cr_number);
    }

    /**
     * Values persisted at registration must still be visible once TMO/BPLO review the
     * application later — they read straight through the same Tricycle relation.
     */
    #[Test]
    public function persisted_vehicle_fields_remain_available_for_later_tmo_bplo_review(): void
    {
        [, , $application] = $this->registerNewApplication([
            'year_model' => 2017, 'body_color' => 'Green', 'body_type' => 'Sidecar',
            'or_number' => 'OR-REVIEW-001', 'cr_number' => 'CR-REVIEW-001',
        ]);

        // Simulate a later request (e.g. TMO's document review page) re-fetching from scratch.
        $reloaded = Tricycle::find($application->tricycle_id);

        $this->assertSame(2017, $reloaded->year_model);
        $this->assertSame('Green', $reloaded->body_color);
        $this->assertSame('Sidecar', $reloaded->body_type);
        $this->assertSame('OR-REVIEW-001', $reloaded->or_number);
        $this->assertSame('CR-REVIEW-001', $reloaded->cr_number);
    }

    /**
     * Regression test for the fix: RegistrationController::store() used to map the `toda` field
     * through single-letter codes ('A'-'D' -> TodaZone.code 'TODA-01'..'TODA-04'), but the
     * dropdown actually submits the zone's full display name (e.g. "TODA Brgy. 8"), and no zone
     * in this database is even coded 'TODA-01'..'04' — so the lookup always missed and every
     * registration silently got toda_id/toda_zone_id = NULL regardless of what was picked. It now
     * resolves TodaZone by name directly, matching what the dropdown actually sends.
     */
    #[Test]
    public function the_toda_zone_actually_picked_on_the_form_is_the_one_persisted(): void
    {
        \App\Models\TodaZone::firstOrCreate(
            ['name' => 'TODA Brgy. 8'],
            ['code' => 'TODA-WORKFLOW-TEST-8', 'barangay' => 'Brgy. 8', 'is_active' => true]
        );

        [, , $application] = $this->registerNewApplication([
            'plate_number' => 'WFL-TODA-CHECK',
            'toda' => 'TODA Brgy. 8',
        ]);

        $operator = $application->operator;
        $this->assertNotNull($operator->toda_id);
        $this->assertSame('TODA Brgy. 8', $operator->todaZone->name);
        $this->assertSame($operator->toda_id, $application->tricycle->toda_zone_id);
    }

    #[Test]
    public function missing_year_model_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['year_model']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('year_model');
        $this->assertSame(0, Application::count());
    }

    #[Test]
    public function an_unreasonable_year_model_is_rejected(): void
    {
        $response = $this->post(route('register.public.submit'), $this->registrationPayload(['year_model' => 1899]));

        $response->assertSessionHasErrors('year_model');
    }

    #[Test]
    public function missing_body_color_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['body_color']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('body_color');
    }

    #[Test]
    public function missing_or_number_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['or_number']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('or_number');
    }

    #[Test]
    public function registration_succeeds_when_terms_and_privacy_are_accepted(): void
    {
        [$response, , $application] = $this->registerNewApplication([
            'terms_accepted' => true,
            'privacy_policy_accepted' => true,
        ]);

        $response->assertSessionDoesntHaveErrors();
        $this->assertTrue($application->terms_accepted);
        $this->assertTrue($application->privacy_policy_accepted);
        $this->assertNotNull($application->consent_accepted_at);
    }

    /**
     * Regression test for the real bug: PublicApply.jsx passed `agreed` to `post()` via an inline
     * `transform` option, which Inertia's useForm().post() silently ignores (`transform` is only
     * a separate `form.transform(callback)` method, not a post() option) — so the checkbox's true
     * value never reached the backend at all, no matter how it was checked. The frontend fix wires
     * the checkbox directly into useForm's `data`, which Inertia's FormData conversion serializes
     * booleans as the literal strings "1"/"0" (confirmed by reading @inertiajs/core's append()) —
     * this test sends exactly that wire format rather than PHP booleans, to lock in the real
     * contract the browser actually produces, not just an equivalent-but-different representation.
     */
    #[Test]
    public function accepting_the_checkbox_reaches_the_backend_in_inertias_real_wire_format(): void
    {
        [$response, , $application] = $this->registerNewApplication([
            'terms_accepted' => '1',
            'privacy_policy_accepted' => '1',
        ]);

        $response->assertSessionDoesntHaveErrors();
        $this->assertTrue($application->terms_accepted);
        $this->assertTrue($application->privacy_policy_accepted);
    }

    #[Test]
    public function an_unchecked_box_in_inertias_real_wire_format_is_rejected(): void
    {
        $payload = $this->registrationPayload([
            'terms_accepted' => '0',
            'privacy_policy_accepted' => '0',
        ]);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors(['terms_accepted', 'privacy_policy_accepted']);
        $this->assertSame(0, Application::count());
    }

    #[Test]
    public function registration_is_rejected_when_terms_are_not_accepted(): void
    {
        $payload = $this->registrationPayload(['terms_accepted' => false]);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('terms_accepted');
        $this->assertSame(0, Application::count());
        $this->assertGuest();
    }

    #[Test]
    public function registration_is_rejected_when_privacy_policy_is_not_accepted(): void
    {
        $payload = $this->registrationPayload(['privacy_policy_accepted' => false]);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('privacy_policy_accepted');
        $this->assertSame(0, Application::count());
    }

    #[Test]
    public function registration_is_rejected_when_terms_are_entirely_omitted(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['terms_accepted'], $payload['privacy_policy_accepted']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors(['terms_accepted', 'privacy_policy_accepted']);
        $this->assertSame(0, Application::count());
    }

    #[Test]
    public function missing_first_name_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['first_name']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('first_name');
        $this->assertGuest();
    }

    #[Test]
    public function an_invalid_email_is_rejected(): void
    {
        $payload = $this->registrationPayload(['email' => 'not-an-email']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('email');
    }

    #[Test]
    public function a_duplicate_email_is_rejected(): void
    {
        $existing = User::factory()->create(['email' => 'taken@trivora.test']);
        $payload = $this->registrationPayload(['email' => $existing->email]);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('email');
    }

    #[Test]
    public function a_duplicate_plate_number_is_rejected(): void
    {
        [, , $first] = $this->registerNewApplication(['plate_number' => 'DUP-0001']);

        $payload = $this->registrationPayload(['plate_number' => 'DUP-0001']);
        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('plate_number');
        // Only the first registration's tricycle exists.
        $this->assertSame(1, Tricycle::where('plate_number', 'DUP-0001')->count());
    }

    #[Test]
    public function missing_toda_assignment_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['toda']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('toda');
    }

    #[Test]
    public function missing_plate_number_is_rejected(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['plate_number']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('plate_number');
    }

    #[Test]
    public function a_required_document_category_cannot_be_omitted(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['documents']['orcr']);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('documents.orcr');
        $this->assertSame(0, Application::count());
    }

    #[Test]
    public function an_invalid_document_file_type_is_rejected(): void
    {
        $payload = $this->registrationPayload([
            'documents' => [
                'orcr'    => [UploadedFile::fake()->create('orcr.exe', 200, 'application/x-msdownload')],
                'license' => [$this->fakeDocument('license.pdf')],
                'brgy'    => [$this->fakeDocument('brgy.pdf')],
                'toda'    => [$this->fakeDocument('toda.pdf')],
            ],
        ]);

        $response = $this->post(route('register.public.submit'), $payload);

        $response->assertSessionHasErrors('documents.orcr.0');
    }

    #[Test]
    public function no_records_are_created_when_validation_fails(): void
    {
        $payload = $this->registrationPayload();
        unset($payload['email']);

        $this->post(route('register.public.submit'), $payload);

        $this->assertSame(0, User::where('name', 'Juan Dela Cruz')->count());
        $this->assertSame(0, Application::count());
        $this->assertGuest();
    }
}
