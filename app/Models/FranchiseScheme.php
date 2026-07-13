<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FranchiseScheme extends Model
{
    protected $fillable = [
        'application_id',
        'tricycle_id',
        'color_coding_scheme_id',
        'issued_by',
        'franchise_number',
        'issue_date',
        'expiry_date',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'  => 'date',
            'expiry_date' => 'date',
            'is_active'   => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Check whether this franchise permit has expired.
     */
    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date->isPast();
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now());
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The application that produced this franchise scheme.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The tricycle this franchise is issued to.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /**
     * The color-coding scheme assigned to this franchise.
     */
    public function colorCodingScheme(): BelongsTo
    {
        return $this->belongsTo(ColorCodingScheme::class);
    }

    /**
     * The BPLO staff member who issued this franchise.
     */
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    /**
     * Violations recorded under this franchise.
     */
    public function violations(): HasMany
    {
        return $this->hasMany(Violation::class);
    }
}
