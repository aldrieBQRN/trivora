<?php

namespace App\Http\Controllers;

use App\Services\StaffNotifier;
use App\Support\RelativeTime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Header notification bell: the signed-in user's own workflow notifications, scoped to their
 * portal. Every query goes through $request->user()->notifications(), so one user can never read
 * or mark another user's notifications.
 */
class NotificationController extends Controller
{
    /** How many recent notifications the header dropdown shows. */
    public const DROPDOWN_LIMIT = 10;

    /**
     * Shared Inertia prop for the header bell (HandleInertiaRequests). Null for users without
     * portal notifications.
     */
    public static function sharedFor(?\App\Models\User $user): ?array
    {
        $portal = StaffNotifier::portalFor($user);
        if (!$portal) {
            return null;
        }

        // `data` is a plain TEXT column holding the notification's JSON; matching the encoded
        // pair keeps this portable (no JSON-path support needed on MySQL/TiDB).
        $query = $user->notifications()->where('data', 'like', '%"portal":"' . $portal . '"%');

        return [
            'unread_count' => (clone $query)->whereNull('read_at')->count(),
            'items' => (clone $query)->latest()->limit(self::DROPDOWN_LIMIT)->get()->map(fn ($n) => [
                'id'         => $n->id,
                'title'      => $n->data['title'] ?? '',
                'message'    => $n->data['message'] ?? '',
                'url'        => $n->data['url'] ?? null,
                'read'       => $n->read_at !== null,
                'time_label' => RelativeTime::label($n->created_at),
                'created_at' => $n->created_at?->toIso8601String(),
            ])->values(),
        ];
    }

    /** Open a notification: mark it read and go to the page it points to. */
    public function open(Request $request, string $id): RedirectResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        $url = $notification->data['url'] ?? null;
        // Only ever redirect to a path inside this app.
        if (!is_string($url) || !str_starts_with($url, '/') || str_starts_with($url, '//')) {
            return back();
        }

        return redirect($url);
    }

    public function markRead(Request $request, string $id): RedirectResponse
    {
        $request->user()->notifications()->findOrFail($id)->markAsRead();

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
