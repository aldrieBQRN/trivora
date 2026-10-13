<?php

namespace App\Services;

use App\Models\DevicePushToken;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends phone notifications to the passenger and driver apps through the Expo Push Service
 * (https://docs.expo.dev/push-notifications/sending-notifications/). Only ever called by
 * App\Services\AppNotifier, after the in-app notification rows already exist — so a push failure
 * can never remove or hide the persistent notification.
 *
 * Guarantees:
 *  - Never throws. Failures are logged with token ids only, never the token value or access token.
 *  - Messages go out in Expo's 100-per-request batches.
 *  - Only Expo's own 429/5xx responses are retried (Expo did not accept the batch). A timeout is
 *    never retried, because Expo may already have queued that batch and a retry would show the
 *    same notification twice.
 *  - A ticket reporting DeviceNotRegistered deletes that token (the app was uninstalled or the
 *    token rotated); the app re-registers a fresh one the next time it opens.
 */
class ExpoPushService
{
    private const BATCH_SIZE = 100;

    /**
     * @param  array<int, array<string, mixed>>  $messages  Expo message objects, each with a `to` token.
     */
    public static function send(array $messages): void
    {
        if (! config('services.expo_push.enabled') || $messages === []) {
            return;
        }

        foreach (array_chunk($messages, self::BATCH_SIZE) as $batch) {
            self::sendBatch($batch);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $batch
     */
    private static function sendBatch(array $batch): void
    {
        try {
            $request = Http::acceptJson()
                ->asJson()
                ->timeout((int) config('services.expo_push.timeout', 10))
                ->retry(2, 500, fn ($e) => $e instanceof RequestException
                    && ($e->response->status() === 429 || $e->response->serverError()), throw: false);

            if ($token = config('services.expo_push.access_token')) {
                $request = $request->withToken($token);
            }

            $response = $request->post(config('services.expo_push.url'), $batch);

            if (! $response->successful()) {
                Log::warning('Expo push batch rejected.', [
                    'status'   => $response->status(),
                    'messages' => count($batch),
                ]);

                return;
            }

            self::handleTickets($batch, (array) $response->json('data', []));
        } catch (\Throwable $e) {
            Log::warning('Expo push batch failed.', [
                'messages'  => count($batch),
                'exception' => get_class($e),
            ]);
        }
    }

    /**
     * Expo returns one ticket per message, in the same order.
     *
     * @param  array<int, array<string, mixed>>  $batch
     * @param  array<int, mixed>  $tickets
     */
    private static function handleTickets(array $batch, array $tickets): void
    {
        $unregistered = [];
        $failed = 0;

        foreach ($tickets as $i => $ticket) {
            if (! is_array($ticket) || ($ticket['status'] ?? null) !== 'error') {
                continue;
            }
            $failed++;
            if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered' && isset($batch[$i]['to'])) {
                $unregistered[] = $batch[$i]['to'];
            }
        }

        if ($unregistered !== []) {
            DevicePushToken::whereIn('token', $unregistered)->delete();
        }

        if ($failed > 0) {
            Log::info('Expo push tickets reported errors.', [
                'failed'       => $failed,
                'unregistered' => count($unregistered),
            ]);
        }
    }
}
