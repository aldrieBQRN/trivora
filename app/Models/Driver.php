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
        'online_since',
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
        'online_since' => 'datetime',
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
     * The driver's latest stored GPS heading (tricycle_locations.heading_deg, degrees 0-360) —
     * the raw device heading the Driver App uploaded, never a computed bearing. Null when the
     * tricycle has no location record or the latest record carries no heading. Not serialized by
     * default: booking responses opt in with ->append('heading_deg') so passengers can orient the
     * driver's map marker to the real direction of travel.
     */
    public function getHeadingDegAttribute(): ?int
    {
        if (!$this->tricycle_id) {
            return null;
        }

        $heading = TricycleLocation::where('tricycle_id', $this->tricycle_id)
            ->latest('recorded_at')
            ->value('heading_deg');

        return $heading === null ? null : (int) $heading;
    }

    /**
     * The franchise (permit) this driver's assigned tricycle currently holds — the tricycle's
     * one CURRENT FranchiseScheme record (Tricycle::franchiseScheme(), scoped to is_active=true).
     * Null when the driver has no tricycle assignment, or the tricycle has no current franchise
     * (e.g. a renewal mid-process, between BPLO release and TMO Final Confirmation).
     */
    public function franchise(): ?FranchiseScheme
    {
        return $this->tricycle?->franchiseScheme;
    }

    /**
     * Whether this driver is currently authorized to operate: go Online, accept/perform
     * bookings, transmit GPS telematics. Operational authorization belongs to the FRANCHISE, not
     * the individual driver account — a driver whose franchise was suspended/revoked by TMO
     * cannot operate even though their own account/login is untouched. The single check every
     * enforcement point (EnsureFranchiseIsOperational middleware, BookingDispatchService, ...)
     * consults, so the rule is defined in exactly one place.
     */
    public function canOperate(): bool
    {
        return $this->franchise()?->canOperate() ?? false;
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

        $distKm = \App\Services\GeoService::haversineKm(
            (float) $this->current_lat,
            (float) $this->current_lng,
            $pickupLat,
            $pickupLng
        );

        return $distKm <= $maxRadiusKm;
    }
}
