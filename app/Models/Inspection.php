<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inspection extends Model
{
    protected $fillable = [
        'application_id',
        'inspector_id',
        'attempt_number',
        'inspection_date',
        'inspection_time',
        'location_address',
        'result',
        'safety_equipment',
        'brakes_steering',
        'lights_reflectors',
        'tires_suspension',
        'emissions_test',
        'license_toda_docs',
        'inspector_notes',
    ];

    protected function casts(): array
    {
        return [
            'inspection_date'   => 'date',
            'attempt_number'    => 'integer',
            'safety_equipment'  => 'boolean',
            'brakes_steering'   => 'boolean',
            'lights_reflectors' => 'boolean',
            'tires_suspension'  => 'boolean',
            'emissions_test'    => 'boolean',
            'license_toda_docs' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Returns true only if every checklist item has passed.
     */
    public function getAllChecksPassedAttribute(): bool
    {
        return $this->safety_equipment
            && $this->brakes_steering
            && $this->lights_reflectors
            && $this->tires_suspension
            && $this->emissions_test
            && $this->license_toda_docs;
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The application this inspection belongs to.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The TMO personnel who conducted this inspection.
     */
    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
