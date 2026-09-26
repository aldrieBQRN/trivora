<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the Driver → Franchise & Compliance → My Tricycles derivation (routes/web.php
 * /operator/fleet) and the Application Tracker's status-history-derived dates
 * (Operator\MTOPController::index()/show()). The single source of truth is the driver's
 * real application/franchise relationship:
 *
 *   Driver → Application → Approved/Active Franchise → Registered Tricycle
 *
 * so pending, rejected, and reinspection units never appear as registered tricycles, an
 * expired franchise clearly reads as Expired, a unit with no application relationship is
 * not shown at all, and the tracker's step dates come from application_status_histories —
 * never from hardcoded values. Same operator-scoped web auth as DriverApplicationTrackingTest.
 */
class MyTricyclesApplicationStateTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Operator $operator;

    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-FLEET-TEST'],
            ['name' => 'Fleet State Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $this->driverUser = User::create([
            'name' => 'Fleet State Driver', 'email' => 'fleet.state.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->driverUser->id, 'toda_id' => $toda->id,
            'first_name' => 'Fleet', 'last_name' => 'State', 'contact_number' => '09170000061',
            'address' => 'Poblacion', 'barangay' => 'Poblacion', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-FLEET-001', 'license_expiry_date' => '2028-01-01',
        ]);
    }

    private function makeTricycle(string $plate, string $status = 'unregistered'): Tricycle
    {
        return Tricycle::create([
            'operator_id' => $this->operator->id,
            'toda_zone_id' => $this->operator->toda_id,
            'plate_number' => $plate, 'engine_number' => 'ENG-' . $plate, 'chassis_number' => 'CHS-' . $plate,
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2022, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-' . $plate, 'cr_number' => 'CR-' . $plate, 'status' => $status,
        ]);
    }

    private function makeApplication(Tricycle $tricycle, string $status, int $step): Application
    {
        return Application::create([
            'reference_number' => 'APP-FLEET-' . strtoupper(substr(md5(uniqid()), 0, 8)),
            'operator_id' => $this->operator->id, 'tricycle_id' => $tricycle->id,
            'application_type' => 'new', 'current_step' => $step, 'status' => $status,
            'submitted_at' => now(),
        ]);
    }

    private function makeIssuedScheme(Application $app, string $expiryDate): FranchiseScheme
    {
        $colorScheme = ColorCodingScheme::create([
            'name' => 'Fleet Test Scheme ' . uniqid(), 'color_hex' => '#112233', 'restricted_days' => [], 'is_active' => true,
        ]);
        $issuer = User::create([
            'name' => 'Fleet Issuer', 'email' => 'fleet.issuer.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        return FranchiseScheme::create([
            'application_id' => $app->id, 'tricycle_id' => $app->tricycle_id,
            'color_coding_scheme_id' => $colorScheme->id, 'issued_by' => $issuer->id,
            'franchise_number' => '90' . rand(10, 99), 'issue_date' => now()->subYear()->toDateString(),
            'expiry_date' => $expiryDate, 'is_active' => true,
        ]);
    }

    #[Test]
    public function only_units_with_an_approved_application_of_this_driver_count_as_registered(): void
    {
        // Approved → registered tricycle.
        $approved = $this->makeTricycle('FLEET-0001', 'active');
        $this->makeApplication($approved, 'completed', 5);

        // Still mid-application — even with a raw tricycle.status of 'active', the pending
        // application must win: not registered, badge keyed to the real workflow stage.
        $pending = $this->makeTricycle('FLEET-0002', 'active');
        $this->makeApplication($pending, 'pending_inspection', 2);

        // Owned unit with NO application at all → outside the application/franchise chain,
        // so it must not appear in My Tricycles at all.
        $this->makeTricycle('FLEET-0003', 'active');

        // Approved but suspended → still registered, suspension preserved on the badge.
        $suspended = $this->makeTricycle('FLEET-0004', 'active');
        $this->makeApplication($suspended, 'scheme_issued', 5);
        $suspended->update(['status' => 'suspended']);

        $response = $this->actingAs($this->driverUser)->get(route('operator.fleet'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Operator/Fleet')
            // FLEET-0003 (no application) is excluded; order is tricycle id.
            ->where('tricycles', fn ($units) => collect($units)->pluck('plateNo')->all() === ['FLEET-0001', 'FLEET-0002', 'FLEET-0004'])
            ->where('tricycles.0.isRegistered', true)
            ->where('tricycles.0.isFinalized', true)
            ->where('tricycles.0.vehicleStatus', 'active')
            ->where('tricycles.0.applicationReference', $approved->applications()->first()->reference_number)
            ->where('tricycles.1.isRegistered', false)
            ->where('tricycles.1.isFinalized', false)
            ->where('tricycles.1.vehicleStatus', 'pending')
            ->where('tricycles.1.pendingStage', 'inspection')
            ->where('tricycles.1.lastSignal', null)
            ->where('tricycles.1.colorCode', null)
            ->where('tricycles.2.isRegistered', true)
            ->where('tricycles.2.vehicleStatus', 'suspended')
        );
    }

    #[Test]
    public function an_expired_franchise_reads_as_expired_and_never_active(): void
    {
        $unit = $this->makeTricycle('FLEET-0101', 'active');
        $app = $this->makeApplication($unit, 'completed', 5);
        $scheme = $this->makeIssuedScheme($app, now()->subDays(10)->toDateString());

        $response = $this->actingAs($this->driverUser)->get(route('operator.fleet'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Operator/Fleet')
            ->has('tricycles', 1)
            ->where('tricycles.0.isRegistered', true)
            ->where('tricycles.0.vehicleStatus', 'expired')
            ->where('tricycles.0.franchiseExpired', true)
            ->where('tricycles.0.franchiseExpiry', $scheme->expiry_date->toDateString())
        );
    }

    #[Test]
    public function the_tracker_step_dates_and_last_updated_come_from_the_status_history(): void
    {
        $unit = $this->makeTricycle('FLEET-0201', 'active');
        $app = $this->makeApplication($unit, 'pending_bplo_release', 3);

        ApplicationStatusHistory::create([
            'application_id' => $app->id, 'changed_by' => $this->driverUser->id,
            'from_status' => null, 'to_status' => 'pending_review',
            'from_step' => null, 'to_step' => 1,
            'notes' => 'Application submitted by operator.',
            'created_at' => now()->subDays(5),
        ]);
        ApplicationStatusHistory::create([
            'application_id' => $app->id, 'changed_by' => $this->driverUser->id,
            'from_status' => 'pending_review', 'to_status' => 'pending_inspection',
            'from_step' => 1, 'to_step' => 2,
            'notes' => 'Requirements verified and approved.',
            'created_at' => now()->subDays(4),
        ]);
        ApplicationStatusHistory::create([
            'application_id' => $app->id, 'changed_by' => $this->driverUser->id,
            'from_status' => 'pending_inspection', 'to_status' => 'pending_bplo_release',
            'from_step' => 2, 'to_step' => 3,
            'notes' => 'Physical inspection passed.',
            'created_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Operator/Compliance/MTOP')
            ->where('applications.0.step_dates', [
                'tmo-docs' => now()->subDays(4)->format('M d, Y'),
                'tmo-phys-inspect' => now()->subDay()->format('M d, Y'),
                'bplo-release' => null,
                'tmo-final-confirm' => null,
            ])
            ->where('applications.0.last_updated', now()->subDay()->format('M d, Y'))
        );

        $detail = $this->actingAs($this->driverUser)->get(route('operator.mtop.details', $app->id));

        $detail->assertOk()->assertInertia(fn ($page) => $page
            ->component('Operator/Compliance/MTOPDetails')
            ->where('application.step_dates.tmo-docs', now()->subDays(4)->format('M d, Y'))
            ->where('application.step_dates.bplo-release', null)
            // The detail hero writes dates in full ("Submitted on September 12, 2026"),
            // so last_updated matches that page's existing 'F d, Y' style there.
            ->where('application.last_updated', now()->subDay()->format('F d, Y'))
        );
    }
}
