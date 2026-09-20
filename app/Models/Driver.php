<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'operator_id',
        'tricycle_id',
        'license_number',
        'mobile_number',
        'is_online',
        'is_available',
        'current_lat',
        'current_lng',
        'last_location_updated_at',
        'rating',
        'total_trips',
        'today_earnings',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'is_available' => 'boolean',
        'current_lat' => 'float',
        'current_lng' => 'float',
        'rating' => 'float',
        'total_trips' => 'integer',
        'today_earnings' => 'float',
        'last_location_updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the driver's assigned TODA Zone ID.
     */
    public function getTodaZoneIdAttribute(): ?int
    {
        return $this->getTodaZoneId();
    }

    /**
     * Resolve assigned TODA Zone ID via tricycle or operator.
     */
    public function getTodaZoneId(): ?int
    {
        if ($this->tricycle_id) {
            $tricycle = Tricycle::find($this->tricycle_id);
            if ($tricycle && $tricycle->toda_zone_id) {
                return (int) $tricycle->toda_zone_id;
            }
        }

        if ($this->operator_id) {
            $operator = Operator::find($this->operator_id);
            if ($operator && $operator->toda_id) {
                return (int) $operator->toda_id;
            }
        }

        return null;
    }

    /**
     * Check if driver is currently within maximum service area coverage distance of a location.
     */
    public function isWithinCoverage(float $pickupLat, float $pickupLng, float $maxRadiusKm = 3.0): bool
    {
        if ($this->current_lat === null || $this->current_lng === null) {
            // Default to true if GPS has not pinged yet to avoid blocking valid online drivers
            return true;
        }

        $distKm = \App\Services\TodaRouteMatcher::haversineKm(
            (float) $this->current_lat,
            (float) $this->current_lng,
            $pickupLat,
            $pickupLng
        );

        return $distKm <= $maxRadiusKm;
    }
}
