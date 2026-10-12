<?php

namespace App\Models;

use App\Services\FareService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FareConfiguration extends Model
{
    use HasFactory;

    protected $table = 'fare_configurations';

    /**
     * Any write to a fare configuration invalidates the cached active-fare lookups, so every writer
     * (controller, factory, direct model call) stays consistent. Deferred until the surrounding
     * transaction commits in production — see FareService::forgetActiveFareCacheAfterCommit().
     */
    protected static function booted(): void
    {
        static::saved(fn () => FareService::forgetActiveFareCacheAfterCommit());
        static::deleted(fn () => FareService::forgetActiveFareCacheAfterCommit());
    }

    protected $fillable = [
        'base_fare',
        'base_fare_per_passenger',
        'included_distance_km',
        'rate_per_km',
        'effective_date',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'base_fare' => 'float',
        'base_fare_per_passenger' => 'float',
        'included_distance_km' => 'float',
        'rate_per_km' => 'float',
        'effective_date' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * TMO Officer or Admin who recorded this fare configuration.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Resolve the currently active fare configuration as of a given date/time.
     */
    public static function activeAsOf(?\DateTimeInterface $asOf = null): ?self
    {
        $target = $asOf ?? now();

        return static::query()
            ->where('is_active', true)
            ->where('effective_date', '<=', $target)
            ->orderByDesc('effective_date')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Determine whether this specific record is active as of today.
     */
    public function isCurrentlyActive(): bool
    {
        $active = static::activeAsOf(now());

        return $active !== null && $active->id === $this->id;
    }
}
