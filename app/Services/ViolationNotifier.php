<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\User;
use App\Models\Violation;
use App\Notifications\ColorCodingViolationDriverNotice;
use App\Notifications\ColorCodingViolationTmoAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

use function Illuminate\Support\defer;

/**
 * Emails the designated TMO mailbox and the driver when a color-coding violation is newly recorded.
 * Like StaffNotifier, it is called from the code paths that create the record
 * (TelemetryService::checkColorCoding() and DashboardController::storeViolation()), never from
 * model events, so seeders and data fixes never send mail.
 *
 * Guarantees:
 *  - Nothing is sent for a write that rolls back: delivery is registered with DB::afterCommit(),
 *    which runs immediately when no transaction is open and is discarded on rollback.
 *  - Delivery is synchronous (the deployment runs no queue worker). During an HTTP request it is
 *    deferred until after the response has been sent, so a telemetry ping or the TMO form never
 *    waits on the mail server. Console processes (the IoT gps:listen loop) never run deferred
 *    callbacks, so there it sends inline.
 *  - This class never throws. A mail failure is logged and can never undo or hide a violation that
 *    is already committed. Logs carry violation and user ids, never addresses or mail credentials.
 */
class ViolationNotifier
{
    /**
     * Domains this codebase uses for system-generated or demo accounts, which are never real
     * mailboxes: driver-app registrants who never supplied an email get driver.{id}@trivora.test
     * (Api\DriverAuthController), and seeded/demo accounts use @trivora.ph.
     */
    private const PLACEHOLDER_DOMAINS = ['trivora.test', 'trivora.ph'];

    /** RFC 2606 / RFC 6761 reserved top-level domains, never deliverable. */
    private const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost'];

    /** Test-only hook: when set, overrides the "defer until after the response" decision. */
    private static ?bool $deferOverride = null;

    public static function forceDeferUntilAfterResponse(?bool $defer): void
    {
        self::$deferOverride = $defer;
    }

    /**
     * Call right after a color-coding violation row has been successfully inserted.
     */
    public static function colorCodingViolationRecorded(Violation $violation): void
    {
        try {
            if (! config('violations.emails_enabled') || $violation->violation_type !== 'color_coding') {
                return;
            }

            $violationId = $violation->id;

            DB::afterCommit(static function () use ($violationId) {
                $send = static fn () => self::deliver($violationId);

                if (self::shouldDeferUntilAfterResponse()) {
                    // Named per violation, so the same record can never be queued twice in one request.
                    defer($send, 'violation-email-' . $violationId, always: true);
                } else {
                    $send();
                }
            });
        } catch (\Throwable $e) {
            self::logFailure('Violation email could not be scheduled', $violation->id ?? null, 'all', $e);
        }
    }

    /**
     * Whether an address is a real, deliverable mailbox rather than a missing, malformed or
     * system-generated placeholder.
     */
    public static function isDeliverableAddress(?string $email): bool
    {
        $email = trim((string) $email);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        $domain = strtolower(substr(strrchr($email, '@'), 1));
        if (in_array($domain, self::PLACEHOLDER_DOMAINS, true)) {
            return false;
        }

        $tld = substr(strrchr('.' . $domain, '.'), 1);

        return ! in_array($tld, self::RESERVED_TLDS, true);
    }

    private static function shouldDeferUntilAfterResponse(): bool
    {
        return self::$deferOverride ?? ! app()->runningInConsole();
    }

    private static function deliver(int $violationId): void
    {
        try {
            $violation = Violation::with([
                'tricycle.operator',
                'franchiseScheme',
                'locationSnapshot',
            ])->find($violationId);

            if (! $violation) {
                Log::warning('Violation email skipped: violation no longer exists.', ['violation_id' => $violationId]);

                return;
            }

            // Belt and braces for the one-per-tricycle-per-day rule: the violations_color_coding_daily_unique
            // index already rejects a same-day duplicate before this is ever reached, but its migration
            // tolerates environments where the index could not be created. Only the first record of
            // the day is ever announced.
            if (self::hasEarlierSameDayViolation($violation)) {
                Log::info('Violation email skipped: an earlier color-coding violation exists for this tricycle on the same date.', [
                    'violation_id' => $violation->id,
                ]);

                return;
            }

            $driver = self::resolveDriver($violation);
            $details = self::details($violation, $driver);
        } catch (\Throwable $e) {
            self::logFailure('Violation email could not be prepared', $violationId, 'all', $e);

            return;
        }

        self::sendToTmo($violation, $details);
        self::sendToDriver($violation, $driver, $details);
    }

