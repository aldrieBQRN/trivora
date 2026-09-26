<?php

namespace Tests\Feature\TMO;

use App\Models\ApplicationDocument;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers TMO\ApplicationController::show() (Document Review detail page, /tmo/review/docs/{id})
 * — the "Additional Documents" section must only ever reflect documents the driver actually
 * uploaded, and a resubmitted document must resolve to its latest status, not an obsolete one.
 */
class DocumentReviewAdditionalDocumentsTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    #[Test]
    public function an_application_with_no_conditional_documents_uploaded_has_none_in_the_response(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'DOCREV-NOOPT-0001']);
        $tmo = $this->makeTmoUser();

        $response = $this->actingAs($tmo)->get(route('tmo.review.docs', $application));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/DocumentReview')
            ->where('application.documents', function ($docs) {
                $categories = collect($docs)->pluck('category')->all();
                \PHPUnit\Framework\Assert::assertNotContains('delivery_receipt', $categories);
                \PHPUnit\Framework\Assert::assertNotContains('authorization_letter', $categories);
                \PHPUnit\Framework\Assert::assertNotContains('prangkisa', $categories);
                return true;
            })
        );
    }

    #[Test]
    public function an_uploaded_conditional_document_is_present_in_the_response(): void
    {
        [, , $application] = $this->registerNewApplication([
            'plate_number' => 'DOCREV-OPT-0001',
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
                'delivery_receipt'   => [$this->fakeDocument('receipt.pdf')],
            ],
        ]);
        $tmo = $this->makeTmoUser();

        $response = $this->actingAs($tmo)->get(route('tmo.review.docs', $application));
        $response->assertInertia(fn ($page) => $page
            ->where('application.documents', function ($docs) {
                $categories = collect($docs)->pluck('category')->all();
                \PHPUnit\Framework\Assert::assertContains('delivery_receipt', $categories);
                return true;
            })
        );
    }

    #[Test]
    public function a_rejected_then_resubmitted_document_reports_only_the_latest_status(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'DOCREV-RESUB-0001']);
        $tmo = $this->makeTmoUser();

        // Reject the driver's license.
        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'           => 'reject',
            'docStatuses'      => ['drivers_license' => 'rejected'],
            'rejectionReasons' => ['drivers_license' => 'Blurry scan.'],
        ]);

        // Operator uploads a corrected copy — a brand-new row, the old rejected one untouched.
        ApplicationDocument::create([
            'application_id' => $application->id,
            'document_type'  => 'drivers_license',
            'file_name'      => 'drivers_license_corrected.pdf',
            'file_path'      => 'applications/documents/drivers_license_corrected.pdf',
            'file_size_kb'   => 210,
            'mime_type'      => 'application/pdf',
            'review_status'  => 'pending',
        ]);

        $response = $this->actingAs($tmo)->get(route('tmo.review.docs', $application));
        $response->assertInertia(fn ($page) => $page
            ->where('application.docStatuses.drivers_license', 'pending')
        );

        // The obsolete rejected row must still exist — history is preserved, not deleted.
        $this->assertDatabaseHas('application_documents', [
            'application_id' => $application->id,
            'document_type'  => 'drivers_license',
            'review_status'  => 'rejected',
        ]);
        $this->assertSame(2, $application->documents()->where('document_type', 'drivers_license')->count());
    }
}
