<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GPS reporting interval
    |--------------------------------------------------------------------------
    |
    | How often a driver's phone / IoT device is expected to report its location,
    | in seconds. This is the project's fixed reporting cadence (see the GPS/IoT
    | tracking plan) — every staleness/status threshold below is expressed as a
    | multiple of it so they scale together if the interval is ever retuned.
    |
    */

    'gps_interval_seconds' => 60,

    /*
    |--------------------------------------------------------------------------
    | Staleness threshold
    |--------------------------------------------------------------------------
    |
    | How old the most recent location ping can be before a tricycle's tracking
    | status is considered "stale" / "signal lost" rather than "connected".
    | Set to 3x the reporting interval so a single missed tick (backgrounding,
    | one network blip) doesn't immediately read as a problem, while a real
    | outage is still flagged within a few minutes.
    |
    */

    'staleness_seconds' => 180,

    /*
    |--------------------------------------------------------------------------
    | Live Fleet Monitoring online/offline threshold
    |--------------------------------------------------------------------------
    |
    | Separate from `staleness_seconds` above (which drives the Final
    | Confirmation & GPS Setup "Connected"/"Stale" badge). This threshold
    | drives the Online/Offline status shown on the TMO Live Fleet Monitoring
    | map — a tighter window since that page is about real-time visibility,
    | not one-time setup verification.
    |
    */

    'fleet_online_threshold_seconds' => 120,

];
