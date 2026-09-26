<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time data remap, not a schema change — applications.status is already a free-form
 * VARCHAR(50) (see 2026_09_12_000000_update_workflow_for_cashier_and_bplo). The in-system
 * "TMO Payment Verification" step has been removed entirely: TMO/BPLO now only instruct the
 * applicant to pay offline at the Municipal Treasurer's Office and never record/verify it in
 * the system. Every application currently sitting in one of the four retired payment-adjacent
 * statuses is collapsed into the single new 'pending_bplo_release' status, and current_step is
 * renumbered from the old 1-6 scale to the new 1-5 scale (Document Review, Physical Inspection,
 * Pending BPLO Release, Awaiting TMO Final Confirmation, Completed).
 *
 * Applications already at awaiting_tmo_confirmation/completed keep their real transition dates;
 * only their current_step number is corrected. Their historical `payments` rows and the
 * append-only `application_status_histories` audit trail are never touched by this migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        // failed_inspection: old step 3 -> new step 2 (still the Physical Inspection stage)
        DB::table('applications')->where('status', 'failed_inspection')->update(['current_step' => 2]);

        // Collapse the four retired payment-adjacent statuses into the new single status;
        // old step 4/5 -> new step 3 (Pending BPLO Release)
        DB::table('applications')
            ->whereIn('status', ['pending_payment', 'payment_issue', 'payment_verified', 'paid'])
            ->update(['status' => 'pending_bplo_release', 'current_step' => 3]);

        // awaiting_tmo_confirmation: old step 5 -> new step 4
        DB::table('applications')->where('status', 'awaiting_tmo_confirmation')->update(['current_step' => 4]);

        // completed (and the already-dead legacy 'scheme_issued'): old step 6 -> new step 5
        DB::table('applications')->whereIn('status', ['completed', 'scheme_issued'])->update(['current_step' => 5]);
    }

    /**
     * Lossy by nature — the original distinction between "pending payment", "payment issue",
     * and "payment verified" cannot be reconstructed from the single collapsed status. Rolling
     * back restores every remapped row to 'payment_verified' (the state closest to where the
     * old workflow would leave a row entering the retired step) rather than guessing.
     */
    public function down(): void
    {
        DB::table('applications')->where('status', 'failed_inspection')->update(['current_step' => 3]);

        DB::table('applications')
            ->where('status', 'pending_bplo_release')
            ->update(['status' => 'payment_verified', 'current_step' => 5]);

        DB::table('applications')->where('status', 'awaiting_tmo_confirmation')->update(['current_step' => 5]);

        DB::table('applications')->whereIn('status', ['completed', 'scheme_issued'])->update(['current_step' => 6]);
    }
};
