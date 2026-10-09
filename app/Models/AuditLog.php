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
        'actor_name',
        'actor_role',
        'module',
        'action',
        'event',
        'auditable_type',
        'auditable_id',
        'target_type',
        'target_id',
        'target_reference',
        'description',
        'channel',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Audit logs are immutable records.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException('Audit logs are immutable and cannot be modified.');
        });

        static::deleting(function () {
            throw new \RuntimeException('Audit logs are immutable and cannot be deleted.');
        });
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Scope to only administrative web logs.
     */
    public function scopeForAdminWeb($query)
    {
        return $query->where('channel', 'web')->whereNotNull('module');
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The user who performed the action (null for system events or deleted users).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Resolve the polymorphic auditable / target record dynamically.
     */
    public function auditable()
    {
        $type = $this->target_type ?: $this->auditable_type;
        $id = $this->target_id ?: $this->auditable_id;

        if (! $type || ! $id || ! class_exists($type)) {
            return null;
        }

        return app($type)->find($id);
    }
}
