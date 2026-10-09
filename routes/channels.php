<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::routes([
    'prefix' => 'api/v1',
    'middleware' => [
        'auth:sanctum',
        function ($request, $next) {
            auth()->shouldUse('sanctum');
            return $next($request);
        },
    ],
]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('booking.{bookingId}', function ($user, $bookingId) {
    if (!$user) {
        return false;
    }

    $passenger = \App\Models\Passenger::where('user_id', $user->id)->first();
    if (!$passenger) {
        return false;
    }

    $booking = \App\Models\Booking::where('id', $bookingId)->first();
    if (!$booking) {
        return false;
    }

    // Only allow passenger associated with this booking
    if ((int) $booking->passenger_id !== (int) $passenger->id) {
        return false;
    }

    // Active tracking statuses only
    return in_array($booking->status, ['accepted', 'arrived', 'in_transit'], true);
}, ['guards' => ['sanctum', 'web']]);
