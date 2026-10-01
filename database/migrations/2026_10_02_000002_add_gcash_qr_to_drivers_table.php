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
        if (Schema::hasTable('drivers')) {
            Schema::table('drivers', function (Blueprint $table) {
                if (!Schema::hasColumn('drivers', 'gcash_qr_path')) {
                    $table->string('gcash_qr_path', 255)->nullable()->after('today_earnings');
                }
                if (!Schema::hasColumn('drivers', 'gcash_name')) {
                    $table->string('gcash_name', 150)->nullable()->after('gcash_qr_path');
                }
                if (!Schema::hasColumn('drivers', 'gcash_number')) {
                    $table->string('gcash_number', 20)->nullable()->after('gcash_name');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('drivers')) {
            Schema::table('drivers', function (Blueprint $table) {
                if (Schema::hasColumn('drivers', 'gcash_number')) {
                    $table->dropColumn('gcash_number');
                }
                if (Schema::hasColumn('drivers', 'gcash_name')) {
                    $table->dropColumn('gcash_name');
                }
                if (Schema::hasColumn('drivers', 'gcash_qr_path')) {
                    $table->dropColumn('gcash_qr_path');
                }
            });
        }
    }
};
