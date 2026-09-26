<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marks the moment a driver's CURRENT online session began — nothing in the schema
     * previously recorded this. It's the session boundary the coding/restricted-day 100-meter
     * movement rule anchors on: the tricycle's first valid GPS reading with recorded_at >=
     * online_since is that session's movement anchor. Null whenever the driver is offline (or has
     * never gone online), so "no active session" is unambiguous.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('drivers', 'online_since')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->timestamp('online_since')->nullable()->after('is_online');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('drivers', 'online_since')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->dropColumn('online_since');
            });
        }
    }
};
