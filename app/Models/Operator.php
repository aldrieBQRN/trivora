<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Operator extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'middle_name',
        'last_name',
        'contact_number',
        'address',
        'barangay',
        'date_of_birth',
        'license_number',
        'license_expiry_date',
        'license_restriction_code',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth'       => 'date',
            'license_expiry_date' => 'date',
        ];
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Get the operator's full name. Whitespace is collapsed because middle_name is often
     * null — a plain interpolation would render "Juan  Dela Cruz" with a double space.
     */
    public function getFullNameAttribute(): string
    {
        return trim(preg_replace('/\s+/', ' ', "{$this->first_name} {$this->middle_name} {$this->last_name}"));
    }

    /**
     * This person's details in the shape franchise/application detail pages render:
     * first/last name, birthday (display date), mobile number, and Nasugbu barangay.
     * Used for the Tricycle OWNER (this record is always the owner, never the driver).
     *
     * @return array{first_name: ?string, last_name: ?string, full_name: ?string, birthday: ?string, contact_number: ?string, barangay: ?string, email: ?string}
     */
    public function personDetails(): array
    {
        return [
            'first_name'     => $this->first_name,
            'last_name'      => $this->last_name,
            'full_name'      => $this->full_name,
            'birthday'       => $this->date_of_birth?->format('m/d/Y'),
            'contact_number' => $this->contact_number,
            'barangay'       => $this->barangay,
            'email'          => $this->user?->email,
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The system user account linked to this operator.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The operator's profile photo (stored on their linked user account), or null. Eager-load
     * `operator.user` when mapping lists to avoid one query per row.
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        return $this->user?->profile_photo_url;
    }


    /**
     * Tricycle units owned by this operator.
     */
    public function tricycles(): HasMany
    {
        return $this->hasMany(Tricycle::class);
    }

    /**
     * Franchise applications submitted by this operator.
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}
