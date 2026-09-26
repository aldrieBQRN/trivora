<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_code',
        'passenger_id',
        'driver_id',
        'tricycle_id',
        'toda_zone_id',
        'pickup_name',
        'pickup_lat',
        'pickup_lng',
        'dropoff_name',
        'dropoff_lat',
        'dropoff_lng',
        'fare_amount',
        'passenger_count',
        'fare_per_passenger',
        'distance_km',
        'estimated_duration_mins',
        'passenger_notes',
        'status',
        'payment_method',
        'payment_status',
        'cancelled_by',
        'cancellation_reason',
        'dispatched_driver_id',
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
        'fare_amount' => 'float',
        'passenger_count' => 'integer',
        'fare_per_passenger' => 'float',
        'distance_km' => 'float',
        'estimated_duration_mins' => 'integer',
        'dispatched_at' => 'datetime',
        'requested_at' => 'datetime',
        'accepted_at' => 'datetime',
        'arrived_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected $appends = ['dispatch_state'];

    /**
     * Backend-authoritative summary of where this booking sits in the sequential dispatch cycle,
     * so the Passenger app can render "Driver Found / Waiting for acceptance" vs "Searching for a
     * driver..." from server state instead of a local timer. Only meaningful while still 'pending'
     * — 'driver_found' means a specific driver currently holds an active (non-expired) offer;
     * 'searching' covers both "between offers" and "no eligible driver right now", since dispatch
     * re-targets synchronously on every evaluation and there is no separate persisted "idle"
     * state to distinguish them.
     */
    public function getDispatchStateAttribute(): ?string
    {
        if ($this->status !== 'pending') {
            return null;
        }

        return $this->dispatched_driver_id ? 'driver_found' : 'searching';
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

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    public function todaZone(): BelongsTo
    {
        return $this->belongsTo(TodaZone::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(RideRating::class);
    }
}
