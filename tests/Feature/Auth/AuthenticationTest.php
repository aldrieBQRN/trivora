<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_their_mobile_number(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'contact_number' => '09171234000',
        ]);

        $response = $this->post('/login', [
            'login_id' => '09171234000',
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));
    }

    public function test_users_can_authenticate_using_their_email_address(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $response = $this->post('/login', [
            'login_id' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));
    }

    public function test_email_login_is_case_insensitive(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true, 'email' => 'juan.delacruz@trivora.test']);

        $response = $this->post('/login', [
            'login_id' => 'Juan.DelaCruz@Trivora.Test',
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));
    }

    public function test_users_can_not_authenticate_using_an_unregistered_email_address(): void
    {
        $this->post('/login', [
            'login_id' => 'nobody@trivora.test',
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create(['contact_number' => '09171234001']);

        $this->post('/login', [
            'login_id' => '09171234001',
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect(route('login'));
    }

    public function test_tmo_user_hitting_dashboard_is_redirected_to_tmo_dashboard(): void
    {
        $tmo = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $response = $this->actingAs($tmo)->get('/dashboard');

        $response->assertRedirect(route('tmo.dashboard'));
    }

    public function test_bplo_user_hitting_dashboard_is_redirected_to_bplo_dashboard(): void
    {
        $bplo = User::factory()->create(['role' => 'bplo_staff', 'is_active' => true]);

        $response = $this->actingAs($bplo)->get('/dashboard');

        $response->assertRedirect(route('bplo.dashboard'));
    }

    public function test_driver_user_hitting_dashboard_is_redirected_to_operator_dashboard(): void
    {
        $driver = User::factory()->create(['role' => 'tricycle_driver', 'is_active' => true]);

        $response = $this->actingAs($driver)->get('/dashboard');

        $response->assertRedirect(route('operator.dashboard'));
    }

    public function test_authenticated_user_hitting_login_is_redirected_to_their_dashboard(): void
    {
        $tmo = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $response = $this->actingAs($tmo)->get('/login');

        $response->assertRedirect(route('tmo.dashboard'));
    }

    public function test_logout_succeeds_via_get_or_post_without_errors(): void
    {
        $user = User::factory()->create(['role' => 'tmo_personnel', 'is_active' => true]);

        $response = $this->actingAs($user)->get('/logout');
        $this->assertGuest();
        $response->assertRedirect(route('login'));

        $response2 = $this->post('/logout');
        $this->assertGuest();
        $response2->assertRedirect(route('login'));
    }
}
