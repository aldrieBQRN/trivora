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
        'gcash_qr_path',
        'gcash_name',
        'gcash_number',
    ];

    protected $appends = [
        'gcash_qr_url',
        'has_gcash_qr',
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

    public function getGcashQrUrlAttribute(): ?string
    {
        return $this->gcash_qr_path ? \App\Services\SecureUpload::publicUrl($this->gcash_qr_path) : null;
    }

    public function getHasGcashQrAttribute(): bool
    {
        return !empty($this->gcash_qr_path);
    }

    public function hasGcashConfigured(): bool
    {
        return !empty($this->gcash_qr_path);
    }

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

    /** QR Ride / Walk-in physical rides this driver operated. */
    public function rideSessions(): HasMany
    {
        return $this->hasMany(RideSession::class);
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

    /**
     * Determine if the driver is operationally online based on the authoritative
     * last_location_updated_at telemetry timestamp and is_online flag.
     *
     * Hierarchy:
     * - is_online = false -> false (Offline)
     * - is_online = true + telemetry age < 600s -> true (Online or No Signal, operationally active)
     * - is_online = true + telemetry age >= 600s (or missing/null) -> false (Offline)
     */
    public function isEffectivelyOnline(): bool
    {
        if (!$this->is_online) {
            return false;
        }

        if (!$this->last_location_updated_at) {
            return false;
        }

        $timeoutSeconds = (int) config('tracking.fleet_auto_offline_seconds', 600);
        return $this->last_location_updated_at->diffInSeconds(now()) < $timeoutSeconds;
    }

    /**
     * Query scope for drivers who are effectively online.
     */
    public function scopeEffectivelyOnline($query)
    {
        $timeoutSeconds = (int) config('tracking.fleet_auto_offline_seconds', 600);
        $cutoff = now()->subSeconds($timeoutSeconds);

        return $query->where('is_online', true)
            ->whereNotNull('last_location_updated_at')
            ->where('last_location_updated_at', '>=', $cutoff);
    }

    /**
     * Transition driver to offline, clearing online session anchor and availability.
     */
    public function transitionToOffline(string $reason = 'manual'): void
    {
        $this->update([
            'is_online'    => false,
            'online_since' => null,
            'is_available' => false,
        ]);
    }
}
