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
 * registration → TMO document review → TMO physical inspection → offline cashier payment → TMO
 * payment verification → BPLO releasing → TMO Final Confirmation — hitting the actual HTTP routes
 * with the actual authenticated roles, never creating a second Application for a later stage.
 *
 * There is no Treasurer controller/role in the real implementation (confirmed by direct code
 * audit — removed by migration 2026_09_12_000000_update_workflow_for_cashier_and_bplo.php): the
 * "cashier payment" step is genuinely offline, and TMO records + verifies it in one action via
 * TMO\PaymentVerificationController::verify(). This test does not fabricate a Treasurer login.
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
            'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
        ])->assertRedirect(route('tmo.docs'));

        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // 3. TMO Physical Inspection — pass.
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'             => 'pass',
            'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ])->assertRedirect(route('tmo.ticket', $application->id));

        $application->refresh();
        $this->assertSame('pending_payment', $application->status);
        $this->assertSame(4, $application->current_step);
        $this->assertSame(1, $application->inspections()->count());
        $this->assertSame('passed', $application->inspections()->first()->result);

        // 4. Offline Municipal Treasurer / Cashier payment — no online Payment row exists yet,
        // the driver-facing payment ticket reflects the real fee, and there is no online payment
        // creation path to test (it's a real-world cash counter).
        $this->assertNull($application->payment()->first());
        $ticket = $application->payment_ticket;
        $this->assertEquals(750.00, $ticket['total_amount']);

        // 5. TMO Payment Verification — verify (this is what actually records the Payment row;
        // BPLO must never be able to do this).
        $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $application), [
            'action'                  => 'verify',
            'official_receipt_number' => 'OR-0001',
            'amount'                  => 750,
            'payment_date'            => now()->toDateString(),
        ])->assertRedirect(route('tmo.payments'));

        $application->refresh();
        $this->assertSame('payment_verified', $application->status);
        $this->assertSame(5, $application->current_step);
        $payment = $application->payment()->first();
        $this->assertNotNull($payment);
        $this->assertTrue((bool) $payment->is_verified);
        $this->assertSame($tmo->id, $payment->processed_by);
        $this->assertSame(1, $application->payment()->count());

        // 6. BPLO Releasing.
        $bplo = $this->makeBploUser();
        $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'body_number'    => '0001',
            'sticker_number' => 'STK-0001',
        ])->assertRedirect(route('bplo.releasing'));

        $application->refresh();
        $this->assertSame('awaiting_tmo_confirmation', $application->status);
        $this->assertSame('STK-0001', $application->sticker_number);
        $franchiseScheme = FranchiseScheme::where('tricycle_id', $tricycleId)->where('is_active', false)->first();
        $this->assertNotNull($franchiseScheme, 'BPLO release must create the franchise scheme, inactive until Final Confirmation.');

        // 7. TMO Final Confirmation & GPS Setup — mobile GPS branch.
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
        $this->assertSame(6, $application->statusHistories()->count(), 'registration + 5 real transitions');
    }

    #[Test]
    public function bplo_has_no_route_or_ability_to_verify_payment(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-BPLOPAY']);
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve', 'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);
        $application->refresh();
        $this->assertSame('pending_payment', $application->status);

        // BPLO staff cannot reach the TMO payment-verification route at all — role middleware
        // rejects it before the controller ever runs.
        $response = $this->actingAs($bplo)->post(route('tmo.verify-payment.submit', $application), [
            'action' => 'verify', 'official_receipt_number' => 'OR-9999', 'amount' => 750, 'payment_date' => now()->toDateString(),
        ]);
        $response->assertForbidden();

        $application->refresh();
        $this->assertSame('pending_payment', $application->status, 'Status must not change from an unauthorized actor.');
        $this->assertNull($application->payment()->first());
    }

    #[Test]
    public function document_rejection_sets_the_application_to_rejected_for_resubmission(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-REJ1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'           => 'reject',
            'docStatuses'      => ['orcr' => 'rejected'],
            'rejectionReasons' => ['orcr' => 'Blurry scan, please resubmit.'],
        ])->assertRedirect(route('tmo.docs'));

        $application->refresh();
        $this->assertSame('rejected', $application->status);
        $this->assertSame(1, $application->current_step);
        $rejectedDoc = $application->documents()->where('document_type', 'or_cr')->first();
        $this->assertSame('rejected', $rejectedDoc->review_status);
        $this->assertSame('Blurry scan, please resubmit.', $rejectedDoc->rejection_reason);
    }

    #[Test]
    public function failed_inspection_allows_driver_re_inspection_request_then_a_second_attempt_passes(): void
    {
        [, $driverUser, $application] = $this->registerNewApplication(['plate_number' => 'WFL-FAIL1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve', 'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
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
        ])->assertRedirect(route('tmo.ticket', $application->id));

        $application->refresh();
        $this->assertSame('pending_payment', $application->status);
        $this->assertSame(2, $application->inspections()->count());
        $this->assertSame(2, $application->inspections()->max('attempt_number'));
    }

    #[Test]
    public function tmo_flagging_a_payment_issue_keeps_the_application_at_the_payment_stage(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'WFL-PAYISSUE']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve', 'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);
        $application->refresh();
        $this->assertSame('pending_payment', $application->status);

        $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $application), [
            'action'       => 'flag_issue',
            'issue_notes'  => 'Official receipt number does not match treasury records.',
        ])->assertRedirect(route('tmo.payments'));

        $application->refresh();
        $this->assertSame('payment_issue', $application->status);
        $this->assertSame(4, $application->current_step);
        $this->assertNull($application->payment()->first(), 'A flagged issue must not create a Payment row.');
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
