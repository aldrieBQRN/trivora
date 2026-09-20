<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            if (!Schema::hasColumn('violations', 'official_receipt_number')) {
                $table->string('official_receipt_number', 50)->nullable()->after('fine_paid_at');
            }
            if (!Schema::hasColumn('violations', 'amount_paid')) {
                $table->decimal('amount_paid', 10, 2)->nullable()->after('official_receipt_number');
            }
            if (!Schema::hasColumn('violations', 'confirmed_by')) {
                $table->foreignId('confirmed_by')->nullable()->after('amount_paid')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
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
};
