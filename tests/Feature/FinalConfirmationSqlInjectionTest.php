<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FinalConfirmationSqlInjectionTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function final_confirmation_safely_handles_officer_names_with_apostrophes(): void
    {
        // Create an officer with an apostrophe in their name, like "Officer D'Angelo"
        $officer = User::create([
            'name'      => "Officer D'Angelo",
            'email'     => 'dangelo.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);

        $operatorUser = User::create([
            'name'      => 'Operator Test',
            'email'     => 'operator.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $operator = Operator::create([
            'user_id'             => $operatorUser->id,
            'first_name'          => 'Mario',
            'last_name'           => 'Santos',
            'contact_number'      => '09171234567',
            'address'             => 'Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1990-01-01',
            'license_number'      => 'N01-TEST-' . uniqid(),
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id'          => $operator->id,
            'plate_number'         => 'DAN-1234',
            'engine_number'        => 'ENG-DAN-1234',
            'chassis_number'       => 'CHS-DAN-1234',
            'make'                 => 'Honda',
            'model'                => 'TMX',
            'year_model'           => 2022,
            'body_color'           => 'Red',
            'body_type'            => 'Standard',
            'status'               => 'unregistered',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $colorScheme = ColorCodingScheme::create([
            'name'            => 'Test Red Scheme',
            'color_hex'       => '#FF0000',
            'restricted_days' => ['Monday'],
            'is_active'       => true,
        ]);

        $application = Application::create([
            'reference_number' => 'APP-DAN-' . rand(10000, 99999),
            'operator_id'      => $operator->id,
            'tricycle_id'      => $tricycle->id,
            'application_type' => 'new',
            'current_step'     => 4,
            'status'           => 'awaiting_tmo_confirmation',
            'submitted_at'     => now(),
        ]);

        $scheme = FranchiseScheme::create([
            'application_id'         => $application->id,
            'tricycle_id'            => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by'              => $officer->id,
            'franchise_number'       => 'FR-DAN-' . rand(1000, 9999),
            'issue_date'             => '2024-01-01',
            'expiry_date'            => '2029-01-01',
            'is_active'              => false,
            'notes'                  => 'Initial draft notes.',
        ]);

        // Post final confirmation as Officer D'Angelo
        $response = $this->actingAs($officer)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified'       => '1',
            'bplo_approval_confirmed'      => '1',
            'sticker_possession_confirmed' => '1',
            'tracking_method'              => 'mobile_gps',
            'officer_notes'                => 'Approved without issues.',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('tmo.final-confirmation'));

        $scheme->refresh();
        $this->assertTrue($scheme->is_active);
        $this->assertStringContainsString("Activated by TMO Officer Officer D'Angelo", $scheme->notes);
        $this->assertStringContainsString('Initial draft notes.', $scheme->notes);

        $application->refresh();
        $this->assertSame('completed', $application->status);
    }
}
