<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Violation extends Model
{
    protected $fillable = [
        'tricycle_id',
        'franchise_scheme_id',
        'color_coding_scheme_id',
        'location_snapshot_id',
        'detected_by',
        'violation_type',
        'detected_at',
        'day_of_week',
        'detection_method',
        'status',
        'fine_amount',
        'fine_paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'detected_at'  => 'datetime',
            'fine_amount'  => 'decimal:2',
            'fine_paid_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeAutomated($query)
    {
        return $query->where('detection_method', 'automated');
    }

    public function scopeManual($query)
    {
        return $query->where('detection_method', 'manual');
    }

    public function scopeColorCoding($query)
    {
        return $query->where('violation_type', 'color_coding');
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Whether the fine has been settled.
     */
    public function getIsFinePaidAttribute(): bool
    {
        return ! is_null($this->fine_paid_at);
    }

    // -------------------------------------------------------------------------
    // Detection source (single source of truth for the user-facing detection labels)
    // -------------------------------------------------------------------------

    /**
     * Stable key describing HOW this violation was detected. The active violation system is
     * GPS-based, so there are exactly two possible answers and both come from real GPS data:
     *
     *  - the GPS ping stored on the record (tricycle_locations.source) already distinguishes the
     *    physical IoT tracker ('gps_device') from the driver's phone ('mobile_app');
     *  - when a record has no stored ping, fall back to the unit's own GPS tracker configuration
     *    (tricycles.active_tracking_mode), which is a real GPS source rather than a guess.
     *
     * The legacy `detection_method` column (automated/manual) is deliberately never consulted —
     * it is kept only for schema/historical compatibility and must not surface as a Detection
     * Method anywhere in the active violation UI.
     */
    public function detectionKey(): string
    {
        $source = $this->locationSnapshot?->source;

        if ($source === 'gps_device') {
            return 'iot_gps';
        }

        if ($source === 'mobile_app') {
            return 'mobile_gps';
        }

        return ($this->tricycle?->active_tracking_mode === 'iot_device') ? 'iot_gps' : 'mobile_gps';
    }

    /**
     * The user-facing wording for detectionKey(). Kept here (not in the controllers) so the TMO
     * Violation Records page, the Driver Active Violations page and the record detail pages can
     * never drift apart. Only ever "Mobile GPS" or "IoT GPS".
     */
    public function detectionLabel(): string
    {
        return $this->detectionKey() === 'iot_gps' ? 'IoT GPS' : 'Mobile GPS';
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The tricycle that committed the violation.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /**
     * The franchise scheme active at the time of the violation.
     */
    public function franchiseScheme(): BelongsTo
    {
        return $this->belongsTo(FranchiseScheme::class);
    }

    /**
     * The color-coding scheme that was violated.
     */
    public function colorCodingScheme(): BelongsTo
    {
        return $this->belongsTo(ColorCodingScheme::class);
    }

    /**
     * The GPS location record that triggered this violation (if automated).
     */
    public function locationSnapshot(): BelongsTo
    {
        return $this->belongsTo(TricycleLocation::class, 'location_snapshot_id');
    }

    /**
     * The TMO personnel who manually flagged this violation (null if automated).
     */
    public function detectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'detected_by');
    }

    /**
     * The driver's appeal against this violation, if one has ever been filed. One appeal per
     * violation — the lifecycle is linear (issued -> appealed -> decided), no re-appeal.
     */
    public function appeal(): HasOne
    {
        return $this->hasOne(ViolationAppeal::class);
    }
}
