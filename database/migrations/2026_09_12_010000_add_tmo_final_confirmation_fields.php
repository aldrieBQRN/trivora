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
        Schema::table('applications', function (Blueprint $table) {
            if (!Schema::hasColumn('applications', 'tracking_method')) {
                $table->enum('tracking_method', ['mobile_gps', 'iot_device'])->nullable()->after('sticker_number');
            }
            if (!Schema::hasColumn('applications', 'iot_device_id')) {
                $table->string('iot_device_id', 50)->nullable()->after('tracking_method');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (Schema::hasColumn('applications', 'tracking_method')) {
                $table->dropColumn('tracking_method');
            }
            if (Schema::hasColumn('applications', 'iot_device_id')) {
                $table->dropColumn('iot_device_id');
            }
        });
    }
};
