<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('bookings')) {
            // Modify payment_status from enum to varchar(30) to support 'unpaid', 'payment_submitted', 'paid'
            DB::statement("ALTER TABLE bookings MODIFY payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid'");

            // Modify payment_method to varchar(20)
            DB::statement("ALTER TABLE bookings MODIFY payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'");

            Schema::table('bookings', function (Blueprint $table) {
                if (!Schema::hasColumn('bookings', 'payment_reference')) {
                    $table->string('payment_reference', 100)->nullable()->after('payment_status');
                }
                if (!Schema::hasColumn('bookings', 'payment_amount_received')) {
                    $table->decimal('payment_amount_received', 10, 2)->nullable()->after('payment_reference');
                }
                if (!Schema::hasColumn('bookings', 'payment_change_amount')) {
                    $table->decimal('payment_change_amount', 10, 2)->nullable()->after('payment_amount_received');
                }
                if (!Schema::hasColumn('bookings', 'paid_at')) {
                    $table->timestamp('paid_at')->nullable()->after('payment_change_amount');
                }
            });

            // Safely map existing legacy 'pending' payment_status rows to 'unpaid'
            DB::table('bookings')->where('payment_status', 'pending')->update(['payment_status' => 'unpaid']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                if (Schema::hasColumn('bookings', 'paid_at')) {
                    $table->dropColumn('paid_at');
                }
                if (Schema::hasColumn('bookings', 'payment_change_amount')) {
                    $table->dropColumn('payment_change_amount');
                }
                if (Schema::hasColumn('bookings', 'payment_amount_received')) {
                    $table->dropColumn('payment_amount_received');
                }
                if (Schema::hasColumn('bookings', 'payment_reference')) {
                    $table->dropColumn('payment_reference');
                }
            });

            DB::table('bookings')->where('payment_status', 'unpaid')->update(['payment_status' => 'pending']);
            DB::statement("ALTER TABLE bookings MODIFY payment_status ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending'");
        }
    }
};
