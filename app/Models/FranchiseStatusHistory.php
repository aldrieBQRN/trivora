<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FranchiseStatusHistory extends Model
{
    /**
     * This is an append-only audit table — no updated_at column.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'franchise_scheme_id',
        'changed_by',
        'from_status',
        'to_status',
        'reason',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function franchiseScheme(): BelongsTo
    {
        return $this->belongsTo(FranchiseScheme::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
