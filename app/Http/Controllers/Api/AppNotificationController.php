<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DevicePushToken;
use App\Models\Driver;
use App\Models\Passenger;
use App\Services\AppNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * In-app notifications and push-token registration for the passenger and driver apps (shared,
 * registered under both route groups). The app is decided by the route group, never by the
 * client, and every query goes through $request->user()->notifications() scoped to that app's
 * portal — one user can never read or mark another user's (or the other app's) notifications.
 */
class AppNotificationController extends Controller
{
    private const PER_PAGE = 30;

    public function index(Request $request): JsonResponse
    {
        $app = $this->app($request);
        $page = $this->query($request, $app)->latest()->paginate(self::PER_PAGE);

        return response()->json([
            'notifications' => collect($page->items())->map(fn (DatabaseNotification $n) => $this->present($n))->values(),
            'unread_count'  => $this->query($request, $app)->whereNull('read_at')->count(),
            'current_page'  => $page->currentPage(),
            'last_page'     => $page->lastPage(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => $this->query($request, $this->app($request))->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $app = $this->app($request);
        $notification = $this->query($request, $app)->findOrFail($id);
        $notification->markAsRead();

        return response()->json([
            'notification' => $this->present($notification),
            'unread_count' => $this->query($request, $app)->whereNull('read_at')->count(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $this->query($request, $this->app($request))->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['unread_count' => 0]);
    }

    /**
     * Register (or refresh) this device's Expo push token for the signed-in account. Idempotent:
     * the token is unique, so re-registering just refreshes it, and a phone that signs in to a
     * different account moves its token there instead of notifying both accounts.
     */
    public function registerPushToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'    => ['required', 'string', 'max:255', function ($attribute, $value, $fail) {
                if (! DevicePushToken::isValidToken($value)) {
                    $fail('Invalid push token.');
                }
            }],
            'platform' => 'nullable|string|in:ios,android,web',
        ]);

        $user = $request->user();
        $app = $this->app($request);
        // Only an account that actually uses this app may receive its pushes.
        $belongs = $app === DevicePushToken::APP_DRIVER
            ? Driver::where('user_id', $user->id)->exists()
            : ($user->role === 'passenger' || Passenger::where('user_id', $user->id)->exists());
        abort_unless($belongs, 403, 'This account does not use this app.');

        $accessToken = $user->currentAccessToken();

        DevicePushToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id'                  => $user->id,
                'app'                      => $app,
                'platform'                 => $validated['platform'] ?? null,
                'personal_access_token_id' => $accessToken instanceof PersonalAccessToken ? $accessToken->id : null,
                'last_registered_at'       => now(),
            ]
        );

        return response()->json(['message' => 'Push token registered.']);
    }

    public function unregisterPushToken(Request $request): JsonResponse
    {
        $validated = $request->validate(['token' => 'required|string|max:255']);

        DevicePushToken::where('token', $validated['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Push token removed.']);
    }

    /** 'passenger' | 'driver', from the route group this request came through. */
    private function app(Request $request): string
    {
        return $request->is('*passenger*') ? DevicePushToken::APP_PASSENGER : DevicePushToken::APP_DRIVER;
    }

    private function query(Request $request, string $app)
    {
        // `data` is a plain TEXT column holding the notification's JSON; matching the encoded
        // pair keeps this portable (same approach as the staff header bell).
        return $request->user()->notifications()
            ->where('type', AppNotifier::TYPE)
            ->where('data', 'like', '%"portal":"' . $app . '"%');
    }

    private function present(DatabaseNotification $n): array
    {
        $data = $n->data;

        return [
            'id'           => $n->id,
            'event'        => $data['event'] ?? null,
            'title'        => $data['title'] ?? '',
            'message'      => $data['message'] ?? '',
            'record_type'  => $data['record_type'] ?? null,
            'record_id'    => $data['record_id'] ?? null,
            'effective_at' => $data['effective_at'] ?? null,
            'read'         => $n->read_at !== null,
            'read_at'      => $n->read_at?->toIso8601String(),
            'created_at'   => $n->created_at?->toIso8601String(),
        ];
    }
}
