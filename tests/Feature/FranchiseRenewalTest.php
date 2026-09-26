<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Payment;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers the fixed Driver Panel MTOP Renewal flow end-to-end:
 *   1. Operator\MTOPController::store()'s server-side can_renew gate (renewalEligibility()).
 *   2. BPLO\BPLOController::release()'s old-scheme deactivation gated by application_type.
 *   3. franchise_number uniqueness scoped to ACTIVE schemes only (active_franchise_number
 *      generated column), so a renewal can reuse its own tricycle's number.
 *   4. Operator\MTOPController::index()/show() showing each Application's OWN franchise period
 *      (Application::franchiseScheme(), application_id-scoped) instead of the tricycle's current
 *      active one.
 *
 * Every assertion is a direct database/HTTP check against the real controllers — no mocking.
 */
class FranchiseRenewalTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    private function allInspectionItemsPassed(): array
    {
        return [
            'mirrors' => 'passed', 'horn' => 'passed', 'plate' => 'passed',
            'headlights' => 'passed', 'taillights' => 'passed', 'signals' => 'passed',
            'brakes' => 'passed', 'sidecar' => 'passed',
        ];
    }

    /** Drives a single Application from pending_review all the way to completed/Franchise Active. */
    private function driveApplicationToActive(Application $application, User $tmo, User $bplo, string $codingNumber, string $stickerNumber): void
    {
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ])->assertRedirect();

        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass',
            'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ])->assertRedirect();

        // Payment (Municipal Treasurer's Office) happens entirely offline — no in-system route to
        // drive here. Inspection pass moves straight to pending_bplo_release.
        $response = $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'body_number' => $codingNumber,
            'sticker_number' => $stickerNumber,
        ]);
        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();

        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified' => true,
            'bplo_approval_confirmed' => true,
            'sticker_possession_confirmed' => true,
            'tracking_method' => 'mobile_gps',
            'officer_notes' => '',
        ])->assertRedirect();

        $application->refresh();
    }

    /**
     * Same vehicle-field set and canonical document vocabulary as Public Registration
     * (RegistrationController::store()) — Operator\MTOPController::store() validates both
     * identically now, for either application_type. Includes Prangkisa, required only for a
     * renewal (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS['prangkisa']).
     */
    private function submitRenewal(User $driverUser, int $tricycleId, array $overrides = []): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($driverUser)->post(route('operator.mtop.store'), array_merge([
            'application_type' => 'renewal',
            'unit_id' => $tricycleId,
            'plate_number' => 'RENEW-UNIT-' . $tricycleId,
            'make_model' => 'Honda TMX155',
            'year_model' => 2022,
            'body_color' => 'Red',
            'body_type' => 'Standard',
            'engine_number' => 'ENG-RENEW-' . $tricycleId,
            'chassis_number' => 'CHS-RENEW-' . $tricycleId,
            'or_number' => 'OR-RENEW-' . $tricycleId,
            'cr_number' => 'CR-RENEW-' . $tricycleId,
            'documents' => [
                'police_clearance'   => [$this->fakeDocument('renew-police.pdf')],
                'health_certificate' => [$this->fakeDocument('renew-health.pdf')],
                'orcr_photocopy'     => [$this->fakeDocument('renew-orcr.pdf')],
                'drivers_license'    => [$this->fakeDocument('renew-license.pdf')],
                'barangay_clearance' => [$this->fakeDocument('renew-brgy.pdf')],
                'toda_clearance'     => [$this->fakeDocument('renew-toda.pdf')],
                'cedula'             => [$this->fakeDocument('renew-cedula.pdf')],
                'driver_id'          => [$this->fakeDocument('renew-driverid.pdf')],
                'tariff_list'        => [$this->fakeDocument('renew-tariff.pdf')],
                'prangkisa'          => [$this->fakeDocument('renew-prangkisa.pdf')],
            ],
        ], $overrides));
    }

    // -------------------------------------------------------------------------
    // Fix #1: server-side can_renew gate
    // -------------------------------------------------------------------------

    #[Test]
    public function an_expired_franchise_is_eligible_and_renewal_succeeds(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-ELIGIBLE-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0001', 'STK-ELIGIBLE-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $scheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $scheme->update(['expiry_date' => now()->subDay()->toDateString()]);

        $response = $this->submitRenewal($driverUser, $tricycle->id);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertSame(2, Application::where('tricycle_id', $tricycle->id)->count());
        $this->assertDatabaseHas('applications', [
            'tricycle_id' => $tricycle->id,
            'application_type' => 'renewal',
            'operator_id' => $originalApplication->operator_id,
        ]);
    }

    #[Test]
    public function a_non_expired_active_franchise_is_not_eligible_and_renewal_is_rejected(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-INELIG-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0002', 'STK-INELIGIBLE-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $activeScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $this->assertFalse($activeScheme->is_expired, 'Sanity check: freshly activated franchise is not expired.');

        $inspectionCountBefore = Inspection::count();
        $documentCountBefore = ApplicationDocument::count();

        $response = $this->submitRenewal($driverUser, $tricycle->id);

        $response->assertRedirect();
        $response->assertSessionHasErrors('application_type');
        $this->assertSame(1, Application::where('tricycle_id', $tricycle->id)->count(), 'No renewal Application should have been created.');
        $this->assertSame($inspectionCountBefore, Inspection::count(), 'No Inspection should have been created for a rejected renewal.');
        $this->assertSame($documentCountBefore, ApplicationDocument::count(), 'No Documents should have been created for a rejected renewal.');
    }

    #[Test]
    public function an_operator_cannot_renew_another_operators_tricycle(): void
    {
        [, , $victimApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-VICTIM-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($victimApplication, $tmo, $bplo, '0003', 'STK-VICTIM-0001');

        $victimTricycle = $victimApplication->tricycle()->first();
        $victimScheme = FranchiseScheme::where('tricycle_id', $victimTricycle->id)->where('is_active', true)->firstOrFail();
        $victimScheme->update(['expiry_date' => now()->subDay()->toDateString()]); // eligible for ITS OWN operator

        [, $attackerUser] = $this->registerNewApplication(['plate_number' => 'RENEW-ATTACKER-0001']);

        $response = $this->submitRenewal($attackerUser, $victimTricycle->id);

        $response->assertRedirect();
        $response->assertSessionHasErrors('unit_id');
        $this->assertSame(1, Application::where('tricycle_id', $victimTricycle->id)->count(), 'The attacker must not be able to create a renewal Application against the victim\'s tricycle.');
        $victimTricycle->refresh();
        $this->assertSame($victimApplication->operator_id, $victimTricycle->operator_id, 'Tricycle ownership must remain unchanged.');
    }

    #[Test]
    public function no_unit_id_on_a_renewal_request_is_rejected(): void
    {
        [, $driverUser] = $this->registerNewApplication(['plate_number' => 'RENEW-NOUNIT-0001']);

        $response = $this->actingAs($driverUser)->post(route('operator.mtop.store'), [
            'application_type' => 'renewal',
            'plate_number' => 'RENEW-NOUNIT-0002',
            'make_model' => 'Honda TMX155',
            'year_model' => 2022,
            'body_color' => 'Red',
            'body_type' => 'Standard',
            'engine_number' => 'ENG-NOUNIT-0001',
            'chassis_number' => 'CHS-NOUNIT-0001',
            'or_number' => 'OR-NOUNIT-0001',
            'cr_number' => 'CR-NOUNIT-0001',
            'documents' => [
                'police_clearance'   => [$this->fakeDocument('a.pdf')],
                'health_certificate' => [$this->fakeDocument('b.pdf')],
                'orcr_photocopy'     => [$this->fakeDocument('c.pdf')],
                'drivers_license'    => [$this->fakeDocument('d.pdf')],
                'barangay_clearance' => [$this->fakeDocument('e.pdf')],
                'toda_clearance'     => [$this->fakeDocument('f.pdf')],
                'cedula'             => [$this->fakeDocument('g.pdf')],
                'driver_id'          => [$this->fakeDocument('h.pdf')],
                'tariff_list'        => [$this->fakeDocument('i.pdf')],
                'prangkisa'          => [$this->fakeDocument('j.pdf')],
            ],
        ]);

        $response->assertSessionHasErrors('unit_id');
        $this->assertSame(1, Application::count(), 'Only the original registration Application should exist.');
    }

    // -------------------------------------------------------------------------
    // Full lifecycle: old/new comparison for an eligible renewal, driven end to end
    // -------------------------------------------------------------------------

    #[Test]
    public function an_eligible_renewal_preserves_the_old_records_and_creates_a_fully_linked_new_period(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-FULL-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0004', 'STK-FULL-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $operator = Operator::find($originalApplication->operator_id);
        $originalScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $originalScheme->update(['expiry_date' => now()->subDay()->toDateString()]);
        $originalScheme->refresh();

        $before = [
            'franchise_number' => $originalScheme->franchise_number,
            'issue_date'       => $originalScheme->issue_date->toDateString(),
            'expiry_date'      => $originalScheme->expiry_date->toDateString(),
        ];

        $originalInspection = Inspection::where('application_id', $originalApplication->id)->firstOrFail();
        $originalDocCount = ApplicationDocument::where('application_id', $originalApplication->id)->count();
        $this->assertSame(9, $originalDocCount);

        // ── ACT: submit + drive an eligible renewal through the SAME real pipeline, reusing the
        // SAME Sticker Number the old (about to be deactivated) scheme already holds. ──
        $this->submitRenewal($driverUser, $tricycle->id)->assertRedirect()->assertSessionDoesntHaveErrors();

        $renewalApplication = Application::where('tricycle_id', $tricycle->id)
            ->where('id', '!=', $originalApplication->id)
            ->firstOrFail();
        $this->assertSame('renewal', $renewalApplication->application_type);
        $this->assertSame($operator->id, $renewalApplication->operator_id);
        $this->assertSame($tricycle->id, $renewalApplication->tricycle_id);
        // 9 mandatory canonical documents + Prangkisa (renewal-only requirement).
        $this->assertSame(10, ApplicationDocument::where('application_id', $renewalApplication->id)->count());

        $this->driveApplicationToActive($renewalApplication, $tmo, $bplo, $before['franchise_number'], 'STK-FULL-0002');

        // ---- COMPARE OLD vs NEW ----
        $originalScheme->refresh();
        $tricycle->refresh();
        $newScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('id', '!=', $originalScheme->id)->firstOrFail();

        // Old Application preserved.
        $this->assertDatabaseHas('applications', ['id' => $originalApplication->id, 'status' => 'completed']);

        // Old FranchiseScheme preserved + deactivated, dates/number unchanged.
        $this->assertDatabaseHas('franchise_schemes', ['id' => $originalScheme->id]);
        $this->assertFalse($originalScheme->is_active);
        $this->assertSame($before['franchise_number'], $originalScheme->franchise_number);
        $this->assertSame($before['issue_date'], $originalScheme->issue_date->toDateString());
        $this->assertSame($before['expiry_date'], $originalScheme->expiry_date->toDateString());

        // New FranchiseScheme created, active, linked to the renewal Application, reusing the SAME
        // Sticker Number (proves the active-only uniqueness fix).
        $this->assertTrue($newScheme->is_active);
        $this->assertSame($renewalApplication->id, $newScheme->application_id);
        $this->assertSame($before['franchise_number'], $newScheme->franchise_number, 'Renewal reused the same Sticker Number.');
        $this->assertSame(now()->toDateString(), $newScheme->issue_date->toDateString());
        $this->assertSame(now()->addYears(3)->toDateString(), $newScheme->expiry_date->toDateString());
        $this->assertNotSame($originalScheme->id, $newScheme->id);

        // Exactly one active scheme for the tricycle; identity unchanged.
        $this->assertSame(1, FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->count());
        $this->assertSame(2, FranchiseScheme::where('tricycle_id', $tricycle->id)->count());
        $this->assertSame(1, User::where('id', $driverUser->id)->count());
        $this->assertSame(1, Tricycle::where('id', $tricycle->id)->count());
        $this->assertSame($operator->id, $renewalApplication->operator_id);

        // Inspection/Documents: new rows for the renewal, old ones untouched. No Payment rows
        // exist for either application — the system never records payment under this workflow.
        $this->assertDatabaseHas('inspections', ['id' => $originalInspection->id, 'application_id' => $originalApplication->id]);
        $renewalInspection = Inspection::where('application_id', $renewalApplication->id)->first();
        $this->assertNotNull($renewalInspection);
        $this->assertNotSame($originalInspection->id, $renewalInspection->id);
        $this->assertSame(0, Payment::count());
    }

    // -------------------------------------------------------------------------
    // Fix #2: BPLO release gated by application_type
    // -------------------------------------------------------------------------

    #[Test]
    public function bplo_release_deactivates_the_old_scheme_only_for_a_renewal_application(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-GATE-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0005', 'STK-GATE-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $originalScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $originalScheme->update(['expiry_date' => now()->subDay()->toDateString()]);

        $this->submitRenewal($driverUser, $tricycle->id)->assertRedirect();
        $renewalApplication = Application::where('tricycle_id', $tricycle->id)->where('id', '!=', $originalApplication->id)->firstOrFail();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $renewalApplication), [
            'action' => 'approve', 'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $renewalApplication), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        $this->actingAs($bplo)->post(route('bplo.release.submit', $renewalApplication), [
            'body_number' => '0006',
            'sticker_number' => 'STK-GATE-0002',
        ])->assertRedirect();

        $originalScheme->refresh();
        $this->assertFalse($originalScheme->is_active, 'A renewal release must deactivate the old scheme.');
    }

    #[Test]
    public function bplo_release_does_not_deactivate_an_existing_active_scheme_for_a_non_renewal_application(): void
    {
        [, , $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-NONGATE-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0007', 'STK-NONGATE-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $operator = Operator::find($originalApplication->operator_id);
        $originalScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();

        // A second application, explicitly type='new', targeting the SAME tricycle (e.g. an
        // operator mistakenly re-submitting via the "New Franchise" wizard instead of "Renew").
        $secondApplication = Application::create([
            'reference_number' => 'APP-2026-TESTNONGATE',
            'operator_id'      => $operator->id,
            'tricycle_id'      => $tricycle->id,
            'application_type' => 'new',
            'current_step'     => 1,
            'status'           => 'pending_review',
            'submitted_at'     => now(),
        ]);

        $this->actingAs($tmo)->post(route('tmo.review.submit', $secondApplication), [
            'action' => 'approve', 'docStatuses' => [],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $secondApplication), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        $response = $this->actingAs($bplo)->post(route('bplo.release.submit', $secondApplication), [
            'body_number' => '0008',
            'sticker_number' => 'STK-NONGATE-0002',
        ]);
        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();

        $originalScheme->refresh();
        $this->assertTrue($originalScheme->is_active, 'A type=new application must NOT deactivate an existing active scheme on the same tricycle.');

        // The new application still gets its own (inactive-until-confirmed) scheme.
        $newScheme = FranchiseScheme::where('application_id', $secondApplication->id)->first();
        $this->assertNotNull($newScheme);
        $this->assertFalse($newScheme->is_active);
        $this->assertSame(2, FranchiseScheme::where('tricycle_id', $tricycle->id)->count());
    }

    // -------------------------------------------------------------------------
    // Fix #3: franchise_number uniqueness scoped to active schemes only
    // -------------------------------------------------------------------------

    #[Test]
    public function bplo_release_still_rejects_a_sticker_number_currently_held_by_another_active_franchise(): void
    {
        [, , $applicationA] = $this->registerNewApplication(['plate_number' => 'RENEW-DUP-A']);
        [, $driverB, $applicationB] = $this->registerNewApplication(['plate_number' => 'RENEW-DUP-B']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();

        $this->driveApplicationToActive($applicationA, $tmo, $bplo, '0009', 'STK-DUP-A');

        // applicationB is a fresh 'new' application for a DIFFERENT tricycle — attempting to
        // release it with tricycle A's still-ACTIVE Sticker Number must still be rejected.
        $this->actingAs($tmo)->post(route('tmo.review.submit', $applicationB), [
            'action' => 'approve', 'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $applicationB), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        $response = $this->actingAs($bplo)->post(route('bplo.release.submit', $applicationB), [
            'body_number' => '0009',
            'sticker_number' => 'STK-DUP-B',
        ]);

        $response->assertSessionHasErrors('body_number');
        $applicationB->refresh();
        $this->assertSame('pending_bplo_release', $applicationB->status);
    }

    #[Test]
    public function reusing_the_same_sticker_number_on_renewal_keeps_both_historical_and_active_rows_queryable(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-HIST-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0010', 'STK-HIST-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $originalScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $originalScheme->update(['expiry_date' => now()->subDay()->toDateString()]);

        $this->submitRenewal($driverUser, $tricycle->id)->assertRedirect();
        $renewalApplication = Application::where('tricycle_id', $tricycle->id)->where('id', '!=', $originalApplication->id)->firstOrFail();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $renewalApplication), [
            'action' => 'approve', 'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $renewalApplication), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        // Reuse the exact SAME Sticker Number '0010' — must now succeed (previously blocked by the
        // global unique constraint).
        $response = $this->actingAs($bplo)->post(route('bplo.release.submit', $renewalApplication), [
            'body_number' => '0010',
            'sticker_number' => 'STK-HIST-0002',
        ]);
        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();

        $this->assertDatabaseCount('franchise_schemes', 2);
        $rows = FranchiseScheme::where('tricycle_id', $tricycle->id)->get();
        // Both rows share the same Sticker Number — proving reuse succeeded — and are both
        // independently queryable by id. The new one is still is_active=false at this point
        // (BPLO release only; TMO Final Confirmation, not run here, is what activates it), so
        // BOTH rows are inactive right now — that itself proves nothing was silently overwritten.
        $this->assertCount(2, $rows->where('franchise_number', '0010'));
        $this->assertSame(0, $rows->where('is_active', true)->count());
        $this->assertTrue($rows->contains('id', $originalScheme->id));
        $this->assertSame(1, $rows->where('id', '!=', $originalScheme->id)->count());
    }

    // -------------------------------------------------------------------------
    // Fix #4: tracker shows each Application's own franchise period
    // -------------------------------------------------------------------------

    #[Test]
    public function the_tracker_shows_each_applications_own_historical_franchise_period_not_the_tricycles_current_one(): void
    {
        [, $driverUser, $originalApplication] = $this->registerNewApplication(['plate_number' => 'RENEW-TRACK-0001']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $this->driveApplicationToActive($originalApplication, $tmo, $bplo, '0011', 'STK-TRACK-0001');

        $tricycle = $originalApplication->tricycle()->first();
        $originalScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $originalScheme->update(['expiry_date' => now()->subDay()->toDateString()]);
        $originalExpiryLabel = $originalScheme->fresh()->expiry_date->format('M d, Y');

        $this->submitRenewal($driverUser, $tricycle->id)->assertRedirect();
        $renewalApplication = Application::where('tricycle_id', $tricycle->id)->where('id', '!=', $originalApplication->id)->firstOrFail();
        $this->driveApplicationToActive($renewalApplication, $tmo, $bplo, 'RENEWED-0011', 'STK-TRACK-0002');

        $newScheme = FranchiseScheme::where('tricycle_id', $tricycle->id)->where('is_active', true)->firstOrFail();
        $newExpiryLabel = $newScheme->expiry_date->format('M d, Y');
        $this->assertNotSame($originalExpiryLabel, $newExpiryLabel);

        // Tracker list: old application shows its OWN (old) expiry, new application shows the new one.
        $trackerResponse = $this->actingAs($driverUser)->get(route('operator.mtop'));
        $trackerResponse->assertInertia(function ($page) use ($originalApplication, $renewalApplication, $originalExpiryLabel, $newExpiryLabel) {
            $page->where('applications', function ($apps) use ($originalApplication, $renewalApplication, $originalExpiryLabel, $newExpiryLabel) {
                $originalRow = $apps->firstWhere('db_id', $originalApplication->id);
                $renewalRow = $apps->firstWhere('db_id', $renewalApplication->id);

                \PHPUnit\Framework\Assert::assertSame('expired-renewed', $originalRow['status'], 'Old application must show as historically expired-and-renewed, not still valid.');
                \PHPUnit\Framework\Assert::assertTrue($originalRow['is_expired']);
                \PHPUnit\Framework\Assert::assertStringContainsString('renewed', strtolower($originalRow['message']));

                \PHPUnit\Framework\Assert::assertSame('completed', $renewalRow['status']);
                \PHPUnit\Framework\Assert::assertFalse($renewalRow['is_expired']);
                \PHPUnit\Framework\Assert::assertStringContainsString($newExpiryLabel, $renewalRow['message']);

                return true;
            });
        });

        // Detail page (show()): same distinction, plus the BPLO block's expiryDate (already
        // application_id-scoped before this fix) confirms the exact dates.
        $oldDetail = $this->actingAs($driverUser)->get(route('operator.mtop.details', ['id' => $originalApplication->id]));
        $oldDetail->assertInertia(fn ($page) => $page
            ->where('application.is_expired', true)
            ->where('application.status', 'expired-renewed')
            ->where('application.bplo.expiryDate', $originalExpiryLabel)
        );

        $newDetail = $this->actingAs($driverUser)->get(route('operator.mtop.details', ['id' => $renewalApplication->id]));
        $newDetail->assertInertia(fn ($page) => $page
            ->where('application.is_expired', false)
            ->where('application.status', 'completed')
            ->where('application.bplo.expiryDate', $newExpiryLabel)
        );

        // Current active tricycle lookup is unaffected by this fix — it must still resolve to the
        // NEW scheme (Tricycle::franchiseScheme() stays is_active-scoped, untouched by fix #4).
        $tricycle->refresh();
        $this->assertSame($newScheme->id, $tricycle->franchiseScheme->id);
        $this->assertSame($newScheme->franchise_number, $tricycle->franchiseScheme->franchise_number);
    }

    // -------------------------------------------------------------------------
    // Regression: the ordinary "new unit" path (no tricycle_id / no existing franchise at all)
    // must be entirely unaffected by the renewal gating changes.
    // -------------------------------------------------------------------------

    #[Test]
    public function a_brand_new_application_with_no_existing_tricycle_is_unaffected_by_the_renewal_gate(): void
    {
        // A real, fully-valid operator (via the actual public registration endpoint), who then
        // submits a SECOND "new unit" application through the Operator MTOP wizard — the ordinary
        // path none of today's fixes should touch.
        [, $user, ] = $this->registerNewApplication(['plate_number' => 'RENEW-BASEUNIT-01']);
        $operator = $user->operator;

        $response = $this->actingAs($user)->post(route('operator.mtop.store'), [
            'application_type' => 'new',
            'plate_number' => 'BRAND-NEW-0001',
            'make_model' => 'Honda TMX155',
            'year_model' => 2023,
            'body_color' => 'Blue',
            'body_type' => 'Standard',
            'engine_number' => 'ENG-BRANDNEW-0001',
            'chassis_number' => 'CHS-BRANDNEW-0001',
            'or_number' => 'OR-BRANDNEW-0001',
            'cr_number' => 'CR-BRANDNEW-0001',
            'documents' => [
                'police_clearance'   => [$this->fakeDocument('a.pdf')],
                'health_certificate' => [$this->fakeDocument('b.pdf')],
                'orcr_photocopy'     => [$this->fakeDocument('c.pdf')],
                'drivers_license'    => [$this->fakeDocument('d.pdf')],
                'barangay_clearance' => [$this->fakeDocument('e.pdf')],
                'toda_clearance'     => [$this->fakeDocument('f.pdf')],
                'cedula'             => [$this->fakeDocument('g.pdf')],
                'driver_id'          => [$this->fakeDocument('h.pdf')],
                'tariff_list'        => [$this->fakeDocument('i.pdf')],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('applications', [
            'operator_id' => $operator->id,
            'application_type' => 'new',
            'status' => 'pending_review',
        ]);
        $this->assertDatabaseHas('tricycles', ['plate_number' => 'BRAND-NEW-0001', 'operator_id' => $operator->id]);
    }
}
