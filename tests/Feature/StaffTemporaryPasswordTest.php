<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\PasswordResetOtpNotice;
use App\Notifications\StaffCredentialsNotice;
use App\Services\StaffCredentials;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

/**
 * Staff accounts created in TMO / BPLO Staff Management get a server-generated temporary
 * password by email, and must change it before using anything else.
 */
class StaffTemporaryPasswordTest extends TestCase
{
    use RefreshDatabase;

    private const OFFICES = [
        'tmo' => ['role' => 'tmo_personnel', 'dashboard' => '/tmo-dashboard'],
        'bplo' => ['role' => 'bplo_staff', 'dashboard' => '/bplo-dashboard'],
    ];

    /** The plaintext password from the most recent credentials email sent to $user. */
    private function sentPassword(User $user): string
    {
        $password = null;
        Notification::assertSentTo($user, StaffCredentialsNotice::class, function ($notification) use (&$password) {
            $password = (fn () => $this->temporaryPassword)->call($notification);

            return true;
        });

        return $password;
    }

    private function createStaff(string $office, string $email, array $extra = []): \Illuminate\Testing\TestResponse
    {
        $admin = User::factory()->create(['role' => 'admin']);

        return $this->actingAs($admin)->post("/{$office}/users", array_merge([
            'name' => 'New Officer',
            'email' => $email,
            'position' => 'Officer I',
        ], $extra));
    }

    /** Make every notification fail like an unreachable SMTP server; captures the password it was given. */
    private function failMail(?string &$attemptedPassword = null): void
    {
        $failing = Mockery::mock(ChannelManager::class);
        $failing->shouldReceive('send')->andReturnUsing(function ($notifiables, $notification) use (&$attemptedPassword) {
            $attemptedPassword = (fn () => $this->temporaryPassword)->call($notification);
            throw new \RuntimeException('Connection could not be established with host smtp.example.test');
        });
        Notification::swap($failing);
    }

    private function freshSession(): void
    {
        auth()->guard('web')->logout();
        $this->flushSession();
    }

    // ── Creation ────────────────────────────────────────────────────────────

    public function test_tmo_and_bplo_staff_creation_emails_a_temporary_password(): void
    {
        foreach (self::OFFICES as $office => $cfg) {
            Notification::fake();
            $email = "new.{$office}@trivora.gov.ph";

            $this->createStaff($office, $email)
                ->assertSessionHasNoErrors()
                ->assertRedirect(route("{$office}.users"))
                ->assertSessionHas('success');

            $user = User::where('email', $email)->firstOrFail();
            $this->assertSame($cfg['role'], $user->role);
            $this->assertSame('Officer I', $user->position);
            $this->assertNotNull($user->employee_id);
            $this->assertTrue($user->must_change_password);
            $this->assertNotNull($user->credentials_sent_at);
            $this->assertEqualsWithDelta(now()->addHours(24)->timestamp, $user->temporary_password_expires_at->timestamp, 5);

            $password = $this->sentPassword($user);
            $this->assertTrue(Hash::check($password, $user->password));
            $this->assertNotSame($password, $user->password, 'Only the hash is stored.');

            $this->freshSession();
        }
    }

    public function test_initial_password_is_no_longer_required_and_an_admin_supplied_one_is_ignored(): void
    {
        Notification::fake();

        $this->createStaff('tmo', 'ignored@trivora.gov.ph', ['password' => 'AdminChosen123'])
            ->assertSessionHasNoErrors();

        $user = User::where('email', 'ignored@trivora.gov.ph')->firstOrFail();
        $this->assertFalse(Hash::check('AdminChosen123', $user->password));
        $this->assertTrue(Hash::check($this->sentPassword($user), $user->password));
    }

