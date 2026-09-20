<?php

namespace Tests\Feature\TMO;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_the_user_management_index(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'tmo_personnel']);

        $response = $this->actingAs($admin)->get('/tmo/users');

        $response->assertOk();
    }

    public function test_tmo_personnel_cannot_access_user_management(): void
    {
        $staff = User::factory()->create(['role' => 'tmo_personnel']);

        $this->actingAs($staff)->get('/tmo/users')->assertForbidden();
        $this->actingAs($staff)->get('/tmo/users/create')->assertForbidden();
    }

    public function test_admin_can_create_a_staff_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->post('/tmo/users', [
            'name' => 'New TMO Officer',
            'email' => 'new.officer@trivora.gov.ph',
            'role' => 'tmo_personnel',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect('/tmo/users');

        $this->assertDatabaseHas('users', [
            'email' => 'new.officer@trivora.gov.ph',
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);
    }

    public function test_creating_an_account_rejects_a_non_staff_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->post('/tmo/users', [
            'name' => 'Should Fail',
            'email' => 'should.fail@trivora.gov.ph',
            'role' => 'tricycle_driver',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ]);

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'should.fail@trivora.gov.ph']);
    }

    public function test_admin_can_edit_another_users_name_and_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'bplo_staff', 'name' => 'Old Name']);

        $response = $this->actingAs($admin)->put("/tmo/users/{$target->id}", [
            'name' => 'Updated Name',
            'email' => $target->email,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect('/tmo/users');
        $this->assertSame('Updated Name', $target->fresh()->name);
    }

    public function test_admin_can_toggle_active_status_of_another_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $this->actingAs($admin)->post("/tmo/users/{$target->id}/toggle-active");

        $this->assertFalse($target->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_their_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $response = $this->actingAs($admin)->post("/tmo/users/{$admin->id}/toggle-active");

        $response->assertSessionHasErrors('is_active');
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_admin_can_reset_another_users_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'bplo_staff']);
        $originalHash = $target->password;

        $response = $this->actingAs($admin)->post("/tmo/users/{$target->id}/reset-password", [
            'password' => 'BrandNewPass123',
            'password_confirmation' => 'BrandNewPass123',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertNotSame($originalHash, $target->fresh()->password);
    }

    public function test_deactivated_account_is_blocked_from_logging_in(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create([
            'role' => 'tmo_personnel',
            'email' => 'deactivate.me@trivora.gov.ph',
            'password' => bcrypt('OriginalPass123'),
        ]);

        $this->actingAs($admin)->post("/tmo/users/{$target->id}/toggle-active");

        // actingAs() sets the user directly on the resolved auth guard instance, which is
        // shared for the rest of this test method — without forgetting it, the next request
        // below would still be "authenticated as $admin" and get redirected away by the
        // `guest` middleware on /login before ever reaching the login logic.
        $this->app['auth']->forgetGuards();

        $response = $this->post('/login', [
            'login_id' => 'deactivate.me@trivora.gov.ph',
            'password' => 'OriginalPass123',
        ]);

        $response->assertSessionHasErrors();
        $this->assertGuest();
    }
}
