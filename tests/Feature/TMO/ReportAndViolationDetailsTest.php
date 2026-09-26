<?php

namespace Tests\Feature\TMO;

use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReportAndViolationDetailsTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected Tricycle $tricycle;
    protected Violation $violation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::create([
            'name'      => 'TMO Officer',
            'email'     => 'tmo.officer.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);

        $operatorUser = User::create([
            'name'      => 'Operator Test',
            'email'     => 'op.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $operatorUser->id,
            'first_name'          => 'Operator',
            'last_name'           => 'Test',
            'contact_number'      => '09123456789',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'LIC-TST-' . rand(1000, 9999),
            'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id'     => $operator->id,
            'plate_number'    => 'TST-' . rand(1000, 9999),
            'engine_number'   => 'ENG-' . rand(1000, 9999),
            'chassis_number'  => 'CHS-' . rand(1000, 9999),
            'make'            => 'Kawasaki',
            'model'           => 'Barako',
            'year_model'      => 2022,
            'body_color'      => 'Red',
            'body_type'       => 'Standard',
            'or_number'       => 'OR-' . rand(1000, 9999),
            'cr_number'       => 'CR-' . rand(1000, 9999),
            'status'          => 'active',
        ]);

        $colorScheme = \App\Models\ColorCodingScheme::firstOrCreate(
            ['name' => 'Report Test Red'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );

        $franchise = \App\Models\FranchiseScheme::create([
            'tricycle_id'            => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by'              => $this->tmoUser->id,
            'franchise_number'       => 'FR-TST-' . rand(1000, 9999),
            'issue_date'             => now()->subMonths(6)->toDateString(),
            'expiry_date'            => now()->addMonths(6)->toDateString(),
            'status'                 => 'active',
        ]);

        $this->violation = Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $franchise->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'violation_type'         => 'color_coding',
            'detection_method'       => 'automated',
            'latitude'               => 14.0725,
            'longitude'              => 120.6321,
            'location'               => 'Nasugbu Highway, Zone 1',
            'detected_at'            => now()->subDays(2),
            'day_of_week'            => now()->subDays(2)->format('l'),
            'status'                 => 'open',
            'fine_amount'            => 500.00,
            'notes'                  => 'Automated test violation',
        ]);
    }

    #[Test]
    public function tmo_reports_page_is_tabbed_and_only_computes_the_active_tab(): void
    {
        // Default tab — only the violations report is computed and delivered.
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Reports/Index')
            ->where('tab', 'violations')
            ->has('reportData.violations.kpis.total_violations')
            ->missing('reportData.applications')
            ->missing('reportData.fleet')
        );

        // Each requested tab computes exactly its own payload (and nothing else).
        $perTab = [
            'applications' => ['reportData.applications.kpis.submitted', ['reportData.violations', 'reportData.fleet']],
            'fleet'        => ['reportData.fleet.kpis.total', ['reportData.violations', 'reportData.applications']],
        ];
        foreach ($perTab as $tab => [$payloadPath, $absentPaths]) {
            $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', ['tab' => $tab]));
            $response->assertOk();
            $response->assertInertia(function ($page) use ($tab, $payloadPath, $absentPaths) {
                $page->component('TMODashboard/Reports/Index')
                    ->where('tab', $tab)
                    ->has($payloadPath);
                foreach ($absentPaths as $absent) {
                    $page->missing($absent);
                }
            });
        }

        // Unknown/legacy tab values fall back to the default tab instead of erroring.
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', ['tab' => 'collections']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Reports/Index')
            ->where('tab', 'violations')
            ->has('reportData.violations.kpis.total_violations')
        );
    }

    #[Test]
    public function excel_export_routes_work_for_active_tabs_and_collections_export_is_gone(): void
    {
        // Violations Excel Export
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports.export-violations-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // Applications Excel Export
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports.export-applications-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // Fleet Excel Export
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports.export-fleet-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // Active Tricycle Registry export (TMO list page — shared ExportsMunicipalExcelReports)
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.registry.export-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // Violation Records export (TMO list page — shared ExportsMunicipalExcelReports)
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.violations.export-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // BPLO Active Registry export (replaces the old client-side CSV button)
        $bploUser = User::create([
            'name'      => 'BPLO Export Officer',
            'email'     => 'bplo.export.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'bplo_staff',
            'is_active' => true,
        ]);
        $response = $this->actingAs($bploUser)->get(route('bplo.registry.export-excel'));
        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));

        // Collections Excel Export route no longer exists (404)
        $response = $this->actingAs($this->tmoUser)->get('/tmo/reports/export/collections-excel');
        $response->assertNotFound();
    }

    #[Test]
    public function violation_details_can_be_viewed_and_payment_confirmed(): void
    {
        // View violation details page
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.violations.details', $this->violation->id));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Violations/ViolationDetails')
            ->has('initialRecord')
        );

        // Confirm payment (plain confirmation — no receipt/OR detail payload)
        $this->withoutExceptionHandling();
        $payResponse = $this->actingAs($this->tmoUser)->post("/tmo/violations/{$this->violation->id}/confirm-payment");

        $payResponse->assertSessionHasNoErrors();
        $this->violation->refresh();
        $this->assertNotNull($this->violation->fine_paid_at);
        $this->assertSame('resolved', $this->violation->status);
    }

    #[Test]
    public function violation_appeal_workflow_still_functions(): void
    {
        $driver = \App\Models\Driver::create([
            'user_id'        => $this->tricycle->operator->user_id,
            'operator_id'    => $this->tricycle->operator->id,
            'tricycle_id'    => $this->tricycle->id,
            'license_number' => 'LIC-TST-9999',
            'is_online'      => true,
            'is_available'   => true,
        ]);

        $appeal = ViolationAppeal::create([
            'violation_id' => $this->violation->id,
            'driver_id'    => $driver->id,
            'reason'       => 'Vehicle was at repair shop.',
            'status'       => 'under_review',
            'submitted_at' => now(),
        ]);

        // Approve appeal
        $response = $this->actingAs($this->tmoUser)->post("/tmo/appeals/{$appeal->id}/approve");
        $response->assertRedirect();
        $appeal->refresh();
        $this->assertSame('approved', $appeal->status);
        $this->assertSame($this->tmoUser->id, $appeal->reviewed_by);
    }
}
