<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A walk-in passenger (Manual Ride) has no Trivora account, so the driver records a name for the
 * ride session. Only walk-in bookings carry it; QR passengers keep their account name. Nullable so
 * existing rows and direct-insert test fixtures remain valid.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'walk_in_name')) {
                $table->string('walk_in_name')->nullable()->after('passenger_notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'walk_in_name')) {
                $table->dropColumn('walk_in_name');
            }
        });
    }
};
