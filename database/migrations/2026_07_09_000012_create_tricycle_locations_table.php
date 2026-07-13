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
        Schema::create('tricycle_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tricycle_id')
                ->constrained('tricycles')
                ->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('speed_kmh', 5, 2)->nullable();
            $table->unsignedSmallInteger('heading_deg')->nullable(); // 0–360°
            $table->decimal('accuracy_m', 6, 2)->nullable();
            $table->enum('source', ['gps_device', 'mobile_app', 'manual'])->default('mobile_app');
            $table->timestamp('recorded_at');
            // No updated_at — location pings are write-once
            $table->timestamp('created_at')->nullable();

            // Composite index for fast "latest position of a tricycle" queries
            $table->index(['tricycle_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tricycle_locations');
    }
};
