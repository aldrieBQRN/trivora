<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use App\Notifications\ColorCodingViolationDriverNotice;
use App\Notifications\ColorCodingViolationTmoAlert;
use App\Services\TelemetryService;
use App\Services\ViolationNotifier;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Tests\Feature\Concerns\BuildsViolationNotificationFixtures;
use Tests\TestCase;

/**
 * Violation emails (App\Services\ViolationNotifier): who receives them, when they are (not) sent,
 * and what they contain. Notification::fake() is used for recipient/trigger rules; the real
 * notification pipeline with the `array` mailer (phpunit.xml) is used for rendered content, and a
 * throwing transport for failure handling. No real email is ever sent.
 *
 * DatabaseTransactions is safe here: Laravel's testing transaction manager runs after-commit
 * callbacks once an application-level transaction commits (and immediately when only the test
 * wrapper is open) and discards them on rollback. Real commits are covered separately by
 * ColorCodingViolationNotificationCommitTest.
 */
class ColorCodingViolationNotificationTest extends TestCase
{
    use DatabaseTransactions;
    use BuildsViolationNotificationFixtures;

    private const TMO_EMAIL = 'tmo.violations@nasugbu-tmo.example.com';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'violations.emails_enabled' => true,
            'violations.tmo_email' => self::TMO_EMAIL,
        ]);
        ViolationNotifier::forceDeferUntilAfterResponse(false);
    }

    protected function tearDown(): void
    {
        ViolationNotifier::forceDeferUntilAfterResponse(null);
        parent::tearDown();
    }

    // ---------------------------------------------------------------------------------------
    // Automatic (GPS telemetry) path
    // ---------------------------------------------------------------------------------------

    #[Test]
    public function a_newly_recorded_gps_violation_emails_the_designated_tmo_and_the_driver(): void
    {
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        Notification::assertNothingSent();

        $response = $this->sendConfirmingPing($monday->copy()->addSeconds(30));

        // The API response is exactly what it was before emails existed.
        $response->assertStatus(201)
            ->assertJsonPath('violation.flagged', true)
            ->assertJsonPath('violation.type', 'color_coding');
        $violation = Violation::where('tricycle_id', $this->tricycle->id)->sole();
        $response->assertJsonPath('violation.citation', 'CITE-' . str_pad($violation->id, 5, '0', STR_PAD_LEFT));
        $this->assertSame(['flagged', 'type', 'citation', 'message'], array_keys($response->json('violation')));

        Notification::assertSentOnDemand(
            ColorCodingViolationTmoAlert::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes === ['mail' => self::TMO_EMAIL]
                && $notification->details['violation_id'] === $violation->id
        );
        Notification::assertSentTo(
            $this->driverUser,
            ColorCodingViolationDriverNotice::class,
            fn ($notification) => $notification->details['violation_id'] === $violation->id
        );
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 1);
        Notification::assertCount(2);
    }

    #[Test]
    public function repeated_gps_pings_the_same_day_never_send_duplicate_emails(): void
    {
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))->assertJsonPath('violation.flagged', true);

        foreach ([45, 60, 75] as $offset) {
            $this->sendConfirmingPing($monday->copy()->addSeconds($offset), 110 + $offset)
                ->assertStatus(201)
                ->assertJsonPath('violation.flagged', false);
        }

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 1);
    }

    #[Test]
    public function the_anchor_and_candidate_pings_alone_never_send_anything(): void
    {
        Notification::fake();
        $this->buildViolationFixture();

        $this->goOnlineAndSendAnchorAndCandidate($this->restrictedMonday());

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertNothingSent();
    }

    #[Test]
    public function the_feature_switch_off_sends_nothing_and_still_records_the_violation(): void
    {
        config(['violations.emails_enabled' => false]);
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))
            ->assertStatus(201)
            ->assertJsonPath('violation.flagged', true);

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertNothingSent();
    }

    #[Test]
    public function a_placeholder_driver_email_skips_the_driver_but_still_alerts_the_tmo(): void
    {
        Notification::fake();
        // The exact system address Api\DriverAuthController generates for a driver with no email.
        $this->buildViolationFixture('driver.123@trivora.test');
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))->assertJsonPath('violation.flagged', true);

        Notification::assertNotSentTo($this->driverUser, ColorCodingViolationDriverNotice::class);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 0);
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
    }

    #[Test]
    public function a_missing_tmo_address_skips_the_tmo_email_but_still_notifies_the_driver(): void
    {
        config(['violations.tmo_email' => null]);
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))->assertJsonPath('violation.flagged', true);

        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 0);
        Notification::assertSentTo($this->driverUser, ColorCodingViolationDriverNotice::class);
    }

    #[Test]
    public function an_invalid_tmo_address_is_never_used(): void
    {
        config(['violations.tmo_email' => 'not-an-email']);
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();

        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))->assertJsonPath('violation.flagged', true);

        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 0);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 1);
    }

    /** @return array<string, array{0: ?string, 1: bool}> */
    public static function addresses(): array
    {
        return [
            'real address'                  => ['juan.delacruz@gmail.com', true],
            'missing'                       => [null, false],
            'blank'                         => ['   ', false],
            'malformed'                     => ['juan.delacruz', false],
            'driver-app system placeholder' => ['driver.42@trivora.test', false],
            'seeded demo domain'            => ['driver.bcruz@trivora.ph', false],
            'reserved .test TLD'            => ['someone@anything.test', false],
            'reserved .invalid TLD'         => ['someone@mail.invalid', false],
            'reserved .localhost TLD'       => ['root@localhost', false],
        ];
    }

    #[Test]
    #[DataProvider('addresses')]
    public function only_real_registered_addresses_count_as_deliverable(?string $email, bool $deliverable): void
    {
        $this->assertSame($deliverable, ViolationNotifier::isDeliverableAddress($email));
    }

    #[Test]
    public function a_transaction_that_rolls_back_never_sends_an_email(): void
    {
        Notification::fake();
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();
        $this->goOnlineAndSendAnchorAndCandidate($monday);

        $service = app(TelemetryService::class);

        try {
            DB::transaction(function () use ($service, $monday) {
                $location = $service->recordLocation([
                    'tricycle_id' => $this->tricycle->id,
                    'latitude'    => $this->metersNorth(14.07, 107),
                    'longitude'   => 120.63,
                    'source'      => 'mobile_app',
                    'recorded_at' => $monday->copy()->addSeconds(30),
                ]);

                $result = $service->checkColorCoding($this->tricycle->fresh(), $location);
                $this->assertTrue($result['flagged']);

                throw new \RuntimeException('force a rollback');
            });
            $this->fail('the transaction should have rethrown');
        } catch (\RuntimeException $e) {
            $this->assertSame('force a rollback', $e->getMessage());
        }

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertNothingSent();
    }

    #[Test]
    public function during_an_http_request_delivery_waits_until_after_the_response(): void
    {
        Notification::fake();
        ViolationNotifier::forceDeferUntilAfterResponse(true);
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();
        $this->goOnlineAndSendAnchorAndCandidate($monday);

        // Outside the HTTP kernel (no response to wait for) the deferred send has not run yet...
        $service = app(TelemetryService::class);
        $location = $service->recordLocation([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => $this->metersNorth(14.07, 107),
            'longitude'   => 120.63,
            'source'      => 'mobile_app',
            'recorded_at' => $monday->copy()->addSeconds(30),
        ]);
        $this->assertTrue($service->checkColorCoding($this->tricycle->fresh(), $location)['flagged']);
        Notification::assertNothingSent();

        // ...and it runs exactly once when the deferred callbacks are invoked (what the HTTP
        // kernel's InvokeDeferredCallbacks middleware does after the response is sent).
        \Illuminate\Support\defer()->invoke();
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 1);
    }

    #[Test]
    public function a_mail_transport_failure_is_logged_safely_and_never_undoes_the_violation(): void
    {
        config([
            'mail.mailers.smtp.username' => 'secret-smtp-user',
            'mail.mailers.failing' => ['transport' => 'failing'],
            'mail.default' => 'failing',
        ]);
        Mail::extend('failing', fn () => new class extends AbstractTransport {
            protected function doSend(SentMessage $message): void
            {
                $to = $message->getEnvelope()->getRecipients()[0]->getAddress();
                throw new TransportException("535 Authentication failed for secret-smtp-user while sending to {$to}");
            }

            public function __toString(): string
            {
                return 'failing://';
            }
        });
        Log::spy();

        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();
        $this->goOnlineAndSendAnchorAndCandidate($monday);

        $this->sendConfirmingPing($monday->copy()->addSeconds(30))
            ->assertStatus(201)
            ->assertJsonPath('violation.flagged', true);

        $violation = Violation::where('tricycle_id', $this->tricycle->id)->sole();
        $this->assertSame('open', $violation->status);

        $failures = [];
        Log::shouldHaveReceived('error')
            ->withArgs(function ($message, $context = []) use (&$failures) {
                if (str_starts_with($message, 'Violation') && str_ends_with($message, 'email failed')) {
                    $failures[] = $context;
                }

                return true;
            });

        $this->assertCount(2, $failures, 'both the TMO and the driver failure must be logged');
        foreach ($failures as $context) {
            $this->assertSame($violation->id, $context['violation_id']);
            $this->assertSame(TransportException::class, $context['exception']);
            $flat = json_encode($context);
            $this->assertStringNotContainsString('secret-smtp-user', $flat);
            $this->assertStringNotContainsString('@', $flat, 'no email address may be logged');
        }

        // A failed send is never reported as handed to the mailer.
        Log::shouldNotHaveReceived('info', ['Violation email handed to the mailer.', \Mockery::any()]);
    }

    // ---------------------------------------------------------------------------------------
    // Manual (TMO ticket) path
    // ---------------------------------------------------------------------------------------

    private function tmoUser(): User
    {
        return User::create([
            'name' => 'TMO Officer VM', 'email' => 'tmo.vm.' . uniqid() . '@example.com',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    #[Test]
    public function a_manually_logged_violation_emails_the_tmo_and_the_driver(): void
    {
        Notification::fake();
        $this->buildViolationFixture();

        $this->actingAs($this->tmoUser())
            ->post(route('tmo.violations.store'), [
                'tricycle_id' => $this->tricycle->id,
                'violation_type' => 'color_coding',
                'fine_amount' => 500,
                'location' => 'Brgy. Wawa',
                'notes' => 'Internal: officer suspects a repeat offender',
            ])
            ->assertRedirect(route('tmo.violations'))
            ->assertSessionHas('success');

        $violation = Violation::where('tricycle_id', $this->tricycle->id)->sole();
        $this->assertSame('manual', $violation->detection_method);

        Notification::assertSentOnDemand(
            ColorCodingViolationTmoAlert::class,
            fn ($n, $c, $notifiable) => $notifiable->routes === ['mail' => self::TMO_EMAIL]
        );
        Notification::assertSentTo($this->driverUser, ColorCodingViolationDriverNotice::class);
        Notification::assertCount(2);
    }

    #[Test]
    public function a_manual_ticket_never_presents_the_units_latest_ping_as_the_violation_location(): void
    {
        Notification::fake();
        $this->buildViolationFixture();
        // An old ping exists; storeViolation links it as location_snapshot_id, but it is not where
        // the violation happened.
        $this->tricycle->locations()->create([
            'latitude' => 14.0712, 'longitude' => 120.6345, 'speed_kmh' => 0, 'heading_deg' => 0,
            'accuracy_m' => 5, 'source' => 'mobile_app', 'recorded_at' => now()->subDays(3),
        ]);

        $this->actingAs($this->tmoUser())->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa', 'notes' => null,
        ])->assertRedirect(route('tmo.violations'));

        $violation = Violation::where('tricycle_id', $this->tricycle->id)->sole();
        $this->assertNotNull($violation->location_snapshot_id);

        Notification::assertSentTo($this->driverUser, ColorCodingViolationDriverNotice::class,
            fn ($n) => $n->details['location'] === null);
        Notification::assertSentOnDemand(ColorCodingViolationTmoAlert::class,
            fn ($n) => $n->details['location'] === null);
    }

    #[Test]
    public function a_unit_with_no_linked_driver_account_alerts_only_the_tmo(): void
    {
        Notification::fake();
        $this->buildViolationFixture(null, withDriverRow: false);

        $this->actingAs($this->tmoUser())->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa',
        ])->assertRedirect(route('tmo.violations'));

        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 0);
    }

    #[Test]
    public function a_rejected_same_day_manual_duplicate_sends_nothing(): void
    {
        Notification::fake();
        $this->buildViolationFixture();
        $tmo = $this->tmoUser();
        $payload = [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa',
        ];

        $this->actingAs($tmo)->post(route('tmo.violations.store'), $payload)->assertSessionHas('success');
        $this->actingAs($tmo)->post(route('tmo.violations.store'), $payload)->assertSessionHas('error');

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 1);
    }

    // ---------------------------------------------------------------------------------------
    // Later lifecycle actions never resend the initial notice
    // ---------------------------------------------------------------------------------------

    #[Test]
    public function viewing_appealing_deciding_and_paying_never_resend_the_violation_emails(): void
    {
        $this->buildViolationFixture();
        $tmo = $this->tmoUser();

        $this->actingAs($tmo)->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa',
        ]);
        $violation = Violation::where('tricycle_id', $this->tricycle->id)->sole();

        // Only what happens after creation is observed from here on.
        Notification::fake();

        $this->actingAs($tmo)->get(route('tmo.violations.details', $violation->id))->assertOk();

        Sanctum::actingAs($this->driverUser, ['*']);
        $this->postJson("/api/v1/driver/violations/{$violation->id}/appeal", [
            'reason' => 'I was not operating; the unit was parked at home all day.',
        ])->assertSuccessful();

        $appeal = ViolationAppeal::where('violation_id', $violation->id)->sole();
        $this->actingAs($tmo)->post(route('tmo.appeals.reject', $appeal->id), [
            'review_notes' => 'GPS record shows movement.',
        ])->assertSessionHas('success');
        $this->assertSame('open', $violation->fresh()->status);

        $this->actingAs($tmo)->post(route('tmo.violations.confirm-payment', $violation->id))
            ->assertSessionHas('success');

        $this->assertNotNull($violation->fresh()->fine_paid_at);
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 0);
        Notification::assertSentTimes(ColorCodingViolationDriverNotice::class, 0);
    }

    // ---------------------------------------------------------------------------------------
    // Rendered content (real notification pipeline, array mailer — nothing leaves the process)
    // ---------------------------------------------------------------------------------------

    /** @return \Illuminate\Support\Collection<int, \Symfony\Component\Mime\Email> */
    private function sentEmails()
    {
        return Mail::mailer('array')->getSymfonyTransport()->messages()
            ->map(fn (SentMessage $message) => $message->getOriginalMessage());
    }

    #[Test]
    public function the_rendered_emails_go_to_the_right_addresses_with_the_expected_content(): void
    {
        $this->buildViolationFixture();
        $monday = $this->restrictedMonday();
        $this->goOnlineAndSendAnchorAndCandidate($monday);
        $this->sendConfirmingPing($monday->copy()->addSeconds(30))->assertJsonPath('violation.flagged', true);

        $violation = Violation::with('locationSnapshot')->where('tricycle_id', $this->tricycle->id)->sole();
        $emails = $this->sentEmails();
        $this->assertCount(2, $emails);

        $tmoEmail = $emails->first(fn ($e) => $e->getTo()[0]->getAddress() === self::TMO_EMAIL);
        $driverEmail = $emails->first(fn ($e) => $e->getTo()[0]->getAddress() === $this->driverUser->email);
        $this->assertNotNull($tmoEmail);
        $this->assertNotNull($driverEmail);
        // Each message has exactly one recipient — neither audience sees the other.
        $this->assertCount(1, $tmoEmail->getTo());
        $this->assertCount(1, $driverEmail->getTo());
        $this->assertEmpty($tmoEmail->getCc());
        $this->assertEmpty($tmoEmail->getBcc());

        $vio = 'VIO-26-' . str_pad($violation->id, 4, '0', STR_PAD_LEFT);
        $cite = 'CITE-' . str_pad($violation->id, 5, '0', STR_PAD_LEFT);
        $lat = number_format((float) $violation->locationSnapshot->latitude, 6, '.', '');

        $this->assertStringContainsString($vio, $tmoEmail->getSubject());
        $this->assertStringContainsString($this->tricycle->plate_number, $tmoEmail->getSubject());
        foreach ([$tmoEmail->getHtmlBody(), $tmoEmail->getTextBody()] as $body) {
            $this->assertStringContainsString($vio, $body);
            $this->assertStringContainsString('Juan Dela Cruz', $body);
            $this->assertStringContainsString($this->tricycle->plate_number, $body);
            $this->assertStringContainsString('0002', $body);
            $this->assertStringContainsString('FR-VM-', $body);
            $this->assertStringContainsString('Color Coding Violation', $body);
            $this->assertStringContainsString('Monday', $body);
            $this->assertStringContainsString($lat, $body);
            $this->assertStringContainsString('Open — fine unpaid', $body);
            $this->assertStringContainsString(route('tmo.violations.details', $violation->id), $body);
        }

        $this->assertStringContainsString($cite, $driverEmail->getSubject());
        foreach ([$driverEmail->getHtmlBody(), $driverEmail->getTextBody()] as $body) {
            $this->assertStringContainsString($cite, $body);
            $this->assertStringContainsString('Juan Dela Cruz', $body);
            $this->assertStringContainsString($this->tricycle->plate_number, $body);
            $this->assertStringContainsString($lat, $body);
            $this->assertStringContainsString('Violations', $body);
            $this->assertStringContainsString('appeal', $body);
            // Driver-facing mail never links into the TMO panel or exposes internal notes.
            $this->assertStringNotContainsString(route('tmo.violations.details', $violation->id), $body);
            $this->assertStringNotContainsString($violation->notes, $body);
            $this->assertStringNotContainsString(self::TMO_EMAIL, $body);
        }
    }

    #[Test]
    public function a_violation_without_gps_renders_without_coordinates_and_without_internal_notes(): void
    {
        $this->buildViolationFixture();

        $this->actingAs($this->tmoUser())->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 750, 'location' => 'Brgy. Wawa',
            'notes' => 'Internal: officer suspects a repeat offender',
        ])->assertRedirect(route('tmo.violations'));

        $emails = $this->sentEmails();
        $this->assertCount(2, $emails);

        foreach ($emails as $email) {
            foreach ([$email->getHtmlBody(), $email->getTextBody()] as $body) {
                $this->assertStringContainsString('No GPS location was recorded for this violation.', $body);
                $this->assertStringNotContainsString('google.com/maps', $body);
                $this->assertStringNotContainsString('Internal: officer suspects', $body);
                $this->assertStringContainsString('₱750.00', $body);
            }
        }
    }

    #[Test]
    public function user_supplied_values_are_escaped_in_the_html_email(): void
    {
        $this->buildViolationFixture();
        $this->driverUser->update(['name' => '<script>alert(1)</script> [click](http://evil.example)']);

        $this->actingAs($this->tmoUser())->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa',
        ])->assertRedirect(route('tmo.violations'));

        foreach ($this->sentEmails() as $email) {
            $html = $email->getHtmlBody();
            $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
            $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
            $this->assertStringNotContainsString('href="http://evil.example"', $html);
            $this->assertStringNotContainsString("\n", $email->getSubject());
        }
    }
}
