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
    ];

    protected $appends = [
        'body_number',
    ];

    protected function casts(): array
    {
        return [
            'year_model' => 'integer',
        ];
    }

    /**
     * Get the body number dynamically from the active franchise scheme.
     */
    public function getBodyNumberAttribute()
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
}
