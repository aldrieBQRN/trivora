<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TricycleLocation extends Model
{
    /**
     * Location pings are write-once — no updated_at needed.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'tricycle_id',
        'latitude',
        'longitude',
        'speed_kmh',
        'heading_deg',
        'accuracy_m',
        'source',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'    => 'decimal:7',
            'longitude'   => 'decimal:7',
            'speed_kmh'   => 'decimal:2',
            'accuracy_m'  => 'decimal:2',
            'heading_deg' => 'integer',
            'recorded_at' => 'datetime',
            'created_at'  => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The tricycle this location ping belongs to.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }
}
