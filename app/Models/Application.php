<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Application extends Model
{
    protected $fillable = [
        'reference_number',
        'operator_id',
        'tricycle_id',
        'application_type',
        'current_step',
        'status',
        'submitted_at',
        'completed_at',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'current_step' => 'integer',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePendingReview($query)
    {
        return $query->where('status', 'pending_review');
    }

    public function scopePendingInspection($query)
    {
        return $query->where('status', 'pending_inspection');
    }

    public function scopePendingPayment($query)
    {
        return $query->where('status', 'pending_payment');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The operator who submitted this application.
     */
    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    /**
     * The tricycle unit this application is for.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /**
     * All documents attached to this application.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class);
    }

    /**
     * The immutable status history timeline for this application.
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class)->orderBy('created_at');
    }

    /**
     * All physical inspection attempts for this application.
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class)->orderBy('attempt_number');
    }

    /**
     * The most recent inspection attempt.
     */
    public function latestInspection(): HasOne
    {
        return $this->hasOne(Inspection::class)->latestOfMany('attempt_number');
    }

    /**
     * The payment record for this application.
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    /**
     * The franchise scheme issued from this application.
     */
    public function franchiseScheme(): HasOne
    {
        return $this->hasOne(FranchiseScheme::class);
    }
}
