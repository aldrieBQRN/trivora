<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * QR Ride / Walk-in Ride: one row per PHYSICAL tricycle ride. Each walk-in passenger's own
     * trip stays a normal `bookings` row (booking_type = 'qr_walkin') pointing here through
     * bookings.ride_session_id — this table only holds what belongs to the ride itself.
     *
     * "At most one open (boarding / in_progress) session per tricycle" is NOT a DB constraint —
     * MySQL has no partial unique index — it is enforced transactionally by locking the
     * tricycle row when a session is opened.
     *
     * tricycle_id / driver_id are nullOnDelete, matching bookings.tricycle_id / driver_id, so
     * removing a tricycle or driver never cascades away ride history.
     */
    public function up(): void
    {
        if (Schema::hasTable('ride_sessions')) {
            return;
        }

        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::create('ride_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_code', 30)->unique();
            $table->foreignId('tricycle_id')->nullable()->constrained('tricycles')->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            // boarding | in_progress | completed | cancelled
            $table->string('status', 20)->default('boarding');
            $table->unsignedTinyInteger('capacity_at_start')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            // all_dropped | driver_ended | no_passengers | expired | franchise_suspended
            $table->string('end_reason', 30)->nullable();
            // driver | system | passenger
            $table->string('ended_by', 20)->nullable();
            $table->timestamps();

            $table->index(['tricycle_id', 'status']);
            $table->index(['driver_id', 'status']);
        });

        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_sessions');
    }
};
