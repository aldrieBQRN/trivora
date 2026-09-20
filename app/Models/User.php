<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'profile_photo_path',
        'employee_id',
        'position',
        'contact_number',
        'address',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Appended to every serialized User (including nested inside a booking's driver.user /
     * passenger.user relations) so the mobile apps never need to know the storage path scheme —
     * they only ever see a ready-to-use URL, or null when no photo has been uploaded.
     *
     * @var list<string>
     */
    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    /**
     * Public URL for the uploaded profile photo, or null when none has been set — never expose
     * the raw storage path itself.
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        return $this->profile_photo_path ? asset('storage/' . $this->profile_photo_path) : null;
    }

    // -------------------------------------------------------------------------
    // Role helpers
    // -------------------------------------------------------------------------

    public function isTricycleDriver(): bool
    {
        return $this->role === 'tricycle_driver';
    }

    public function isTmoPersonnel(): bool
    {
        return $this->role === 'tmo_personnel';
    }

    public function isBploStaff(): bool
    {
        return $this->role === 'bplo_staff';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * A user who is a tricycle driver has one operator profile.
     */
    public function operator(): HasOne
    {
        return $this->hasOne(Operator::class);
    }

    /**
     * Documents reviewed by this user (TMO personnel).
     */
    public function reviewedDocuments(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class, 'reviewed_by');
    }

    /**
     * Inspections conducted by this user (TMO personnel).
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class, 'inspector_id');
    }

    /**
     * Payments verified by this user (BPLO staff / admin).
     */
    public function processedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'processed_by');
    }

    /**
     * Franchise schemes issued by this user (BPLO staff).
     */
    public function issuedFranchiseSchemes(): HasMany
    {
        return $this->hasMany(FranchiseScheme::class, 'issued_by');
    }

    /**
     * Status history changes made by this user.
     */
    public function applicationStatusChanges(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class, 'changed_by');
    }

    /**
     * Violations detected by this user (TMO personnel, if manually flagged).
     */
    public function detectedViolations(): HasMany
    {
        return $this->hasMany(Violation::class, 'detected_by');
    }

    /**
     * Violation fine payments confirmed by this user (TMO personnel), after the driver
     * paid at the Municipal Treasurer's cashier and presented the official receipt.
     */
    public function confirmedViolationPayments(): HasMany
    {
        return $this->hasMany(Violation::class, 'confirmed_by');
    }

    /**
     * Audit log entries created by this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
