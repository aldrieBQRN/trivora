<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ColorCodingScheme extends Model
{
    protected $fillable = [
        'name',
        'color_hex',
        'restricted_days',
        'restricted_digits',
        'fine_amount',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'restricted_days'   => 'array', // JSON column → PHP array
            'restricted_digits' => 'array', // JSON column → PHP array
            'fine_amount'       => 'decimal:2',
            'is_active'         => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Check if this color code is restricted on a given day name.
     *
     * @param  string  $dayName  e.g. 'Monday', 'Tuesday'
     */
    public function isRestrictedOn(string $dayName): bool
    {
        return in_array($dayName, $this->restricted_days ?? [], true);
    }

    /**
     * Legacy/Display accessor for the primary restricted day name.
     */
    public function getCodingDayAttribute(): string
    {
        return !empty($this->restricted_days) ? $this->restricted_days[0] : 'None';
    }

    /**
     * Check if this color code restricts a given last digit.
     */
    public function restrictsDigit(int $digit): bool
    {
        return in_array($digit, $this->restricted_digits ?? [], true);
    }

    /**
     * Check if this color code is restricted on a given day name and last digit.
     * If $lastDigit is null, checks only the day restriction.
     */
    public function isRestricted(string $dayName, ?int $lastDigit = null): bool
    {
        if (!$this->isRestrictedOn($dayName)) {
            return false;
        }

        if ($lastDigit !== null && !empty($this->restricted_digits)) {
            return $this->restrictsDigit($lastDigit);
        }

        return true;
    }

    /**
     * Check if this color code is restricted today (optionally for a given last digit).
     */
    public function isRestrictedToday(?int $lastDigit = null): bool
    {
        return $this->isRestricted(now()->format('l'), $lastDigit);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * All franchise permits that use this color code.
     */
    public function franchiseSchemes(): HasMany
    {
        return $this->hasMany(FranchiseScheme::class);
    }

    /**
     * All violations triggered by this color code.
     */
    public function violations(): HasMany
    {
        return $this->hasMany(Violation::class);
    }
}
