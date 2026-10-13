<?php

namespace App\Services;

use App\Models\DevicePushToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

use function Illuminate\Support\defer;

/**
 * In-app + phone notifications for the passenger and driver apps. Event wording and recipients
 * live in App\Services\MobileNotifier; this class only persists and delivers.
 *
 * Records go in Laravel's existing `notifications` table (the same one the TMO/BPLO header bell
 * uses), scoped by `data.portal` = 'passenger' | 'driver' exactly like the staff portals are, so
 * neither side ever lists the other's rows.
 *
 * Guarantees:
 *  - Nothing is written or pushed for a write that rolls back: everything is registered with
 *    DB::afterCommit(), which runs immediately when no transaction is open.
 *  - Idempotent: each row's primary key is a UUIDv5 of (dedupe key, app, user), so a retried or
 *    repeated event can never create a second row, and only rows created by THIS call are pushed —
 *    the same event never rings the phone twice.
 *  - The in-app row is written before any push is attempted, and push delivery
 *    (App\Services\ExpoPushService) never touches it, so a push failure never loses a notification.
 *  - Push is deferred until after the HTTP response (like ViolationNotifier's email), and sent
 *    inline from console processes, which never run deferred callbacks.
 *  - This class never throws into the business operation that called it.
 */
class AppNotifier
{
    /** The `notifications.type` value for every mobile-app row. */
    public const TYPE = 'App\\Notifications\\MobileAppNotification';

    /** Fixed namespace for the deterministic notification ids. */
    private const UUID_NAMESPACE = '0f1d6a3c-5b8e-4a52-9a37-7c0e3f2b9d41';

    private const INSERT_CHUNK = 500;

    /** Test-only hook: when set, overrides the "defer until after the response" decision. */
    private static ?bool $deferOverride = null;

    public static function forceDeferUntilAfterResponse(?bool $defer): void
    {
        self::$deferOverride = $defer;
    }

    /**
     * Create one in-app notification per recipient and push it to their registered devices.
     *
     * @param  'passenger'|'driver'  $app
     * @param  array<int, int>  $userIds
     * @param  array{dedupe: string, record_type?: ?string, record_id?: int|string|null, group?: ?string,
     *     push_title?: ?string, push_body?: ?string, push?: bool, data?: array<string, mixed>}  $options
     */
    public static function notify(string $app, array $userIds, string $event, string $title, string $message, array $options): void
    {
        try {
            $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
            if ($userIds === []) {
                return;
            }

            $payload = array_merge($options['data'] ?? [], [
                'portal'      => $app,
                'event'       => $event,
                'title'       => $title,
                'message'     => $message,
                'record_type' => $options['record_type'] ?? null,
                'record_id'   => $options['record_id'] ?? null,
                'group'       => $options['group'] ?? null,
            ]);

            DB::afterCommit(static function () use ($app, $userIds, $payload, $options) {
                self::deliver($app, $userIds, $payload, $options);
            });
        } catch (\Throwable $e) {
            self::logFailure('App notification could not be scheduled', $event, $e);
        }
    }

    /**
     * Take back a notification that no longer applies (a ride request another driver accepted, or
     * that expired): its in-app rows are deleted for these recipients, and a silent push asks their
     * phones to dismiss the tray notification where the OS allows it.
     *
     * @param  'passenger'|'driver'  $app
     * @param  array<int, int>  $userIds
     */
    public static function withdraw(string $app, array $userIds, string $dedupe, string $group): void
    {
        try {
            $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
            if ($userIds === []) {
                return;
            }

            DB::afterCommit(static function () use ($app, $userIds, $dedupe, $group) {
                try {
                    $ids = array_map(fn (int $userId) => self::notificationId($dedupe, $app, $userId), $userIds);
                    DB::table('notifications')->whereIn('id', $ids)->delete();
                } catch (\Throwable $e) {
                    self::logFailure('App notification could not be withdrawn', $group, $e);
                }

                self::dispatchPush(static function () use ($app, $userIds, $group) {
                    $messages = self::tokensFor($app, $userIds)->map(fn (DevicePushToken $t) => [
                        'to'                => $t->token,
                        'data'              => ['type' => 'dismiss', 'group' => $group],
                        'priority'          => 'high',
                        '_contentAvailable' => true,
                    ])->values()->all();

                    ExpoPushService::send($messages);
                });
            });
        } catch (\Throwable $e) {
            self::logFailure('App notification withdrawal could not be scheduled', $group, $e);
        }
    }

