<?php

namespace App\Models;

use App\Services\GeoService;
use App\Services\RouteDistanceService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Cache;

class Booking extends Model
{
    use HasFactory;

    /** A normal requested booking (dispatch flow) — every pre-QR row is this type. */
    public const TYPE_BOOKING = 'booking';

    /** A QR Ride / Walk-in passenger trip, grouped under a RideSession. */
    public const TYPE_QR_WALKIN = 'qr_walkin';

    /** A Manual Ride: recorded by the driver for a walk-in passenger with no account (passenger_id NULL). */
    public const TYPE_MANUAL = 'manual';

    public const PAYMENT_METHOD_CASH = 'cash';
    public const PAYMENT_METHOD_GCASH = 'gcash';

    public const PAYMENT_STATUS_UNPAID = 'unpaid';
    public const PAYMENT_STATUS_PAYMENT_SUBMITTED = 'payment_submitted';
    public const PAYMENT_STATUS_PAID = 'paid';

    protected $fillable = [
        'booking_code',
        'booking_type',
        'passenger_id',
        'driver_id',
        'tricycle_id',
        'ride_session_id',
        'pickup_name',
        'pickup_lat',
        'pickup_lng',
        'dropoff_name',
        'dropoff_lat',
        'dropoff_lng',
        'dropped_off_lat',
        'dropped_off_lng',
        'fare_amount',
        'passenger_count',
        'fare_per_passenger',
        'distance_km',
        'distance_source',
        'estimated_duration_mins',
        'passenger_notes',
        'walk_in_name',
        'status',
        'payment_method',
        'payment_status',
        'payment_reference',
        'payment_amount_received',
        'payment_change_amount',
        'paid_at',
        'cancelled_by',
        'cancellation_reason',
        'dispatched_driver_id',
        'dispatch_round',
        'dispatched_at',
        'requested_at',
        'accepted_at',
        'arrived_at',
        'started_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'pickup_lat' => 'float',
        'pickup_lng' => 'float',
        'dropoff_lat' => 'float',
        'dropoff_lng' => 'float',
        'dropped_off_lat' => 'float',
        'dropped_off_lng' => 'float',
        'fare_amount' => 'float',
        'passenger_count' => 'integer',
        'fare_per_passenger' => 'float',
        'distance_km' => 'float',
        'payment_amount_received' => 'float',
        'payment_change_amount' => 'float',
        'paid_at' => 'datetime',
        'estimated_duration_mins' => 'integer',
        'dispatch_round' => 'integer',
        'dispatched_at' => 'datetime',
        'requested_at' => 'datetime',
        'accepted_at' => 'datetime',
        'arrived_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected $appends = ['dispatch_state', 'dispatch_radius_m', 'dispatch_round_remaining_seconds'];

    /**
     * Backend-authoritative summary of where this booking sits in the dispatch cycle.
     */
    public function getDispatchStateAttribute(): ?string
    {
        if ($this->status !== 'pending') {
            return null;
        }

        $hasActiveOffers = $this->relationLoaded('dispatchOffers')
            ? $this->dispatchOffers->contains('status', BookingDispatchOffer::STATUS_OFFERED)
            : ($this->dispatchOffers()->where('status', BookingDispatchOffer::STATUS_OFFERED)->exists() || !empty($this->dispatched_driver_id));

        return $hasActiveOffers ? 'driver_found' : 'searching';
    }

    public function getDispatchRadiusMAttribute(): int
    {
        return match ((int) ($this->dispatch_round ?: 1)) {
            1 => 500,
            2 => 1000,
            default => 2000,
        };
    }

    public function getDispatchRoundRemainingSecondsAttribute(): int
    {
        if ($this->status !== 'pending' || !$this->dispatched_at) {
            return 0;
        }
        $elapsed = $this->dispatched_at->diffInSeconds(now());
        return max(0, 20 - $elapsed);
    }

    /**
     * Road distance and drive time from the assigned driver's last reported position to the
     * pick-up point — the single figure both mobile apps show while the driver is heading there,
     * so they always agree. Only while 'accepted'; null otherwise or without a driver GPS fix.
     *
     * Deliberately not an $appends accessor: it can call OSRM, so it's attached only to the
     * active-ride responses and the live location event, and cached per exact driver fix (below),
     * so the location upload and both apps' polls for the same fix share one lookup.
     *
     * @return array{pickup_distance_km: float, pickup_eta_mins: int}|null
     */
    public function pickupEta(): ?array
    {
        $driver = $this->driver;
        if ($this->status !== 'accepted' || !$driver
            || $driver->current_lat === null || $driver->current_lng === null
            || $this->pickup_lat === null || $this->pickup_lng === null) {
            return null;
        }

        // Practically at the pick-up point: report the real straight-line gap. Routing such a short
        // hop is pointless, and RouteDistanceService treats near-identical points as "routing
        // unavailable" and returns its 0.8 km fare floor, which would be wrong here.
        $straightKm = GeoService::haversineKm(
            (float) $driver->current_lat,
            (float) $driver->current_lng,
            (float) $this->pickup_lat,
            (float) $this->pickup_lng
        );
        if ($straightKm < 0.05) {
            return ['pickup_distance_km' => round($straightKm, 3), 'pickup_eta_mins' => 1];
        }

        // Cached per EXACT stored driver fix (not RouteDistanceService's ~11 m grid, which would
        // reuse a figure from a slightly different position): the location upload computes it once,
        // and both apps' polls — which read the same stored coordinates — get that same figure.
        $cacheKey = sprintf('pickup_eta:%d:%s,%s', $this->id, $driver->current_lat, $driver->current_lng);

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($driver) {
            try {
                $route = app(RouteDistanceService::class)->calculateDistance(
                    (float) $driver->current_lat,
                    (float) $driver->current_lng,
                    (float) $this->pickup_lat,
                    (float) $this->pickup_lng,
                    useCache: false
                );
            } catch (\InvalidArgumentException) {
                return null;
            }

            // Exact meters (km to 3 decimals) so both apps show whole meters under 1 km and km to
            // 2 decimals above — never a nearby driver collapsing to "0 km".
            return [
                'pickup_distance_km' => round($route['distance_m'] / 1000, 3),
                'pickup_eta_mins' => $route['duration_mins'],
            ];
        });
    }

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(Passenger::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function dispatchedDriver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'dispatched_driver_id');
    }

    public function dispatchOffers(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(BookingDispatchOffer::class);
    }

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /** The physical ride this QR walk-in trip belongs to (null for normal bookings). */
    public function rideSession(): BelongsTo
    {
        return $this->belongsTo(RideSession::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(RideRating::class);
    }
}
