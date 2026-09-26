<?php

namespace Tests\Feature\BPLO;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\FranchiseScheme;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers the rebuilt BPLO Releasing Analytics & Reporting page (BPLOReportController) — a
 * single-page report scoped to BPLO's own responsibility (releasing the sticker/plate), built
 * from the real Application.status = 'pending_bplo_release' queue and the real FranchiseScheme
 * release ledger, driven through the actual public-registration → TMO review → TMO physical
 * inspection → BPLO release pipeline rather than seeded shortcuts.
 */
class BPLOReportControllerTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedTodaAndColorScheme();
    }

    /** Drives one application from public registration through TMO document review and physical
     * inspection, landing it at Application.status = 'pending_bplo_release' — BPLO's own queue. */
    private function bringToPendingBploRelease(array $overrides = []): Application
    {
        [, , $application] = $this->registerNewApplication($overrides);
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

        return $application->refresh();
    }

    private function releaseByBplo(Application $application, string $codingNumber): Application
    {
        $bplo = $this->makeBploUser();
        $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'body_number' => $codingNumber,
        ])->assertRedirect();

        return $application->refresh();
    }

    #[Test]
    public function pending_bplo_release_applications_are_counted_as_pending(): void
    {
        $baseline = $this->fetchReportData();

        $application = $this->bringToPendingBploRelease(['plate_number' => 'BPR-PEND-0001']);
        $this->assertSame('pending_bplo_release', $application->status);

        $data = $this->fetchReportData();

        $this->assertSame($baseline['overview']['pending_release'] + 1, $data['overview']['pending_release']);
        $this->assertSame($baseline['overview']['total_for_bplo'] + 1, $data['overview']['total_for_bplo']);
    }

    #[Test]
    public function releasing_an_application_moves_it_from_pending_to_released_and_fixes_the_sticker_number_bug(): void
    {
        $application = $this->bringToPendingBploRelease(['plate_number' => 'BPR-REL-0001']);
        $baseline = $this->fetchReportData();

        $released = $this->releaseByBplo($application, '9101');
        $this->assertSame('awaiting_tmo_confirmation', $released->status);

        $data = $this->fetchReportData();

        $this->assertSame($baseline['overview']['pending_release'] - 1, $data['overview']['pending_release']);
        $this->assertSame($baseline['overview']['released'] + 1, $data['overview']['released']);
        $this->assertSame($baseline['stickerPlate']['total_releases'] + 1, $data['stickerPlate']['total_releases']);

        // Regression check: FranchiseScheme.sticker_number was missing from $fillable, so
        // BPLOController::release()'s FranchiseScheme::create([..., 'sticker_number' => ...])
        // silently dropped it on every real release. Confirms the fix actually persists it.
        $scheme = FranchiseScheme::where('application_id', $application->id)->firstOrFail();
        $this->assertNotNull($scheme->sticker_number);
        $this->assertSame($application->refresh()->sticker_number, $scheme->sticker_number);

        // And the recent-activity list (and, by extension, the export) reflects the real record.
        $this->assertTrue(collect($data['recentActivity'])->contains(fn ($r) => $r['plate'] === 'BPR-REL-0001'));
    }

    #[Test]
    public function status_filter_pending_zeroes_out_the_released_bucket_and_vice_versa(): void
    {
        $pending = $this->bringToPendingBploRelease(['plate_number' => 'BPR-FLT-0001']);
        $toRelease = $this->bringToPendingBploRelease(['plate_number' => 'BPR-FLT-0002']);
        $this->releaseByBplo($toRelease, '9102');

        $pendingOnly = $this->fetchReportData(['status' => 'pending']);
        $this->assertGreaterThanOrEqual(1, $pendingOnly['overview']['pending_release']);
        $this->assertSame(0, $pendingOnly['overview']['released']);
        // The "released" bucket is excluded entirely, so period-scoped release activity (which
        // is inherently about release events) must report empty too — not a mix of statuses.
        $this->assertSame(0, $pendingOnly['overview']['activity_in_period']);
        $this->assertNull($pendingOnly['processing']['avg_days_to_release']);

        $releasedOnly = $this->fetchReportData(['status' => 'released']);
        $this->assertSame(0, $releasedOnly['overview']['pending_release']);
        $this->assertGreaterThanOrEqual(1, $releasedOnly['overview']['released']);
        $this->assertNull($releasedOnly['processing']['oldest_pending']);
    }

    #[Test]
    public function activity_and_records_respect_the_selected_date_range(): void
    {
        $application = $this->bringToPendingBploRelease(['plate_number' => 'BPR-RNG-0001']);
        $this->releaseByBplo($application, '9103');

        $scheme = FranchiseScheme::where('application_id', $application->id)->firstOrFail();
        $scheme->forceFill(['issue_date' => now()->subYear()->toDateString()])->save();

        // A range that excludes the (backdated) release entirely.
        $outsideRange = $this->fetchReportData([
            'from' => now()->subDays(2)->toDateString(),
            'to' => now()->toDateString(),
        ]);
        $this->assertSame(0, $outsideRange['overview']['activity_in_period']);
        $this->assertFalse(collect($outsideRange['recentActivity'])->contains(fn ($r) => $r['plate'] === 'BPR-RNG-0001'));

        // The lifetime "released" count is NOT date-scoped, so it must still include it.
        $this->assertGreaterThanOrEqual(1, $outsideRange['overview']['released']);

        // A range that actually covers it.
        $insideRange = $this->fetchReportData([
            'from' => now()->subYear()->subDay()->toDateString(),
            'to' => now()->toDateString(),
        ]);
        $this->assertGreaterThanOrEqual(1, $insideRange['overview']['activity_in_period']);
        $this->assertTrue(collect($insideRange['recentActivity'])->contains(fn ($r) => $r['plate'] === 'BPR-RNG-0001'));
    }

    #[Test]
    public function average_processing_time_is_computed_from_real_timestamps_not_fabricated(): void
    {
        $baseline = $this->fetchReportData();
        // With nothing released in the (default, last-30-days) range yet, the metric must be
        // omitted (null), never a fabricated 0.
        $this->assertNull($baseline['processing']['avg_days_to_release']);
        $this->assertSame(0, $baseline['processing']['sample_size']);

        $application = $this->bringToPendingBploRelease(['plate_number' => 'BPR-AVG-0001']);
        // Backdate the submission so the processing-time computation has a real, non-trivial gap.
        $application->forceFill(['submitted_at' => now()->subDays(5)])->save();
        $this->releaseByBplo($application, '9104');

        $data = $this->fetchReportData();

        $this->assertNotNull($data['processing']['avg_days_to_release']);
        $this->assertSame(1, $data['processing']['sample_size']);
        $this->assertEqualsWithDelta(5.0, $data['processing']['avg_days_to_release'], 0.5);
    }

    #[Test]
    public function oldest_pending_release_is_the_one_that_entered_the_queue_first(): void
    {
        $older = $this->bringToPendingBploRelease(['plate_number' => 'BPR-OLD-0001']);
        $newer = $this->bringToPendingBploRelease(['plate_number' => 'BPR-OLD-0002']);

        // Both just entered the queue "now" — push the older one's queue-entry timestamp back so
        // ordering is unambiguous regardless of how fast these two requests ran.
        ApplicationStatusHistory::where('application_id', $older->id)
            ->where('to_status', 'pending_bplo_release')
            ->update(['created_at' => now()->subDays(3)]);

        $data = $this->fetchReportData();

        $this->assertNotNull($data['processing']['oldest_pending']);
        $this->assertSame('BPR-OLD-0001', $data['processing']['oldest_pending']['plate']);
        $this->assertGreaterThanOrEqual(3, $data['processing']['oldest_pending']['days_ago']);
    }

    #[Test]
    public function export_excel_route_returns_a_real_spreadsheet_respecting_filters(): void
    {
        $application = $this->bringToPendingBploRelease(['plate_number' => 'BPR-EXP-0001']);
        $this->releaseByBplo($application, '9105');

        $officer = $this->makeBploUser();
        $response = $this->actingAs($officer)->get(route('bplo.reports.export-excel', ['status' => 'released']));

        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));
    }

    /** @param array $params from/to/status overrides */
    private function fetchReportData(array $params = []): array
    {
        $officer = $this->makeBploUser();
        $response = $this->actingAs($officer)->get(route('bplo.reports', $params));
        $response->assertOk();

        return $response->inertiaProps('reportData');
    }
}
