<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\RegistrationEmailCodeNotice;
use App\Services\RegistrationEmailVerification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Public MTOP registration: Applicant Information → Continue emails a 6-digit code, the modal
 * verifies it, and only a verified email can be submitted.
 */
class RegistrationEmailVerificationTest extends TestCase
{
    use DrivesFranchiseWorkflow;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedColorScheme();
    }

    private function sentCode(string $email): string
    {
        $code = null;
        Notification::assertSentTo(new AnonymousNotifiable, RegistrationEmailCodeNotice::class, function ($notification, $channels, $notifiable) use ($email, &$code) {
            if (($notifiable->routes['mail'] ?? null) !== $email) {
                return false;
            }
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    public function test_continue_sends_a_code_and_the_correct_code_verifies_the_email(): void
    {
        Notification::fake();

        $this->postJson(route('register.public.email.send'), ['email' => 'Juan.Owner@Example.com'])
            ->assertOk()
            ->assertJsonPath('resend_after_seconds', RegistrationEmailVerification::RESEND_COOLDOWN_SECONDS);

        $code = $this->sentCode('juan.owner@example.com');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $this->postJson(route('register.public.email.verify'), ['email' => 'juan.owner@example.com', 'code' => $code])
            ->assertOk();

        $this->assertSame('juan.owner@example.com', session(RegistrationEmailVerification::SESSION_KEY));

        // A reload of the wizard knows this email is already verified.
        $this->get(route('register.public'))
            ->assertInertia(fn ($page) => $page->where('verifiedEmail', 'juan.owner@example.com'));
    }

    public function test_wrong_codes_are_rejected_and_lock_out_after_five_attempts(): void
    {
        Notification::fake();
        $this->postJson(route('register.public.email.send'), ['email' => 'owner@example.com'])->assertOk();
        $code = $this->sentCode('owner@example.com');
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, 4) as $_) {
            $this->postJson(route('register.public.email.verify'), ['email' => 'owner@example.com', 'code' => $wrong])
                ->assertStatus(422)->assertJsonValidationErrors('code');
        }
        $this->postJson(route('register.public.email.verify'), ['email' => 'owner@example.com', 'code' => $wrong])
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', 'Too many incorrect attempts. Please request a new code.');

        // Even the right code no longer works — a new one must be requested.
        $this->postJson(route('register.public.email.verify'), ['email' => 'owner@example.com', 'code' => $code])
            ->assertStatus(422);
        $this->assertNull(session(RegistrationEmailVerification::SESSION_KEY));
    }

    public function test_an_already_registered_email_and_rapid_resends_are_refused(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson(route('register.public.email.send'), ['email' => 'Taken@Example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson(route('register.public.email.send'), ['email' => 'fresh@example.com'])->assertOk();
        $this->postJson(route('register.public.email.send'), ['email' => 'fresh@example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->travel(61)->seconds();
        $this->postJson(route('register.public.email.send'), ['email' => 'fresh@example.com'])->assertOk();
    }

    public function test_the_code_expires(): void
    {
        Notification::fake();
        $this->postJson(route('register.public.email.send'), ['email' => 'late@example.com'])->assertOk();
        $code = $this->sentCode('late@example.com');

        $this->travel(RegistrationEmailVerification::EXPIRES_MINUTES + 1)->minutes();

        $this->postJson(route('register.public.email.verify'), ['email' => 'late@example.com', 'code' => $code])
            ->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_registration_cannot_be_submitted_without_verifying_that_exact_email(): void
    {
        $payload = $this->registrationPayload();

        // Never verified.
        $this->post(route('register.public.submit'), $payload)->assertSessionHasErrors('email');
        $this->assertDatabaseMissing('users', ['email' => $payload['email']]);

        // Verified a DIFFERENT email, then swapped it on the form.
        $this->withSession([RegistrationEmailVerification::SESSION_KEY => 'someone.else@example.com'])
            ->post(route('register.public.submit'), $payload)
            ->assertSessionHasErrors('email');
        $this->assertDatabaseMissing('users', ['email' => $payload['email']]);

        // Verified the same email: accepted, and the verification is consumed.
        $this->postRegistration($payload)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => $payload['email']]);
        $this->assertNull(session(RegistrationEmailVerification::SESSION_KEY));
    }
}
