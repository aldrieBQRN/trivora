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

    public function test_driver_cannot_access_user_management(): void
    {
        $driver = User::factory()->create(['role' => 'tricycle_driver']);

        $this->actingAs($driver)->get('/tmo/users')->assertForbidden();
    }

    public function test_admin_can_create_a_staff_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->post('/tmo/users', [
            'name' => 'New TMO Officer',
            'email' => 'new.officer@trivora.gov.ph',
            'password' => 'SecurePass123',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('tmo.users'));

        $this->assertDatabaseHas('users', [
            'email' => 'new.officer@trivora.gov.ph',
            'role' => 'tmo_personnel',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_edit_another_users_name_and_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'tmo_personnel', 'name' => 'Old Name']);

        $response = $this->actingAs($admin)->put("/tmo/users/{$target->id}", [
            'name' => 'Updated Name',
            'email' => $target->email,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('tmo.users'));
        $this->assertSame('Updated Name', $target->fresh()->name);
    }

    public function test_admin_can_toggle_active_status_of_another_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $this->actingAs($admin)->patch("/tmo/users/{$target->id}/toggle-status");

        $this->assertFalse($target->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_their_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $response = $this->actingAs($admin)->patch("/tmo/users/{$admin->id}/toggle-status");

        $response->assertSessionHas('error');
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_admin_can_reset_another_users_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'tmo_personnel', 'password' => bcrypt('OriginalPass123')]);
        $originalHash = $target->password;

        $response = $this->actingAs($admin)->put("/tmo/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'password' => 'BrandNewPass123',
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
            'contact_number' => '09171234999',
            'password' => bcrypt('OriginalPass123'),
            'is_active' => true,
        ]);

        $this->actingAs($admin)->patch("/tmo/users/{$target->id}/toggle-status");
        $this->assertFalse($target->fresh()->is_active);

        // actingAs() sets the user directly on the resolved auth guard instance, which is
        // shared for the rest of this test method — without forgetting it, the next request
        // below would still be "authenticated as $admin" and get redirected away by the
        // `guest` middleware on /login before ever reaching the login logic.
        $this->app['auth']->forgetGuards();

        // Login uses the account's stored mobile number (email is no longer accepted).
        $response = $this->post('/login', [
            'login_id' => '09171234999',
            'password' => 'OriginalPass123',
        ]);

        $response->assertSessionHasErrors('login_id');
        $this->assertGuest();
    }
}
