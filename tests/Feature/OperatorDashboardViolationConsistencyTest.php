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
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the fixed inconsistency between Operator\DashboardController::index()'s "Active
 * Violations" preview (recentViolations, stats.pending_fine_amount) and the actual Active
 * Violations page (Operator\ViolationController::index()). Both must agree on which violations
 * currently count as "active" — before the fix, the dashboard only excluded status='dismissed'
 * (not 'resolved'), so a violation resolved via an APPROVED appeal — which never gets a
 * fine_paid_at, since no fine was ever owed — still showed on the dashboard as an active
 * violation while the real Active Violations page correctly excluded it.
 */
class OperatorDashboardViolationConsistencyTest extends TestCase
{
    use DatabaseTransactions;

    protected User $operatorUser;
    protected Operator $operator;
    protected Tricycle $tricycle;
    protected Violation $violation;

    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-DASHVIOL-TEST'],
            ['name' => 'Dashboard Violation Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );
        $colorScheme = ColorCodingScheme::create([
            'name' => 'Dashboard Violation Test Scheme', 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->operator = Operator::create([
            'toda_id' => $toda->id, 'first_name' => 'Dashboard', 'last_name' => 'Tester',
            'contact_number' => '09170000040', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-DASHVIOL-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $this->operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'DASH-0001', 'engine_number' => 'ENG-DASH-001', 'chassis_number' => 'CHS-DASH-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-DASH-001', 'cr_number' => 'CR-DASH-001', 'status' => 'active',
        ]);

        $issuer = User::create([
            'name' => 'BPLO Issuer Dash', 'email' => 'bplo.dash.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);
        $franchise = FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id, 'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $issuer->id, 'franchise_number' => 'FR-DASH-001',
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01', 'is_active' => true,
        ]);

        $this->operatorUser = User::create([
            'name' => 'Dashboard Tester', 'email' => 'dashboard.tester.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        // Operator::user() is the inverse of User::operator() (hasOne, keyed by operators.user_id)
        // — this is what makes $request->user()->operator resolve correctly in both controllers.
        $this->operator->update(['user_id' => $this->operatorUser->id]);

        Driver::create([
            'user_id' => $this->operatorUser->id, 'operator_id' => $this->operator->id, 'tricycle_id' => $this->tricycle->id,
            'license_number' => 'LIC-DASHVIOL-001', 'is_online' => true, 'is_available' => true,
        ]);

        $this->violation = Violation::create([
            'tricycle_id' => $this->tricycle->id, 'franchise_scheme_id' => $franchise->id, 'color_coding_scheme_id' => $colorScheme->id,
            'violation_type' => 'color_coding', 'detected_at' => now(), 'day_of_week' => now()->format('l'),
            'detection_method' => 'automated', 'status' => 'open', 'fine_amount' => 500.00,
        ]);
    }

    #[Test]
    public function a_genuinely_open_violation_appears_on_both_the_dashboard_and_the_active_violations_page(): void
    {
        $dashboard = $this->actingAs($this->operatorUser)->get(route('operator.dashboard'));
        $dashboard->assertInertia(fn ($page) => $page
            ->where('recentViolations.0.id', $this->violation->id)
            ->where('stats.pending_violations', 1)
        );

        $violationsPage = $this->actingAs($this->operatorUser)->get(route('operator.violations'));
        $violationsPage->assertInertia(fn ($page) => $page->has('violations', 1));
    }

    #[Test]
    public function a_violation_resolved_via_an_approved_appeal_disappears_from_both_the_dashboard_and_active_violations(): void
    {
        $appeal = ViolationAppeal::create([
            'violation_id' => $this->violation->id, 'driver_id' => Driver::where('user_id', $this->operatorUser->id)->value('id'),
            'reason' => 'Genuine emergency at the time.', 'status' => 'under_review', 'submitted_at' => now(),
        ]);
        $this->violation->update(['status' => 'contested']);

        $tmo = User::create([
            'name' => 'TMO Reviewer', 'email' => 'tmo.dash.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
        $this->actingAs($tmo)->post("/tmo/appeals/{$appeal->id}/approve")->assertRedirect();

        $this->violation->refresh();
        $this->assertSame('resolved', $this->violation->status);
        $this->assertNull($this->violation->fine_paid_at, 'An approved appeal never sets fine_paid_at — no fine was ever owed.');

        // Before the fix: this would still show up here (only 'dismissed' was excluded).
        $dashboard = $this->actingAs($this->operatorUser)->get(route('operator.dashboard'));
        $dashboard->assertInertia(fn ($page) => $page
            ->where('recentViolations', [])
            ->where('stats.pending_fine_amount', '0.00')
        );

        // Already correct before the fix — confirms the two now genuinely agree.
        $violationsPage = $this->actingAs($this->operatorUser)->get(route('operator.violations'));
        $violationsPage->assertInertia(fn ($page) => $page->has('violations', 0));
    }
}