    private static function sendToTmo(Violation $violation, array $details): void
    {
        $address = trim((string) config('violations.tmo_email'));

        if ($address === '' || filter_var($address, FILTER_VALIDATE_EMAIL) === false) {
            Log::warning('Violation TMO email skipped: VIOLATION_TMO_EMAIL is missing or invalid.', [
                'violation_id' => $violation->id,
            ]);

            return;
        }

        try {
            Notification::route('mail', $address)->notify(new ColorCodingViolationTmoAlert($details));
            self::logSent($violation->id, 'tmo');
        } catch (\Throwable $e) {
            self::logFailure('Violation TMO email failed', $violation->id, 'tmo', $e);
        }
    }

    private static function sendToDriver(Violation $violation, ?Driver $driver, array $details): void
    {
        $user = $driver?->user;

        if (! $user) {
            Log::info('Violation driver email skipped: no driver account is linked to this tricycle.', [
                'violation_id' => $violation->id,
            ]);

            return;
        }

        if (! self::isDeliverableAddress($user->email)) {
            Log::info('Violation driver email skipped: the driver has no deliverable registered email.', [
                'violation_id' => $violation->id,
                'user_id'      => $user->id,
            ]);

            return;
        }

        try {
            Notification::send($user, new ColorCodingViolationDriverNotice($details));
            self::logSent($violation->id, 'driver', $user->id);
        } catch (\Throwable $e) {
            self::logFailure('Violation driver email failed', $violation->id, 'driver', $e, $user->id);
        }
    }

    /**
     * The driver tied to the violation's tricycle: first the Driver row on that tricycle (the same
     * lookup the movement rule uses to find the online session that produced the detection), then
     * the operator's Driver row, which is how the driver's own violation list resolves it
     * (Api\DriverViolationController). Never guessed beyond these recorded links. Also used by
     * App\Services\MobileNotifier, so the email and the in-app notice reach the same driver.
     */
    public static function resolveDriver(Violation $violation): ?Driver
    {
        $driver = Driver::with('user')->where('tricycle_id', $violation->tricycle_id)->first();

        if (! $driver && $violation->tricycle?->operator_id) {
            $driver = Driver::with('user')->where('operator_id', $violation->tricycle->operator_id)->first();
        }

        return $driver;
    }

    private static function hasEarlierSameDayViolation(Violation $violation): bool
    {
        if (! $violation->detected_at) {
            return false;
        }

        return Violation::where('tricycle_id', $violation->tricycle_id)
            ->where('violation_type', 'color_coding')
            ->whereDate('detected_at', $violation->detected_at->toDateString())
            ->where('id', '<', $violation->id)
            ->exists();
    }

    /**
     * Plain values for both emails. Deliberately excludes the record's free-text notes (internal
     * TMO notes on manual tickets) and any movement/anchor detection internals.
     *
     * @return array<string, mixed>
     */
    private static function details(Violation $violation, ?Driver $driver): array
    {
        $tricycle = $violation->tricycle;
        $detectedAt = $violation->detected_at?->copy()->timezone(config('app.timezone'));
        $timezone = config('app.timezone');

        return [
            'violation_id'     => $violation->id,
            'tmo_reference'    => 'VIO-26-' . str_pad((string) $violation->id, 4, '0', STR_PAD_LEFT),
            'driver_reference' => 'CITE-' . str_pad((string) $violation->id, 5, '0', STR_PAD_LEFT),
            'driver_name'      => $driver?->user?->name ?: null,
            'owner_name'       => $tricycle?->operator?->full_name ?: null,
            'plate_number'     => $tricycle?->plate_number ?: null,
            'sticker_number'   => $tricycle?->coding_scheme_number ?: null,
            'franchise_number' => $violation->franchiseScheme?->franchise_number ?: null,
            'make_model'       => $tricycle ? (trim(($tricycle->make ?? '') . ' ' . ($tricycle->model ?? '')) ?: null) : null,
            'type_label'       => ucwords(str_replace('_', ' ', (string) $violation->violation_type)) . ' Violation',
            'description'      => $violation->day_of_week
                ? "Operating a tricycle on its restricted color-coding day ({$violation->day_of_week})."
                : 'Operating a tricycle on its restricted color-coding day.',
            'recorded_via'     => $violation->detection_method === 'manual'
                ? 'Logged by TMO personnel'
                : 'Automated GPS monitoring',
            'date'             => $detectedAt?->format('F j, Y'),
            'time'             => $detectedAt
                ? $detectedAt->format('g:i A') . ($timezone === 'Asia/Manila' ? ' (Philippine Time)' : " ({$timezone})")
                : null,
            'location'         => self::recordedLocation($violation),
            'fine_amount'      => $violation->fine_amount !== null
                ? '₱' . number_format((float) $violation->fine_amount, 2)
                : null,
            'status_label'     => self::statusLabel($violation),
            'tmo_url'          => route('tmo.violations.details', $violation->id),
            'driver_portal_url' => route('operator.violations'),
        ];
    }

