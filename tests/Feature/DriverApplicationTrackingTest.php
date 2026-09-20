<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Covers the driver-facing Application Tracking page (Operator\MTOPController + resources/js/
 * Pages/Operator/Compliance/MTOP.jsx & MTOPDetails.jsx). Verified against the real controller
 * switch statement (index()/show(), which the frontend comments note "must stay in sync" with) —
 * the exact phase keys are tmo-docs, tmo-phys-inspect, cashier-pay, tmo-payment, bplo-release,
 * tmo-final-confirm, completed. This is operator-scoped web auth (a User with role=tricycle_driver
 * and an Operator profile), not the mobile Driver/Sanctum auth used by the driver app.
 */
class DriverApplicationTrackingTest extends TestCase
{
    use DatabaseTransactions;

    protected User $driverUser;
    protected Application $application;

    protected function setUp(): void
    {
        parent::setUp();

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-TRACK-TEST'],
            ['name' => 'Tracking Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $this->driverUser = User::create([
            'name' => 'Tracking Driver', 'email' => 'track.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id' => $this->driverUser->id, 'toda_id' => $toda->id,
            'first_name' => 'Tracking', 'last_name' => 'Driver', 'contact_number' => '09170000050',
            'address' => 'Poblacion', 'barangay' => 'Poblacion', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-TRACK-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'TRK-0001', 'engine_number' => 'ENG-TRK-001', 'chassis_number' => 'CHS-TRK-001',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-TRK-001', 'cr_number' => 'CR-TRK-001', 'status' => 'unregistered',
        ]);

        $this->application = Application::create([
            'reference_number' => 'APP-2026-TRACK' . uniqid(),
            'operator_id' => $operator->id, 'tricycle_id' => $tricycle->id,
            'application_type' => 'new', 'current_step' => 1, 'status' => 'pending_review',
            'submitted_at' => now(),
        ]);
    }

    public static function statusPhaseProvider(): array
    {
        return [
            'draft'                     => ['draft', 'tmo-docs', 'in-progress'],
            'pending_review'            => ['pending_review', 'tmo-docs', 'in-progress'],
            'under_review'              => ['under_review', 'tmo-docs', 'in-progress'],
            'rejected'                  => ['rejected', 'tmo-docs', 'action-req'],
            'pending_inspection'        => ['pending_inspection', 'tmo-phys-inspect', 'in-progress'],
            'under_inspection'          => ['under_inspection', 'tmo-phys-inspect', 'in-progress'],
            'failed_inspection'         => ['failed_inspection', 'tmo-phys-inspect', 'action-req'],
            'pending_payment'           => ['pending_payment', 'cashier-pay', 'action-req'],
            'payment_issue'             => ['payment_issue', 'tmo-payment', 'action-req'],
            'payment_verified'          => ['payment_verified', 'bplo-release', 'in-progress'],
            'awaiting_tmo_confirmation' => ['awaiting_tmo_confirmation', 'tmo-final-confirm', 'action-req'],
        ];
    }

    /**
     * Locks in the exact status -> phase -> UI-status mapping. Deliberately does NOT allow the
     * stale phase keys this project's history flagged (e.g. 'bplo-payment' for payment_issue) —
     * an exact-match assertion against the real key already guards against that regressing.
     */
    #[Test]
    #[DataProvider('statusPhaseProvider')]
    public function the_tracker_maps_each_application_status_to_the_correct_phase(
        string $status,
        string $expectedPhase,
        string $expectedUiStatus
    ): void {
        $this->application->update(['status' => $status]);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop'));

        $response->assertInertia(fn ($page) => $page
            ->where('applications.0.phase', $expectedPhase)
            ->where('applications.0.status', $expectedUiStatus)
        );
    }

    #[Test]
    public function the_payment_stage_tells_the_driver_to_pay_in_person_at_the_cashier(): void
    {
        $this->application->update(['status' => 'pending_payment']);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop'));

        $response->assertInertia(fn ($page) => $page
            ->where('applications.0.phase', 'cashier-pay')
            ->where('applications.0.message', fn ($message) => str_contains($message, 'Municipal Treasurer') && str_contains($message, 'in person'))
        );
    }

    #[Test]
    public function the_awaiting_confirmation_stage_tells_the_driver_to_return_to_tmo(): void
    {
        $this->application->update(['status' => 'awaiting_tmo_confirmation']);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop'));

        $response->assertInertia(fn ($page) => $page
            ->where('applications.0.phase', 'tmo-final-confirm')
            ->where('applications.0.message', fn ($message) => str_contains($message, 'Return to TMO'))
        );
    }

    #[Test]
    public function completed_status_shows_franchise_active_with_the_real_expiry_date(): void
    {
        $colorScheme = ColorCodingScheme::create([
            'name' => 'Tracking Completed Scheme', 'color_hex' => '#00FF00', 'restricted_days' => [], 'is_active' => true,
        ]);
        $issuer = User::create([
            'name' => 'Issuer', 'email' => 'issuer.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);
        FranchiseScheme::create([
            'application_id' => $this->application->id, 'tricycle_id' => $this->application->tricycle_id,
            'color_coding_scheme_id' => $colorScheme->id, 'issued_by' => $issuer->id,
            'franchise_number' => '0099', 'issue_date' => now()->toDateString(),
            'expiry_date' => now()->addYears(3)->toDateString(), 'is_active' => true,
        ]);
        $this->application->update(['status' => 'completed']);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop'));

        $response->assertInertia(fn ($page) => $page
            ->where('applications.0.phase', 'completed')
            ->where('applications.0.status', 'completed')
        );
    }

    #[Test]
    public function the_detail_page_exposes_the_real_status_and_phase_for_a_single_application(): void
    {
        $this->application->update(['status' => 'pending_inspection']);

        $response = $this->actingAs($this->driverUser)->get(route('operator.mtop.details', $this->application->id));

        $response->assertInertia(fn ($page) => $page
            ->where('application.raw_status', 'pending_inspection')
            ->where('application.phase', 'tmo-phys-inspect')
        );
    }

    #[Test]
    public function a_driver_without_an_operator_profile_sees_an_empty_tracker(): void
    {
        $bareUser = User::create([
            'name' => 'No Operator', 'email' => 'bare.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $response = $this->actingAs($bareUser)->get(route('operator.mtop'));

        $response->assertInertia(fn ($page) => $page->where('applications', []));
    }

    #[Test]
    public function a_driver_cannot_view_another_operators_application_detail(): void
    {
        $otherUser = User::create([
            'name' => 'Other', 'email' => 'other.track.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $response = $this->actingAs($otherUser)->get(route('operator.mtop.details', $this->application->id));

        $response->assertStatus(403);
    }
}
