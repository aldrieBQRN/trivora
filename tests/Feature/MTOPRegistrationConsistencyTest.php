<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Tricycle;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers Operator\MTOPController::store() (Driver Portal "New Unit Registration"/"Renewal")
 * now matching Public Registration (RegistrationController::store()) for vehicle-field
 * validation and canonical document vocabulary, plus the renewal-only Prangkisa requirement.
 */
class MTOPRegistrationConsistencyTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    private function newUnitPayload(array $overrides = []): array
    {
        return array_merge([
            'application_type' => 'new',
            'plate_number' => 'MTOP-NEW-0001',
            'make_model' => 'Honda TMX155',
            'year_model' => 2023,
            'body_color' => 'Blue',
            'body_type' => 'Standard',
            'engine_number' => 'ENG-MTOPNEW-0001',
            'chassis_number' => 'CHS-MTOPNEW-0001',
            'or_number' => 'OR-MTOPNEW-0001',
            'cr_number' => 'CR-MTOPNEW-0001',
            'documents' => [
                'police_clearance'   => [$this->fakeDocument('police.pdf')],
                'health_certificate' => [$this->fakeDocument('health.pdf')],
                'orcr_photocopy'     => [$this->fakeDocument('orcr.pdf')],
                'drivers_license'    => [$this->fakeDocument('license.pdf')],
                'barangay_clearance' => [$this->fakeDocument('brgy.pdf')],
                'toda_clearance'     => [$this->fakeDocument('toda.pdf')],
                'cedula'             => [$this->fakeDocument('cedula.pdf')],
                'driver_id'          => [$this->fakeDocument('driverid.pdf')],
                'tariff_list'        => [$this->fakeDocument('tariff.pdf')],
            ],
        ], $overrides);
    }

    #[Test]
    public function new_unit_registration_requires_the_same_vehicle_fields_as_public_registration(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-BASE-0001']);

        $payload = $this->newUnitPayload();
        unset($payload['year_model'], $payload['body_color'], $payload['or_number']);

        $response = $this->actingAs($user)->post(route('operator.mtop.store'), $payload);

        $response->assertSessionHasErrors(['year_model', 'body_color', 'or_number']);
    }

    #[Test]
    public function new_unit_registration_requires_the_same_canonical_documents_as_public_registration(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-BASE-0002']);

        $payload = $this->newUnitPayload();
        unset($payload['documents']['police_clearance'], $payload['documents']['cedula']);

        $response = $this->actingAs($user)->post(route('operator.mtop.store'), $payload);

        $response->assertSessionHasErrors(['documents.police_clearance', 'documents.cedula']);
    }

    #[Test]
    public function new_unit_registration_does_not_require_prangkisa(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-BASE-0003']);

        $response = $this->actingAs($user)->post(route('operator.mtop.store'), $this->newUnitPayload());

        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('applications', [
            'operator_id' => $user->operator->id,
            'application_type' => 'new',
        ]);

        $application = Application::where('operator_id', $user->operator->id)
            ->where('application_type', 'new')
            ->latest('id')
            ->firstOrFail();
        $this->assertFalse(
            $application->documents()->where('document_type', 'prangkisa')->exists(),
            'A new unit registration must never have a Prangkisa document.'
        );
    }

    #[Test]
    public function renewal_requires_prangkisa_but_new_unit_registration_does_not(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'MTOP-PRK-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();

        // Drive the original application to a completed/active franchise, then expire it so a
        // renewal is eligible — reusing the same real pipeline FranchiseRenewalTest uses.
        $this->actingAs($tmo)->post(route('tmo.review.submit', $originalApplication), [
            'action' => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $originalApplication), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);
        $this->actingAs($bplo)->post(route('bplo.release.submit', $originalApplication), [
            'body_number' => '9001', 'sticker_number' => 'STK-PRK-0001',
        ]);
        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $originalApplication), [
            'signed_ticket_verified' => true, 'bplo_approval_confirmed' => true,
            'sticker_possession_confirmed' => true, 'tracking_method' => 'mobile_gps', 'officer_notes' => '',
        ]);

        $tricycle = $originalApplication->tricycle()->first();
        \App\Models\FranchiseScheme::where('tricycle_id', $tricycle->id)
            ->where('is_active', true)
            ->update(['expiry_date' => now()->subDay()->toDateString()]);

        $renewalPayload = $this->newUnitPayload([
            'application_type' => 'renewal',
            'unit_id' => $tricycle->id,
        ]);
        // Deliberately omit Prangkisa — this must be rejected for a renewal.
        $response = $this->actingAs($driverUser)->post(route('operator.mtop.store'), $renewalPayload);

        $response->assertSessionHasErrors('documents.prangkisa');
        $this->assertSame(1, Application::where('tricycle_id', $tricycle->id)->count(), 'No renewal Application should have been created without Prangkisa.');

        // Now submit again WITH Prangkisa — must succeed.
        $renewalPayload['documents']['prangkisa'] = [$this->fakeDocument('prangkisa.pdf')];
        $response = $this->actingAs($driverUser)->post(route('operator.mtop.store'), $renewalPayload);

        $response->assertSessionDoesntHaveErrors();
        $renewalApplication = Application::where('tricycle_id', $tricycle->id)
            ->where('id', '!=', $originalApplication->id)
            ->firstOrFail();
        $this->assertSame('renewal', $renewalApplication->application_type);
        $this->assertTrue(
            $renewalApplication->documents()->where('document_type', 'prangkisa')->exists(),
            'The renewal application must have a Prangkisa document.'
        );
    }

    #[Test]
    public function new_unit_registration_stores_documents_under_the_canonical_document_type_values(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-KEYS-0001']);

        $this->actingAs($user)->post(route('operator.mtop.store'), $this->newUnitPayload())
            ->assertSessionDoesntHaveErrors();

        $application = Application::where('operator_id', $user->operator->id)
            ->where('application_type', 'new')
            ->latest('id')
            ->firstOrFail();

        $storedTypes = ApplicationDocument::where('application_id', $application->id)
            ->pluck('document_type')
            ->sort()
            ->values()
            ->all();

        $this->assertSame([
            'barangay_clearance', 'cedula', 'driver_id', 'drivers_license', 'health_certificate',
            'orcr_photocopy', 'police_clearance', 'tariff_list', 'toda_clearance',
        ], $storedTypes, 'Documents must be stored under the same canonical document_type values Public Registration uses — never "other" or the old short keys.');
    }

    #[Test]
    public function new_unit_registration_creates_a_tricycle_from_the_actual_submitted_vehicle_details(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-VEH-0001']);

        $this->actingAs($user)->post(route('operator.mtop.store'), $this->newUnitPayload([
            'plate_number' => 'MTOP-VEH-0002',
            'year_model' => 2019,
            'body_color' => 'Green',
            'body_type' => 'Extended Sidecar',
            'or_number' => 'OR-VEH-UNIQUE',
            'cr_number' => 'CR-VEH-UNIQUE',
        ]))->assertSessionDoesntHaveErrors();

        $tricycle = Tricycle::where('plate_number', 'MTOP-VEH-0002')->firstOrFail();
        $this->assertSame(2019, (int) $tricycle->year_model);
        $this->assertSame('Green', $tricycle->body_color);
        $this->assertSame('Extended Sidecar', $tricycle->body_type);
        $this->assertSame('OR-VEH-UNIQUE', $tricycle->or_number);
        $this->assertSame('CR-VEH-UNIQUE', $tricycle->cr_number);
        $this->assertNull($tricycle->toda_zone_id, 'Registration must not assign a TODA zone — TODA is a document requirement only.');
    }
}