    /**
     * Coordinates are shown only when the record itself proves they are where the violation
     * happened: an automated detection stores the very ping that triggered it, stamped with that
     * ping's own time. A manual ticket links the unit's latest ping of any age, which is not the
     * violation location, so it is never shown as one.
     *
     * @return array{latitude: string, longitude: string, map_url: string}|null
     */
    private static function recordedLocation(Violation $violation): ?array
    {
        $ping = $violation->locationSnapshot;

        if ($violation->detection_method !== 'automated' || ! $ping || ! $ping->recorded_at || ! $violation->detected_at) {
            return null;
        }

        if ($ping->recorded_at->timestamp !== $violation->detected_at->timestamp) {
            return null;
        }

        $lat = (float) $ping->latitude;
        $lng = (float) $ping->longitude;

        if (($lat === 0.0 && $lng === 0.0) || abs($lat) > 90 || abs($lng) > 180) {
            return null;
        }

        $latitude = number_format($lat, 6, '.', '');
        $longitude = number_format($lng, 6, '.', '');

        return [
            'latitude'  => $latitude,
            'longitude' => $longitude,
            'map_url'   => "https://www.google.com/maps?q={$latitude},{$longitude}",
        ];
    }

    private static function statusLabel(Violation $violation): string
    {
        if ($violation->fine_paid_at) {
            return 'Fine paid';
        }

        return match ($violation->status) {
            'open'         => 'Open — fine unpaid',
            'acknowledged' => 'Acknowledged — fine unpaid',
            'contested'    => 'Under appeal',
            'resolved'     => 'Resolved',
            'dismissed'    => 'Dismissed',
            default        => ucfirst((string) $violation->status),
        };
    }

    private static function logSent(int $violationId, string $recipient, ?int $userId = null): void
    {
        // "Handed to the mailer" is all a synchronous send can confirm; the mailer name makes it
        // obvious when an environment is only writing mail to the log.
        Log::info('Violation email handed to the mailer.', array_filter([
            'violation_id' => $violationId,
            'recipient'    => $recipient,
            'user_id'      => $userId,
            'mailer'       => config('mail.default'),
        ], fn ($value) => $value !== null));
    }

    private static function logFailure(string $message, ?int $violationId, string $recipient, \Throwable $e, ?int $userId = null): void
    {
        try {
            Log::error($message, array_filter([
                'violation_id' => $violationId,
                'recipient'    => $recipient,
                'user_id'      => $userId,
                'mailer'       => config('mail.default'),
                'exception'    => get_class($e),
                'error'        => self::sanitize($e->getMessage()),
            ], fn ($value) => $value !== null));
        } catch (\Throwable) {
            // Logging must never break violation recording either.
        }
    }

    /**
     * Strip anything sensitive a transport error message may echo back: the configured mail
     * credentials and any email address (recipients are identified by user id instead).
     */
    private static function sanitize(string $message): string
    {
        $secrets = array_filter([
            config('mail.mailers.smtp.username'),
            config('mail.mailers.smtp.password'),
            config('mail.mailers.smtp.url'),
        ], fn ($value) => is_string($value) && $value !== '');

        foreach ($secrets as $secret) {
            $message = str_replace($secret, '[redacted]', $message);
        }

        $message = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[email]', $message) ?? '';

        return mb_substr($message, 0, 500);
    }
}
