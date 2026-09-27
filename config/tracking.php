<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GPS reporting interval
    |--------------------------------------------------------------------------
    |
    | How often a driver's phone / IoT device is expected to report its location,
    | in seconds. This is the project's fixed reporting cadence (see the GPS/IoT
    | tracking plan): the driver app transmits on a fixed 5-second schedule while
    | tracking is active, with no movement/distance filter on the sending decision,
    | so a stationary unit reports just as often as a moving one.
    |
    | Informational today — no controller reads this key (the cadence itself is
    | enforced client-side by the driver app and in locationTask.ts) — so it is kept
    | as the documented single source of truth for what that cadence actually is.
    |
    */

    'gps_interval_seconds' => 5,

    /*
    |--------------------------------------------------------------------------
    | Staleness threshold
    |--------------------------------------------------------------------------
    |
    | How old the most recent location ping can be before a tricycle's tracking
    | status is considered "stale" / "signal lost" rather than "connected".
    | Deliberately independent of the reporting interval above: it is a display
    | threshold (a single missed tick — backgrounding, one network blip — shouldn't
    | immediately read as a problem) while a real outage is still flagged within a
    | few minutes. Read by the Tricycle / GpsDevice tracking-status helpers.
    |
    */

    'staleness_seconds' => 180,

    /*
    |--------------------------------------------------------------------------
    | Live Fleet Monitoring "No Signal" threshold
    |--------------------------------------------------------------------------
    |
    | Separate from `staleness_seconds` above (which drives the Final
    | Confirmation & GPS Setup "Connected"/"Stale" badge). Live Monitoring
    | status is:
    |   drivers.is_online = false                    -> Offline (immediately,
    |                                                   toggle or logout)
    |   drivers.is_online = true, GPS <= this value  -> Online
    |   drivers.is_online = true, GPS  > this value  -> No Signal
    | Units that have never sent GPS are not listed in Live Monitoring.
    |
    */

    'fleet_signal_lost_seconds' => 60,

    /*
    |--------------------------------------------------------------------------
    | Coding/restricted-day movement threshold
    |--------------------------------------------------------------------------
    |
    | How far (in meters) a tricycle must have moved from its movement anchor —
    | the first valid GPS reading received after the driver goes Online on a
    | restricted color-coding day — before a coding violation becomes eligible
    | to fire. A single reading at/beyond this distance is only a candidate; the
    | next valid reading must still be at/beyond it too before a violation is
    | actually created (see TelemetryService::hasConfirmedMovementSinceOnline()).
    |
    */

    'coding_violation_movement_threshold_meters' => 100,

];
