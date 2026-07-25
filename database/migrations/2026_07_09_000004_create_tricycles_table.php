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
        Schema::create('tricycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operator_id')
                ->constrained('operators')
                ->cascadeOnDelete();
            $table->foreignId('toda_zone_id')
                ->nullable()
                ->constrained('toda_zones')
                ->nullOnDelete();
            $table->string('plate_number', 20)->unique();
            $table->string('engine_number', 50)->unique();
            $table->string('chassis_number', 50)->unique();
            $table->string('make', 100);
            $table->string('model', 100);
            $table->year('year_model');
            $table->string('body_color', 50);
            $table->string('body_type', 100)->nullable();
            $table->string('or_number', 50)->nullable(); // LTO Official Receipt
            $table->string('cr_number', 50)->nullable(); // LTO Certificate of Registration
            $table->enum('status', [
                'unregistered',
                'active',
                'suspended',
                'revoked',
            ])->default('unregistered');
            $table->string('iot_device_id', 50)->nullable()->unique();
            $table->enum('tracking_capability', ['iot_enabled', 'mobile_only'])->default('mobile_only');
            $table->enum('active_tracking_mode', ['iot_device', 'mobile_app'])->default('mobile_app');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tricycles');
    }
};
