<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Manual Ride: a driver records a trip for a walk-in passenger who has no Trivora account, so
     * the booking has no passenger. Making `bookings.passenger_id` nullable is the only schema
     * change — no placeholder passenger is ever created.
     *
     * Only the column's nullability changes: its type, the `bookings_passenger_id_foreign` key and
     * its ON DELETE CASCADE rule are left exactly as they are, and no existing row is touched.
     */
    public function up(): void
    {
        if (!$this->isNotNull()) {
            return; // already nullable — safe to re-run
        }

        DB::statement('ALTER TABLE `bookings` MODIFY `passenger_id` BIGINT UNSIGNED NULL');
        $this->assertForeignKeyIntact();
    }

    /**
     * Restores NOT NULL only when no booking relies on a NULL passenger. Manual Ride records are
     * never deleted to make a rollback possible — the rollback fails instead.
     */
    public function down(): void
    {
        if ($this->isNotNull()) {
            return;
        }

        $withoutPassenger = DB::table('bookings')->whereNull('passenger_id')->count();
        if ($withoutPassenger > 0) {
            throw new RuntimeException(
                "Cannot make bookings.passenger_id NOT NULL again: {$withoutPassenger} booking(s) " .
                '(Manual Rides) have no passenger. They are kept — resolve them manually before rolling back.'
            );
        }

        DB::statement('ALTER TABLE `bookings` MODIFY `passenger_id` BIGINT UNSIGNED NOT NULL');
        $this->assertForeignKeyIntact();
    }

    private function isNotNull(): bool
    {
        $column = collect(DB::select("SHOW COLUMNS FROM `bookings` LIKE 'passenger_id'"))->first();

        return $column && strtoupper($column->Null) === 'NO';
    }

    private function assertForeignKeyIntact(): void
    {
        if (!Schema::hasTable('bookings')) {
            return;
        }
        $rule = DB::selectOne(
            "SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
               AND CONSTRAINT_NAME = 'bookings_passenger_id_foreign'"
        );
        if (!$rule || $rule->DELETE_RULE !== 'CASCADE') {
            throw new RuntimeException('bookings_passenger_id_foreign is missing or no longer ON DELETE CASCADE.');
        }
    }
};
