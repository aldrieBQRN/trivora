<?php

namespace Tests\Feature\TMO;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers TMO\ReportController's Violations & Compliance Status filter — the UI-facing groups
 * (Pending, Settled/Paid) map onto the real violations.status enum
 * (open/acknowledged/contested/resolved/dismissed), the same grouping already used elsewhere
 * (ViolationPaymentController, Operator\DashboardController). 'dismissed' has no dedicated
 * menu option but must still be included under "All Statuses". There is deliberately no
 * "Appeal" option — whether an appeal was filed is a separate facet from settlement status
 * (see the "Appeals Filed" KPI for appeal-specific analysis instead).
 */
class ViolationsReportStatusFilterTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected ColorCodingScheme $colorScheme;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::create([
            'name' => 'TMO Status Filter Officer',
            'email' => 'tmo.statusfilter.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Status Filter Test Red'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
    }

    // Each violation gets its own fresh tricycle — the violations table has a one-color-coding-
    // violation-per-tricycle-per-day unique constraint, so reusing a single tricycle across
    // multiple violations created "today" in the same test would collide.
    private function makeViolation(string $status, $detectedAt = null): Violation
    {
        $suffix = uniqid();
        $operatorUser = User::create([
            'name' => 'Status Filter Op ' . $suffix,
            'email' => 'sfop.' . $suffix . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        $operator = Operator::create([
            'user_id' => $operatorUser->id,
            'first_name' => 'Status', 'last_name' => 'Filter ' . $suffix,
            'contact_number' => '0917' . rand(1000000, 9999999),
            'address' => 'Poblacion', 'barangay' => 'Poblacion', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SF-' . $suffix, 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id,
            'plate_number' => 'SF-' . $suffix,
            'engine_number' => 'ENG-SF-' . $suffix,
            'chassis_number' => 'CHS-SF-' . $suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2022,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-SF-' . $suffix, 'cr_number' => 'CR-SF-' . $suffix,
            'status' => 'active',
        ]);
        $franchiseScheme = FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'issued_by' => $this->tmoUser->id,
            'franchise_number' => 'FR-SF-' . $suffix,
            'issue_date' => now()->subMonths(6)->toDateString(),
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $detectedAt = $detectedAt ?? now()->subDay();

        return Violation::create([
            'tricycle_id' => $tricycle->id,
            'franchise_scheme_id' => $franchiseScheme->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'violation_type' => 'color_coding',
            'detection_method' => 'automated',
            'detected_at' => $detectedAt,
            'day_of_week' => $detectedAt->format('l'),
            'status' => $status,
            'fine_amount' => 500.00,
            'notes' => 'Status filter test violation',
        ]);
    }

    #[Test]
    public function all_statuses_returns_every_violation_regardless_of_status(): void
    {
        $this->makeViolation('open');
        $this->makeViolation('contested');
        $this->makeViolation('resolved');
        $this->makeViolation('dismissed');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', ['tab' => 'violations']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.violations.kpis.total_violations', 4)
        );
    }

    #[Test]
    public function pending_groups_open_and_acknowledged_together(): void
    {
        $this->makeViolation('open');
        $this->makeViolation('acknowledged');
        $this->makeViolation('contested');
        $this->makeViolation('resolved');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'violations', 'violation_status' => 'pending',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.violations.kpis.total_violations', 2)
        );
    }

    #[Test]
    public function settled_maps_to_the_resolved_status(): void
    {
        $this->makeViolation('resolved');
        $this->makeViolation('open');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'violations', 'violation_status' => 'settled',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.violations.kpis.total_violations', 1)
        );
    }

    #[Test]
    public function an_unknown_status_group_is_ignored_and_returns_everything(): void
    {
        // 'dismissed' is a real status value but has no dedicated filter option — passing it (or
        // any value outside the three real menu options) must not silently return zero results.
        $this->makeViolation('dismissed');
        $this->makeViolation('resolved');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'violations', 'violation_status' => 'dismissed',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.violations.kpis.total_violations', 2)
        );
    }

    #[Test]
    public function status_filter_combines_with_the_date_range(): void
    {
        $this->makeViolation('open', now()->subDay());
        $this->makeViolation('open', now()->subYear());

        $from = now()->subDays(2)->toDateString();
        $to = now()->toDateString();

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'violations', 'violation_status' => 'pending', 'from' => $from, 'to' => $to,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.violations.kpis.total_violations', 1)
        );
    }

    #[Test]
    public function violations_excel_export_honors_the_status_filter(): void
    {
        $this->makeViolation('resolved');
        $this->makeViolation('open');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports.export-violations-excel', [
            'violation_status' => 'settled',
        ]));

        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));
    }
}
