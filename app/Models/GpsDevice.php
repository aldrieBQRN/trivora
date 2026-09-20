<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GpsDevice extends Model
{
    protected $fillable = [
        'device_identifier',
        'imei',
        'sim_number',
        'model',
        'tricycle_id',
        'status',
        'last_seen_at',
        'paired_at',
        'paired_by',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'paired_at'    => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    public function pairedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paired_by');
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    /**
     * Connectivity status derived only from actual telemetry (last_seen_at) — never implied by
     * being 'paired'. Mirrors Tricycle::gpsStatus()'s rule for TricycleLocation pings: a device
     * that has never reported in is 'awaiting', never 'connected', no matter how long ago it was
     * paired. Stays 'awaiting' for every device until a later phase wires up real ST-901L
     * telemetry that actually updates last_seen_at.
     *
     * @return 'awaiting'|'connected'|'stale'
     */
    public function connectionStatus(): string
    {
        if (!$this->last_seen_at) {
            return 'awaiting';
        }

        $stalenessSeconds = config('tracking.staleness_seconds', 180);

        return $this->last_seen_at->diffInSeconds(now()) < $stalenessSeconds ? 'connected' : 'stale';
    }
}
