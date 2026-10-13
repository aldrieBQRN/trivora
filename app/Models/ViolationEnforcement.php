<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViolationEnforcement extends Model
{
    protected $fillable = [
        'violation_id',
        'franchise_scheme_id',
        'offense_number',
        'action_type',
        'status',
        'confirmed_by',
        'confirmed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'offense_number' => 'integer',
            'confirmed_at'   => 'datetime',
        ];
    }

    public function violation(): BelongsTo
    {
        return $this->belongsTo(Violation::class);
    }

    public function franchiseScheme(): BelongsTo
    {
        return $this->belongsTo(FranchiseScheme::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
