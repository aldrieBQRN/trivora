<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Passenger bookings now capture how many passengers a fare covers and the agreed fare per
 * passenger, so the total fare is derived (passenger_count * fare_per_passenger) instead of a
 * single client-supplied number. Defaults/nullable keep existing direct-insert test fixtures
 * (which bypass request validation) valid without changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'passenger_count')) {
                $table->unsignedSmallInteger('passenger_count')->default(1)->after('fare_amount');
            }
            if (!Schema::hasColumn('bookings', 'fare_per_passenger')) {
                $table->decimal('fare_per_passenger', 10, 2)->nullable()->after('passenger_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            foreach (['fare_per_passenger', 'passenger_count'] as $column) {
                if (Schema::hasColumn('bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
