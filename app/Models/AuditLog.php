<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    /**
     * Audit logs are append-only — no updated_at.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The user who performed the action (null for system events).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Resolve the polymorphic auditable record dynamically.
     * Usage: $log->auditable() returns the related model instance.
     */
    public function auditable()
    {
        if (! $this->auditable_type || ! $this->auditable_id) {
            return null;
        }

        return app($this->auditable_type)->find($this->auditable_id);
    }
}
