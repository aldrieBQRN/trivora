<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * QR Ride / Walk-in Ride fields on the existing per-passenger trip record. Purely additive:
     * every existing row becomes booking_type = 'booking' through the column default and keeps
     * ride_session_id / distance_source / dropped_off_* NULL — no existing value is rewritten and
     * the status enum is untouched (QR bookings reuse accepted / in_transit / completed /
     * cancelled).
     *
     * dropped_off_lat/lng use the same precision as the existing pickup/dropoff coordinates.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'booking_type')) {
                // booking | qr_walkin
                $table->string('booking_type', 20)->default('booking')->after('booking_code');
            }
            if (!Schema::hasColumn('bookings', 'ride_session_id')) {
                $table->foreignId('ride_session_id')->nullable()->after('tricycle_id')
                    ->constrained('ride_sessions')->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'distance_source')) {
                // osrm | fallback — how a QR ride's distance was computed
                $table->string('distance_source', 20)->nullable()->after('distance_km');
            }
            if (!Schema::hasColumn('bookings', 'dropped_off_lat')) {
                $table->decimal('dropped_off_lat', 10, 8)->nullable()->after('dropoff_lng');
            }
            if (!Schema::hasColumn('bookings', 'dropped_off_lng')) {
                $table->decimal('dropped_off_lng', 11, 8)->nullable()->after('dropped_off_lat');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'ride_session_id')) {
                $table->dropConstrainedForeignId('ride_session_id');
            }
            foreach (['booking_type', 'distance_source', 'dropped_off_lat', 'dropped_off_lng'] as $column) {
                if (Schema::hasColumn('bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
