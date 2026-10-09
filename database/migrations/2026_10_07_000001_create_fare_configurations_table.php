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
        Schema::create('fare_configurations', function (Blueprint $table) {
            $table->id();
            // Exact fixed-point decimals for money and distance — never floating point (float/double)
            $table->decimal('base_fare', 10, 2);
            $table->decimal('base_fare_per_passenger', 10, 2);
            $table->decimal('included_distance_km', 8, 2);
            $table->decimal('rate_per_km', 10, 2);
            $table->dateTime('effective_date')->index();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Seed initial baseline fare configuration record
        DB::table('fare_configurations')->insert([
            'base_fare' => 50.00,
            'base_fare_per_passenger' => 25.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 5.00,
            'effective_date' => '2026-01-01 00:00:00',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fare_configurations');
    }
};
