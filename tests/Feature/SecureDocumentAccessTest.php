<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SecureDocumentAccessTest extends TestCase
{
    use DatabaseTransactions;

    private User $ownerUser;
    private Operator $operator;
    private Application $application;
    private ApplicationDocument $document;
    private User $tmoUser;
    private User $bploUser;
    private User $adminUser;
    private User $unrelatedUser;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');

        $this->ownerUser = User::create([
            'name' => 'Operator Owner',
            'email' => 'operator.owner.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->ownerUser->id,
            'first_name' => 'Juan',
            'last_name' => 'Owner',
            'contact_number' => '09171234567',
            'address' => 'Nasugbu, Batangas',
            'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'N01-SECURE-' . uniqid(),
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id' => $this->operator->id,
            'plate_number' => 'SEC-' . rand(1000, 9999),
            'engine_number' => 'ENG-' . uniqid(),
            'chassis_number' => 'CHS-' . uniqid(),
            'make' => 'Honda',
            'model' => 'TMX',
            'year_model' => 2021,
            'body_color' => 'Red',
            'body_type' => 'Standard',
            'status' => 'active',
        ]);

        $this->application = Application::create([
            'reference_number' => 'APP-2026-' . rand(10000, 99999),
            'operator_id' => $this->operator->id,
            'tricycle_id' => $tricycle->id,
            'application_type' => 'new',
            'status' => 'pending_review',
        ]);

        // Put a fake file on the private 'local' disk
        $filePath = 'applications/documents/test_police_clearance.pdf';
        Storage::disk('local')->put($filePath, '%PDF-1.4 Fake PDF Content');

        $this->document = ApplicationDocument::create([
            'application_id' => $this->application->id,
            'document_type' => 'police_clearance',
            'file_name' => 'police_clearance.pdf',
            'file_path' => $filePath,
            'file_size_kb' => 15,
            'mime_type' => 'application/pdf',
            'review_status' => 'pending',
        ]);

        $this->tmoUser = User::create([
            'name' => 'TMO Staff',
            'email' => 'tmo.staff.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tmo_personnel',
        ]);

        $this->bploUser = User::create([
            'name' => 'BPLO Staff',
            'email' => 'bplo.staff.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'bplo_staff',
        ]);

        $this->adminUser = User::create([
            'name' => 'System Admin',
            'email' => 'admin.staff.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $this->unrelatedUser = User::create([
            'name' => 'Unrelated Person',
            'email' => 'unrelated.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
    }

    #[Test]
    public function unauthenticated_user_cannot_access_application_document(): void
    {
        $response = $this->get('/documents/application/' . $this->document->id);
        $this->assertSame(401, $response->status());
    }

    #[Test]
    public function owning_operator_can_access_their_application_document(): void
    {
        $response = $this->actingAs($this->ownerUser)->get('/documents/application/' . $this->document->id);

        $response->assertStatus(200);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertSame('%PDF-1.4 Fake PDF Content', $response->streamedContent());
    }

    #[Test]
    public function municipal_staff_and_admin_can_access_application_documents(): void
    {
        $this->actingAs($this->tmoUser)
            ->get('/documents/application/' . $this->document->id)
            ->assertStatus(200);

        $this->actingAs($this->bploUser)
            ->get('/documents/application/' . $this->document->id)
            ->assertStatus(200);

        $this->actingAs($this->adminUser)
            ->get('/documents/application/' . $this->document->id)
            ->assertStatus(200);
    }

    #[Test]
    public function unauthorized_user_receives_forbidden_response(): void
    {
        $response = $this->actingAs($this->unrelatedUser)->get('/documents/application/' . $this->document->id);
        $response->assertStatus(403);
    }

    #[Test]
    public function valid_temporary_signed_url_allows_access_without_session(): void
    {
        $signedUrl = URL::temporarySignedRoute('documents.application.show', now()->addMinutes(30), [
            'id' => $this->document->id,
        ]);

        $response = $this->get($signedUrl);
        $response->assertStatus(200);
        $this->assertSame('%PDF-1.4 Fake PDF Content', $response->streamedContent());
    }

    #[Test]
    public function legacy_file_on_public_disk_is_safely_served_by_authorized_route(): void
    {
        $legacyPath = 'applications/documents/legacy_orcr.pdf';
        Storage::disk('public')->put($legacyPath, 'Legacy Public PDF');

        $legacyDoc = ApplicationDocument::create([
            'application_id' => $this->application->id,
            'document_type' => 'orcr_photocopy',
            'file_name' => 'legacy_orcr.pdf',
            'file_path' => $legacyPath,
            'file_size_kb' => 12,
            'mime_type' => 'application/pdf',
            'review_status' => 'pending',
        ]);

        $response = $this->actingAs($this->ownerUser)->get('/documents/application/' . $legacyDoc->id);
        $response->assertStatus(200);
        $this->assertSame('Legacy Public PDF', $response->streamedContent());
    }

    #[Test]
    public function non_existent_document_id_returns_not_found(): void
    {
        $response = $this->actingAs($this->tmoUser)->get('/documents/application/999999');
        $response->assertStatus(404);
    }

    #[Test]
    public function missing_storage_file_returns_not_found(): void
    {
        $missingDoc = ApplicationDocument::create([
            'application_id' => $this->application->id,
            'document_type' => 'cedula',
            'file_name' => 'missing.pdf',
            'file_path' => 'applications/documents/does_not_exist.pdf',
            'file_size_kb' => 10,
            'mime_type' => 'application/pdf',
            'review_status' => 'pending',
        ]);

        $response = $this->actingAs($this->tmoUser)->get('/documents/application/' . $missingDoc->id);
        $response->assertStatus(404);
    }

    #[Test]
    public function path_traversal_is_blocked(): void
    {
        $traversalDoc = ApplicationDocument::create([
            'application_id' => $this->application->id,
            'document_type' => 'cedula',
            'file_name' => 'traversal.pdf',
            'file_path' => '../../sensitive/config.env',
            'file_size_kb' => 5,
            'mime_type' => 'text/plain',
            'review_status' => 'pending',
        ]);

        $response = $this->actingAs($this->tmoUser)->get('/documents/application/' . $traversalDoc->id);
        $response->assertStatus(400);
    }

    #[Test]
    public function violation_appeal_evidence_access_is_properly_authorized(): void
    {
        $tricycle = Tricycle::create([
            'operator_id' => $this->operator->id,
            'plate_number' => 'ABC-9999',
            'engine_number' => 'ENG-9999',
            'chassis_number' => 'CHS-9999',
            'make' => 'Honda',
            'model' => 'TMX',
            'year_model' => 2022,
            'body_color' => 'Black',
            'body_type' => 'Standard',
            'status' => 'active',
        ]);

        $driver = Driver::create([
            'user_id' => $this->ownerUser->id,
            'operator_id' => $this->operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'N01-DRV-' . uniqid(),
            'mobile_number' => '09171234567',
        ]);

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Test Scheme',
            'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'],
            'is_active' => true,
        ]);

        $franchise = FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $this->bploUser->id,
            'franchise_number' => 'FR-SEC-' . rand(1000, 9999),
            'issue_date' => '2024-01-01',
            'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        $violation = Violation::create([
            'tricycle_id' => $tricycle->id,
            'franchise_scheme_id' => $franchise->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'violation_type' => 'color_coding',
            'fine_amount' => 500,
            'status' => 'open',
            'detected_at' => now(),
        ]);

        $evidencePath = 'violation_appeals/evidence_proof.jpg';
        Storage::disk('local')->put($evidencePath, 'Fake Image Proof Content');

        $appeal = ViolationAppeal::create([
            'violation_id' => $violation->id,
            'driver_id' => $driver->id,
            'reason' => 'Emergency hospital trip with patient.',
            'evidence_path' => $evidencePath,
            'status' => 'under_review',
            'submitted_at' => now(),
        ]);

        // Owning driver can view
        $this->actingAs($this->ownerUser)
            ->get('/documents/violation-appeal/' . $appeal->id)
            ->assertStatus(200);

        // TMO staff can view
        $this->actingAs($this->tmoUser)
            ->get('/documents/violation-appeal/' . $appeal->id)
            ->assertStatus(200);

        // Unrelated user is forbidden
        $this->actingAs($this->unrelatedUser)
            ->get('/documents/violation-appeal/' . $appeal->id)
            ->assertStatus(403);

        // Signed URL works
        $signedUrl = URL::temporarySignedRoute('documents.violation_appeal.show', now()->addMinutes(30), [
            'id' => $appeal->id,
        ]);
        $this->get($signedUrl)->assertStatus(200);
    }
}
