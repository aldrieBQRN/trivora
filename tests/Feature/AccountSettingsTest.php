<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Account Settings (/profile): the signed-in user's own real record (read-only profile), password
 * change and validation.
 */
class AccountSettingsTest extends TestCase
{
    use DatabaseTransactions;

    private function user(string $role, array $attrs = []): User
    {
        return User::create(array_merge([
            'name' => 'Settings ' . $role, 'email' => 'settings.' . uniqid() . '@trivora.test',
            'password' => bcrypt('OldPassword123'), 'role' => $role, 'is_active' => true,
        ], $attrs));
    }

    private function account(User $user): array
    {
        $account = null;
        $this->actingAs($user)->get('/profile')->assertOk()
            ->assertInertia(function ($page) use (&$account) {
                $page->component('Profile/Edit');
                $account = $page->toArray()['props']['account'];
            });

        return $account;
    }

    #[Test]
    public function page_shows_the_signed_in_users_real_record(): void
    {
        $tmo = $this->user('tmo_personnel', ['employee_id' => 'EMP-' . uniqid(), 'position' => 'Enforcement Officer', 'contact_number' => '09171112222']);
        $a = $this->account($tmo);

        $this->assertSame($tmo->name, $a['name']);
        $this->assertSame($tmo->email, $a['email']);
        $this->assertSame('TMO Personnel', $a['role_label']);
        $this->assertSame($tmo->employee_id, $a['employee_id']);
        $this->assertSame('Enforcement Officer', $a['position']);
        $this->assertSame('09171112222', $a['contact_number']);
        $this->assertTrue($a['is_staff']);
        $this->assertTrue($a['is_active']);
        $this->assertSame($tmo->created_at->format('M d, Y'), $a['member_since']);
    }

    #[Test]
    public function guests_are_redirected_to_login(): void
    {
        $this->get('/profile')->assertRedirect('/login');
    }

    #[Test]
    public function profile_details_cannot_be_changed_from_account_settings(): void
    {
        $bplo = $this->user('bplo_staff', ['contact_number' => '0917 111 2222', 'address' => 'Bucana']);

        // Account Settings is read-only for profile data — there is no update route at all.
        $this->actingAs($bplo)->patch('/profile', [
            'name' => 'Changed Name', 'email' => 'changed.' . uniqid() . '@trivora.test', 'contact_number' => '0917 333 4444',
        ])->assertStatus(405);

        $fresh = $bplo->fresh();
        $this->assertSame($bplo->name, $fresh->name);
        $this->assertSame($bplo->email, $fresh->email);
        $this->assertSame('0917 111 2222', $fresh->contact_number);
    }

    #[Test]
    public function password_can_be_changed_with_the_current_password(): void
    {
        $tmo = $this->user('tmo_personnel');

        $this->actingAs($tmo)->from('/profile')->put('/password', [
            'current_password' => 'OldPassword123', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456',
        ])->assertSessionHasNoErrors()->assertRedirect('/profile');

        $this->assertTrue(Hash::check('NewPassword456', $tmo->fresh()->password));
    }

    #[Test]
    public function password_change_is_validated(): void
    {
        $tmo = $this->user('tmo_personnel');

        $this->actingAs($tmo)->from('/profile')->put('/password', [
            'current_password' => 'wrong-password', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456',
        ])->assertSessionHasErrors('current_password');

        $this->actingAs($tmo)->from('/profile')->put('/password', [
            'current_password' => 'OldPassword123', 'password' => 'NewPassword456', 'password_confirmation' => 'Different789',
        ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('OldPassword123', $tmo->fresh()->password));
    }

    #[Test]
    public function settings_always_load_the_signed_in_user_never_another(): void
    {
        $tmo = $this->user('tmo_personnel');
        $other = $this->user('bplo_staff');

        // There is no user parameter: even asking for another id returns your own record.
        $a = null;
        $this->actingAs($tmo)->get('/profile?user=' . $other->id)->assertOk()
            ->assertInertia(function ($page) use (&$a) { $a = $page->toArray()['props']['account']; });
        $this->assertSame($tmo->email, $a['email']);
    }

    #[Test]
    public function any_user_can_upload_replace_and_remove_their_profile_photo(): void
    {
        Storage::fake('public');
        $bplo = $this->user('bplo_staff');

        $this->actingAs($bplo)->post('/profile/photo', ['photo' => UploadedFile::fake()->image('first.jpg', 300, 300)])
            ->assertSessionHasNoErrors()->assertRedirect('/profile');
        $first = $bplo->fresh()->profile_photo_path;
        Storage::disk('public')->assertExists($first);
        $this->assertNotNull($this->account($bplo)['profile_photo_url']);

        // Replacing deletes the old file.
        $this->actingAs($bplo)->post('/profile/photo', ['photo' => UploadedFile::fake()->image('second.png', 300, 300)])
            ->assertSessionHasNoErrors();
        $second = $bplo->fresh()->profile_photo_path;
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->actingAs($bplo)->delete('/profile/photo')->assertRedirect('/profile');
        $this->assertNull($bplo->fresh()->profile_photo_path);
        Storage::disk('public')->assertMissing($second);
    }

    #[Test]
    public function profile_photo_must_be_a_small_image(): void
    {
        Storage::fake('public');
        $tmo = $this->user('tmo_personnel');

        $this->actingAs($tmo)->post('/profile/photo', ['photo' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors('photo');
        $this->actingAs($tmo)->post('/profile/photo', ['photo' => UploadedFile::fake()->image('huge.jpg')->size(6000)])
            ->assertSessionHasErrors('photo');

        $this->assertNull($tmo->fresh()->profile_photo_path);
    }

    #[Test]
    public function drivers_see_their_registered_barangay(): void
    {
        $driver = $this->user('tricycle_driver');
        \App\Models\Operator::create([
            'user_id' => $driver->id, 'first_name' => 'Brgy', 'last_name' => 'Driver',
            'contact_number' => '09175551111', 'address' => 'Wawa', 'barangay' => 'Wawa',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-BRGY-' . uniqid(), 'license_expiry_date' => '2029-01-01',
        ]);

        $this->assertSame('Wawa', $this->account($driver)['registration']['barangay']);
    }
}
