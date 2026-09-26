<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the Owner vs Tricycle Driver distinction to franchise applications.
 *
 * The tricycle OWNER IS (and stays) the existing `operators` record linked through
 * applications.operator_id — first/last name, date_of_birth (a real date column),
 * contact_number and barangay already live there, so no duplicate owner record is
 * introduced. This migration only adds the ability for the DRIVER to be someone else:
 *
 *  - applications.owner_is_driver (boolean, default 1): whether the owner is also the
 *    tricycle driver. Every pre-existing application gets 1, because no historical
 *    application ever captured a separate driver — the old public form collected a
 *    single person only, stored on `operators`. That information is preserved untouched
 *    as the Tricycle Owner; no existing application, franchise, driver, or owner record
 *    is deleted or rewritten.
 *  - application_drivers: the optional, application-scoped driver person, used only when
 *    owner_is_driver = 0. Intentionally NOT the `drivers`/`users` tables: this person is
 *    franchise-application data only (no login account, no mobile-app dispatch state), so
 *    no duplicate user/person records are created for them. The table stays empty for all
 *    pre-existing applications — none of them had a separate driver — so there is no
 *    backfill data to invent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (! Schema::hasColumn('applications', 'owner_is_driver')) {
                $table->boolean('owner_is_driver')->default(true)->after('tricycle_id')
                    ->comment('1 = the tricycle owner (operator) is also the driver; 0 = a separate person exists in application_drivers');
            }
        });

        if (! Schema::hasTable('application_drivers')) {
            Schema::create('application_drivers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('application_id')->unique()
                    ->constrained('applications')->cascadeOnDelete();
                $table->string('first_name', 100);
                $table->string('last_name', 100);
                $table->date('date_of_birth');
                $table->string('contact_number', 20);
                $table->string('barangay', 100);
                $table->timestamps();

                $table->index('barangay');
            });
        }

        // Safe migration for existing data: every application that predates this
        // distinction has no separate driver person anywhere in the system, so it is
        // explicitly recorded as "owner is also the driver". (A no-op for rows the column
        // default already covered — kept so the intent survives non-default schemas.)
        DB::table('applications')->whereNull('owner_is_driver')->update(['owner_is_driver' => 1]);
    }

    public function down(): void
    {
        Schema::dropIfExists('application_drivers');

        Schema::table('applications', function (Blueprint $table) {
            if (Schema::hasColumn('applications', 'owner_is_driver')) {
                $table->dropColumn('owner_is_driver');
            }
        });
    }
};
