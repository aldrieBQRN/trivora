<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ColorCodingScheme;
use App\Models\DevicePushToken;
use App\Models\Driver;
use App\Models\FareConfiguration;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use App\Services\AppNotifier;
use App\Services\MobileNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * In-app + push notifications for the passenger and driver apps (AppNotifier / MobileNotifier /
 * Api\AppNotificationController). Push goes through a faked Expo endpoint.
 */
class MobileAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    private const PICKUP_LAT = 14.0715;
    private const PICKUP_LNG = 120.6330;

    private User $passengerUser;
    private Passenger $passenger;
    private Driver $driverA;
    private Driver $driverB;

    /** What the faked Expo endpoint answers: [body, status]. */
    private array $expoReply = [['data' => []], 200];

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(['exp.host/*' => fn () => Http::response(...$this->expoReply)]);

        $this->passengerUser = User::create([
            'name' => 'Notif Passenger', 'email' => 'notif.passenger@trivora.test',
            'password' => bcrypt('password'), 'role' => 'passenger', 'is_active' => true,
        ]);
        $this->passenger = Passenger::create(['user_id' => $this->passengerUser->id, 'mobile_number' => '09170000001']);

        $this->driverA = $this->makeDriver('A', 14.0718, 120.6332);
        $this->driverB = $this->makeDriver('B', 14.0735, 120.6345);
    }

    private function makeDriver(string $suffix, float $lat, float $lng): Driver
    {
        $user = User::create([
            'name' => "Notif Driver {$suffix}", 'email' => "notif.driver.{$suffix}@trivora.test",
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        $operator = Operator::create([
            'user_id' => $user->id,
            'first_name' => 'Notif', 'last_name' => "Operator {$suffix}",
            'contact_number' => '0917000000' . strlen($suffix), 'address' => 'Nasugbu', 'barangay' => 'Brgy 8',
            'date_of_birth' => '1990-01-01', 'license_number' => "LIC-NOTIF-{$suffix}", 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id, 'plate_number' => "NTF-{$suffix}01",
            'engine_number' => "ENG-NTF-{$suffix}", 'chassis_number' => "CHS-NTF-{$suffix}",
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2021, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => "OR-NTF-{$suffix}", 'cr_number' => "CR-NTF-{$suffix}", 'status' => 'active',
        ]);
        $scheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Notif Test Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
        $issuer = User::firstOrCreate(
            ['email' => 'notif.issuer@trivora.test'],
            ['name' => 'Notif Issuer', 'password' => bcrypt('password'), 'role' => 'bplo_staff']
        );
        FranchiseScheme::create([
            'tricycle_id' => $tricycle->id, 'color_coding_scheme_id' => $scheme->id, 'issued_by' => $issuer->id,
            'franchise_number' => "FR-NTF-{$suffix}", 'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        return Driver::create([
            'user_id' => $user->id, 'operator_id' => $operator->id, 'tricycle_id' => $tricycle->id,
            'license_number' => "LIC-NOTIF-{$suffix}", 'is_online' => true, 'is_available' => true,
            'current_lat' => $lat, 'current_lng' => $lng, 'last_location_updated_at' => now(),
        ]);
    }

    private function registerToken(User $user, string $app, string $token): void
    {
        DevicePushToken::create(['user_id' => $user->id, 'app' => $app, 'token' => $token]);
    }

    private function rowsFor(User $user, ?string $event = null)
    {
        return $user->notifications()
            ->where('type', AppNotifier::TYPE)
            ->get()
            ->filter(fn ($n) => $event === null || $n->data['event'] === $event)
            ->values();
    }

    private function requestBooking(): Booking
    {
        Sanctum::actingAs($this->passengerUser);
        $response = $this->postJson('/api/v1/passenger/bookings/request', [
            'pickup_name' => 'Nasugbu Hall', 'pickup_lat' => self::PICKUP_LAT, 'pickup_lng' => self::PICKUP_LNG,
            'dropoff_name' => 'Brgy 8 Chapel', 'dropoff_lat' => 14.0703, 'dropoff_lng' => 120.6332,
            'passenger_count' => 1, 'distance_km' => 1.2,
        ])->assertCreated();

        return Booking::findOrFail($response->json('booking.id'));
    }

    private function pushedTo(string $token): array
    {
        $messages = [];
        foreach (Http::recorded() as [$request]) {
            /** @var HttpRequest $request */
            foreach ((array) $request->data() as $message) {
                if (($message['to'] ?? null) === $token) {
                    $messages[] = $message;
                }
            }
        }

        return $messages;
    }

    #[Test]
    public function dispatch_notifies_each_offered_driver_once_with_a_push(): void
    {
        $this->registerToken($this->driverA->user, 'driver', 'ExponentPushToken[driverA]');

        $booking = $this->requestBooking();

        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'booking_request'));
        $this->assertCount(1, $this->rowsFor($this->driverB->user, 'booking_request'));
        $this->assertSame($booking->id, $this->rowsFor($this->driverA->user, 'booking_request')->first()->data['record_id']);

        // Re-evaluating dispatch (every driver poll does this) never re-notifies.
        Sanctum::actingAs($this->driverA->user);
        $this->getJson('/api/v1/driver/bookings/pending')->assertOk();
        $this->getJson('/api/v1/driver/bookings/pending')->assertOk();

        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'booking_request'));
        $pushes = $this->pushedTo('ExponentPushToken[driverA]');
        $this->assertCount(1, $pushes);
        // The phone preview carries no pickup/dropoff detail.
        $this->assertStringNotContainsString('Nasugbu Hall', $pushes[0]['body']);
        $this->assertSame('booking_request', $pushes[0]['data']['event']);
    }

    #[Test]
    public function accepting_notifies_both_sides_and_withdraws_the_request_from_other_drivers(): void
    {
        $this->registerToken($this->passengerUser, 'passenger', 'ExponentPushToken[passenger]');
        $this->registerToken($this->driverB->user, 'driver', 'ExponentPushToken[driverB]');
        $booking = $this->requestBooking();

        Sanctum::actingAs($this->driverA->user);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();

        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'booking_accepted'));
        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'booking_assigned'));
        // Driver B's pending request is gone from their notification list...
        $this->assertCount(0, $this->rowsFor($this->driverB->user, 'booking_request'));
        // ...and their phone was asked to dismiss it.
        $dismiss = collect($this->pushedTo('ExponentPushToken[driverB]'))->firstWhere('data.type', 'dismiss');
        $this->assertNotNull($dismiss);
        $this->assertSame("booking_request:{$booking->id}", $dismiss['data']['group']);
        $this->assertArrayNotHasKey('title', $dismiss);

        // A late accept by driver B is rejected safely, with no extra notifications.
        Sanctum::actingAs($this->driverB->user);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertStatus(409);
        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'booking_accepted'));
        $this->assertCount(0, $this->rowsFor($this->driverB->user));
    }

    #[Test]
    public function cancellation_and_completion_notify_the_other_party(): void
    {
        $booking = $this->requestBooking();
        Sanctum::actingAs($this->driverA->user);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();

        foreach (['arrived', 'in_transit', 'completed'] as $status) {
            $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => $status])->assertOk();
        }

        $completed = $this->rowsFor($this->passengerUser, 'booking_completed');
        $this->assertCount(1, $completed);
        $this->assertSame('booking', $completed->first()->data['record_type']);
        $this->assertSame($booking->id, $completed->first()->data['record_id']);
        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'booking_completed'));

        // A passenger cancellation after acceptance reaches the assigned driver only.
        $second = $this->requestBooking();
        Sanctum::actingAs($this->driverB->user);
        $this->postJson("/api/v1/driver/bookings/{$second->id}/accept")->assertOk();
        Sanctum::actingAs($this->passengerUser);
        $this->postJson("/api/v1/passenger/bookings/{$second->id}/cancel", ['status' => 'cancelled'])->assertOk();

        $this->assertCount(1, $this->rowsFor($this->driverB->user, 'booking_cancelled'));
        $this->assertCount(0, $this->rowsFor($this->passengerUser, 'booking_cancelled'));
    }

    #[Test]
    public function fare_change_reaches_every_registered_passenger_and_driver_once_with_the_effective_time(): void
    {
        $this->registerToken($this->passengerUser, 'passenger', 'ExponentPushToken[passenger]');
        $tmo = User::create([
            'name' => 'Fare Officer', 'email' => 'fare.officer@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);

        $effective = now()->addDays(3)->setTime(6, 0);
        $this->actingAs($tmo)->post(route('tmo.fares.store'), [
            'base_fare' => 55, 'base_fare_per_passenger' => 30, 'included_distance_km' => 4, 'rate_per_km' => 6,
            'effective_date' => $effective->format('Y-m-d H:i'),
        ])->assertRedirect(route('tmo.fares'));

        $fare = FareConfiguration::latest('id')->firstOrFail();
        $label = $effective->format('F j, Y \a\t g:i A');

        foreach ([$this->passengerUser, $this->driverA->user, $this->driverB->user] as $user) {
            $rows = $this->rowsFor($user, 'fare_updated');
            $this->assertCount(1, $rows, "user {$user->id}");
            $this->assertSame('Upcoming fare change', $rows->first()->data['title']);
            $this->assertStringContainsString($label, $rows->first()->data['message']);
            $this->assertSame('upcoming', $rows->first()->data['fare_status']);
        }
        $this->assertCount(0, $this->rowsFor($tmo));
        $this->assertCount(1, $this->pushedTo('ExponentPushToken[passenger]'));

        // A repeated delivery of the same saved change creates and pushes nothing new.
        MobileNotifier::fareConfigurationSaved($fare);
        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'fare_updated'));
        $this->assertCount(1, $this->pushedTo('ExponentPushToken[passenger]'));

        // A failed save (duplicate effective date) notifies nobody.
        $this->actingAs($tmo)->post(route('tmo.fares.store'), [
            'base_fare' => 60, 'base_fare_per_passenger' => 30, 'included_distance_km' => 4, 'rate_per_km' => 6,
            'effective_date' => $effective->format('Y-m-d H:i'),
        ])->assertSessionHasErrors('effective_date');
        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'fare_updated'));
    }

    #[Test]
    public function fare_change_already_in_effect_is_labelled_as_effective(): void
    {
        $fare = FareConfiguration::create([
            'base_fare' => 50, 'base_fare_per_passenger' => 25, 'included_distance_km' => 4, 'rate_per_km' => 5,
            'effective_date' => now()->subMinute(), 'is_active' => true,
        ]);
        MobileNotifier::fareConfigurationSaved($fare);

        $row = $this->rowsFor($this->passengerUser, 'fare_updated')->first();
        $this->assertSame('New fare rates in effect', $row->data['title']);
        $this->assertStringContainsString('took effect on', $row->data['message']);
    }

    #[Test]
    public function rolled_back_operations_notify_nobody(): void
    {
        try {
            DB::transaction(function () {
                $fare = FareConfiguration::create([
                    'base_fare' => 50, 'base_fare_per_passenger' => 25, 'included_distance_km' => 4, 'rate_per_km' => 5,
                    'effective_date' => now()->addDay(), 'is_active' => true,
                ]);
                MobileNotifier::fareConfigurationSaved($fare);
                throw new \RuntimeException('save failed');
            });
        } catch (\RuntimeException) {
        }

        $this->assertCount(0, $this->rowsFor($this->passengerUser));
        Http::assertNothingSent();
    }

    #[Test]
    public function push_failure_keeps_the_in_app_notification_and_unregistered_tokens_are_removed(): void
    {
        $this->expoReply = ['down', 500];
        $this->registerToken($this->passengerUser, 'passenger', 'ExponentPushToken[passenger]');
        $booking = $this->requestBooking();
        Sanctum::actingAs($this->driverA->user);
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/accept")->assertOk();

        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'booking_accepted'));

        $this->assertNotEmpty($this->pushedTo('ExponentPushToken[passenger]'));
        $this->assertDatabaseHas('device_push_tokens', ['token' => 'ExponentPushToken[passenger]']);

        $this->expoReply = [['data' => [
            ['status' => 'error', 'message' => 'not registered', 'details' => ['error' => 'DeviceNotRegistered']],
        ]], 200];
        $this->postJson("/api/v1/driver/bookings/{$booking->id}/status", ['status' => 'cancelled'])->assertOk();

        $this->assertCount(1, $this->rowsFor($this->passengerUser, 'booking_cancelled'));
        $this->assertDatabaseMissing('device_push_tokens', ['token' => 'ExponentPushToken[passenger]']);
    }

    #[Test]
    public function violation_appeal_and_franchise_events_reach_the_affected_driver(): void
    {
        $tricycle = $this->driverA->tricycle;
        $franchise = $tricycle->franchiseScheme;
        $violation = Violation::create([
            'tricycle_id' => $tricycle->id, 'franchise_scheme_id' => $franchise->id,
            'color_coding_scheme_id' => $franchise->color_coding_scheme_id, 'violation_type' => 'color_coding',
            'detected_at' => now(), 'day_of_week' => now()->format('l'), 'detection_method' => 'manual',
            'status' => 'open', 'fine_amount' => 500,
        ]);
        MobileNotifier::violationRecorded($violation);

        $recorded = $this->rowsFor($this->driverA->user, 'violation_recorded');
        $this->assertCount(1, $recorded);
        $this->assertSame($violation->id, $recorded->first()->data['record_id']);
        $this->assertCount(0, $this->rowsFor($this->driverB->user));

        $tmo = User::create([
            'name' => 'TMO', 'email' => 'notif.tmo@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
        $appeal = ViolationAppeal::create([
            'violation_id' => $violation->id, 'driver_id' => $this->driverA->id,
            'reason' => 'I was not operating that day.', 'status' => 'under_review', 'submitted_at' => now(),
        ]);
        $violation->update(['status' => 'contested']);
        $this->actingAs($tmo)->post(route('tmo.appeals.reject', $appeal->id), ['review_notes' => 'GPS shows movement.'])
            ->assertRedirect();
        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'violation_appeal_rejected'));

        $franchise->transitionStatus(FranchiseScheme::STATUS_SUSPENDED, 'Third offense.', $tmo->id);
        $this->assertCount(1, $this->rowsFor($this->driverA->user, 'franchise_suspended'));
    }

    #[Test]
    public function the_notifications_api_is_scoped_to_the_signed_in_user_and_app(): void
    {
        AppNotifier::notify('passenger', [$this->passengerUser->id], 'fare_updated', 'P1', 'm', ['dedupe' => 't1']);
        AppNotifier::notify('passenger', [$this->passengerUser->id], 'fare_updated', 'P2', 'm', ['dedupe' => 't2']);
        AppNotifier::notify('driver', [$this->driverA->user->id], 'fare_updated', 'D1', 'm', ['dedupe' => 't1']);
        // Same dedupe key again: no duplicate row.
        AppNotifier::notify('passenger', [$this->passengerUser->id], 'fare_updated', 'P1', 'm', ['dedupe' => 't1']);

        Sanctum::actingAs($this->passengerUser);
        $list = $this->getJson('/api/v1/passenger/notifications')->assertOk();
        $this->assertSame(2, $list->json('unread_count'));
        $this->assertCount(2, $list->json('notifications'));

        $id = $list->json('notifications.0.id');
        $this->postJson("/api/v1/passenger/notifications/{$id}/read")->assertOk()->assertJsonPath('unread_count', 1);
        $this->getJson('/api/v1/passenger/notifications/unread-count')->assertJsonPath('unread_count', 1);

        // Another user's notification can't be read or marked.
        $driverRowId = $this->rowsFor($this->driverA->user)->first()->id;
        $this->postJson("/api/v1/passenger/notifications/{$driverRowId}/read")->assertNotFound();

        $this->postJson('/api/v1/passenger/notifications/read-all')->assertOk();
        $this->getJson('/api/v1/passenger/notifications/unread-count')->assertJsonPath('unread_count', 0);
        $this->assertNull($this->rowsFor($this->driverA->user)->first()->read_at);

        // The driver app lists only driver rows.
        Sanctum::actingAs($this->driverA->user);
        $this->getJson('/api/v1/driver/notifications')->assertOk()
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('notifications.0.title', 'D1');
    }

    #[Test]
    public function push_tokens_are_validated_moved_between_accounts_and_removed_on_logout(): void
    {
        Sanctum::actingAs($this->passengerUser);
        $this->postJson('/api/v1/passenger/push-token', ['token' => 'not-a-token'])->assertUnprocessable();
        $this->postJson('/api/v1/passenger/push-token', ['token' => 'ExponentPushToken[abc]', 'platform' => 'android'])->assertOk();
        $this->postJson('/api/v1/passenger/push-token', ['token' => 'ExponentPushToken[abc]', 'platform' => 'android'])->assertOk();
        $this->assertDatabaseCount('device_push_tokens', 1);

        // A passenger account can't register for the driver app's pushes.
        $this->postJson('/api/v1/driver/push-token', ['token' => 'ExponentPushToken[abc]'])->assertForbidden();

        // The same phone signs in to a driver account: the token moves, it is never shared.
        Sanctum::actingAs($this->driverA->user);
        $this->postJson('/api/v1/driver/push-token', ['token' => 'ExponentPushToken[abc]'])->assertOk();
        $this->assertDatabaseHas('device_push_tokens', ['token' => 'ExponentPushToken[abc]', 'user_id' => $this->driverA->user_id, 'app' => 'driver']);

        // Logging out of the session that registered a token removes it (a real bearer token, so
        // the actingAs user above must not linger in the guard).
        $this->app['auth']->forgetGuards();
        $plain = $this->passengerUser->createToken('passenger-app')->plainTextToken;
        $this->withToken($plain)->postJson('/api/v1/passenger/push-token', ['token' => 'ExponentPushToken[xyz]'])->assertOk();
        $this->withToken($plain)->postJson('/api/v1/passenger/logout')->assertOk();
        $this->assertDatabaseMissing('device_push_tokens', ['token' => 'ExponentPushToken[xyz]']);
    }
}
