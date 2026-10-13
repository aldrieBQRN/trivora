<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingDispatchOffer extends Model
{
    use HasFactory;

    public const STATUS_OFFERED = 'offered';
    public const STATUS_DECLINED = 'declined';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_ACCEPTED = 'accepted';

    protected $fillable = [
        'booking_id',
        'driver_id',
        'dispatch_round',
        'status',
    ];

    protected $casts = [
        'dispatch_round' => 'integer',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }
}
