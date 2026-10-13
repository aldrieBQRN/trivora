<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An Expo push token registered by the passenger or driver app for one signed-in device. See the
 * create_device_push_tokens_table migration and App\Services\ExpoPushService.
 */
class DevicePushToken extends Model
{
    public const APP_PASSENGER = 'passenger';
    public const APP_DRIVER = 'driver';

    protected $fillable = [
        'user_id',
        'app',
        'token',
        'platform',
        'personal_access_token_id',
        'last_registered_at',
    ];

    protected $casts = [
        'last_registered_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Expo's own token format — anything else is never sent to the push service. */
    public static function isValidToken(?string $token): bool
    {
        return is_string($token) && preg_match('/^(ExponentPushToken|ExpoPushToken)\[[^\]\s]+\]$/', $token) === 1;
    }
}