    public function test_temporary_passwords_are_unique_and_strong(): void
    {
        $generated = collect(range(1, 200))->map(fn () => app(StaffCredentials::class)->generatePassword());

        $this->assertCount(200, $generated->unique());
        $generated->each(function ($password) {
            $this->assertSame(16, strlen($password));
            $this->assertMatchesRegularExpression('/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{16}$/', $password);
        });

        Notification::fake();
        $this->createStaff('tmo', 'one@trivora.gov.ph');
        $this->createStaff('bplo', 'two@trivora.gov.ph');
        $this->assertNotSame(
            $this->sentPassword(User::where('email', 'one@trivora.gov.ph')->first()),
            $this->sentPassword(User::where('email', 'two@trivora.gov.ph')->first()),
        );
    }

    // ── Delivery failure & retry ────────────────────────────────────────────

    public function test_email_failure_is_reported_and_resend_issues_a_new_password(): void
    {
        foreach (self::OFFICES as $office => $cfg) {
            $this->failMail();
            $email = "fail.{$office}@trivora.gov.ph";

            $this->createStaff($office, $email)
                ->assertRedirect(route("{$office}.users"))
                ->assertSessionHas('warning')
                ->assertSessionMissing('success');

            $user = User::where('email', $email)->firstOrFail();
            $this->assertNull($user->credentials_sent_at);
            $this->assertSame('not_sent', StaffCredentials::status($user));

            $this->get("/{$office}/users")->assertInertia(fn ($page) => $page
                ->where('users.0.credentials_status', 'not_sent'));

            // Retry once mail works again: a NEW password is generated and delivered.
            $oldHash = $user->password;
            Notification::fake();
            $this->post("/{$office}/users/{$user->id}/resend-credentials")
                ->assertRedirect(route("{$office}.users"))
                ->assertSessionHas('success');

            $user->refresh();
            $this->assertNotSame($oldHash, $user->password);
            $this->assertNotNull($user->credentials_sent_at);
            $this->assertTrue(Hash::check($this->sentPassword($user), $user->password));

            $this->freshSession();
        }
    }

    public function test_an_error_while_issuing_credentials_leaves_no_half_created_account(): void
    {
        $this->mock(StaffCredentials::class)
            ->shouldReceive('issue')
            ->andThrow(new \RuntimeException('Database error while saving the temporary password'));
        $this->withoutExceptionHandling();

        foreach (array_keys(self::OFFICES) as $office) {
            try {
                $this->createStaff($office, "crash.{$office}@trivora.gov.ph");
                $this->fail('Expected the creation to fail.');
            } catch (\RuntimeException $e) {
                $this->assertSame('Database error while saving the temporary password', $e->getMessage());
            }

            $this->assertDatabaseMissing('users', ['email' => "crash.{$office}@trivora.gov.ph"]);
        }
    }

    public function test_resend_is_refused_for_accounts_that_already_set_their_own_password(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $existing = User::factory()->create(['role' => 'tmo_personnel', 'password' => Hash::make('ExistingPass123')]);

        $this->actingAs($admin)->post("/tmo/users/{$existing->id}/resend-credentials")
            ->assertSessionHas('error');

        Notification::assertNothingSent();
        $this->assertTrue(Hash::check('ExistingPass123', $existing->fresh()->password));

        // Office boundary: TMO can't reissue BPLO credentials.
        $bplo = User::factory()->create(['role' => 'bplo_staff']);
        $this->actingAs($admin)->post("/tmo/users/{$bplo->id}/resend-credentials")->assertForbidden();
    }

    // ── Forced password change ──────────────────────────────────────────────

