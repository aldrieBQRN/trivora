<?php

namespace Tests\Feature;

use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiAuthRateLimitTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    #[Test]
    public function driver_login_is_rate_limited_after_ten_attempts(): void
    {
        $driverUser = User::create([
            'name' => 'Rate Limit Test Driver',
            'email' => 'ratelimit.driver@trivora.test',
            'password' => Hash::make('CorrectPassword123!'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);

        // First 10 attempts from this IP should fail with 401 (invalid credentials), NOT 429
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/driver/login', [
                'login' => $driverUser->email,
                'password' => 'WrongPassword!',
            ]);
            $this->assertSame(401, $response->status(), "Attempt {$i} should be 401.");
        }

        // 11th attempt should be throttled (429 Too Many Requests)
        $throttled = $this->postJson('/api/v1/driver/login', [
            'login' => $driverUser->email,
            'password' => 'WrongPassword!',
        ]);
        $throttled->assertStatus(429);
    }

    #[Test]
    public function driver_login_cannot_bypass_rate_limit_by_changing_login_input(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/driver/login', [
                'login' => "attempt{$i}@trivora.test",
                'password' => 'WrongPassword!',
            ]);
            $this->assertSame(401, $response->status());
        }

        // 11th attempt with a completely new email should still be throttled
        $throttled = $this->postJson('/api/v1/driver/login', [
            'login' => 'another.victim@trivora.test',
            'password' => 'WrongPassword!',
        ]);
        $throttled->assertStatus(429);
    }

    #[Test]
    public function successful_driver_login_works_within_rate_limits(): void
    {
        $driverUser = User::create([
            'name' => 'Valid Login Driver',
            'email' => 'valid.driver@trivora.test',
            'password' => Hash::make('SecurePassword123!'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/driver/login', [
            'login' => $driverUser->email,
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['token', 'user', 'driver']);
    }

    #[Test]
    public function passenger_login_is_rate_limited_after_ten_attempts(): void
    {
        $passengerUser = User::create([
            'name' => 'Rate Limit Test Passenger',
            'email' => 'ratelimit.passenger@trivora.test',
            'password' => Hash::make('CorrectPassword123!'),
            'role' => 'passenger',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/passenger/login', [
                'login' => $passengerUser->email,
                'password' => 'WrongPassword!',
            ]);
            $this->assertSame(401, $response->status(), "Attempt {$i} should be 401.");
        }

        $throttled = $this->postJson('/api/v1/passenger/login', [
            'login' => $passengerUser->email,
            'password' => 'WrongPassword!',
        ]);
        $throttled->assertStatus(429);
    }

    #[Test]
    public function passenger_registration_is_rate_limited_after_twenty_attempts(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson('/api/v1/passenger/register', [
                'name' => 'Test User',
                'email' => "user{$i}@example.com",
            ]);
            $this->assertSame(422, $response->status(), "Validation attempt {$i} should not be 429.");
        }

        $throttled = $this->postJson('/api/v1/passenger/register', [
            'name' => 'Test User',
            'email' => 'user21@example.com',
        ]);
        $throttled->assertStatus(429);
    }

    #[Test]
    public function driver_registration_is_rate_limited_after_twenty_attempts(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson('/api/v1/driver/register', [
                'franchise_number' => 'NON-EXISTENT',
            ]);
            $this->assertNotSame(429, $response->status());
        }

        $throttled = $this->postJson('/api/v1/driver/register', [
            'franchise_number' => 'NON-EXISTENT',
        ]);
        $throttled->assertStatus(429);
    }
}
