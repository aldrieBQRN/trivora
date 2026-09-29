<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * QR Ride / Walk-in Ride fields on tricycles.
     *
     * qr_token — the public identifier printed in a tricycle's QR code. Random (Str::random uses
     * random_bytes, a CSPRNG), 40 characters, never derived from the id, replaceable later.
     * Nullable only so the column can be added to existing rows; the backfill below fills every
     * NULL, and Tricycle::creating() fills it for new rows.
     *
     * passenger_capacity — no equivalent field exists anywhere in the schema and there is no
     * established municipal value, so it stays NULL until TMO records a verified capacity.
     *
     * The backfill runs here (not in a seeder) because deploys always run `migrate` but only seed
     * an empty database — same convention as the existing data migrations. It only ever fills
     * NULL tokens, touches no other column (not even updated_at), and is safe to re-run.
     */
    public function up(): void
    {
        Schema::table('tricycles', function (Blueprint $table) {
            if (!Schema::hasColumn('tricycles', 'qr_token')) {
                $table->string('qr_token', 64)->nullable()->unique()->after('plate_number');
            }
            if (!Schema::hasColumn('tricycles', 'passenger_capacity')) {
                $table->unsignedTinyInteger('passenger_capacity')->nullable()->after('body_type');
            }
        });

        DB::table('tricycles')->whereNull('qr_token')->orderBy('id')->select('id')
            ->chunkById(200, function ($tricycles) {
                foreach ($tricycles as $tricycle) {
                    do {
                        $token = Str::random(40);
                    } while (DB::table('tricycles')->where('qr_token', $token)->exists());

                    DB::table('tricycles')
                        ->where('id', $tricycle->id)
                        ->whereNull('qr_token')
                        ->update(['qr_token' => $token]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('tricycles', function (Blueprint $table) {
            if (Schema::hasColumn('tricycles', 'qr_token')) {
                $table->dropUnique(['qr_token']);
                $table->dropColumn('qr_token');
            }
            if (Schema::hasColumn('tricycles', 'passenger_capacity')) {
                $table->dropColumn('passenger_capacity');
            }
        });
    }
};
