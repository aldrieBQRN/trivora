<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Public Plate Verification (/api/public/verify-plate, landing page): the franchise standing,
 * numbers and expiry shown to the public must match the real records.
 */
class PublicPlateVerificationTest extends TestCase
{
    use DatabaseTransactions;

    private Operator $operator;
    private ColorCodingScheme $colorScheme;
    private User $issuer;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::create([
            'name' => 'Plate Verify Owner', 'email' => 'plate.verify.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        $this->operator = Operator::create([
            'user_id' => $user->id, 'first_name' => 'Plate', 'last_name' => 'Verify',
            'contact_number' => '09170000901', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-PV-' . uniqid(), 'license_expiry_date' => '2029-01-01',
        ]);
        $this->colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Plate Verify Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
        $this->issuer = User::firstOrCreate(
            ['email' => 'plate.verify.issuer@trivora.test'],
            ['name' => 'Plate Verify Issuer', 'password' => bcrypt('password'), 'role' => 'bplo_staff']
        );
    }

    private function tricycle(string $plate, string $status = 'active'): Tricycle
    {
        $n = substr(md5($plate), 0, 8);
        return Tricycle::create([
            'operator_id' => $this->operator->id, 'plate_number' => $plate,
            'engine_number' => "ENG-{$n}", 'chassis_number' => "CHS-{$n}",
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => "OR-{$n}", 'cr_number' => "CR-{$n}", 'status' => $status,
        ]);
    }

    private function franchise(Tricycle $tri, array $attrs = []): FranchiseScheme
    {
        return FranchiseScheme::create(array_merge([
            'tricycle_id' => $tri->id, 'color_coding_scheme_id' => $this->colorScheme->id,
            'issued_by' => $this->issuer->id, 'franchise_number' => 'PV-' . substr(md5($tri->plate_number), 0, 6),
            'sticker_number' => 'STK-PV-' . $tri->id,
            'issue_date' => now()->subYear()->toDateString(), 'expiry_date' => now()->addYears(2)->toDateString(),
            'is_active' => true,
        ], $attrs));
    }

    private function verify(string $plate): array
    {
        return $this->getJson('/api/public/verify-plate?plate=' . urlencode($plate))->assertOk()->json();
    }

    #[Test]
    public function active_unit_with_valid_franchise_shows_active_with_real_franchise_and_sticker_numbers(): void
    {
        $tri = $this->tricycle('PVA-1001');
        $fs = $this->franchise($tri);

        $r = $this->verify('pva-1001');
        $this->assertTrue($r['found']);
        $this->assertSame('Active', $r['status']);
        $this->assertSame($fs->franchise_number, $r['franchise_number']);
        $this->assertSame($fs->sticker_number, $r['sticker_number']);
        $this->assertSame($fs->expiry_date->format('M d, Y'), $r['expiry']);
    }

    #[Test]
    public function active_tricycle_whose_franchise_has_expired_is_reported_expired_not_active(): void
    {
        $tri = $this->tricycle('PVE-1002', 'active');
        $this->franchise($tri, ['expiry_date' => now()->subDays(10)->toDateString()]);

        $r = $this->verify('PVE-1002');
        $this->assertSame('Expired', $r['status']);
    }

    #[Test]
    public function suspended_tricycle_or_franchise_is_reported_suspended(): void
    {
        $this->franchise($this->tricycle('PVS-1003', 'suspended'));
        $this->assertSame('Suspended', $this->verify('PVS-1003')['status']);

        $this->franchise($this->tricycle('PVS-1004', 'active'), ['status' => FranchiseScheme::STATUS_SUSPENDED]);
        $this->assertSame('Suspended', $this->verify('PVS-1004')['status']);
    }

    #[Test]
    public function revoked_franchise_is_reported_revoked(): void
    {
        $this->franchise($this->tricycle('PVR-1005', 'active'), ['status' => FranchiseScheme::STATUS_REVOKED]);
        $this->assertSame('Revoked', $this->verify('PVR-1005')['status']);
    }

    #[Test]
    public function unit_without_a_franchise_shows_no_franchise_or_sticker_number(): void
    {
        $tri = $this->tricycle('PVU-1006', 'unregistered');
        $tri->update(['coding_scheme_number' => '1006']); // not a sticker — must not be shown as one

        $r = $this->verify('PVU-1006');
        $this->assertSame('Unregistered', $r['status']);
        $this->assertNull($r['franchise_number']);
        $this->assertNull($r['sticker_number']);
        $this->assertNull($r['expiry']);
    }

    #[Test]
    public function partial_plate_matching_several_units_is_ambiguous_not_an_arbitrary_unit(): void
    {
        $this->tricycle('PVX-2001');
        $this->tricycle('PVX-2002');

        $r = $this->verify('PVX-200');
        $this->assertFalse($r['found']);
        $this->assertTrue($r['ambiguous']);
    }

    #[Test]
    public function partial_plate_matching_exactly_one_unit_is_found(): void
    {
        $this->tricycle('PVZ-3141');

        $r = $this->verify('3141');
        $this->assertTrue($r['found']);
        $this->assertSame('PVZ-3141', $r['plate']);
    }

    #[Test]
    public function unit_with_in_progress_application_does_not_display_as_active_or_show_sticker_number(): void
    {
        $tri = $this->tricycle('PVP-1007', 'active');
        $this->franchise($tri);

        \App\Models\Application::create([
            'reference_number' => 'APP-TEST-' . uniqid(),
            'operator_id'      => $this->operator->id,
            'tricycle_id'      => $tri->id,
            'application_type' => 'new',
            'current_step'     => 2,
            'status'           => 'pending_inspection',
        ]);

        $r = $this->verify('PVP-1007');
        $this->assertTrue($r['found']);
        $this->assertSame('Pending', $r['status']);
        $this->assertSame('In Process — Pending Inspection', $r['application_status']);
        $this->assertNull($r['sticker_number']);
        $this->assertNull($r['franchise_number']);
        $this->assertNull($r['expiry']);
    }

    #[Test]
    public function unit_with_awaiting_confirmation_application_does_not_display_as_active_or_show_sticker_number(): void
    {
        $tri = $this->tricycle('PVP-1008', 'unregistered');
        \App\Models\Application::create([
            'reference_number' => 'APP-TEST-' . uniqid(),
            'operator_id'      => $this->operator->id,
            'tricycle_id'      => $tri->id,
            'application_type' => 'new',
            'current_step'     => 4,
            'status'           => 'awaiting_tmo_confirmation',
            'sticker_number'   => 'STK-2026-9999',
        ]);

        $r = $this->verify('PVP-1008');
        $this->assertTrue($r['found']);
        $this->assertSame('Pending', $r['status']);
        $this->assertSame('In Process — Awaiting TMO Confirmation', $r['application_status']);
        $this->assertNull($r['sticker_number']);
        $this->assertNull($r['franchise_number']);
    }

    #[Test]
    public function like_wildcards_in_the_query_are_matched_literally(): void
    {
        $this->tricycle('PVW-4001');

        $r = $this->verify('%');
        $this->assertFalse($r['found']);
        $this->assertArrayNotHasKey('plate', $r);
    }
}
