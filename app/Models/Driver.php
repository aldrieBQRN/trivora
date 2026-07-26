<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'operator_id',
        'tricycle_id',
        'license_number',
        'mobile_number',
        'is_online',
        'is_available',
        'current_lat',
        'current_lng',
        'last_location_updated_at',
        'rating',
        'total_trips',
        'today_earnings',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'is_available' => 'boolean',
        'current_lat' => 'float',
        'current_lng' => 'float',
        'rating' => 'float',
        'total_trips' => 'integer',
        'today_earnings' => 'float',
        'last_location_updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
