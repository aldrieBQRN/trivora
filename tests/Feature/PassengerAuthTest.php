<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\User;
use App\Notifications\RegistrationEmailCodeNotice;
use App\Services\RegistrationEmailVerification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PassengerAuthTest extends TestCase
{
    use DatabaseTransactions;

    private function validPayload(array $overrides = []): array
    {
        $payload = array_merge([
            'name' => 'Maria Santos',
            'email' => 'maria.santos@trivora.test',
            'password' => 'PassengerPass123!',
            'mobile_number' => '+63 917 555 0192',
            'terms_accepted' => true,
            'privacy_policy_accepted' => true,
        ], $overrides);

        // Sign-up requires the token from verifying the emailed code.
        if (! array_key_exists('email_verification_token', $overrides)) {
            $payload['email_verification_token'] = $this->verificationTokenFor($payload['email']);
        }

        return $payload;
    }

    /** Runs the real send-code -> verify-code exchange and returns the verification token. */
    private function verificationTokenFor(string $email): string
    {
        Notification::fake();

        $this->postJson('/api/v1/passenger/register/send-code', ['email' => $email])->assertOk();

        $code = null;
        Notification::assertSentTo(new AnonymousNotifiable, RegistrationEmailCodeNotice::class, function ($notification) use (&$code) {
            $code = $notification->code;

            return true;
        });

        return $this->postJson('/api/v1/passenger/register/verify-code', ['email' => $email, 'code' => $code])
            ->assertOk()
            ->json('verification_token');
    }

    #[Test]
    public function registration_requires_a_verified_email()
    {
        // No token at all.
        $this->postJson('/api/v1/passenger/register', $this->validPayload(['email_verification_token' => null]))
            ->assertStatus(422)->assertJsonValidationErrors(['email_verification_token']);

        // A token issued for a DIFFERENT email.
        $otherToken = $this->verificationTokenFor('someone.else@trivora.test');
        $this->postJson('/api/v1/passenger/register', $this->validPayload(['email_verification_token' => $otherToken]))
            ->assertStatus(422)->assertJsonValidationErrors(['email']);

        $this->assertDatabaseMissing('users', ['email' => 'maria.santos@trivora.test']);
    }

    #[Test]
    public function the_verification_token_works_once_and_the_email_says_passenger_account()
    {
        $payload = $this->validPayload();

        Notification::assertSentTo(new AnonymousNotifiable, RegistrationEmailCodeNotice::class, function ($notification) {
            return $notification->context === RegistrationEmailVerification::CONTEXT_PASSENGER;
        });

        $this->postJson('/api/v1/passenger/register', $payload)->assertStatus(201);

        // Reusing the same token for another sign-up is refused.
        $this->postJson('/api/v1/passenger/register', array_merge($payload, [
            'email' => 'second.passenger@trivora.test',
            'mobile_number' => '+63 917 555 0000',
        ]))->assertStatus(422);
    }

    #[Test]
    public function a_code_cannot_be_sent_to_an_email_that_already_has_an_account()
    {
        User::factory()->create(['email' => 'existing@trivora.test']);

        $this->postJson('/api/v1/passenger/register/send-code', ['email' => 'Existing@Trivora.test'])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function a_wrong_code_is_rejected()
    {
        Notification::fake();
        $this->postJson('/api/v1/passenger/register/send-code', ['email' => 'new.rider@trivora.test'])->assertOk();

        $code = null;
        Notification::assertSentTo(new AnonymousNotifiable, RegistrationEmailCodeNotice::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });

        $this->postJson('/api/v1/passenger/register/verify-code', [
            'email' => 'new.rider@trivora.test',
            'code'  => $code === '000000' ? '111111' : '000000',
        ])->assertStatus(422)->assertJsonValidationErrors(['code'])->assertJsonMissing(['verification_token']);
    }

    #[Test]
    public function registration_fails_without_accepting_terms()
    {
        $res = $this->postJson('/api/v1/passenger/register', $this->validPayload(['terms_accepted' => false]));

        $res->assertStatus(422)->assertJsonValidationErrors(['terms_accepted']);
        $this->assertDatabaseMissing('users', ['email' => 'maria.santos@trivora.test']);
    }

    #[Test]
    public function registration_fails_without_accepting_privacy_policy()
    {
        $res = $this->postJson('/api/v1/passenger/register', $this->validPayload(['privacy_policy_accepted' => false]));

        $res->assertStatus(422)->assertJsonValidationErrors(['privacy_policy_accepted']);
        $this->assertDatabaseMissing('users', ['email' => 'maria.santos@trivora.test']);
    }

    #[Test]
    public function registration_fails_when_consent_fields_are_omitted_entirely()
    {
        $payload = $this->validPayload();
        unset($payload['terms_accepted'], $payload['privacy_policy_accepted']);

        $res = $this->postJson('/api/v1/passenger/register', $payload);

        $res->assertStatus(422)->assertJsonValidationErrors(['terms_accepted', 'privacy_policy_accepted']);
    }

    #[Test]
    public function registration_succeeds_and_persists_consent_when_terms_are_accepted()
    {
        $res = $this->postJson('/api/v1/passenger/register', $this->validPayload());

        $res->assertStatus(201)->assertJsonStructure(['token', 'user']);

        $user = User::where('email', 'maria.santos@trivora.test')->first();
        $this->assertNotNull($user);

        $passenger = Passenger::where('user_id', $user->id)->first();
        $this->assertNotNull($passenger);
        $this->assertTrue($passenger->terms_accepted);
        $this->assertTrue($passenger->privacy_policy_accepted);
        $this->assertNotNull($passenger->consent_accepted_at);
        $this->assertSame('2026.09', $passenger->terms_version);
    }

    #[Test]
    public function duplicate_email_registration_is_rejected()
    {
        $this->postJson('/api/v1/passenger/register', $this->validPayload())->assertStatus(201);

        $res = $this->postJson('/api/v1/passenger/register', $this->validPayload([
            'mobile_number' => '+63 917 555 9999',
            // The email already has an account, so no new code can be issued for it.
            'email_verification_token' => 'not-needed',
        ]));

        $res->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function duplicate_mobile_number_registration_is_rejected()
    {
        $this->postJson('/api/v1/passenger/register', $this->validPayload())->assertStatus(201);

        $res = $this->postJson('/api/v1/passenger/register', $this->validPayload([
            'email' => 'another.passenger@trivora.test',
        ]));

        $res->assertStatus(422)->assertJsonValidationErrors(['mobile_number']);
    }

    #[Test]
    public function a_driver_account_cannot_log_in_to_the_passenger_app()
    {
        $driver = User::create([
            'name' => 'Driver Not Passenger '.uniqid(),
            'email' => 'drv.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);

        $this->postJson('/api/v1/passenger/login', ['email' => $driver->email, 'password' => 'password'])
            ->assertStatus(403)
            ->assertJson(['message' => 'Access restricted to passenger accounts only.']);

        $this->assertDatabaseMissing('passengers', ['user_id' => $driver->id]);
    }

    #[Test]
    public function a_passenger_account_can_log_in()
    {
        [$user] = $this->makePassenger();

        $this->postJson('/api/v1/passenger/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    private function makePassenger(): array
    {
        $user = User::create([
            'name' => 'Emergency Contact Passenger '.uniqid(),
            'email' => 'ec.'.uniqid().'@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        $passenger = Passenger::create([
            'user_id' => $user->id,
            'mobile_number' => '0917'.rand(1000000, 9999999),
        ]);

        return [$user, $passenger];
    }

    #[Test]
    public function me_returns_null_emergency_contact_when_none_is_set()
    {
        [$user] = $this->makePassenger();
        Sanctum::actingAs($user, ['*']);

        $res = $this->getJson('/api/v1/passenger/me');
        $res->assertStatus(200);
        $this->assertNull($res->json('user.emergency_contact'));
    }

    #[Test]
    public function updating_the_emergency_contact_persists_and_is_returned_by_a_fresh_me_call()
    {
        [$user, $passenger] = $this->makePassenger();
        Sanctum::actingAs($user, ['*']);

        $update = $this->putJson('/api/v1/passenger/profile', [
            'emergency_contact_name' => 'Juan Dela Cruz',
            'emergency_contact_phone' => '09171234567',
        ]);
        $update->assertStatus(200);
        $this->assertSame('Juan Dela Cruz (09171234567)', $update->json('user.emergency_contact'));

        $this->assertSame('Juan Dela Cruz (09171234567)', $passenger->fresh()->emergency_contact);

        // A completely fresh /me call (simulating a reopened Edit Profile / app reload) must
        // return the same saved value — this is the exact bug being guarded against here: the
        // value must survive being refetched, not just echoed back by the write itself.
        $me = $this->getJson('/api/v1/passenger/me');
        $this->assertSame('Juan Dela Cruz (09171234567)', $me->json('user.emergency_contact'));
    }

    #[Test]
    public function clearing_the_emergency_contact_sets_it_back_to_null()
    {
        [$user, $passenger] = $this->makePassenger();
        $passenger->update(['emergency_contact' => 'Old Contact (0917)']);
        Sanctum::actingAs($user, ['*']);

        $this->putJson('/api/v1/passenger/profile', [
            'emergency_contact_name' => '',
            'emergency_contact_phone' => '',
        ])->assertStatus(200);

        $this->assertNull($passenger->fresh()->emergency_contact);
    }

    #[Test]
    public function updating_the_profile_requires_authentication()
    {
        $response = $this->putJson('/api/v1/passenger/profile', [
            'emergency_contact_name' => 'Someone',
            'emergency_contact_phone' => '0917',
        ]);

        $response->assertStatus(401);
    }
}
