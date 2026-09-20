<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * ProfilePhotoController is shared by both the Passenger and Driver mobile apps' routes — it
 * only ever acts on $request->user()->profile_photo_path, regardless of role, so these tests use
 * plain User fixtures rather than the full Passenger/Driver/Operator/Tricycle graph.
 */
class ProfilePhotoTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function makeUser(string $role = 'passenger'): User
    {
        return User::create([
            'name' => 'Photo Tester',
            'email' => 'photo.tester.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => $role,
            'is_active' => true,
        ]);
    }

    #[Test]
    public function authenticated_user_can_upload_a_profile_photo()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('profile_photo_url'));

        $user->refresh();
        $this->assertNotNull($user->profile_photo_path);
        Storage::disk('public')->assertExists($user->profile_photo_path);
    }

    #[Test]
    public function uploading_a_new_photo_replaces_and_deletes_the_old_one()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('first.jpg'),
        ])->assertStatus(200);
        $oldPath = $user->refresh()->profile_photo_path;
        Storage::disk('public')->assertExists($oldPath);

        $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('second.jpg'),
        ])->assertStatus(200);
        $newPath = $user->refresh()->profile_photo_path;

        $this->assertNotEquals($oldPath, $newPath);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
    }

    #[Test]
    public function authenticated_user_can_remove_their_profile_photo()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ])->assertStatus(200);
        $path = $user->refresh()->profile_photo_path;

        $response = $this->deleteJson('/api/v1/passenger/profile-photo');

        $response->assertStatus(200);
        $this->assertNull($response->json('profile_photo_url'));
        $this->assertNull($user->refresh()->profile_photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    #[Test]
    public function removing_when_no_photo_exists_is_a_safe_noop()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        $response = $this->deleteJson('/api/v1/passenger/profile-photo');

        $response->assertStatus(200);
        $this->assertNull($response->json('profile_photo_url'));
        $this->assertNull($user->refresh()->profile_photo_path);
    }

    #[Test]
    public function profile_photo_upload_requires_authentication()
    {
        $response = $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function profile_photo_removal_requires_authentication()
    {
        $response = $this->deleteJson('/api/v1/passenger/profile-photo');

        $response->assertStatus(401);
    }

    #[Test]
    public function profile_photo_must_be_an_image()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]);

        $response->assertStatus(422);
        $this->assertNull($user->refresh()->profile_photo_path);
    }

    #[Test]
    public function profile_photo_must_not_exceed_the_size_limit()
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user, ['*']);

        // Limit is 5120 KB — this fake image reports a larger size without allocating real bytes.
        $response = $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('huge.jpg')->size(6000),
        ]);

        $response->assertStatus(422);
        $this->assertNull($user->refresh()->profile_photo_path);
    }

    #[Test]
    public function each_users_photo_is_independent_of_the_other()
    {
        $userA = $this->makeUser();
        $userB = $this->makeUser('tricycle_driver');

        Sanctum::actingAs($userA, ['*']);
        $this->postJson('/api/v1/passenger/profile-photo', [
            'photo' => UploadedFile::fake()->image('a.jpg'),
        ])->assertStatus(200);

        Sanctum::actingAs($userB, ['*']);
        $this->postJson('/api/v1/driver/profile-photo', [
            'photo' => UploadedFile::fake()->image('b.jpg'),
        ])->assertStatus(200);

        $userA->refresh();
        $userB->refresh();
        $this->assertNotNull($userA->profile_photo_path);
        $this->assertNotNull($userB->profile_photo_path);
        $this->assertNotEquals($userA->profile_photo_path, $userB->profile_photo_path);

        // Removing B's photo must never touch A's.
        Sanctum::actingAs($userB, ['*']);
        $this->deleteJson('/api/v1/driver/profile-photo')->assertStatus(200);

        $this->assertNull($userB->refresh()->profile_photo_path);
        $this->assertNotNull($userA->refresh()->profile_photo_path);
        Storage::disk('public')->assertExists($userA->profile_photo_path);
    }

    #[Test]
    public function the_driver_route_uses_the_same_shared_controller()
    {
        $user = $this->makeUser('tricycle_driver');
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v1/driver/profile-photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($user->refresh()->profile_photo_path);
    }
}
