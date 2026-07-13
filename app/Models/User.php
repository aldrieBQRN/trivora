<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

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

    public function isMunicipalTreasurer(): bool
    {
        return $this->role === 'municipal_treasurer';
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
     * Payments processed by this user (Municipal Treasurer).
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
     * Audit log entries created by this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
