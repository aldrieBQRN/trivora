<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TodaZoneRoute extends Model
{
    protected $fillable = [
        'toda_zone_id',
        'sequence_order',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'latitude'       => 'decimal:7',
            'longitude'      => 'decimal:7',
            'sequence_order' => 'integer',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The TODA zone this waypoint belongs to.
     */
    public function todaZone(): BelongsTo
    {
        return $this->belongsTo(TodaZone::class);
    }
}
