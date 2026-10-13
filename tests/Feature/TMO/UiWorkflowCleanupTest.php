<?php

namespace Tests\Feature\TMO;

use App\Models\Application;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
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
        $this->seedColorScheme();

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
    public function bplo_release_form_only_previews_numbers_and_never_reserves_them(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-BPLOSTK']);

        $application->update([
            'status'         => 'pending_bplo_release',
            'current_step'   => 3,
            'sticker_number' => null,
        ]);

        // Opening the page shows previews of both numbers...
        $response = $this->actingAs($this->bploUser)->get(route('bplo.issue', $application));
        $response->assertOk();

        $preview = null;
        $response->assertInertia(function ($page) use (&$preview) {
            $page->component('BPLODashboard/IssueStickerNumber')
                ->where('application.sticker_number', function ($value) use (&$preview) {
                    $preview = $value;

                    return str_starts_with((string) $value, 'MTOP-' . date('Y') . '-');
                })
                ->where('application.suggested_coding_number', fn ($value) => preg_match('/^\d{4}$/', (string) $value) === 1);
        });

        // ...but reserves nothing, so a visit by another staff member sees the same preview.
        $application->refresh();
        $this->assertNull($application->sticker_number);
        $this->assertNull($application->tricycle->coding_scheme_number);

        $this->actingAs($this->bploUser)->get(route('bplo.issue', $application))
            ->assertInertia(fn ($page) => $page->where('application.sticker_number', $preview));
    }

    #[Test]
    public function franchise_number_has_its_own_yearly_counter_independent_of_the_sticker_number(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-OWNSEQ']);
        $application->update(['status' => 'pending_bplo_release', 'current_step' => 3, 'sticker_number' => null]);

        // A high existing Sticker Number used to drag the Franchise Number up to sticker + 1.
        \App\Models\Tricycle::where('id', '!=', $application->tricycle_id)->first()
            ?->update(['coding_scheme_number' => '0842']);
        $application->tricycle->update(['coding_scheme_number' => null]);

        $prefix = 'MTOP-' . date('Y') . '-';
        $highestThisYear = \App\Models\Application::where('sticker_number', 'like', "{$prefix}%")
            ->pluck('sticker_number')
            ->merge(\App\Models\FranchiseScheme::where('franchise_number', 'like', "{$prefix}%")->pluck('franchise_number'))
            ->map(fn ($n) => (int) substr($n, strlen($prefix)))
            ->max() ?? 0;

        $response = $this->actingAs($this->bploUser)->get(route('bplo.issue', $application));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->where('application.sticker_number', sprintf('%s%04d', $prefix, $highestThisYear + 1))
            ->whereNot('application.suggested_coding_number', null)
        );
    }

    #[Test]
    public function an_application_cannot_be_released_twice_by_two_staff_members(): void
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => 'TST-TWICE']);
        $application->update(['status' => 'pending_bplo_release', 'current_step' => 3, 'sticker_number' => null]);
        $otherStaff = $this->makeBploUser();

        // Staff A releases.
        $this->actingAs($this->bploUser)->post(route('bplo.release.submit', $application))
            ->assertRedirect(route('bplo.releasing'))
            ->assertSessionHas('success');

        $application->refresh();
        $issuedSticker = $application->tricycle->coding_scheme_number;
        $issuedFranchise = $application->sticker_number;
        $historyCount = $application->statusHistories()->count();

        // Staff B submits the same (stale) page: refused, nothing changes.
        $this->actingAs($otherStaff)->post(route('bplo.release.submit', $application), [
            'sticker_number' => 'STK-HACKED-9999',
        ])->assertRedirect(route('bplo.releasing'))->assertSessionHas('error');

        $application->refresh();
        $this->assertSame($issuedSticker, $application->tricycle->coding_scheme_number);
        $this->assertSame($issuedFranchise, $application->sticker_number);
        $this->assertSame($historyCount, $application->statusHistories()->count());
        $this->assertSame(1, \App\Models\FranchiseScheme::where('application_id', $application->id)->count());

        // And Staff B can't even open the release form for it anymore.
        $this->actingAs($otherStaff)->get(route('bplo.issue', $application))
            ->assertRedirect(route('bplo.releasing'))->assertSessionHas('error');
    }

    #[Test]
    public function releases_of_different_applications_never_share_a_number(): void
    {
        [, , $first] = $this->registerNewApplication(['plate_number' => 'TST-PAIR-A']);
        [, , $second] = $this->registerNewApplication(['plate_number' => 'TST-PAIR-B']);
        foreach ([$first, $second] as $application) {
            $application->update(['status' => 'pending_bplo_release', 'current_step' => 3, 'sticker_number' => null]);
        }
        $otherStaff = $this->makeBploUser();

        // Both staff open their pages first — they see the SAME preview numbers...
        $previewA = $this->actingAs($this->bploUser)->get(route('bplo.issue', $first))->viewData('page')['props']['application'];
        $previewB = $this->actingAs($otherStaff)->get(route('bplo.issue', $second))->viewData('page')['props']['application'];
        $this->assertSame($previewA['sticker_number'], $previewB['sticker_number']);
        $this->assertSame($previewA['suggested_coding_number'], $previewB['suggested_coding_number']);

        // ...but each release gets its own numbers, and form input is ignored.
        $this->actingAs($this->bploUser)->post(route('bplo.release.submit', $first), ['sticker_number' => $previewA['sticker_number']]);
        $this->actingAs($otherStaff)->post(route('bplo.release.submit', $second), ['sticker_number' => $previewB['sticker_number']]);

        $first->refresh();
        $second->refresh();
        $this->assertSame('awaiting_tmo_confirmation', $first->status);
        $this->assertSame('awaiting_tmo_confirmation', $second->status);
        $this->assertNotSame($first->sticker_number, $second->sticker_number);
        $this->assertNotSame($first->tricycle->coding_scheme_number, $second->tricycle->coding_scheme_number);
    }

}
