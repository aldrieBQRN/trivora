<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The optional tricycle DRIVER of a franchise application, when the driver is a different
 * person than the tricycle owner (applications.owner_is_driver = 0). Exactly one row per
 * application at most; absent entirely when the owner is also the driver.
 *
 * Deliberately NOT a `drivers`/`users` record: this person is franchise-application data
 * only — they need no login account and no mobile-app dispatch state — so registering an
 * application never creates duplicate user/person records for them. The tricycle OWNER
 * remains the existing `operators` record (Application::operator()); this model only
 * represents the separate driver person.
 */
class ApplicationDriver extends Model
{
    protected $fillable = [
        'application_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'contact_number',
        'barangay',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    /**
     * The application this driver belongs to.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The driver's full name (first + last).
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
