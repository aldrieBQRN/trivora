<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationStatusHistory extends Model
{
    /**
     * This is an append-only audit table — no updated_at column.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'application_id',
        'changed_by',
        'from_status',
        'to_status',
        'from_step',
        'to_step',
        'notes',
        // Seed fixtures pass an explicit created_at so the append-only trail reads as a
        // realistic timeline (the Application Tracker derives its step dates from this
        // column). Without it in here, mass assignment silently discards the value and
        // every demo row collapses to the moment the seeder ran.
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'from_step' => 'integer',
            'to_step'   => 'integer',
            'created_at'=> 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The application this history entry belongs to.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The user who triggered this status change.
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Alias for changedBy relationship.
     */
    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
