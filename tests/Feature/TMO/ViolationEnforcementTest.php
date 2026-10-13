<?php

namespace Tests\Feature\TMO;

use App\Models\AuditLog;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use App\Models\ViolationEnforcement;
use App\Services\ViolationEnforcementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ViolationEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private User $tmoUser;
    private User $unauthorizedUser;
    private Tricycle $tricycle;
    private FranchiseScheme $franchise;
    private ColorCodingScheme $colorScheme;
    private Driver $driver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::factory()->create([
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->unauthorizedUser = User::factory()->create([
            'role'      => 'passenger',
            'is_active' => true,
        ]);

        $operatorUser = User::factory()->create([
            'role'      => 'passenger',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $operatorUser->id,
            'first_name'          => 'Mario',
            'last_name'           => 'Reyes',
            'contact_number'      => '09123456789',
            'address'             => 'Nasugbu Poblacion',
            'barangay'            => 'Barangay 1',
            'date_of_birth'       => '1985-05-15',
            'license_number'      => 'LIC-' . rand(10000, 99999),
            'license_expiry_date' => '2028-05-15',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id'    => $operator->id,
            'plate_number'   => 'NLG-' . rand(1000, 9999),
            'engine_number'  => 'ENG-' . rand(1000, 9999),
            'chassis_number' => 'CHS-' . rand(1000, 9999),
            'make'           => 'Bajaj',
            'model'          => 'RE',
            'year_model'     => 2023,
            'body_color'     => 'Red',
            'body_type'      => 'Standard',
            'or_number'      => 'OR-12345',
            'cr_number'      => 'CR-12345',
            'status'         => 'active',
        ]);

        $this->colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Red Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'fine_amount' => 500.00, 'is_active' => true]
        );

        $this->franchise = FranchiseScheme::create([
            'tricycle_id'            => $this->tricycle->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'issued_by'              => $this->tmoUser->id,
            'franchise_number'       => 'MTOP-2026-0099',
            'sticker_number'         => 'STK-2026-0099',
            'issue_date'             => now()->subMonths(3)->toDateString(),
            'expiry_date'            => now()->addMonths(9)->toDateString(),
            'status'                 => FranchiseScheme::STATUS_ACTIVE,
            'is_active'              => true,
        ]);

        $driverUser = User::factory()->create([
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $this->driver = Driver::create([
            'user_id'        => $driverUser->id,
            'tricycle_id'    => $this->tricycle->id,
            'license_number' => 'DRV-LIC-99999',
            'is_online'      => true,
            'is_available'   => true,
        ]);
    }

    private function createViolation(int $daysAgo, string $status = 'open'): Violation
    {
        return Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchise->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now()->subDays($daysAgo),
            'day_of_week'            => now()->subDays($daysAgo)->format('l'),
            'detection_method'       => 'automated',
            'status'                 => $status,
            'fine_amount'            => 500.00,
            'notes'                  => "Test violation {$daysAgo} days ago",
        ]);
    }

    #[Test]
    public function it_calculates_correct_offense_number_and_penalty_for_first_through_fourth_offenses(): void
    {
        $v1 = $this->createViolation(10); // 1st
        $v2 = $this->createViolation(7);  // 2nd
        $v3 = $this->createViolation(4);  // 3rd
        $v4 = $this->createViolation(1);  // 4th

        // Check 1st offense
        $num1 = ViolationEnforcementService::calculateOffenseNumber($v1);
        $pen1 = ViolationEnforcementService::getPenaltyDetails($num1);
        $this->assertSame(1, $num1);
        $this->assertSame('1st Offense · ₱500', $pen1['penalty_display']);
        $this->assertEquals(500.00, $pen1['fine_amount']);
        $this->assertFalse($pen1['requires_impoundment']);
        $this->assertFalse($pen1['requires_suspension']);

        // Check 2nd offense
        $num2 = ViolationEnforcementService::calculateOffenseNumber($v2);
        $pen2 = ViolationEnforcementService::getPenaltyDetails($num2);
        $this->assertSame(2, $num2);
        $this->assertSame('2nd Offense · ₱1,000', $pen2['penalty_display']);
        $this->assertEquals(1000.00, $pen2['fine_amount']);
        $this->assertFalse($pen2['requires_impoundment']);

        // Check 3rd offense
        $num3 = ViolationEnforcementService::calculateOffenseNumber($v3);
        $pen3 = ViolationEnforcementService::getPenaltyDetails($num3);
        $this->assertSame(3, $num3);
        $this->assertSame('3rd Offense · ₱2,500', $pen3['penalty_display']);
        $this->assertEquals(2500.00, $pen3['fine_amount']);
        $this->assertTrue($pen3['requires_impoundment']);
        $this->assertTrue($pen3['requires_suspension']);

        // Check 4th offense (No invented fine amount, cancellation only)
        $num4 = ViolationEnforcementService::calculateOffenseNumber($v4);
        $pen4 = ViolationEnforcementService::getPenaltyDetails($num4);
        $this->assertSame(4, $num4);
        $this->assertSame('4th Offense · Franchise Cancellation', $pen4['penalty_display']);
        $this->assertNull($pen4['fine_amount'], 'Fourth offense must not invent a fine amount.');
        $this->assertTrue($pen4['requires_revocation']);
    }

    #[Test]
    public function it_excludes_dismissed_and_appeal_approved_violations_from_the_offense_count(): void
    {
        // V1 is confirmed
        $v1 = $this->createViolation(10, 'resolved');

        // V2 was dismissed
        $v2 = $this->createViolation(8, 'dismissed');

        // V3 was appealed and appeal was approved (cleared)
        $v3 = $this->createViolation(6, 'resolved');
        ViolationAppeal::create([
            'violation_id' => $v3->id,
            'driver_id'    => $this->driver->id,
            'reason'       => 'Emergency medical transport',
            'status'       => 'approved',
            'submitted_at' => now()->subDays(6),
            'reviewed_at'  => now(),
            'reviewed_by'  => $this->tmoUser->id,
            'review_notes' => 'Exonerated under emergency exception',
        ]);

        // V4 is a fresh violation
        $v4 = $this->createViolation(2, 'open');

        // V1 is 1st offense
        $this->assertSame(1, ViolationEnforcementService::calculateOffenseNumber($v1));

        // V4 should be the 2nd offense (NOT 4th offense!), because V2 was dismissed and V3 appeal was approved
        $offenseNum4 = ViolationEnforcementService::calculateOffenseNumber($v4);
        $this->assertSame(2, $offenseNum4);
        $penalty4 = ViolationEnforcementService::getPenaltyDetails($offenseNum4);
        $this->assertSame('2nd Offense · ₱1,000', $penalty4['penalty_display']);
    }

    #[Test]
    public function pending_appeals_are_not_counted_as_confirmed_and_show_pending_confirmation(): void
    {
        $v1 = $this->createViolation(5, 'resolved');

        // V2 has an appeal currently under review
        $v2 = $this->createViolation(3, 'contested');
        ViolationAppeal::create([
            'violation_id' => $v2->id,
            'driver_id'    => $this->driver->id,
            'reason'       => 'Contesting GPS accuracy',
            'status'       => 'under_review',
            'submitted_at' => now()->subDays(3),
        ]);

        // V3 is another violation
        $v3 = $this->createViolation(1, 'open');

        // V2 itself should show enforcement status 'pending_confirmation'
        $state2 = ViolationEnforcementService::resolveEnforcementState($v2, 2);
        $this->assertSame('pending_confirmation', $state2['status']);
        $this->assertSame('Pending Confirmation', $state2['label']);

        // Since V2 is still pending, V3 does not count V2 as confirmed yet
        $this->assertSame(2, ViolationEnforcementService::calculateOffenseNumber($v3));
    }

    #[Test]
    public function enforcement_indicators_reflect_no_action_action_required_and_action_completed(): void
    {
        $v1 = $this->createViolation(10);
        $v2 = $this->createViolation(7);
        $v3 = $this->createViolation(4);

        // Offenses 1 and 2: No Action Required
        $state1 = ViolationEnforcementService::resolveEnforcementState($v1, 1);
        $this->assertSame('no_action_required', $state1['status']);
        $this->assertSame('No Action Required', $state1['label']);

        $state2 = ViolationEnforcementService::resolveEnforcementState($v2, 2);
        $this->assertSame('no_action_required', $state2['status']);

        // Offense 3 before confirmation: Action Required
        $state3 = ViolationEnforcementService::resolveEnforcementState($v3, 3);
        $this->assertSame('action_required', $state3['status']);
        $this->assertSame('Action Required', $state3['label']);

        // Confirm enforcement for V3
        ViolationEnforcement::create([
            'violation_id'        => $v3->id,
            'franchise_scheme_id' => $this->franchise->id,
            'offense_number'      => 3,
            'action_type'         => 'impoundment_and_suspension',
            'status'              => 'completed',
            'confirmed_by'        => $this->tmoUser->id,
            'confirmed_at'        => now(),
            'notes'               => 'Impounded at compound',
        ]);

        $v3->refresh();
        $state3After = ViolationEnforcementService::resolveEnforcementState($v3, 3);
        $this->assertSame('completed', $state3After['status']);
        $this->assertSame('Action Completed', $state3After['label']);
    }

    #[Test]
    public function tmo_can_confirm_third_offense_enforcement_suspending_franchise_and_forcing_drivers_offline(): void
    {
        $this->createViolation(10, 'resolved');
        $this->createViolation(7, 'resolved');
        $v3 = $this->createViolation(1, 'open');

        $this->assertTrue($this->franchise->isActive());
        $this->assertTrue($this->driver->is_online);

        $response = $this->actingAs($this->tmoUser)->post(
            route('tmo.violations.confirm-enforcement', $v3->id),
            ['notes' => 'Tricycle impounded at Nasugbu Municipal Compound. Suspension effective immediately.']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Check enforcement record created
        $this->assertDatabaseHas('violation_enforcements', [
            'violation_id'   => $v3->id,
            'offense_number' => 3,
            'action_type'    => 'impoundment_and_suspension',
            'status'         => 'completed',
            'confirmed_by'   => $this->tmoUser->id,
        ]);

        // Franchise must now be Suspended
        $this->franchise->refresh();
        $this->assertTrue($this->franchise->isSuspended());

        // Driver must be forced offline
        $this->driver->refresh();
        $this->assertFalse($this->driver->is_online);
        $this->assertFalse($this->driver->is_available);

        // Audit log must exist
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'violation_enforcement.confirmed',
        ]);
    }

    #[Test]
    public function tmo_can_confirm_fourth_offense_enforcement_revoking_franchise(): void
    {
        $this->createViolation(15, 'resolved');
        $this->createViolation(10, 'resolved');
        $this->createViolation(5, 'resolved');
        $v4 = $this->createViolation(1, 'open');

        $response = $this->actingAs($this->tmoUser)->post(
            route('tmo.violations.confirm-enforcement', $v4->id),
            ['notes' => 'Habitual offender: franchise cancelled and revoked.']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Check enforcement record created
        $this->assertDatabaseHas('violation_enforcements', [
            'violation_id'   => $v4->id,
            'offense_number' => 4,
            'action_type'    => 'revocation',
            'status'         => 'completed',
        ]);

        // Franchise must now be Revoked
        $this->franchise->refresh();
        $this->assertTrue($this->franchise->isRevoked());
    }

    #[Test]
    public function duplicate_enforcement_confirmation_is_prevented(): void
    {
        $this->createViolation(10, 'resolved');
        $this->createViolation(7, 'resolved');
        $v3 = $this->createViolation(1, 'open');

        // First confirmation succeeds
        $this->actingAs($this->tmoUser)->post(
            route('tmo.violations.confirm-enforcement', $v3->id),
            ['notes' => 'First confirmation']
        );

        // Second confirmation must be rejected
        $response2 = $this->actingAs($this->tmoUser)->post(
            route('tmo.violations.confirm-enforcement', $v3->id),
            ['notes' => 'Second attempt']
        );

        $response2->assertSessionHas('error');
        $this->assertSame(1, ViolationEnforcement::where('violation_id', $v3->id)->count());
    }

    #[Test]
    public function unauthorized_users_cannot_confirm_enforcement(): void
    {
        $this->createViolation(10, 'resolved');
        $this->createViolation(7, 'resolved');
        $v3 = $this->createViolation(1, 'open');

        $response = $this->actingAs($this->unauthorizedUser)->post(
            route('tmo.violations.confirm-enforcement', $v3->id),
            ['notes' => 'Unauthorized attempt']
        );

        $response->assertForbidden();
    }

    #[Test]
    public function violation_records_page_and_details_page_render_offense_and_enforcement_data(): void
    {
        $this->createViolation(10, 'resolved');
        $this->createViolation(5, 'resolved');
        $v3 = $this->createViolation(1, 'open');

        // 1. Violation Records index
        $responseIndex = $this->actingAs($this->tmoUser)->get(route('tmo.violations'));
        $responseIndex->assertOk();
        $responseIndex->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Violations/Violations')
            ->has('initialViolations', 3)
            ->where('initialViolations.0.offense_number', 3)
            ->where('initialViolations.0.penalty_display', '3rd Offense · ₱2,500')
            ->where('initialViolations.0.enforcement_status', 'action_required')
        );

        // 2. Violation Details view
        $responseDetails = $this->actingAs($this->tmoUser)->get(route('tmo.violations.details', $v3->id));
        $responseDetails->assertOk();
        $responseDetails->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Violations/ViolationDetails')
            ->where('initialRecord.offense_number', 3)
            ->where('initialRecord.penalty_display', '3rd Offense · ₱2,500')
            ->where('initialRecord.enforcement_status', 'action_required')
            ->where('initialRecord.can_confirm_enforcement', true)
        );
    }
}
