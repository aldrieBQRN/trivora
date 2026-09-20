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
        // 1. Convert applications.status from ENUM to VARCHAR(50) to support expanded workflow statuses
        DB::statement("ALTER TABLE applications MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft'");

        // 2. Add sticker_number column to applications and franchise_schemes if not present
        if (!Schema::hasColumn('applications', 'sticker_number')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->string('sticker_number', 50)->nullable()->after('remarks');
            });
        }

        if (!Schema::hasColumn('franchise_schemes', 'sticker_number')) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->string('sticker_number', 50)->nullable()->after('franchise_number');
            });
        }

        // 3. Reassign any records created by treasurer account to an admin/bplo user
        $adminOrBplo = DB::table('users')->whereIn('role', ['admin', 'bplo_staff'])->orderBy('id')->first();
        $treasurerUser = DB::table('users')->where('email', 'treasurer@trivora.gov.ph')->first();

        if ($treasurerUser && $adminOrBplo) {
            DB::table('payments')->where('processed_by', $treasurerUser->id)->update(['processed_by' => $adminOrBplo->id]);
            DB::table('application_status_histories')->where('changed_by', $treasurerUser->id)->update(['changed_by' => $adminOrBplo->id]);
            DB::table('franchise_schemes')->where('issued_by', $treasurerUser->id)->update(['issued_by' => $adminOrBplo->id]);
            DB::table('inspections')->where('inspector_id', $treasurerUser->id)->update(['inspector_id' => $adminOrBplo->id]);
            DB::table('users')->where('id', $treasurerUser->id)->delete();
        }

        // 4. Update users role enum to remove municipal_treasurer
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('passenger','tricycle_driver','tmo_personnel','bplo_staff','admin') NOT NULL DEFAULT 'passenger'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('applications', 'sticker_number')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->dropColumn('sticker_number');
            });
        }

        if (Schema::hasColumn('franchise_schemes', 'sticker_number')) {
            Schema::table('franchise_schemes', function (Blueprint $table) {
                $table->dropColumn('sticker_number');
            });
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('passenger','tricycle_driver','tmo_personnel','bplo_staff','municipal_treasurer','admin') NOT NULL DEFAULT 'passenger'");
        DB::statement("ALTER TABLE applications MODIFY COLUMN status ENUM('draft','pending_review','under_review','rejected','pending_inspection','under_inspection','failed_inspection','pending_payment','paid','scheme_issued','completed','cancelled') NOT NULL DEFAULT 'draft'");
    }
};
