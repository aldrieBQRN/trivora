<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'overpass' => [
        'url' => env('OVERPASS_URL', env('OVERPASS_API_URL', 'https://overpass-api.de/api/interpreter')),
        'timeout' => (int) env('OVERPASS_TIMEOUT', 3),
        'enable_fallback' => env('OVERPASS_ENABLE_FALLBACK', null),
    ],

    // Public link to the latest Trivora Driver Android build (an EAS build/APK URL). Shown as the
    // "Download Driver App" card in the Driver panel sidebar; the card is hidden while unset.
    'driver_app' => [
        'download_url' => env('DRIVER_APP_DOWNLOAD_URL'),
    ],

];
