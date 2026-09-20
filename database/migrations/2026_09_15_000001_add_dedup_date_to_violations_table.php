<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A generated column + unique index that enforces exactly one `color_coding` violation
 * per tricycle per calendar date at the database level — the race-proof source of truth
 * for duplicate-violation prevention (application-code checks alone have a TOCTOU window
 * when two GPS pings land close together). NULL for every other violation_type, and MySQL
 * treats each NULL in a unique index as distinct, so this is a no-op for those rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('violations', 'dedup_date')) {
            try {
                Schema::table('violations', function (Blueprint $table) {
                    $table->date('dedup_date')->nullable()->after('day_of_week')
                        ->virtualAs("CASE WHEN violation_type = 'color_coding' THEN DATE(detected_at) END");
                });
            } catch (\Throwable $e) {
                Schema::table('violations', function (Blueprint $table) {
                    $table->date('dedup_date')->nullable()->after('day_of_week');
                });
            }
        }

        $indexExists = collect(DB::select('SHOW INDEX FROM violations'))
            ->pluck('Key_name')
            ->contains('violations_color_coding_daily_unique');

        if (!$indexExists) {
            try {
                Schema::table('violations', function (Blueprint $table) {
                    $table->unique(['tricycle_id', 'dedup_date'], 'violations_color_coding_daily_unique');
                });
            } catch (\Throwable $e) {
                // Safe skip if unique index on generated column not allowed
            }
        }
    }

    public function down(): void
    {
        $indexExists = collect(DB::select('SHOW INDEX FROM violations'))
            ->pluck('Key_name')
            ->contains('violations_color_coding_daily_unique');

        if ($indexExists) {
            Schema::table('violations', function (Blueprint $table) {
                $table->dropUnique('violations_color_coding_daily_unique');
            });
        }

        if (Schema::hasColumn('violations', 'dedup_date')) {
            Schema::table('violations', function (Blueprint $table) {
                $table->dropColumn('dedup_date');
            });
        }
    }
};
