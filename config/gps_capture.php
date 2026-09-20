<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GPS raw packet capture port (DEVELOPMENT ONLY)
    |--------------------------------------------------------------------------
    |
    | Used only by `php artisan gps:capture` — a temporary tool for inspecting the real ST-901L
    | wire protocol before a parser is written. Unrelated to any production IoT ingestion route
    | or port; nothing in TelemetryService, gps_devices, or any production code path reads this.
    |
    */

    'port' => env('GPS_CAPTURE_PORT', 9001),

];
