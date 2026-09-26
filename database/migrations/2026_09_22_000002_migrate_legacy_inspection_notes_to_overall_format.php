<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time data fix, not a schema change — physical inspection was reworked from an item-by-item
 * pass/fail decision into a single overall approve/reject decision (TMO\InspectionController's
 * live write path already only ever writes a plain-text overall note/reason). A handful of old
 * demo-seeded `inspections` rows still carry the retired per-item JSON format in `inspector_notes`
 * (e.g. `{"statuses":{"horn":"failed","mirrors":"failed",...},"defects":{"horn":"...","mirrors":
 * "..."}}`), which leaks raw JSON to TMO/operator UI if ever re-displayed for those records. This
 * rewrites every such row's `inspector_notes` into one overall sentence built from its own
 * `defects`, and leaves every already-plain-text row (the normal case) untouched.
 *
 * No inspection attempts, application status history, or any other record is deleted — only the
 * `inspector_notes` string content of affected rows is normalized.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('inspections')
            ->whereNotNull('inspector_notes')
            ->orderBy('id')
            ->get(['id', 'inspector_notes'])
            ->each(function ($inspection) {
                $notes = trim((string) $inspection->inspector_notes);
                if ($notes === '' || $notes[0] !== '{') {
                    return; // already plain text — the normal, current-model case
                }

                $decoded = json_decode($notes, true);
                if (!is_array($decoded)) {
                    return;
                }

                $defects = array_values(array_filter(array_map('trim', (array) ($decoded['defects'] ?? []))));
                $overallReason = empty($defects)
                    ? 'Physical inspection requires reinspection.'
                    : 'Physical inspection requires reinspection. ' . implode(' ', $defects);

                DB::table('inspections')
                    ->where('id', $inspection->id)
                    ->update(['inspector_notes' => $overallReason]);
            });
    }

    /**
     * Irreversible by design — the retired per-item JSON format is being permanently normalized
     * away, and reconstructing it would resurrect exactly the structure this migration removes.
     */
    public function down(): void
    {
        // Intentionally no-op.
    }
};
