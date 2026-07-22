<?php

namespace Tests\Feature;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DriverApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic TodaZone
        $toda = TodaZone::firstOrCreate(
            ['code' => 'TEST-TODA-01'],
            [
                'name'     => 'Test Toda Zone',
                'barangay' => 'Poblacion',
            ]
        );

        // Seed an eligible operator with an active tricycle
        $operator = Operator::firstOrCreate(
            ['license_number' => 'N01-TEST-123456'],
            [
                'toda_id'             => $toda->id,
                'first_name'          => 'Juan',
                'last_name'           => 'Dela Cruz',
                'contact_number'      => '09171234567',
                'address'             => 'Block 1 Lot 2',
                'barangay'            => 'Poblacion',
                'date_of_birth'       => '1990-01-01',
                'license_expiry_date' => '2028-01-01',
            ]
        );

        Tricycle::firstOrCreate(
            ['plate_number' => 'TST-1234'],
            [
                'operator_id'    => $operator->id,
                'toda_zone_id'   => $toda->id,
                'engine_number'  => 'ENG-TEST-12345',
                'chassis_number' => 'CHS-TEST-12345',
                'make'           => 'Kawasaki',
                'model'          => 'Barako 175',
                'year_model'     => 2020,
                'body_color'     => 'Red',
                'body_type'      => 'Standard',
                'or_number'      => 'OR-TEST-12345',
                'cr_number'      => 'CR-TEST-12345',
                'status'         => 'active',
            ]
        );
    }

    #[Test]
    public function unverified_license_number_is_rejected()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'license_number' => 'INVALID-LICENSE-999',
        ]);

        $response->assertStatus(404)
            ->assertJsonFragment([
                'success' => false,
            ]);
    }

    #[Test]
    public function valid_license_number_passes_eligibility_verification()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'license_number' => 'N01-TEST-123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'success'  => true,
                'eligible' => true,
            ]);
    }

    #[Test]
    public function driver_can_register_and_login_with_sanctum_token()
    {
        // 1. Verify Eligibility
        $verifyRes = $this->postJson('/api/v1/driver/verify-eligibility', [
            'license_number' => 'N01-TEST-123456',
        ]);
        $token = $verifyRes->json('verification_token');

        // 2. Register Account
        $regRes = $this->postJson('/api/v1/driver/register', [
            'license_number'        => 'N01-TEST-123456',
            'verification_token'    => $token,
            'email'                 => 'test.driver@trivora.ph',
            'password'              => 'DriverPass123!',
            'password_confirmation' => 'DriverPass123!',
        ]);

        $regRes->assertStatus(201)
            ->assertJsonStructure(['token', 'user', 'operator']);

        // 3. Login Account
        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => 'N01-TEST-123456',
            'password' => 'DriverPass123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user', 'tricycle']);

        $bearerToken = $loginRes->json('token');

        // 4. Test Authenticated Telematics Ping
        $pingRes = $this->withHeader('Authorization', "Bearer {$bearerToken}")
            ->postJson('/api/v1/driver/telematics', [
                'latitude'    => 14.0725,
                'longitude'   => 120.6355,
                'speed_kmh'   => 25.5,
                'heading_deg' => 180,
                'accuracy_m'  => 3.2,
            ]);

        $pingRes->assertStatus(201)
            ->assertJsonFragment(['success' => true]);
    }
}
