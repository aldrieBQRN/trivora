<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TodaZone extends Model
{
    protected $fillable = [
        'name',
        'code',
        'barangay',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Operators/drivers belonging to this TODA zone.
     */
    public function operators(): HasMany
    {
        return $this->hasMany(Operator::class, 'toda_id');
    }

    /**
     * Tricycles assigned to this TODA zone.
     */
    public function tricycles(): HasMany
    {
        return $this->hasMany(Tricycle::class, 'toda_zone_id');
    }

    /**
     * Geo-coordinate waypoints that define this zone's route boundary.
     */
    public function routes(): HasMany
    {
        return $this->hasMany(TodaZoneRoute::class)->orderBy('sequence_order');
    }
}
