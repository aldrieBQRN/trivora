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
     * The overall inspection note, normalized for display. Physical inspection is a single
     * overall approve/reject decision — inspector_notes is always plain text going forward.
     * This transparently rewrites the retired per-item JSON format
     * (`{"statuses":{...},"defects":{...}}`, written only by old demo seeders/records) into one
     * overall sentence, so no caller needs to know that legacy format ever existed.
     */
    public function getOverallNotesAttribute(): ?string
    {
        $notes = $this->inspector_notes;
        if (!is_string($notes) || trim($notes) === '' || $notes[0] !== '{') {
            return $notes;
        }

        $decoded = json_decode($notes, true);
        if (!is_array($decoded)) {
            return $notes;
        }

        $defects = array_values(array_filter((array) ($decoded['defects'] ?? [])));
        if (empty($defects)) {
            return 'Physical inspection requires reinspection.';
        }

        return 'Physical inspection requires reinspection. ' . implode(' ', $defects);
    }

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
