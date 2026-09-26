<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The public registration requirements list was expanded from 6 generic document types to the
 * real 11 municipal requirements (police clearance, health certificate, OR/CR photocopy,
 * driver's license, delivery receipt, barangay clearance, TODA clearance, cedula, driver's ID,
 * tariff list, authorization letter). The old 6-value ENUM couldn't represent them individually —
 * 4 conditional document kinds all collapsed into 'other' and were disambiguated only by parsing
 * a filename prefix (RegistrationController::store(), TMO\ApplicationController::review()).
 *
 * Same pattern as 2026_09_12_000000_update_workflow_for_cashier_and_bplo's applications.status
 * conversion: MySQL stores an ENUM value as its string label, so widening to VARCHAR is a safe,
 * non-lossy conversion — every existing row keeps its current value unchanged. This is additive
 * only; no data is remapped or deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE application_documents MODIFY COLUMN document_type VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        // Any row already using one of the new granular values (e.g. 'police_clearance') has no
        // equivalent in the old 6-value enum — MySQL would reject those rows outright on this
        // ALTER. Best-effort collapse them back to 'other' first so a rollback doesn't fail on
        // data written after this migration ran.
        DB::table('application_documents')
            ->whereNotIn('document_type', ['drivers_license', 'or_cr', 'proof_of_residence', 'toda_clearance', 'photo_id', 'other'])
            ->update(['document_type' => 'other']);

        DB::statement("ALTER TABLE application_documents MODIFY COLUMN document_type ENUM('drivers_license','or_cr','proof_of_residence','toda_clearance','photo_id','other') NOT NULL");
    }
};
