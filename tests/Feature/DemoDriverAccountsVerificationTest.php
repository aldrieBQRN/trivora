<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Database\Seeders\ColorCodingSchemesSeeder;
use Database\Seeders\DemoStageDriversSeeder;
use Database\Seeders\TestAccountsSeeder;
use Database\Seeders\TodaZonesSeeder;
use Database\Seeders\UsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DemoDriverAccountsVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ColorCodingSchemesSeeder::class);
        $this->seed(TodaZonesSeeder::class);
        $this->seed(UsersSeeder::class);
        $this->seed(TestAccountsSeeder::class);
        $this->seed(DemoStageDriversSeeder::class);
    }

    #[Test]
    public function primary_driver_app_login_has_exactly_one_active_franchise_and_one_active_tricycle(): void
    {
        $loginResponse = $this->postJson('/api/v1/driver/login', [
            'login'    => '09170001111',
            'password' => 'TestDriver123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.name', 'Test Driver')
            ->assertJsonPath('tricycle.plate_number', 'TEST-0001')
            ->assertJsonPath('tricycle.status', 'active')
            ->assertJsonPath('tricycle.franchise_number', '9999')
            ->assertJsonPath('franchise.status', 'active');

        $driver = Driver::where('mobile_number', '09170001111')->firstOrFail();

        // Exactly 1 assigned tricycle
        $this->assertNotNull($driver->tricycle);
        $this->assertSame('TEST-0001', $driver->tricycle->plate_number);
        $this->assertSame('active', $driver->tricycle->status);

        // Exactly 1 active franchise
        $activeSchemes = FranchiseScheme::where('tricycle_id', $driver->tricycle_id)
            ->where('is_active', true)
            ->get();

        $this->assertCount(1, $activeSchemes);
        $this->assertSame('active', $activeSchemes->first()->status);
        $this->assertFalse($activeSchemes->first()->is_expired);
        $this->assertTrue($driver->canOperate());
    }

    #[Test]
    public function all_8_workflow_scenarios_exist_and_match_their_expected_states(): void
    {
        // 1. Expired Franchise
        $expiredApp = Application::where('reference_number', 'APP-2026-00047')->firstOrFail();
        $this->assertSame('completed', $expiredApp->status);
        $this->assertSame(5, $expiredApp->current_step);
        $expiredScheme = FranchiseScheme::where('tricycle_id', $expiredApp->tricycle_id)->firstOrFail();
        $this->assertTrue($expiredScheme->is_expired, 'Scenario 1 franchise permit must be expired.');

        // 2. Under Document Review
        $reviewApp = Application::where('reference_number', 'APP-2026-00043')->firstOrFail();
        $this->assertSame('pending_review', $reviewApp->status);
        $this->assertSame(1, $reviewApp->current_step);
        $this->assertTrue($reviewApp->documents()->where('review_status', 'pending')->exists());

        // 3. Resubmission Required
        $resubmitApp = Application::where('reference_number', 'APP-2026-00051')->firstOrFail();
        $this->assertSame('rejected', $resubmitApp->status);
        $this->assertSame(1, $resubmitApp->current_step);
        $this->assertTrue($resubmitApp->documents()->where('review_status', 'rejected')->exists());

        // 4. Under Physical Inspection
        $inspectApp = Application::where('reference_number', 'APP-2026-00044')->firstOrFail();
        $this->assertSame('pending_inspection', $inspectApp->status);
        $this->assertSame(2, $inspectApp->current_step);

        // 5. Reinspection Required
        $reinspectApp = Application::where('reference_number', 'APP-2026-00052')->firstOrFail();
        $this->assertSame('failed_inspection', $reinspectApp->status);
        $this->assertSame(2, $reinspectApp->current_step);
        $failedInspection = Inspection::where('application_id', $reinspectApp->id)->firstOrFail();
        $this->assertSame('failed', $failedInspection->result);

        // 6. Under Releasing
        $bploApp = Application::where('reference_number', 'APP-2026-00045')->firstOrFail();
        $this->assertSame('pending_bplo_release', $bploApp->status);
        $this->assertSame(3, $bploApp->current_step);

        // 7. Under Final Confirmation
        $confirmApp = Application::where('reference_number', 'APP-2026-00046')->firstOrFail();
        $this->assertSame('awaiting_tmo_confirmation', $confirmApp->status);
        $this->assertSame(4, $confirmApp->current_step);

        // 8. Renewed Expired Franchise
        $origRenewedApp = Application::where('reference_number', 'APP-2023-00010')->firstOrFail();
        $this->assertSame('completed', $origRenewedApp->status);

        $renewalApp = Application::where('reference_number', 'APP-2026-00054')->firstOrFail();
        $this->assertSame('renewal', $renewalApp->application_type);
        $this->assertSame('pending_bplo_release', $renewalApp->status);
        $this->assertSame(3, $renewalApp->current_step);
        $this->assertSame($origRenewedApp->tricycle_id, $renewalApp->tricycle_id);

        $expiredRenewedScheme = FranchiseScheme::where('tricycle_id', $renewalApp->tricycle_id)->firstOrFail();
        $this->assertTrue($expiredRenewedScheme->is_expired, 'Previous franchise scheme must be expired.');

        // Renewal application has Prangkisa requirement
        $this->assertTrue(
            ApplicationDocument::where('application_id', $renewalApp->id)->where('document_type', 'prangkisa')->exists(),
            'Renewal application must carry Prangkisa requirement.'
        );
    }
}
