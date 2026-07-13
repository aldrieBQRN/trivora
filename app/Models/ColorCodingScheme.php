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
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'restricted_days' => 'array', // JSON column → PHP array
            'is_active'       => 'boolean',
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
     * Check if this color code is restricted today.
     */
    public function isRestrictedToday(): bool
    {
        return $this->isRestrictedOn(now()->format('l'));
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
