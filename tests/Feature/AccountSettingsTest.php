<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Account Settings (/profile): the signed-in user's own real record, profile updates, password
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
    public function staff_can_update_name_email_mobile_and_address(): void
    {
        $bplo = $this->user('bplo_staff');
        $email = 'updated.' . uniqid() . '@trivora.test';

        $this->actingAs($bplo)->patch('/profile', [
            'name' => 'Updated Name', 'email' => $email, 'contact_number' => '0917 333 4444', 'address' => 'Poblacion, Nasugbu',
        ])->assertSessionHasNoErrors()->assertRedirect('/profile');

        $bplo->refresh();
        $this->assertSame('Updated Name', $bplo->name);
        $this->assertSame($email, $bplo->email);
        $this->assertSame('0917 333 4444', $bplo->contact_number);
        $this->assertSame('Poblacion, Nasugbu', $bplo->address);
    }

    #[Test]
    public function drivers_mobile_number_is_not_changed_from_account_settings(): void
    {
        $driver = $this->user('tricycle_driver');
        $this->actingAs($driver)->patch('/profile', [
            'name' => 'Driver Name', 'email' => $driver->email, 'contact_number' => '09999999999',
        ])->assertSessionHasNoErrors();

        $this->assertNull($driver->fresh()->contact_number);
        $this->assertFalse($this->account($driver)['is_staff']);
    }

    #[Test]
    public function profile_validation_rejects_bad_input(): void
    {
        $tmo = $this->user('tmo_personnel');
        $taken = $this->user('tmo_personnel');

        $this->actingAs($tmo)->patch('/profile', ['name' => '', 'email' => $taken->email, 'contact_number' => 'call me'])
            ->assertSessionHasErrors(['name', 'email', 'contact_number']);
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

        $this->actingAs($tmo)->patch('/profile', ['name' => 'Mine', 'email' => $tmo->email, 'id' => $other->id]);
        $this->assertSame('Settings bplo_staff', $other->fresh()->name);
    }
}
