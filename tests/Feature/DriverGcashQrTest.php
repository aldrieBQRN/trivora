<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DriverGcashQrTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function makeDriverUser(): array
    {
        $user = User::create([
            'name' => 'Driver ' . uniqid(),
            'email' => 'driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
            'is_active' => true,
        ]);

        $driver = Driver::create([
            'user_id' => $user->id,
            'license_number' => 'LIC-' . strtoupper(uniqid()),
            'mobile_number' => '+63 912 345 6789',
            'is_online' => true,
            'is_available' => true,
            'today_earnings' => 0.00,
            'total_trips' => 0,
        ]);

        return [$user, $driver];
    }

    #[Test]
    public function driver_can_view_gcash_status_when_not_configured()
    {
        [$user, $driver] = $this->makeDriverUser();
        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/v1/driver/gcash-qr');

        $response->assertStatus(200);
        $this->assertFalse($response->json('configured'));
        $this->assertFalse($response->json('has_gcash_qr'));
        $this->assertFalse($response->json('driver.has_gcash_qr'));
        $this->assertNull($response->json('gcash_qr_url'));
    }

    #[Test]
    public function driver_can_upload_gcash_qr_code()
    {
        [$user, $driver] = $this->makeDriverUser();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v1/driver/gcash-qr', [
            'qr_image' => UploadedFile::fake()->image('my-gcash-qr.png', 400, 400),
            'gcash_name' => 'Juan Dela Cruz',
            'gcash_number' => '09123456789',
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('configured'));
        $this->assertTrue($response->json('has_gcash_qr'));
        $this->assertTrue($response->json('driver.has_gcash_qr'));
        $this->assertNotNull($response->json('gcash_qr_url'));
        $this->assertSame('Juan Dela Cruz', $response->json('gcash_name'));

        $driver->refresh();
        $this->assertNotNull($driver->gcash_qr_path);
        $this->assertTrue($driver->hasGcashConfigured());
        Storage::disk('public')->assertExists($driver->gcash_qr_path);
    }

    #[Test]
    public function uploading_new_qr_replaces_and_deletes_old_file()
    {
        [$user, $driver] = $this->makeDriverUser();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/driver/gcash-qr', [
            'qr_image' => UploadedFile::fake()->image('old-qr.png'),
        ]);

        $driver->refresh();
        $firstPath = $driver->gcash_qr_path;
        Storage::disk('public')->assertExists($firstPath);

        $this->postJson('/api/v1/driver/gcash-qr', [
            'qr_image' => UploadedFile::fake()->image('new-qr.png'),
        ]);

        $driver->refresh();
        $secondPath = $driver->gcash_qr_path;
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    #[Test]
    public function driver_can_remove_gcash_qr_code()
    {
        [$user, $driver] = $this->makeDriverUser();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/driver/gcash-qr', [
            'qr_image' => UploadedFile::fake()->image('qr.png'),
        ]);

        $driver->refresh();
        $path = $driver->gcash_qr_path;
        Storage::disk('public')->assertExists($path);

        $deleteResponse = $this->deleteJson('/api/v1/driver/gcash-qr');
        $deleteResponse->assertStatus(200);
        $this->assertFalse($deleteResponse->json('configured'));
        $this->assertFalse($deleteResponse->json('has_gcash_qr'));
        $this->assertFalse($deleteResponse->json('driver.has_gcash_qr'));

        $driver->refresh();
        $this->assertNull($driver->gcash_qr_path);
        $this->assertFalse($driver->hasGcashConfigured());
        Storage::disk('public')->assertMissing($path);
    }

    #[Test]
    public function driver_b_cannot_tamper_with_driver_a_qr()
    {
        [$userA, $driverA] = $this->makeDriverUser();
        [$userB, $driverB] = $this->makeDriverUser();

        Sanctum::actingAs($userA, ['*']);
        $this->postJson('/api/v1/driver/gcash-qr', [
            'qr_image' => UploadedFile::fake()->image('qrA.png'),
        ]);
        $driverA->refresh();
        $pathA = $driverA->gcash_qr_path;

        // Driver B deletes their own QR
        Sanctum::actingAs($userB, ['*']);
        $this->deleteJson('/api/v1/driver/gcash-qr');

        // Driver A's QR must remain intact
        $driverA->refresh();
        $this->assertSame($pathA, $driverA->gcash_qr_path);
        Storage::disk('public')->assertExists($pathA);
    }
}
