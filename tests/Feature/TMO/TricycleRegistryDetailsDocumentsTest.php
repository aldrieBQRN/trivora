<?php

namespace Tests\Feature\TMO;

use App\Models\ApplicationDocument;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

class TricycleRegistryDetailsDocumentsTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function registry_details_reflects_the_selected_tricycles_real_mixed_document_statuses(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-REGDOC1']);
        $tmo = $this->makeTmoUser();

        // TMO approves one requirement, rejects another, and leaves the rest untouched (still
        // pending). The two conditional requirements (delivery_receipt, authorization_letter)
        // were never uploaded at all.
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'           => 'reject',
            'docStatuses'      => [
                'orcr_photocopy'  => 'approved',
                'drivers_license' => 'rejected',
            ],
            'rejectionReasons' => ['drivers_license' => 'Blurry scan, please resubmit.'],
        ]);

        $tricycleId = $application->fresh()->tricycle_id;

        $response = $this->actingAs($tmo)->get(route('tricycle.details', $tricycleId));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/TricycleDetails')
            ->where('initialDocs', function ($docs) {
                $byName = collect($docs)->keyBy('name');

                \PHPUnit\Framework\Assert::assertSame('verified', $byName['Photocopy of OR/CR']['status']);
                \PHPUnit\Framework\Assert::assertSame(
                    'rejected',
                    $byName["Driver's License Back-to-back (Prof/Restriction 1/A1)"]['status']
                );
                \PHPUnit\Framework\Assert::assertSame(
                    'pending',
                    $byName['Police Clearance or LGU Certification']['status']
                );
                \PHPUnit\Framework\Assert::assertSame(
                    'not_submitted',
                    $byName['Delivery Receipt (Kung walang OR/CR pa / New Unit)']['status']
                );
                \PHPUnit\Framework\Assert::assertNull(
                    $byName['Delivery Receipt (Kung walang OR/CR pa / New Unit)']['date']
                );

                // The TODA clearance requirement is present as a document, never as TODA
                // zone/assignment/operational information.
                \PHPUnit\Framework\Assert::assertArrayHasKey(
                    'TODA/NAFTODA/ACTODAN Clearance (Original)',
                    $byName->toArray()
                );

                // Exactly the 11-item canonical requirement list, never a hardcoded shorter/longer
                // list and never every-document-shows-"verified".
                \PHPUnit\Framework\Assert::assertCount(11, $docs);
                \PHPUnit\Framework\Assert::assertNotSame(
                    ['verified'],
                    collect($docs)->pluck('status')->unique()->values()->all()
                );

                return true;
            })
        );
    }

    #[Test]
    public function two_different_tricycles_show_independent_document_sets(): void
    {
        [, , $applicationA] = $this->registerNewApplication(['plate_number' => 'TST-REGDOCA']);
        [, , $applicationB] = $this->registerNewApplication(['plate_number' => 'TST-REGDOCB']);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $applicationA), [
            'action'      => 'approve',
            'docStatuses' => [
                'police_clearance'   => 'approved', 'health_certificate' => 'approved',
                'orcr_photocopy'     => 'approved', 'drivers_license'    => 'approved',
                'barangay_clearance' => 'approved', 'toda_clearance'     => 'approved',
                'cedula'             => 'approved', 'driver_id'          => 'approved',
                'tariff_list'        => 'approved',
            ],
        ]);
        // Application B is left entirely untouched — every document should still read "pending".

        $tricycleAId = $applicationA->fresh()->tricycle_id;
        $tricycleBId = $applicationB->fresh()->tricycle_id;

        $responseA = $this->actingAs($tmo)->get(route('tricycle.details', $tricycleAId));
        $responseA->assertInertia(fn ($page) => $page
            ->where('initialDocs', function ($docs) {
                $byName = collect($docs)->keyBy('name');
                // All 9 uploaded/mandatory requirements verified; the 2 conditional requirements
                // were never uploaded, so they honestly read "not_submitted" rather than "verified".
                \PHPUnit\Framework\Assert::assertSame('verified', $byName['Photocopy of OR/CR']['status']);
                \PHPUnit\Framework\Assert::assertSame(
                    'not_submitted',
                    $byName['Delivery Receipt (Kung walang OR/CR pa / New Unit)']['status']
                );
                return true;
            })
        );

        $responseB = $this->actingAs($tmo)->get(route('tricycle.details', $tricycleBId));
        $responseB->assertInertia(fn ($page) => $page
            ->where('initialDocs', function ($docs) {
                $byName = collect($docs)->keyBy('name');
                \PHPUnit\Framework\Assert::assertSame(
                    'pending',
                    $byName['Photocopy of OR/CR']['status']
                );
                return true;
            })
        );
    }

    #[Test]
    public function a_rejected_then_resubmitted_document_shows_only_the_latest_status(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-REGDOC2']);
        $tmo = $this->makeTmoUser();

        // The originally-uploaded barangay clearance gets rejected...
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'           => 'reject',
            'docStatuses'      => ['barangay_clearance' => 'rejected'],
            'rejectionReasons' => ['barangay_clearance' => 'Expired clearance date.'],
        ]);

        // ...then the operator uploads a corrected copy as a brand-new row (never overwriting
        // the rejected one), exactly like the real resubmission code paths do.
        ApplicationDocument::create([
            'application_id' => $application->id,
            'document_type'  => 'barangay_clearance',
            'file_name'      => 'barangay_clearance_corrected.pdf',
            'file_path'      => 'applications/documents/barangay_clearance_corrected.pdf',
            'file_size_kb'   => 220,
            'mime_type'      => 'application/pdf',
            'review_status'  => 'pending',
        ]);

        $tricycleId = $application->fresh()->tricycle_id;

        $response = $this->actingAs($tmo)->get(route('tricycle.details', $tricycleId));
        $response->assertInertia(fn ($page) => $page
            ->where('initialDocs', function ($docs) {
                $byName = collect($docs)->keyBy('name');
                \PHPUnit\Framework\Assert::assertSame(
                    'pending',
                    $byName['Barangay Clearance (Original)']['status']
                );
                return true;
            })
        );

        // The obsolete rejected row must still exist untouched — history is preserved, not deleted.
        $this->assertDatabaseHas('application_documents', [
            'application_id' => $application->id,
            'document_type'  => 'barangay_clearance',
            'review_status'  => 'rejected',
        ]);
        $this->assertSame(2, $application->documents()->where('document_type', 'barangay_clearance')->count());
    }
}
