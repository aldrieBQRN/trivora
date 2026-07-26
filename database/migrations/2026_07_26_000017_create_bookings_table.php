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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code', 30)->unique();
            $table->foreignId('passenger_id')
                ->constrained('passengers')
                ->cascadeOnDelete();
            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('drivers')
                ->nullOnDelete();
            $table->foreignId('tricycle_id')
                ->nullable()
                ->constrained('tricycles')
                ->nullOnDelete();
            $table->foreignId('toda_zone_id')
                ->nullable()
                ->constrained('toda_zones')
                ->nullOnDelete();

            // Pickup coordinates & description
            $table->string('pickup_name', 255);
            $table->decimal('pickup_lat', 10, 8);
            $table->decimal('pickup_lng', 11, 8);

            // Dropoff coordinates & description
            $table->string('dropoff_name', 255);
            $table->decimal('dropoff_lat', 10, 8);
            $table->decimal('dropoff_lng', 11, 8);

            // Fare & Trip Specs
            $table->decimal('fare_amount', 10, 2);
            $table->decimal('distance_km', 6, 2)->default(0.00);
            $table->unsignedInteger('estimated_duration_mins')->default(5);
            $table->text('passenger_notes')->nullable();

            // Status tracking
            $table->enum('status', [
                'pending',
                'accepted',
                'arrived',
                'in_transit',
                'completed',
                'cancelled',
            ])->default('pending');

            $table->enum('payment_method', ['cash', 'gcash', 'wallet'])->default('cash');
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');
            $table->enum('cancelled_by', ['passenger', 'driver', 'system'])->nullable();
            $table->string('cancellation_reason', 255)->nullable();

            // Timestamps
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
