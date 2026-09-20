<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Passenger extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'mobile_number',
        'emergency_contact',
        'rating',
        'total_rides',
        'terms_accepted',
        'privacy_policy_accepted',
        'consent_accepted_at',
        'terms_version',
    ];

    protected $casts = [
        'rating' => 'float',
        'total_rides' => 'integer',
        'terms_accepted' => 'boolean',
        'privacy_policy_accepted' => 'boolean',
        'consent_accepted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function savedPlaces(): HasMany
    {
        return $this->hasMany(SavedPlace::class);
    }
}
