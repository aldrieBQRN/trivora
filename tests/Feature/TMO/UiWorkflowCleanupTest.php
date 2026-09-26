<?php

namespace Tests\Feature\TMO;

use App\Models\Application;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

class UiWorkflowCleanupTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected User $tmoUser;
    protected User $bploUser;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();

        $this->tmoUser = $this->makeTmoUser();
        $this->bploUser = $this->makeBploUser();
    }

    #[Test]
    public function tricycle_registry_details_loads_successfully_for_tmo(): void
    {
        $operatorUser = User::create([
            'name'      => 'Operator Test',
            'email'     => 'op.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $operatorUser->id,
            'first_name'          => 'Registry',
            'last_name'           => 'Test',
            'contact_number'      => '09123456789',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'LIC-' . rand(1000, 9999),
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id'     => $operator->id,
            'plate_number'    => 'REG-' . rand(1000, 9999),
            'engine_number'   => 'ENG-' . rand(1000, 9999),
            'chassis_number'  => 'CHS-' . rand(1000, 9999),
            'make'            => 'Honda',
            'model'           => 'TMX155',
            'year_model'      => 2022,
            'body_color'      => 'Blue',
            'body_type'       => 'Standard',
            'or_number'       => 'OR-' . rand(1000, 9999),
            'cr_number'       => 'CR-' . rand(1000, 9999),
            'status'          => 'active',
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tricycle.details', $tricycle->id));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/TricycleDetails')
            ->where('initialTricycle.plate_no', $tricycle->plate_number)
        );
    }

    #[Test]
    public function violation_details_exposes_coordinates_and_payment_can_be_confirmed(): void
    {
        $operatorUser = User::create([
            'name'      => 'Operator Test',
            'email'     => 'op.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $operatorUser->id,
            'first_name'          => 'Violation',
            'last_name'           => 'Test',
            'contact_number'      => '09123456789',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'LIC-' . rand(1000, 9999),
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id'     => $operator->id,
            'plate_number'    => 'VIO-' . rand(1000, 9999),
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

        $colorScheme = ColorCodingScheme::first();

        $franchise = FranchiseScheme::create([
            'tricycle_id'            => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by'              => $this->tmoUser->id,
            'franchise_number'       => 'FR-' . rand(1000, 9999),
            'issue_date'             => now()->subMonths(6)->toDateString(),
            'expiry_date'            => now()->addMonths(6)->toDateString(),
            'is_active'              => true,
        ]);

        $location = \App\Models\TricycleLocation::create([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0725,
            'longitude'   => 120.6321,
            'speed_kmh'   => 25.5,
            'recorded_at' => now()->subDays(2),
        ]);

        $violation = Violation::create([
            'tricycle_id'            => $tricycle->id,
            'franchise_scheme_id'    => $franchise->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'location_snapshot_id'   => $location->id,
            'violation_type'         => 'color_coding',
            'detection_method'       => 'automated',
            'detected_at'            => now()->subDays(2),
            'day_of_week'            => now()->subDays(2)->format('l'),
            'status'                 => 'open',
            'fine_amount'            => 500.00,
            'notes'                  => 'Automated test violation',
        ]);

        // 1. Violation details loads coordinates
        $response = $this->actingAs($this->tmoUser)->get(route('tmo.violations.details', $violation->id));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/Violations/ViolationDetails')
            ->where('initialRecord.lat', 14.0725)
            ->where('initialRecord.lng', 120.6321)
        );

        // 2. Confirm Payment action updates violation to settled / resolved (plain
        //    confirmation — no receipt/OR details are captured by this flow)
        $payResponse = $this->actingAs($this->tmoUser)->post("/tmo/violations/{$violation->id}/confirm-payment");

        $payResponse->assertRedirect();
        $violation->refresh();
        $this->assertSame('resolved', $violation->status);
        $this->assertTrue($violation->is_fine_paid);
        $this->assertNotNull($violation->fine_paid_at);
    }

    #[Test]
    public function physical_inspection_approves_and_redirects_to_physical_queue_not_ticket(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-INSP1']);

        // Step 1: Document review
        $this->actingAs($this->tmoUser)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ]);
        $application->refresh();
        $this->assertSame('pending_inspection', $application->status);

        // Step 2: Physical Inspection approval redirects to tmo.physical
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'approve',
        ]);

        $response->assertRedirect(route('tmo.physical'));
        $response->assertSessionHas('success');

        $application->refresh();
        $this->assertSame('pending_bplo_release', $application->status);
        $this->assertSame(3, $application->current_step);
    }

    #[Test]
    public function obsolete_physical_inspection_ticket_routes_return_404(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-NOSTUB']);

        $responseTmo = $this->actingAs($this->tmoUser)->get("/tmo/ticket/{$application->id}");
        $responseTmo->assertNotFound();

        $responseBplo = $this->actingAs($this->bploUser)->get("/bplo/ticket/{$application->id}");
        $responseBplo->assertNotFound();

        $responseOperator = $this->actingAs($this->tmoUser)->get("/operator/mtop/{$application->id}/ticket");
        $responseOperator->assertNotFound();
    }

    #[Test]
    public function final_confirmation_show_does_not_generate_fake_suggested_iot_id(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-FINCONF']);

        // Advance application to awaiting_tmo_confirmation
        $application->update([
            'status'       => 'awaiting_tmo_confirmation',
            'current_step' => 4,
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.final-confirmation.show', $application));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/FinalConfirmationDetail')
            ->missing('application.suggested_iot_id')
        );
    }

    #[Test]
    public function bplo_release_form_auto_generates_and_persists_unique_sticker_number(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-BPLOSTK']);

        $application->update([
            'status'         => 'pending_bplo_release',
            'current_step'   => 3,
            'sticker_number' => null,
        ]);

        $this->assertNull($application->sticker_number);

        // 1. First visit generates and persists sticker_number
        $response = $this->actingAs($this->bploUser)->get(route('bplo.issue', $application));
        $response->assertOk();

        $application->refresh();
        $persistedSticker = $application->sticker_number;
        $this->assertNotEmpty($persistedSticker);
        $this->assertStringStartsWith('STK-', $persistedSticker);

        $response->assertInertia(fn ($page) => $page
            ->component('BPLODashboard/IssueStickerNumber')
            ->where('application.sticker_number', $persistedSticker)
        );

        // 2. Second visit does NOT regenerate sticker_number
        $response2 = $this->actingAs($this->bploUser)->get(route('bplo.issue', $application));
        $response2->assertOk();

        $application->refresh();
        $this->assertSame($persistedSticker, $application->sticker_number);
    }
}
