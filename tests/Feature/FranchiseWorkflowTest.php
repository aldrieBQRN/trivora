<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\FranchiseScheme;
use App\Models\TricycleLocation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Drives ONE application record through the real franchise workflow end-to-end — public
 * registration → TMO document review → TMO physical inspection → BPLO releasing → TMO Final
 * Confirmation — hitting the actual HTTP routes with the actual authenticated roles, never
 * creating a second Application for a later stage.
 *
 * There is no Treasurer controller/role, and no in-system payment verification step at all
 * (removed entirely — see TMO\InspectionController::store() and BPLO\BPLOController::release()).
 * Cashier payment happens genuinely offline: the applicant pays at the Municipal Treasurer's
 * Office and presents the receipt in person at BPLO before release; the system never records or
 * verifies it. This test does not fabricate a Treasurer login or an online payment record.
 */
class FranchiseWorkflowTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function a_single_application_progresses_from_registration_to_franchise_active(): void
    {
        // 1. Public registration.
        [$regResponse, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-1000']);
        $regResponse->assertRedirect();
        $this->assertSame('pending_review', $application->status);
        $applicationId = $application->id;
        $tricycleId = $application->tricycle_id;

        // 2. TMO Document Review — approve.
        $tmo = $this->makeTmoUser();
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ])->assertRedirect(route('tmo.docs'));

        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // 3. TMO Physical Inspection — pass.
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'             => 'pass',
            'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ])->assertRedirect(route('tmo.physical'));

        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status);
        $this->assertSame(3, $application->current_step);
        $this->assertSame(1, $application->inspections()->count());
        $this->assertSame('passed', $application->inspections()->first()->result);

        // 4. Offline Municipal Treasurer / Cashier payment — the system never records or
        // verifies this. No online Payment row exists, and there is no route to create one; the
        // TMO ticket the driver was redirected to is the only thing the system generates here.
        $this->assertNull($application->payment()->first());
        $ticket = $application->payment_ticket;
        $this->assertEquals(750.00, $ticket['total_amount']);

        // 5. BPLO Releasing — BPLO only visually checks the TMO ticket/receipt in person; it
        // never records a Payment row.
        $bplo = $this->makeBploUser();
        $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'coding_scheme_number' => '0001',
            'sticker_number' => 'STK-0001',
        ])->assertRedirect(route('bplo.releasing'));

        $application->refresh();
        $this->assertSame('awaiting_tmo_confirmation', $application->status);
        $this->assertSame('STK-0001', $application->sticker_number);
        $franchiseScheme = FranchiseScheme::where('tricycle_id', $tricycleId)->where('is_active', false)->first();
        $this->assertNotNull($franchiseScheme, 'BPLO release must create the franchise scheme, inactive until Final Confirmation.');

        // 6. TMO Final Confirmation & GPS Setup — mobile GPS branch.
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $tricycleId)->count());

        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'mobile_gps',
            'officer_notes'                => '',
        ])->assertRedirect(route('tmo.final-confirmation'));

        $application->refresh();
        $this->assertSame('completed', $application->status);

        $tricycle = $application->tricycle()->first();
        $this->assertSame('active', $tricycle->status);
        $this->assertSame('mobile_only', $tricycle->tracking_capability);
        $this->assertSame('mobile_app', $tricycle->active_tracking_mode);

        // The exact behavior this session's GPS honesty fix protects: Final Confirmation must
        // NEVER seed a fake location, regardless of how the application got here.
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $tricycleId)->count());

        $franchiseScheme->refresh();
        $this->assertTrue((bool) $franchiseScheme->is_active, 'Franchise scheme must activate on Final Confirmation.');

        // Database integrity: no duplicate records were created by advancing through stages.
        $this->assertSame(1, Application::where('id', $applicationId)->count());
        $this->assertSame(5, $application->statusHistories()->count(), 'registration + 4 real transitions');
    }

    /**
     * Regression guard for the removal itself — the TMO payment-verification step no longer
     * exists in this system at all (not just restricted to a role). Neither TMO nor BPLO can
     * reach it, for anyone, because the routes are gone.
     */
    #[Test]
    public function tmo_payment_verification_routes_no_longer_exist(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-BPLOPAY']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve', 'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);
        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status);

        $this->assertFalse(\Illuminate\Support\Facades\Route::has('tmo.payments'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('tmo.verify-payment'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('tmo.verify-payment.submit'));

        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status, 'Status must be untouched.');
        $this->assertNull($application->payment()->first());
    }

    #[Test]
    public function document_rejection_sets_the_application_to_rejected_for_resubmission(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-REJ1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'           => 'reject',
            'docStatuses'      => ['orcr_photocopy' => 'rejected'],
            'rejectionReasons' => ['orcr_photocopy' => 'Blurry scan, please resubmit.'],
        ])->assertRedirect(route('tmo.docs'));

        $application->refresh();
        $this->assertSame('rejected', $application->status);
        $this->assertSame(1, $application->current_step);
        $rejectedDoc = $application->documents()->where('document_type', 'orcr_photocopy')->first();
        $this->assertSame('rejected', $rejectedDoc->review_status);
        $this->assertSame('Blurry scan, please resubmit.', $rejectedDoc->rejection_reason);
    }

    #[Test]
    public function failed_inspection_allows_driver_re_inspection_request_then_a_second_attempt_passes(): void
    {
        [, $driverUser, $application] = $this->registerNewApplication(['plate_number' => 'WFL-FAIL1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve', 'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);

        $failedItems = array_merge($this->allInspectionItemsPassed(), ['mirrors' => 'failed']);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'             => 'fail',
            'inspectionStatuses' => $failedItems,
            'defectNotes'        => ['mirrors' => 'Missing side mirror.'],
        ])->assertRedirect(route('tmo.physical'));

        $application->refresh();
        $this->assertSame('failed_inspection', $application->status);
        $this->assertSame(1, $application->inspections()->count());

        // Driver confirms the repair and requests re-inspection — real route, no payload needed
        // for the physical-fix branch (MTOPController::submitFix reuses the stored checklist).
        $this->actingAs($driverUser)->post(route('operator.mtop.submit-fix', $application->id))
            ->assertRedirect(route('operator.mtop.details', ['id' => $application->id]));

        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // TMO re-inspects — a second Inspection row, this time passing.
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'             => 'pass',
            'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ])->assertRedirect(route('tmo.physical'));

        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status);
        $this->assertSame(2, $application->inspections()->count());
        $this->assertSame(2, $application->inspections()->max('attempt_number'));
    }

    /**
     * Regression test for the fix: FinalConfirmationController::confirm() only ever filtered
     * candidates by status in index() (the queue listing) — the POST action itself never checked
     * that the application it was bound to was actually 'awaiting_tmo_confirmation'. A stale page,
     * a replayed request, or a direct call against an application still at an earlier stage must
     * not be able to activate a franchise or write GPS/tracking configuration.
     */
    #[Test]
    public function final_confirmation_is_rejected_when_the_application_is_not_awaiting_tmo_confirmation(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-BADSTATE']);
        $tmo = $this->makeTmoUser();
        // Still 'pending_review' — hasn't even reached document review yet.
        $this->assertSame('pending_review', $application->status);

        $tricycleId = $application->tricycle_id;
        $tricycleBefore = $application->tricycle()->first();

        $response = $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'mobile_gps',
            'officer_notes'                => '',
        ]);

        $response->assertSessionHasErrors('status');

        $application->refresh();
        $this->assertSame('pending_review', $application->status, 'Status must be untouched.');

        $tricycleAfter = $application->tricycle()->first();
        $this->assertSame($tricycleBefore->status, $tricycleAfter->status, 'Tricycle must not be activated.');
        $this->assertSame($tricycleBefore->active_tracking_mode, $tricycleAfter->active_tracking_mode, 'GPS tracking mode must not change.');
        $this->assertSame(0, TricycleLocation::where('tricycle_id', $tricycleId)->count(), 'No GPS location may be written.');
        $this->assertNull(FranchiseScheme::where('tricycle_id', $tricycleId)->first(), 'No franchise scheme exists yet at this stage, and none may be created.');
    }
}
