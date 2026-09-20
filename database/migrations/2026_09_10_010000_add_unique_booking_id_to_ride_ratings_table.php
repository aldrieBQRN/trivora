<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_ratings', function (Blueprint $table) {
            // A booking can only ever have one rating. RideRating::updateOrCreate() already
            // enforces this at the application level, but a genuine unique constraint closes the
            // race window a rapid double-tap on Submit could otherwise slip through (two
            // concurrent requests both finding "no existing row" before either commits).
            $table->unique('booking_id');
        });
    }

    public function down(): void
    {
        Schema::table('ride_ratings', function (Blueprint $table) {
            $table->dropUnique(['booking_id']);
        });
    }
};
