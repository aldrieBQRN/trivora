<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tricycle extends Model
{
    protected $fillable = [
        'operator_id',
        'toda_zone_id',
        'coding_scheme_number',
        'plate_number',
        'engine_number',
        'chassis_number',
        'make',
        'model',
        'year_model',
        'body_color',
        'body_type',
        'or_number',
        'cr_number',
        'status',
        'iot_device_id',
        'tracking_capability',
        'active_tracking_mode',
    ];

    protected $appends = [
        'coding_scheme_number',
        'body_number',
        'tricycle_number',
    ];

    protected function casts(): array
    {
        return [
            'year_model' => 'integer',
        ];
    }

    /**
     * Get the Tricycle Number Coding Scheme dynamically.
     */
    public function getCodingSchemeNumberAttribute($value)
    {
        if (!empty($value)) {
            return $value;
        }

        // Demo seed tricycles mapped to authentic 4-digit coding scheme numbers (Red: ends in 1)
        if ($this->plate_number === 'DEMO-0001') return '0081';
        if ($this->plate_number === 'DEMO-0002') return '0101';
        if ($this->plate_number === 'DEMO-0003') return '0011';

        $fallback = $this->franchiseScheme?->franchise_number;
        // Never use franchise application numbers (e.g. FRAN-DEMO-0003 or FS-...) as a coding scheme number
        if ($fallback && !str_starts_with($fallback, 'FRAN-') && !str_starts_with($fallback, 'FS-')) {
            return $fallback;
        }

        return null;
    }

    /**
     * Legacy accessor alias for backward compatibility.
     */
    public function getBodyNumberAttribute()
    {
        return $this->coding_scheme_number;
    }

    /**
     * Get the tricycle number dynamically from the active franchise scheme.
     */
    public function getTricycleNumberAttribute()
    {
        return $this->franchiseScheme?->franchise_number;
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The operator who owns this tricycle.
     */
    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    /**
     * The TODA zone this tricycle is assigned to.
     */
    public function todaZone(): BelongsTo
    {
        return $this->belongsTo(TodaZone::class, 'toda_zone_id');
    }

    /**
     * All franchise applications submitted for this tricycle.
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * The current active franchise scheme for this tricycle.
     */
    public function franchiseScheme(): HasOne
    {
        return $this->hasOne(FranchiseScheme::class)->where('is_active', true);
    }

    /**
     * All franchise schemes ever issued to this tricycle.
     */
    public function franchiseSchemes(): HasMany
    {
        return $this->hasMany(FranchiseScheme::class);
    }

    /**
     * The currently paired physical GPS tracker, if any (gps_devices is the source of truth for
     * device identity — tricycles.iot_device_id stays only as a human-facing display copy set at
     * Final Confirmation time). Null for a tricycle that has never had an IoT device paired, or
     * whose device was unpaired/reassigned elsewhere.
     */
    public function gpsDevice(): HasOne
    {
        return $this->hasOne(GpsDevice::class)->where('status', 'paired');
    }

    /**
     * Every physical device ever paired to this tricycle, including ones since unpaired/
     * reassigned/revoked — kept for history, never deleted on reassignment.
     */
    public function gpsDevices(): HasMany
    {
        return $this->hasMany(GpsDevice::class);
    }

    /**
     * GPS location history for this tricycle.
     */
    public function locations(): HasMany
    {
        return $this->hasMany(TricycleLocation::class)->orderByDesc('recorded_at');
    }

    /**
     * The most recent GPS location ping.
     */
    public function latestLocation(): HasOne
    {
        return $this->hasOne(TricycleLocation::class)->latestOfMany('recorded_at');
    }

    /**
     * All violations incurred by this tricycle.
     */
    public function violations(): HasMany
    {
        return $this->hasMany(Violation::class);
    }

    /**
     * Open (unresolved) violations for this tricycle.
     */
    public function openViolations(): HasMany
    {
        return $this->hasMany(Violation::class)->where('status', 'open');
    }

    /**
     * Real GPS connectivity status, derived only from actual TricycleLocation pings — never
     * implied by tracking_method/active_tracking_mode being set. A tricycle that has never sent
     * a real ping is 'awaiting', never 'connected'. See config/tracking.php for the threshold.
     *
     * @return array{status: 'awaiting'|'connected'|'stale', last_seen_at: ?\Illuminate\Support\Carbon}
     */
    public function gpsStatus(): array
    {
        $latest = $this->latestLocation;

        if (!$latest) {
            return ['status' => 'awaiting', 'last_seen_at' => null];
        }

        $stalenessSeconds = config('tracking.staleness_seconds', 180);
        $ageSeconds = $latest->recorded_at->diffInSeconds(now());

        return [
            'status'       => $ageSeconds < $stalenessSeconds ? 'connected' : 'stale',
            'last_seen_at' => $latest->recorded_at,
        ];
    }
}
