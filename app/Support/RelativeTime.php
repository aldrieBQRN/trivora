<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * The one relative-time wording used across the web portals ("5 secs ago", "1 min ago",
 * "3 hrs ago", "Yesterday", "4 days ago", then the date), measured against the server clock and
 * bucketed on the app's configured timezone. Used by Live Monitoring's "Last update" and the header
 * notification bell.
 */
class RelativeTime
{
    public static function label(CarbonInterface $moment): string
    {
        $tz = config('app.timezone');
        $now = now($tz);
        $local = $moment->copy()->setTimezone($tz);
        // A clock slightly ahead of the server gives a negative age: that is simply "now".
        $seconds = max(0, (int) floor($local->diffInSeconds($now)));
        $plural = fn (int $n, string $unit) => $n . ' ' . $unit . ($n === 1 ? '' : 's') . ' ago';

        if ($seconds < 60) {
            return $plural($seconds, 'sec');
        }
        if ($seconds < 3600) {
            return $plural(intdiv($seconds, 60), 'min');
        }
        if ($local->isSameDay($now)) {
            return $plural(intdiv($seconds, 3600), 'hr');
        }
        if ($local->isSameDay($now->copy()->subDay())) {
            return 'Yesterday';
        }
        $days = (int) $local->copy()->startOfDay()->diffInDays($now->copy()->startOfDay());
        if ($days < 7) {
            return $days . ' days ago';
        }

        return $local->format($local->year === $now->year ? 'M j' : 'M j, Y');
    }
}
