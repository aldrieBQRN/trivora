<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
