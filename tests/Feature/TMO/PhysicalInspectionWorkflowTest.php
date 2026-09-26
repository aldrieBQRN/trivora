<?php

namespace Tests\Feature\TMO;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Inspection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

class PhysicalInspectionWorkflowTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function approve_with_no_comment_succeeds_and_proceeds_to_next_step(): void
    {
        // 1. Prepare application up to pending_inspection
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-APPR1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // 2. Physical Inspection: Approve with no comment
        $response = $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'approve',
        ]);

        $response->assertRedirect(route('tmo.physical'));
        $response->assertSessionHas('success');

        $application->refresh();

        // Check application workflow state
        $this->assertSame('pending_bplo_release', $application->status);
        $this->assertSame(3, $application->current_step);

        // Check inspection record
        $inspection = $application->latestInspection;
        $this->assertNotNull($inspection);
        $this->assertSame('passed', $inspection->result);
        $this->assertSame($tmo->id, $inspection->inspector_id);
        $this->assertTrue((bool)$inspection->safety_equipment);
        $this->assertTrue((bool)$inspection->brakes_steering);
        $this->assertTrue((bool)$inspection->lights_reflectors);
        $this->assertTrue((bool)$inspection->tires_suspension);
        $this->assertSame('Physical inspection approved.', $inspection->inspector_notes);

        // Check audit status history
        $history = ApplicationStatusHistory::where('application_id', $application->id)
            ->where('to_status', 'pending_bplo_release')
            ->latest('id')
            ->first();
        $this->assertNotNull($history);
        $this->assertSame($tmo->id, $history->changed_by);
        $this->assertSame('pending_inspection', $history->from_status);
        $this->assertSame('pending_bplo_release', $history->to_status);
        $this->assertSame(2, $history->from_step);
        $this->assertSame(3, $history->to_step);
        $this->assertStringContainsString('Passed physical tricycle inspection attempt #1', $history->notes);
    }

    #[Test]
    public function reject_with_empty_comment_is_blocked_by_validation(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-EMPTY1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);

        // Try rejecting with completely empty comment
        $response = $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'           => 'reject',
            'rejection_reason' => '',
        ]);

        $response->assertSessionHasErrors(['rejection_reason']);

        $application->refresh();
        // Status must remain unchanged
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(0, $application->inspections()->count());
    }

    #[Test]
    public function reject_with_whitespace_only_comment_is_blocked(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-SPACE1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();

        $response = $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'           => 'reject',
            'rejection_reason' => "   \n\t  ",
        ]);

        $response->assertSessionHasErrors(['rejection_reason']);
        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
    }

    #[Test]
    public function reject_with_comment_succeeds_and_stores_rejection_reason(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-REJ1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();

        $reason = 'Defective rear brake light and missing right rearview mirror.';
        $response = $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'           => 'reject',
            'rejection_reason' => $reason,
        ]);

        $response->assertRedirect(route('tmo.physical'));
        $response->assertSessionHas('error');

        $application->refresh();
        $this->assertSame('failed_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // Check inspection record
        $inspection = $application->latestInspection;
        $this->assertNotNull($inspection);
        $this->assertSame('failed', $inspection->result);
        $this->assertSame($tmo->id, $inspection->inspector_id);
        $this->assertSame($reason, $inspection->inspector_notes);

        // Check audit status history
        $history = ApplicationStatusHistory::where('application_id', $application->id)
            ->where('to_status', 'failed_inspection')
            ->latest('id')
            ->first();
        $this->assertNotNull($history);
        $this->assertSame($tmo->id, $history->changed_by);
        $this->assertSame('pending_inspection', $history->from_status);
        $this->assertSame('failed_inspection', $history->to_status);
        $this->assertStringContainsString($reason, $history->notes);
    }

    #[Test]
    public function rejected_application_returns_through_reinspection_flow_and_subsequent_approval_succeeds(): void
    {
        [, $driverUser, $application] = $this->registerNewApplication(['plate_number' => 'TST-REINS1']);
        $tmo = $this->makeTmoUser();

        // 1. Initial document review approved
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();

        // 2. TMO rejects physical inspection attempt #1
        $defectReason = 'Worn-out brake shoe and loose sidecar frame.';
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'           => 'reject',
            'rejection_reason' => $defectReason,
        ]);

        $application->refresh();
        $this->assertSame('failed_inspection', $application->status);

        // 3. Driver requests re-inspection after fixing defects
        $this->actingAs($driverUser)->post(route('operator.mtop.submit-fix', $application->id))
            ->assertRedirect(route('operator.mtop.details', ['id' => $application->id]));

        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);
        $this->assertSame(2, $application->current_step);

        // 4. TMO views physical inspection page - should see re-inspection flags
        $showResponse = $this->actingAs($tmo)->get(route('tmo.review.physical', $application));
        $showResponse->assertOk();
        $showResponse->assertInertia(fn ($page) => $page
            ->component('TMODashboard/PhysicalInspection')
            ->where('application.is_reinspection', true)
            ->where('application.previous_rejection_reason', $defectReason)
            ->where('application.attempt_count', 1)
        );

        // 5. TMO approves attempt #2
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'approve',
        ])->assertRedirect(route('tmo.physical'));

        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status);
        $this->assertSame(3, $application->current_step);
        $this->assertSame(2, $application->inspections()->count());

        $latestInspection = $application->latestInspection;
        $this->assertSame(2, $latestInspection->attempt_number);
        $this->assertSame('passed', $latestInspection->result);
    }

    #[Test]
    public function physical_inspection_queue_and_driver_reinspection_contain_no_scheduling(): void
    {
        [, $driverUser, $application] = $this->registerNewApplication(['plate_number' => 'TST-NOSCHED']);
        $tmo = $this->makeTmoUser();

        // 1. Approve docs
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();

        // 2. Queue shows Awaiting Inspection with no schedule fields
        $queueResponse = $this->actingAs($tmo)->get(route('tmo.physical'));
        $queueResponse->assertOk();
        $queueResponse->assertInertia(fn ($page) => $page
            ->component('TMODashboard/PhysicalQueue')
            ->where('applications', function ($apps) use ($application) {
                $appData = $apps->firstWhere('id', $application->id);
                \PHPUnit\Framework\Assert::assertNotNull($appData);
                \PHPUnit\Framework\Assert::assertSame('Awaiting Inspection', $appData['status']);
                \PHPUnit\Framework\Assert::assertArrayNotHasKey('scheduled_date', $appData);
                \PHPUnit\Framework\Assert::assertArrayNotHasKey('time_slot', $appData);
                return true;
            })
        );

        // 3. TMO rejects inspection with overall reason
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'           => 'reject',
            'rejection_reason' => 'Broken tail light and missing mirror.',
        ]);
        $application->refresh();
        $this->assertSame('failed_inspection', $application->status);

        // 4. Driver details page exposes Reinspection Required and rejection reason
        $driverDetailsResponse = $this->actingAs($driverUser)->get(route('operator.mtop.details', ['id' => $application->id]));
        $driverDetailsResponse->assertOk();
        $driverDetailsResponse->assertInertia(fn ($page) => $page
            ->component('Operator/Compliance/MTOPDetails')
            ->where('application.is_reinspection_required', true)
            ->where('application.rejection_reason', 'Broken tail light and missing mirror.')
            ->where('application.status', 'action-req')
        );

        // 5. Driver confirms readiness without any date or time
        $this->actingAs($driverUser)->post(route('operator.mtop.submit-fix', $application->id), [
            'repairs_confirmed' => true,
        ])->assertRedirect(route('operator.mtop.details', ['id' => $application->id]));
        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);

        // 6. Queue now shows Ready for Reinspection
        $requeueResponse = $this->actingAs($tmo)->get(route('tmo.physical'));
        $requeueResponse->assertOk();
        $requeueResponse->assertInertia(fn ($page) => $page
            ->component('TMODashboard/PhysicalQueue')
            ->where('applications', function ($apps) use ($application) {
                $appData = $apps->firstWhere('id', $application->id);
                \PHPUnit\Framework\Assert::assertNotNull($appData);
                \PHPUnit\Framework\Assert::assertSame('Ready for Reinspection', $appData['status']);
                return true;
            })
        );

        // 7. Driver details now shows Ready for Reinspection
        $driverReadyResponse = $this->actingAs($driverUser)->get(route('operator.mtop.details', ['id' => $application->id]));
        $driverReadyResponse->assertOk();
        $driverReadyResponse->assertInertia(fn ($page) => $page
            ->component('Operator/Compliance/MTOPDetails')
            ->where('application.is_ready_for_reinspection', true)
        );
    }

    #[Test]
    public function legacy_per_item_json_inspection_notes_are_normalized_to_a_single_overall_reason(): void
    {
        [, $driverUser, $application] = $this->registerNewApplication(['plate_number' => 'TST-LEGACY1']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();

        // Simulate a pre-refactor record that still carries the retired per-item JSON format —
        // this must never leak to the UI as raw JSON, nor resurrect a per-item checklist.
        $application->update(['status' => 'failed_inspection']);
        Inspection::create([
            'application_id'    => $application->id,
            'inspector_id'      => $tmo->id,
            'attempt_number'    => 1,
            'inspection_date'   => now()->toDateString(),
            'inspection_time'   => now()->toTimeString(),
            'location_address'  => 'TMO Compound, Municipal Hall',
            'result'            => 'failed',
            'safety_equipment'  => false,
            'brakes_steering'   => true,
            'lights_reflectors' => true,
            'tires_suspension'  => true,
            'emissions_test'    => true,
            'license_toda_docs' => true,
            'inspector_notes'   => json_encode([
                'statuses' => ['headlights' => 'passed', 'horn' => 'failed', 'mirrors' => 'failed'],
                'defects'  => ['mirrors' => 'Missing right-side mirror.', 'horn' => 'Horn is not working.'],
            ]),
        ]);

        $overallReason = 'Physical inspection requires reinspection. Missing right-side mirror. Horn is not working.';

        $inspection = $application->fresh()->latestInspection;
        $this->assertSame($overallReason, $inspection->overall_notes);

        $response = $this->actingAs($driverUser)->get(route('operator.mtop.details', ['id' => $application->id]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Operator/Compliance/MTOPDetails')
            ->where('application.is_reinspection_required', true)
            ->where('application.rejection_reason', $overallReason)
            ->missing('application.inspections')
        );
    }
}
