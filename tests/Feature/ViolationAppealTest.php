<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ViolationAppealTest extends TestCase
{
    use DatabaseTransactions;

    protected Driver $driver;
    protected Violation $violation;

    /** Builds one real driver (user+operator+tricycle+driver) with one open violation against
     * their own tricycle — the fixture every test in this file starts from. */
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-APPEAL-TEST'],
            ['name' => 'Test Appeal Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $colorScheme = ColorCodingScheme::create([
            'name' => 'Test Red', 'color_hex' => '#FF0000', 'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $operator = Operator::create([
            'toda_id' => $toda->id,
            'first_name' => 'Appeal', 'last_name' => 'Tester',
            'contact_number' => '09170000010', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-APPEAL-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'APL-0001', 'engine_number' => 'ENG-APL-001', 'chassis_number' => 'CHS-APL-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-APL-001', 'cr_number' => 'CR-APL-001', 'status' => 'active',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer', 'email' => 'bplo.issuer.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        $franchise = FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-APL-001',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        $driverUser = User::create([
            'name' => 'Appeal Driver', 'email' => 'appeal.driver.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $this->driver = Driver::create([
            'user_id' => $driverUser->id, 'operator_id' => $operator->id, 'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-APPEAL-001', 'is_online' => true, 'is_available' => true,
        ]);

        $this->violation = Violation::create([
            'tricycle_id' => $tricycle->id,
            'franchise_scheme_id' => $franchise->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'violation_type' => 'color_coding',
            'detected_at' => now(),
            'day_of_week' => now()->format('l'),
            'detection_method' => 'automated',
            'status' => 'open',
            'fine_amount' => 500.00,
            'notes' => 'Test violation for appeal flow.',
        ]);
    }

    private function makeTmoUser(): User
    {
        return User::create([
            'name' => 'TMO Reviewer', 'email' => 'tmo.reviewer.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    /** Second driver + tricycle + violation, entirely unrelated to $this->driver — for ownership tests. */
    private function makeOtherDriverWithViolation(): array
    {
        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-APPEAL-TEST-2'],
            ['name' => 'Other Zone', 'barangay' => 'Bucana', 'is_active' => true]
        );
        $colorScheme = ColorCodingScheme::create([
            'name' => 'Other Scheme', 'color_hex' => '#00FF00', 'restricted_days' => ['Tuesday'], 'is_active' => true,
        ]);
        $operator = Operator::create([
            'toda_id' => $toda->id, 'first_name' => 'Other', 'last_name' => 'Driver',
            'contact_number' => '09170000099', 'address' => 'Bucana', 'barangay' => 'Bucana',
            'date_of_birth' => '1991-01-01', 'license_number' => 'LIC-OTHER-001', 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'OTH-0001', 'engine_number' => 'ENG-OTH-001', 'chassis_number' => 'CHS-OTH-001',
            'make' => 'Yamaha', 'model' => 'STX', 'year_model' => 2020,
            'body_color' => 'Green', 'body_type' => 'Standard',
            'or_number' => 'OR-OTH-001', 'cr_number' => 'CR-OTH-001', 'status' => 'active',
        ]);
        $issuer = User::create([
            'name' => 'BPLO Issuer Other', 'email' => 'bplo.issuer.other.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        $franchise = FranchiseScheme::create([
            'tricycle_id' => $tricycle->id, 'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id,
            'franchise_number' => 'FR-OTH-001', 'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01', 'is_active' => true,
        ]);
        $otherUser = User::create([
            'name' => 'Other Driver User', 'email' => 'other.driver.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);
        $otherDriver = Driver::create([
            'user_id' => $otherUser->id, 'operator_id' => $operator->id, 'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-OTHER-001', 'is_online' => true, 'is_available' => true,
        ]);
        $otherViolation = Violation::create([
            'tricycle_id' => $tricycle->id, 'franchise_scheme_id' => $franchise->id, 'color_coding_scheme_id' => $colorScheme->id,
            'violation_type' => 'route_violation', 'detected_at' => now(), 'day_of_week' => now()->format('l'),
            'detection_method' => 'manual', 'status' => 'open', 'fine_amount' => 300.00,
        ]);

        return [$otherDriver, $otherViolation];
    }

    #[Test]
    public function driver_can_list_only_their_own_violations()
    {
        [, $otherViolation] = $this->makeOtherDriverWithViolation();

        Sanctum::actingAs($this->driver->user, ['*']);
        $response = $this->getJson('/api/v1/driver/violations');

        $response->assertStatus(200);
        $ids = collect($response->json('violations'))->pluck('id');
        $this->assertTrue($ids->contains($this->violation->id));
        $this->assertFalse($ids->contains($otherViolation->id));
    }

    #[Test]
    public function a_fresh_violation_is_pending_and_appealable()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $response = $this->getJson('/api/v1/driver/violations');

        $entry = collect($response->json('violations'))->firstWhere('id', $this->violation->id);
        $this->assertEquals('pending', $entry['driver_status']);
        $this->assertTrue($entry['can_appeal']);
        $this->assertNull($entry['appeal']);
    }

    /** Field-for-field: every value the mobile app actually displays must come from this exact
     * database row, not be fabricated or mismatched by the serializer. */
    #[Test]
    public function every_displayed_field_matches_the_underlying_database_record_exactly(): void
    {
        $location = \App\Models\TricycleLocation::create([
            'tricycle_id' => $this->violation->tricycle_id,
            'latitude' => 14.071234,
            'longitude' => 120.631234,
            'speed_kmh' => 12,
            'heading_deg' => 90,
            'accuracy_m' => 5,
            'source' => 'mobile_app',
            'recorded_at' => now(),
        ]);
        $this->violation->update([
            'location_snapshot_id' => $location->id,
            'notes' => 'Automated GPS detection: operating on restricted color-coding day.',
        ]);

        Sanctum::actingAs($this->driver->user, ['*']);
        $response = $this->getJson('/api/v1/driver/violations');
        $entry = collect($response->json('violations'))->firstWhere('id', $this->violation->id);

        $this->assertSame('CITE-' . str_pad((string) $this->violation->id, 5, '0', STR_PAD_LEFT), $entry['citation_no']);
        $this->assertSame('color_coding', $entry['violation_type']);
        $this->assertSame('Color Coding', $entry['title']);
        $this->assertSame($this->violation->notes, $entry['description']);
        $this->assertSame($this->violation->detected_at->toIso8601String(), $entry['detected_at']);
        $this->assertSame($this->violation->day_of_week, $entry['day_of_week']);
        $this->assertSame('automated', $entry['detection_method']);
        $this->assertEqualsWithDelta(500.00, $entry['fine_amount'], 0.001);
        $this->assertNull($entry['fine_paid_at']);
        $this->assertEqualsWithDelta(14.071234, $entry['location']['latitude'], 0.00001);
        $this->assertEqualsWithDelta(120.631234, $entry['location']['longitude'], 0.00001);
    }

    #[Test]
    public function driver_can_submit_an_appeal_with_proof_photo()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $photo = UploadedFile::fake()->image('evidence.jpg');

        $response = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'I was responding to a genuine passenger emergency at the time.',
            'proof' => $photo,
        ]);

        $response->assertStatus(201);
        $this->assertEquals('appeal_under_review', $response->json('violation.driver_status'));
        $this->assertFalse($response->json('violation.can_appeal'));
        $this->assertNotNull($response->json('violation.appeal.evidence_url'));

        $appeal = ViolationAppeal::where('violation_id', $this->violation->id)->first();
        $this->assertNotNull($appeal);
        $this->assertEquals($this->driver->id, $appeal->driver_id);
        $this->assertEquals('under_review', $appeal->status);
        $this->assertNotNull($appeal->evidence_path);
        Storage::disk('public')->assertExists($appeal->evidence_path);

        $this->assertEquals('contested', $this->violation->refresh()->status);
    }

    #[Test]
    public function driver_can_submit_an_appeal_without_a_photo()
    {
        Sanctum::actingAs($this->driver->user, ['*']);

        $response = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'This was a mechanical failure beyond my control.',
        ]);

        $response->assertStatus(201);
        $this->assertNull($response->json('violation.appeal.evidence_url'));
    }

    #[Test]
    public function appeal_reason_is_required_and_validated()
    {
        Sanctum::actingAs($this->driver->user, ['*']);

        $response = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'short',
        ]);

        $response->assertStatus(422);
        $this->assertNull(ViolationAppeal::where('violation_id', $this->violation->id)->first());
    }

    #[Test]
    public function driver_cannot_appeal_another_drivers_violation()
    {
        [, $otherViolation] = $this->makeOtherDriverWithViolation();

        Sanctum::actingAs($this->driver->user, ['*']);
        $response = $this->postJson("/api/v1/driver/violations/{$otherViolation->id}/appeal", [
            'reason' => 'Trying to appeal a violation that is not mine.',
        ]);

        $response->assertStatus(404);
        $this->assertNull(ViolationAppeal::where('violation_id', $otherViolation->id)->first());
    }

    #[Test]
    public function a_violation_cannot_be_appealed_twice()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'First appeal attempt with a valid reason.',
        ])->assertStatus(201);

        $second = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Second appeal attempt should be rejected outright.',
        ]);

        $second->assertStatus(422);
        $this->assertEquals(1, ViolationAppeal::where('violation_id', $this->violation->id)->count());
    }

    #[Test]
    public function appeal_submission_requires_authentication()
    {
        $response = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Attempting without any authentication at all.',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function tmo_can_approve_an_appeal_and_it_resolves_the_violation()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Genuine emergency, requesting review.',
        ])->assertStatus(201);
        $appeal = ViolationAppeal::where('violation_id', $this->violation->id)->firstOrFail();

        $tmo = $this->makeTmoUser();
        $response = $this->actingAs($tmo)->post("/tmo/appeals/{$appeal->id}/approve");

        $response->assertRedirect();
        $appeal->refresh();
        $this->assertEquals('approved', $appeal->status);
        $this->assertEquals($tmo->id, $appeal->reviewed_by);
        $this->assertNotNull($appeal->reviewed_at);
        $this->assertEquals('resolved', $this->violation->refresh()->status);
    }

    #[Test]
    public function tmo_can_reject_an_appeal_and_violation_requires_fine_payment()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Requesting review of this citation.',
        ])->assertStatus(201);
        $appeal = ViolationAppeal::where('violation_id', $this->violation->id)->firstOrFail();

        $tmo = $this->makeTmoUser();
        $response = $this->actingAs($tmo)->post("/tmo/appeals/{$appeal->id}/reject", [
            'review_notes' => 'Evidence does not support the claim.',
        ]);

        $response->assertRedirect();
        $appeal->refresh();
        $this->assertEquals('rejected', $appeal->status);
        $this->assertEquals('Evidence does not support the claim.', $appeal->review_notes);
        $this->assertEquals('open', $this->violation->refresh()->status);

        // Driver-facing: the violation must now read as "fine payment required", not plain pending.
        Sanctum::actingAs($this->driver->user, ['*']);
        $listRes = $this->getJson('/api/v1/driver/violations');
        $entry = collect($listRes->json('violations'))->firstWhere('id', $this->violation->id);
        $this->assertEquals('fine_payment_required', $entry['driver_status']);
        $this->assertEquals('rejected', $entry['appeal']['status']);
    }

    #[Test]
    public function a_decided_appeal_cannot_be_decided_again()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Requesting review of this citation.',
        ])->assertStatus(201);
        $appeal = ViolationAppeal::where('violation_id', $this->violation->id)->firstOrFail();

        $tmo = $this->makeTmoUser();
        $this->actingAs($tmo)->post("/tmo/appeals/{$appeal->id}/approve")->assertRedirect();

        // Attempting to reject an already-approved appeal must not flip it.
        $this->actingAs($tmo)->post("/tmo/appeals/{$appeal->id}/reject");
        $this->assertEquals('approved', $appeal->refresh()->status);
        $this->assertEquals('resolved', $this->violation->refresh()->status);
    }

    #[Test]
    public function a_driver_cannot_approve_their_own_appeal()
    {
        Sanctum::actingAs($this->driver->user, ['*']);
        $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Requesting review of this citation.',
        ])->assertStatus(201);
        $appeal = ViolationAppeal::where('violation_id', $this->violation->id)->firstOrFail();

        // The driver's own account has no TMO/admin role, so the web-guard role middleware must
        // reject them even if they were somehow authenticated on the web guard.
        $response = $this->actingAs($this->driver->user)->post("/tmo/appeals/{$appeal->id}/approve");

        $response->assertStatus(403);
        $this->assertEquals('under_review', $appeal->refresh()->status);
    }

    #[Test]
    public function an_unauthenticated_request_cannot_approve_an_appeal()
    {
        // Built directly via Eloquent (not through the API) so this test never calls
        // Sanctum::actingAs — which also authenticates the 'web' guard the TMO routes use, since
        // it's guard-list based — keeping this request genuinely, unambiguously unauthenticated.
        $appeal = ViolationAppeal::create([
            'violation_id' => $this->violation->id,
            'driver_id' => $this->driver->id,
            'reason' => 'Requesting review of this citation.',
            'status' => 'under_review',
            'submitted_at' => now(),
        ]);
        $this->violation->update(['status' => 'contested']);

        $response = $this->post("/tmo/appeals/{$appeal->id}/approve");

        $response->assertRedirect(route('login'));
        $this->assertEquals('under_review', $appeal->refresh()->status);
    }

    /**
     * Reproduces a real data state found in the dev database: an operator with TWO Tricycle rows
     * (e.g. an older/demo unit plus their real current one) where Driver::tricycle_id is stale,
     * still pointing at the older unit instead of the one the operator actually currently has.
     * DriverTelematicsController (GPS) already resolves the tricycle via operator_id, not
     * Driver::tricycle_id — this proves DriverViolationController now does the same, so violation
     * visibility and appeal eligibility always reflect the driver's real current unit instead of a
     * stale FK. Without the fix, this test's violation (on the CURRENT tricycle) would be invisible
     * and the older tricycle's unrelated violation would appear instead — which is exactly what
     * made the appeal button look "disabled": the driver was looking at the wrong tricycle's data.
     */
    #[Test]
    public function violations_resolve_against_the_operators_current_tricycle_even_when_driver_tricycle_id_is_stale(): void
    {
        // The OLDER tricycle Driver::tricycle_id still (incorrectly) points at.
        $staleTricycle = Tricycle::create([
            'operator_id' => $this->driver->operator_id, 'toda_zone_id' => $this->driver->operator->toda_id,
            'plate_number' => 'OLD-0001', 'engine_number' => 'ENG-OLD-001', 'chassis_number' => 'CHS-OLD-001',
            'make' => 'Honda', 'model' => 'XRM', 'year_model' => 2018,
            'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-OLD-001', 'cr_number' => 'CR-OLD-001', 'status' => 'suspended',
        ]);
        $this->driver->update(['tricycle_id' => $staleTricycle->id]);

        $staleColorScheme = ColorCodingScheme::create([
            'name' => 'Stale Tricycle Scheme', 'color_hex' => '#0000FF', 'restricted_days' => ['Wednesday'], 'is_active' => true,
        ]);
        $staleIssuer = User::create([
            'name' => 'BPLO Issuer Stale', 'email' => 'bplo.issuer.stale.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);
        $staleFranchise = FranchiseScheme::create([
            'tricycle_id' => $staleTricycle->id, 'color_coding_scheme_id' => $staleColorScheme->id,
            'issued_by' => $staleIssuer->id, 'franchise_number' => 'FR-OLD-001',
            'issue_date' => '2020-01-01', 'expiry_date' => '2023-01-01', 'is_active' => false,
        ]);

        // An unrelated violation sitting on the stale/old tricycle — must NOT appear for this driver.
        Violation::create([
            'tricycle_id' => $staleTricycle->id, 'franchise_scheme_id' => $staleFranchise->id,
            'color_coding_scheme_id' => $staleColorScheme->id, 'violation_type' => 'color_coding',
            'detected_at' => now(), 'day_of_week' => now()->format('l'),
            'detection_method' => 'automated', 'status' => 'open', 'fine_amount' => 500.00,
        ]);

        Sanctum::actingAs($this->driver->user, ['*']);

        // The real violation, on the operator's actual CURRENT tricycle, must be visible and appealable.
        $listResponse = $this->getJson('/api/v1/driver/violations');
        $ids = collect($listResponse->json('violations'))->pluck('id');
        $this->assertTrue($ids->contains($this->violation->id), 'The violation on the operator\'s real current tricycle must be visible.');
        $this->assertSame(1, $ids->count(), 'The stale/old tricycle\'s unrelated violation must not appear.');

        $appealResponse = $this->postJson("/api/v1/driver/violations/{$this->violation->id}/appeal", [
            'reason' => 'Verifying appeal works against the correct current tricycle.',
        ]);
        $appealResponse->assertStatus(201);
        $this->assertSame('appeal_under_review', $appealResponse->json('violation.driver_status'));
    }
}