    /** The deterministic id of the row a given event creates for one recipient. */
    public static function notificationId(string $dedupe, string $app, int $userId): string
    {
        return Uuid::uuid5(self::UUID_NAMESPACE, "{$dedupe}|{$app}|{$userId}")->toString();
    }

    private static function deliver(string $app, array $userIds, array $payload, array $options): void
    {
        try {
            $created = self::persist($app, $userIds, $payload, $options['dedupe']);
        } catch (\Throwable $e) {
            self::logFailure('App notification could not be stored', $payload['event'], $e);

            return;
        }

        if ($created === [] || ($options['push'] ?? true) === false) {
            return;
        }

        self::dispatchPush(static function () use ($app, $created, $payload, $options) {
            $messages = self::tokensFor($app, array_keys($created))->map(fn (DevicePushToken $t) => [
                'to'        => $t->token,
                'title'     => $options['push_title'] ?? $payload['title'],
                'body'      => $options['push_body'] ?? $payload['message'],
                'data'      => [
                    'notification_id' => $created[$t->user_id],
                    'app'             => $app,
                    'event'           => $payload['event'],
                    'record_type'     => $payload['record_type'],
                    'record_id'       => $payload['record_id'],
                    'group'           => $payload['group'],
                ],
                'sound'     => 'default',
                'priority'  => 'high',
                'channelId' => 'default',
            ])->values()->all();

            ExpoPushService::send($messages);
        });
    }

    /**
     * Inserts the rows that don't exist yet and returns them as [userId => notificationId].
     *
     * @return array<int, string>
     */
    private static function persist(string $app, array $userIds, array $payload, string $dedupe): array
    {
        $created = [];
        $now = now();
        $morphClass = (new User)->getMorphClass();
        $data = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        foreach (array_chunk($userIds, self::INSERT_CHUNK) as $chunk) {
            $ids = [];
            foreach ($chunk as $userId) {
                $ids[$userId] = self::notificationId($dedupe, $app, $userId);
            }

            $existing = DB::table('notifications')->whereIn('id', array_values($ids))->pluck('id')->all();
            $missing = array_diff($ids, $existing);
            if ($missing === []) {
                continue;
            }

            $rows = [];
            foreach ($missing as $userId => $id) {
                $rows[] = [
                    'id'              => $id,
                    'type'            => self::TYPE,
                    'notifiable_type' => $morphClass,
                    'notifiable_id'   => $userId,
                    'data'            => $data,
                    'read_at'         => null,
                    'created_at'      => $now,
                    'updated_at'      => $now,
                ];
            }

            // insertOrIgnore: a concurrent delivery of the same event that won the race keeps its
            // row; this one simply doesn't add a second.
            DB::table('notifications')->insertOrIgnore($rows);
            $created += $missing;
        }

        return $created;
    }

    /** @return \Illuminate\Support\Collection<int, DevicePushToken> */
    private static function tokensFor(string $app, array $userIds)
    {
        return DevicePushToken::where('app', $app)
            ->whereIn('user_id', $userIds)
            ->get(['user_id', 'token']);
    }

    private static function dispatchPush(\Closure $send): void
    {
        $guarded = static function () use ($send) {
            try {
                $send();
            } catch (\Throwable $e) {
                self::logFailure('App push could not be sent', null, $e);
            }
        };

        if (self::$deferOverride ?? ! app()->runningInConsole()) {
            defer($guarded, always: true);
        } else {
            $guarded();
        }
    }

    private static function logFailure(string $message, ?string $event, \Throwable $e): void
    {
        try {
            Log::error($message, array_filter([
                'event'     => $event,
                'exception' => get_class($e),
                'error'     => mb_substr($e->getMessage(), 0, 300),
            ], fn ($v) => $v !== null));
        } catch (\Throwable) {
            // Logging must never break the business operation either.
        }
    }
}
