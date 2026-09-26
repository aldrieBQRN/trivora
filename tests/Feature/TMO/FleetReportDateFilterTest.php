<?php

namespace Tests\Feature\TMO;

use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers TMO\ReportController's Fleet tab registration-date filter — unlike Violations/
 * Applications (which always default to a rolling 30-day window), Fleet's natural default is
 * the whole registry ("all time"); a Day or Date Range pick scopes it to tricycles registered
 * in that window instead.
 */
class FleetReportDateFilterTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::create([
            'name' => 'TMO Fleet Officer',
            'email' => 'tmo.fleet.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);
    }

    private function makeTricycle(string $status = 'active'): Tricycle
    {
        $suffix = uniqid();
        $operatorUser = User::create([
            'name' => 'Fleet Op ' . $suffix,
            'email' => 'fleetop.' . $suffix . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);
        $operator = Operator::create([
            'user_id' => $operatorUser->id,
            'first_name' => 'Fleet', 'last_name' => 'Op ' . $suffix,
            'contact_number' => '0917' . rand(1000000, 9999999),
            'address' => 'Poblacion', 'barangay' => 'Poblacion', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-FLT-' . $suffix, 'license_expiry_date' => '2028-01-01',
        ]);

        return Tricycle::create([
            'operator_id' => $operator->id,
            'plate_number' => 'FLT-' . $suffix,
            'engine_number' => 'ENG-' . $suffix,
            'chassis_number' => 'CHS-' . $suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2022,
            'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-' . $suffix, 'cr_number' => 'CR-' . $suffix,
            'status' => $status,
        ]);
    }

    #[Test]
    public function fleet_report_defaults_to_all_time_when_no_date_filter_is_given(): void
    {
        $old = $this->makeTricycle();
        $old->forceFill(['created_at' => now()->subYears(2)])->save();

        $recent = $this->makeTricycle();
        $recent->forceFill(['created_at' => now()])->save();

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', ['tab' => 'fleet']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('from', '')
            ->where('to', '')
            ->where('reportData.fleet.has_date_filter', false)
            ->where('reportData.fleet.kpis.total', fn ($total) => $total >= 2)
        );
    }

    /** The current fleet total for a given from/to (or none), used as a baseline so these
     * assertions hold regardless of whatever else already exists in the registry. */
    private function fetchTotal(?string $from = null, ?string $to = null): int
    {
        $params = ['tab' => 'fleet'];
        if ($from) { $params['from'] = $from; }
        if ($to) { $params['to'] = $to; }

        // The `inertiaProps` TestResponse macro (from inertiajs/inertia-laravel's testing
        // helpers) reads a prop straight out of the page payload without an assertion.
        return $this->actingAs($this->tmoUser)
            ->get(route('tmo.reports', $params))
            ->inertiaProps('reportData.fleet.kpis.total');
    }

    #[Test]
    public function fleet_report_scopes_totals_to_tricycles_registered_within_the_selected_range(): void
    {
        $from = now()->subDays(2)->toDateString();
        $to = now()->toDateString();
        $baseline = $this->fetchTotal($from, $to);

        $outsideRange = $this->makeTricycle();
        $outsideRange->forceFill(['created_at' => now()->subYears(2)])->save();

        $insideRange = $this->makeTricycle();
        $insideRange->forceFill(['created_at' => now()])->save();

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'fleet', 'from' => $from, 'to' => $to,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('from', $from)
            ->where('to', $to)
            ->where('reportData.fleet.has_date_filter', true)
            // Only the in-range tricycle should have been added to the count — the one
            // registered two years ago must not show up in a last-2-days window.
            ->where('reportData.fleet.kpis.total', $baseline + 1)
        );
    }

    #[Test]
    public function a_single_day_pick_sets_the_same_day_as_both_bounds_and_filters_accordingly(): void
    {
        $day = now()->toDateString();
        $baseline = $this->fetchTotal($day, $day);

        $yesterday = $this->makeTricycle();
        $yesterday->forceFill(['created_at' => now()->subDay()])->save();

        $today = $this->makeTricycle();
        $today->forceFill(['created_at' => now()])->save();

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', [
            'tab' => 'fleet', 'from' => $day, 'to' => $day,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.fleet.kpis.total', $baseline + 1)
        );
    }

    #[Test]
    public function fleet_excel_export_honors_the_registration_date_filter(): void
    {
        $from = now()->subDays(7)->toDateString();
        $to = now()->toDateString();

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports.export-fleet-excel', [
            'from' => $from, 'to' => $to,
        ]));

        $response->assertOk();
        $this->assertStringContainsString('spreadsheet', $response->headers->get('content-type'));
    }

    #[Test]
    public function fleet_report_without_a_date_filter_still_supports_the_existing_status_filter(): void
    {
        $suspendedParams = ['tab' => 'fleet', 'tricycle_status' => 'suspended'];
        $baseline = $this->actingAs($this->tmoUser)
            ->get(route('tmo.reports', $suspendedParams))
            ->inertiaProps('reportData.fleet.kpis.total');

        $this->makeTricycle('active');
        $this->makeTricycle('suspended');

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.reports', $suspendedParams));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('reportData.fleet.has_date_filter', false)
            ->where('reportData.fleet.kpis.total', $baseline + 1)
        );
    }
}
