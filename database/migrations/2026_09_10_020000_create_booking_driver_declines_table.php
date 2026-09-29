<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Records that a given driver declined a given (still-pending) booking, so
     * BookingController::getPendingRequests() can exclude it for that driver on subsequent
     * polls without affecting whether other eligible drivers still see it. The unique pair
     * makes a repeated decline (e.g. a retried request) idempotent instead of erroring or
     * accumulating duplicate rows.
     */
    public function up(): void
    {
        if (Schema::hasTable('booking_driver_declines')) {
            return;
        }

        // TiDB may not honour the conditional FOREIGN_KEY_CHECKS=0 from the schema dump,
        // so disable explicitly for this table's FK creation.
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::create('booking_driver_declines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['booking_id', 'driver_id']);
        });

        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_driver_declines');
    }
};
