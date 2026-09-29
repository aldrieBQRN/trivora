<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One PHYSICAL tricycle ride for QR Ride / Walk-in passengers. Each passenger's own trip
 * (destination, distance, fare, drop-off) is a normal Booking with booking_type = 'qr_walkin'
 * and ride_session_id pointing here.
 */
class RideSession extends Model
{
    public const STATUS_BOARDING = 'boarding';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    /** Statuses in which the session still occupies its tricycle. */
    public const OPEN_STATUSES = [self::STATUS_BOARDING, self::STATUS_IN_PROGRESS];

    public const END_REASON_ALL_DROPPED = 'all_dropped';
    public const END_REASON_DRIVER_ENDED = 'driver_ended';
    public const END_REASON_NO_PASSENGERS = 'no_passengers';
    public const END_REASON_EXPIRED = 'expired';
    public const END_REASON_FRANCHISE_SUSPENDED = 'franchise_suspended';

    public const ENDED_BY_DRIVER = 'driver';
    public const ENDED_BY_SYSTEM = 'system';
    public const ENDED_BY_PASSENGER = 'passenger';

    protected $fillable = [
        'session_code',
        'tricycle_id',
        'driver_id',
        'status',
        'capacity_at_start',
        'started_at',
        'ended_at',
        'end_reason',
        'ended_by',
    ];

    protected $casts = [
        'capacity_at_start' => 'integer',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function scopeOpen($query)
    {
        return $query->whereIn('status', self::OPEN_STATUSES);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    /** Every passenger trip in this ride, including ones that left or were removed. */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
