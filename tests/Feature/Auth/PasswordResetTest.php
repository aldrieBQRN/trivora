<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordResetOtpNotice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_code_is_emailed_to_a_registered_email(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('password.reset', ['email' => strtolower($user->email)]));

        Notification::assertSentTo($user, PasswordResetOtpNotice::class, function ($notification) {
            return preg_match('/^\d{6}$/', $notification->code) === 1;
        });
    }

    public function test_unregistered_email_is_rejected(): void
    {
        Notification::fake();

        $this->post('/forgot-password', ['email' => 'nobody@example.com'])
            ->assertSessionHasErrors('email');

        Notification::assertNothingSent();
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        $this->get('/reset-password?email=someone@example.com')->assertStatus(200);
    }

    public function test_resend_countdown_survives_a_page_refresh(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        $this->travel(20)->seconds();

        $this->get('/reset-password?email=' . urlencode($user->email))
            ->assertInertia(fn ($page) => $page->where('resendAfterSeconds', 40));
    }

    public function test_password_can_be_reset_with_valid_code(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, PasswordResetOtpNotice::class, function ($notification) use ($user) {
            $this->post('/reset-password/verify', [
                'email' => $user->email,
                'otp' => $notification->code,
            ])
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('password.new'));

            $this->get('/reset-password/new')->assertStatus(200);

            $this->post('/reset-password', [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_wrong_code_is_rejected(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, PasswordResetOtpNotice::class, function ($notification) use ($user) {
            $wrong = $notification->code === '000000' ? '111111' : '000000';

            $this->post('/reset-password/verify', [
                'email' => $user->email,
                'otp' => $wrong,
            ])->assertSessionHasErrors('otp');

            // Without a verified code, the new password step can't be reached or submitted.
            $this->get('/reset-password/new')->assertRedirect(route('password.request'));
            $this->post('/reset-password', [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])->assertRedirect(route('password.request'));

            return true;
        });

        $this->assertFalse(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_mobile_api_resets_password_with_code(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/v1/passenger/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->postJson('/api/v1/passenger/forgot-password', ['email' => $user->email])
            ->assertStatus(422);

        Notification::assertSentTo($user, PasswordResetOtpNotice::class, function ($notification) use ($user) {
            $this->postJson('/api/v1/driver/forgot-password/verify', [
                'email' => $user->email,
                'otp' => $notification->code,
            ])->assertOk();

            $this->postJson('/api/v1/driver/forgot-password/reset', [
                'email' => $user->email,
                'otp' => $notification->code,
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
            ])->assertOk();

            return true;
        });

        $this->assertTrue(Hash::check('secret123', $user->fresh()->password));
    }
}