    public function test_temporary_password_login_forces_a_password_change_before_anything_else(): void
    {
        foreach (self::OFFICES as $office => $cfg) {
            Notification::fake();
            $email = "first.{$office}@trivora.gov.ph";
            $this->createStaff($office, $email);
            $user = User::where('email', $email)->firstOrFail();
            $temp = $this->sentPassword($user);
            $this->freshSession();

            $this->post('/login', ['login_id' => $email, 'password' => $temp])
                ->assertRedirect(route('password.change'));
            $this->assertAuthenticatedAs($user);

            // No protected page or JSON endpoint is reachable yet.
            $this->get($cfg['dashboard'])->assertRedirect(route('password.change'));
            $this->get("/{$office}/users")->assertRedirect(route('password.change'));
            $this->get('/dashboard')->assertRedirect(route('password.change'));
            $this->getJson("/{$office}/users")->assertForbidden();
            $this->get('/change-password')->assertOk()->assertInertia(fn ($page) => $page->where('mode', 'change'));

            // Wrong temporary password / reusing it as the new one are rejected.
            $this->put('/change-password', [
                'current_password' => 'WrongPass1234',
                'password' => 'MyOwnPass12345',
                'password_confirmation' => 'MyOwnPass12345',
            ])->assertSessionHasErrors('current_password');
            $this->put('/change-password', [
                'current_password' => $temp,
                'password' => $temp,
                'password_confirmation' => $temp,
            ])->assertSessionHasErrors('password');

            $this->put('/change-password', [
                'current_password' => $temp,
                'password' => 'MyOwnPass12345',
                'password_confirmation' => 'MyOwnPass12345',
            ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

            $user->refresh();
            $this->assertFalse($user->must_change_password);
            $this->assertNull($user->temporary_password_expires_at);
            $this->assertFalse(Hash::check($temp, $user->password), 'The temporary password is invalidated.');
            $this->get($cfg['dashboard'])->assertOk();

            $this->freshSession();
            $this->post('/login', ['login_id' => $email, 'password' => $temp])->assertSessionHasErrors('login_id');
            $this->post('/login', ['login_id' => $email, 'password' => 'MyOwnPass12345'])
                ->assertRedirect(route("{$office}.dashboard"));

            $this->freshSession();
        }
    }

    public function test_api_requests_are_blocked_until_the_password_is_changed(): void
    {
        $user = User::factory()->create(['role' => 'tmo_personnel']);
        $user->forceFill(['must_change_password' => true, 'temporary_password_expires_at' => now()->addDay()])->save();
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/passenger/me')
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $user->forceFill(['must_change_password' => false, 'temporary_password_expires_at' => null])->save();
        $this->app['auth']->forgetGuards(); // a real request resolves the token's user afresh

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/passenger/me')
            ->assertJsonMissing(['message' => 'You must sign in to the Trivora web portal and change your temporary password first.']);
    }

    // ── Expiry & recovery ───────────────────────────────────────────────────

    public function test_expired_temporary_password_cannot_sign_in_and_can_be_recovered(): void
    {
        Notification::fake();
        $this->createStaff('tmo', 'late@trivora.gov.ph');
        $user = User::where('email', 'late@trivora.gov.ph')->firstOrFail();
        $expiredTemp = $this->sentPassword($user);
        $this->freshSession();

        $this->travel(25)->hours();

        $this->post('/login', ['login_id' => 'late@trivora.gov.ph', 'password' => $expiredTemp])
            ->assertSessionHasErrors(['login_id' => 'Your temporary password has expired. Ask your administrator to resend your credentials, or use Forgot password.']);
        $this->assertGuest();
        $this->assertSame('expired', StaffCredentials::status($user->fresh()));

        // Recovery 1: admin resend → a different, fresh password that works.
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->post("/tmo/users/{$user->id}/resend-credentials")->assertSessionHas('success');
        $newTemp = $this->sentPassword($user);
        $this->assertNotSame($expiredTemp, $newTemp);
        $this->freshSession();

        $this->post('/login', ['login_id' => 'late@trivora.gov.ph', 'password' => $expiredTemp])->assertSessionHasErrors('login_id');
        $this->post('/login', ['login_id' => 'late@trivora.gov.ph', 'password' => $newTemp])->assertRedirect(route('password.change'));
        $this->freshSession();

        // Recovery 2: Forgot password (emailed code) also completes the change.
        $this->post('/forgot-password', ['email' => 'late@trivora.gov.ph']);
        $code = null;
        Notification::assertSentTo($user, PasswordResetOtpNotice::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });
        $this->post('/reset-password/verify', ['email' => 'late@trivora.gov.ph', 'otp' => $code]);
        $this->post('/reset-password', ['password' => 'RecoveredPass123', 'password_confirmation' => 'RecoveredPass123'])
            ->assertRedirect(route('login'));

        $this->assertFalse($user->fresh()->must_change_password);
        $this->post('/login', ['login_id' => 'late@trivora.gov.ph', 'password' => 'RecoveredPass123'])
            ->assertRedirect(route('tmo.dashboard'));
    }

    public function test_session_with_an_expired_temporary_password_is_signed_out(): void
    {
        $user = User::factory()->create(['role' => 'tmo_personnel']);
        $user->forceFill(['must_change_password' => true, 'temporary_password_expires_at' => now()->subMinute()])->save();

        $this->actingAs($user)->get('/change-password')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    // ── Existing accounts, roles, throttling ────────────────────────────────

    public function test_existing_staff_sign_in_normally_with_role_restrictions_intact(): void
    {
        $tmo = User::factory()->create(['role' => 'tmo_personnel', 'password' => Hash::make('ExistingPass123')]);
        $bplo = User::factory()->create(['role' => 'bplo_staff', 'password' => Hash::make('ExistingPass123')]);

        $this->assertFalse($tmo->fresh()->must_change_password);

        $this->post('/login', ['login_id' => $tmo->email, 'password' => 'ExistingPass123'])->assertRedirect(route('tmo.dashboard'));
        $this->get('/tmo-dashboard')->assertOk();
        $this->get('/bplo-dashboard')->assertForbidden();
        $this->freshSession();

        $this->post('/login', ['login_id' => $bplo->email, 'password' => 'ExistingPass123'])->assertRedirect(route('bplo.dashboard'));
        $this->get('/tmo/users')->assertForbidden();
        $this->get('/change-password')->assertRedirect(route('dashboard'));
    }

    public function test_login_attempts_are_rate_limited(): void
    {
        $user = User::factory()->create(['role' => 'tmo_personnel', 'password' => Hash::make('ExistingPass123')]);

        foreach (range(1, 5) as $_) {
            $this->post('/login', ['login_id' => $user->email, 'password' => 'wrong-password'])->assertSessionHasErrors('login_id');
        }

        $this->post('/login', ['login_id' => $user->email, 'password' => 'ExistingPass123'])
            ->assertSessionHasErrors('login_id');
        $this->assertGuest();
        $this->assertStringContainsString('Too many sign-in attempts', session('errors')->first('login_id'));
    }

    // ── Secrecy ─────────────────────────────────────────────────────────────

    public function test_temporary_password_never_appears_in_responses_logs_flash_or_audit_logs(): void
    {
        $logged = [];
        Event::listen(MessageLogged::class, function (MessageLogged $e) use (&$logged) {
            $logged[] = $e->message . ' ' . json_encode($e->context);
        });

        // Successful delivery.
        Notification::fake();
        $response = $this->createStaff('tmo', 'secret@trivora.gov.ph');
        $user = User::where('email', 'secret@trivora.gov.ph')->firstOrFail();
        $password = $this->sentPassword($user);

        $this->assertStringNotContainsString($password, $response->getContent());
        $this->assertStringNotContainsString($password, json_encode(session()->all()));
        $this->assertStringNotContainsString($password, $this->get('/tmo/users')->getContent());
        $this->assertStringNotContainsString($password, json_encode($user->fresh()->toArray()));

        // Failed delivery: the error is logged, but never with the password.
        $failedPassword = null;
        $this->failMail($failedPassword);
        $failResponse = $this->post("/tmo/users/{$user->id}/resend-credentials")->assertSessionHas('warning');
        $this->assertNotEmpty($logged);
        $this->assertNotNull($failedPassword);

        $audits = AuditLog::all()->toJson();
        $this->assertStringContainsString('staff.created', $audits);
        $haystacks = [$audits, implode("\n", $logged), $failResponse->getContent(), json_encode(session()->all())];
        foreach ([$password, $failedPassword] as $secret) {
            foreach ($haystacks as $haystack) {
                $this->assertStringNotContainsString($secret, $haystack);
            }
        }

        // Nor in the rendered sign-in flow.
        $this->freshSession();
        $this->assertStringNotContainsString($password, $this->get('/login')->getContent());
    }
}
