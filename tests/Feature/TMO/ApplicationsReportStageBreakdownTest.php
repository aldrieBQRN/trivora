<?php

namespace Tests\Feature\TMO;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Regression coverage for TMO\ReportController::applicationsReport()'s "Current Stage Breakdown"
 * (by_stage). It previously grouped applications using the retired 'pending_payment',
 * 'payment_issue', 'payment_verified' and 'paid' statuses — none of which any live code path
 * assigns anymore (the Municipal Treasurer payment step was replaced by the single
 * 'pending_bplo_release' status). Every application sitting in that real, live status was
 * therefore silently missing from the breakdown entirely.
 */
class ApplicationsReportStageBreakdownTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function an_application_pending_bplo_release_is_counted_in_the_stage_breakdown(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'STG-BRK-0001']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action' => 'approve',
            'docStatuses' => [
                'orcr_photocopy' => 'approved', 'drivers_license' => 'approved',
                'barangay_clearance' => 'approved', 'toda_clearance' => 'approved',
            ],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        $this->assertSame('pending_bplo_release', $application->refresh()->status);

        $response = $this->actingAs($tmo)->get(route('tmo.reports', ['tab' => 'applications']));
        $response->assertOk();

        $byStage = collect($response->inertiaProps('reportData.applications.by_stage'));
        $submitted = $response->inertiaProps('reportData.applications.kpis.submitted');

        $pendingBploRelease = $byStage->firstWhere('stage', 'Pending BPLO Release');
        $this->assertNotNull($pendingBploRelease, 'Expected a "Pending BPLO Release" stage bucket in the breakdown.');
        $this->assertGreaterThanOrEqual(1, $pendingBploRelease['count']);

        // Every retired stage label from the old payment-step grouping must be gone.
        $this->assertNull($byStage->firstWhere('stage', 'Municipal Treasurer Payment'));
        $this->assertNull($byStage->firstWhere('stage', 'BPLO Releasing'));

        // The buckets must actually account for every submitted application — the whole point of
        // fixing the dead-status bug is that nothing silently falls through the cracks.
        $this->assertSame($submitted, $byStage->sum('count'));
    }
}
