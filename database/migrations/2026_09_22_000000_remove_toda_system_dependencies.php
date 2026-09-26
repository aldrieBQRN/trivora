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
        // 1. Drop foreign key constraints so tables are decoupled from toda_zones
        // (Columns are preserved as nullable to maintain historical data).
        Schema::table('bookings', function (Blueprint $table) {
            // Drop foreign key if exists
            try {
                $table->dropForeign(['toda_zone_id']);
            } catch (\Throwable $e) {
                // Ignore if constraint doesn't exist
            }

            // Add fields for sequential nearest-driver dispatch
            if (!Schema::hasColumn('bookings', 'dispatched_driver_id')) {
                $table->unsignedBigInteger('dispatched_driver_id')->nullable()->after('driver_id');
            }
            if (!Schema::hasColumn('bookings', 'dispatched_at')) {
                $table->timestamp('dispatched_at')->nullable()->after('requested_at');
            }
        });

        Schema::table('operators', function (Blueprint $table) {
            try {
                $table->dropForeign(['toda_id']);
            } catch (\Throwable $e) {
                // Ignore if constraint doesn't exist
            }
        });

        Schema::table('tricycles', function (Blueprint $table) {
            try {
                $table->dropForeign(['toda_zone_id']);
            } catch (\Throwable $e) {
                // Ignore if constraint doesn't exist
            }
        });

        // 2. Drop obsolete route waypoint table
        Schema::dropIfExists('toda_zone_routes');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'dispatched_driver_id')) {
                $table->dropColumn('dispatched_driver_id');
            }
            if (Schema::hasColumn('bookings', 'dispatched_at')) {
                $table->dropColumn('dispatched_at');
            }
        });
    }
};
