<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Violation email notifications
    |--------------------------------------------------------------------------
    |
    | When enabled, every newly recorded color-coding violation (automated GPS
    | detection in TelemetryService and the TMO's manual ticket form) emails the
    | designated TMO address below and the driver's own registered account email
    | — see App\Services\ViolationNotifier. Delivery uses the regular MAIL_*
    | settings. Off by default so no environment starts sending mail just because
    | it was deployed; turn it on explicitly once MAIL_* has been verified with a
    | controlled recipient.
    |
    */

    'emails_enabled' => filter_var(env('VIOLATION_EMAILS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    /*
    | The single TMO mailbox that receives every violation alert. Left empty, no
    | TMO email is sent (the driver email is unaffected).
    */

    'tmo_email' => env('VIOLATION_TMO_EMAIL'),

];
