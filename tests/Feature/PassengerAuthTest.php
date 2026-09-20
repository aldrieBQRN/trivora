<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PassengerAuthTest extends TestCase
{
    use DatabaseTransactions;

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Maria Santos',
            'email' => 'maria.santos@trivora.test',
            'password' => 'PassengerPass123!',
            'mobile_number' => '+63 917 555 0192',
            'terms_accepted' => true,
            'privacy_policy_accepted' => true,
        ], $overrides);
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
