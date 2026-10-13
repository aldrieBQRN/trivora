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
        if (!Schema::hasColumn('bookings', 'dispatch_round')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->unsignedTinyInteger('dispatch_round')->default(1)->after('dispatched_driver_id');
            });
        }

        if (Schema::hasTable('booking_dispatch_offers')) {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::create('booking_dispatch_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->unsignedTinyInteger('dispatch_round')->default(1);
            $table->string('status', 20)->default('offered');
            $table->timestamps();

            $table->unique(['booking_id', 'driver_id']);
            $table->index(['booking_id', 'status']);
            $table->index(['driver_id', 'status']);
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_dispatch_offers');

        if (Schema::hasColumn('bookings', 'dispatch_round')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropColumn('dispatch_round');
            });
        }
    }
};
