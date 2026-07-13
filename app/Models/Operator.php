<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Operator extends Model
{
    protected $fillable = [
        'user_id',
        'toda_id',
        'first_name',
        'middle_name',
        'last_name',
        'contact_number',
        'address',
        'barangay',
        'date_of_birth',
        'license_number',
        'license_expiry_date',
        'license_restriction_code',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth'       => 'date',
            'license_expiry_date' => 'date',
        ];
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Get the operator's full name.
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The system user account linked to this operator.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The TODA zone this operator belongs to.
     */
    public function todaZone(): BelongsTo
    {
        return $this->belongsTo(TodaZone::class, 'toda_id');
    }

    /**
     * Tricycle units owned by this operator.
     */
    public function tricycles(): HasMany
    {
        return $this->hasMany(Tricycle::class);
    }

    /**
     * Franchise applications submitted by this operator.
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}
