<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Confirm Payment flow on the TMO Violation Details page no longer captures payment
 * details (Official Receipt Number / Payment Amount / confirmer) — the cashier's OR is a
 * physical, offline record and the dialog is now a plain "has this violation been paid?"
 * confirmation. These three columns were added solely for the old detail-entry flow and
 * are used nowhere else, so they are dropped here (guarded, no `migrate:fresh`, no rows
 * are deleted). `fine_paid_at` is intentionally kept: it is the settlement flag used
 * across tricycle details, reports and the driver's active-violations list.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            if (Schema::hasColumn('violations', 'confirmed_by')) {
                $table->dropConstrainedForeignId('confirmed_by');
            }
            if (Schema::hasColumn('violations', 'amount_paid')) {
                $table->dropColumn('amount_paid');
            }
            if (Schema::hasColumn('violations', 'official_receipt_number')) {
                $table->dropColumn('official_receipt_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            if (! Schema::hasColumn('violations', 'official_receipt_number')) {
                $table->string('official_receipt_number', 50)->nullable()->after('fine_paid_at');
            }
            if (! Schema::hasColumn('violations', 'amount_paid')) {
                $table->decimal('amount_paid', 10, 2)->nullable()->after('official_receipt_number');
            }
            if (! Schema::hasColumn('violations', 'confirmed_by')) {
                $table->foreignId('confirmed_by')->nullable()->after('amount_paid')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }
};
