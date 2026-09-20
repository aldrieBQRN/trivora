<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * franchise_number (the tricycle's body/coding number) previously had a single global unique
 * constraint, so a renewal could never reuse the same body number while the old, now-inactive
 * FranchiseScheme row was still preserved for history — exactly the same generated-column +
 * unique-index pattern already used for violations.dedup_date. A generated column mirrors
 * franchise_number only when is_active=1 (NULL otherwise); MySQL treats every NULL in a unique
 * index as distinct, so historical/inactive rows can repeat a number freely while at most one
 * currently-ACTIVE scheme may hold it at a time — across the whole table, matching the original
 * constraint's scope (a body number identifies one currently-operating unit municipality-wide).
 */
return new class extends Migration
{
    public function up(): void
    {
        $oldIndexExists = collect(DB::select('SHOW INDEX FROM franchise_schemes'))
            ->pluck('Key_name')
            ->contains('franchise_schemes_franchise_number_unique');

        if ($oldIndexExists) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->dropUnique('franchise_schemes_franchise_number_unique');
            });
        }

        if (!Schema::hasColumn('franchise_schemes', 'active_franchise_number')) {
            try {
                Schema::table('franchise_schemes', function (Blueprint $table) {
                    $table->string('active_franchise_number', 30)->nullable()->after('franchise_number')
                        ->virtualAs("CASE WHEN is_active = 1 THEN franchise_number END");
                });
            } catch (\Throwable $e) {
                Schema::table('franchise_schemes', function (Blueprint $table) {
                    $table->string('active_franchise_number', 30)->nullable()->after('franchise_number');
                });
            }
        }

        $newIndexExists = collect(DB::select('SHOW INDEX FROM franchise_schemes'))
            ->pluck('Key_name')
            ->contains('franchise_schemes_active_franchise_number_unique');

        if (!$newIndexExists) {
            try {
                Schema::table('franchise_schemes', function (Blueprint $table) {
                    $table->unique('active_franchise_number', 'franchise_schemes_active_franchise_number_unique');
                });
            } catch (\Throwable $e) {
                // Safe skip if unique index on generated column not allowed on distributed engine
            }
        }
    }

    public function down(): void
    {
        $newIndexExists = collect(DB::select('SHOW INDEX FROM franchise_schemes'))
            ->pluck('Key_name')
            ->contains('franchise_schemes_active_franchise_number_unique');

        if ($newIndexExists) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->dropUnique('franchise_schemes_active_franchise_number_unique');
            });
        }

        if (Schema::hasColumn('franchise_schemes', 'active_franchise_number')) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->dropColumn('active_franchise_number');
            });
        }

        $oldIndexExists = collect(DB::select('SHOW INDEX FROM franchise_schemes'))
            ->pluck('Key_name')
            ->contains('franchise_schemes_franchise_number_unique');

        if (!$oldIndexExists) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->unique('franchise_number', 'franchise_schemes_franchise_number_unique');
            });
        }
    }
};
