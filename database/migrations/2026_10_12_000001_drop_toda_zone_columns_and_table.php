<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fully removes the retired TODA zone system. 2026_09_22_000000_remove_toda_system_dependencies
 * already dropped the foreign keys and kept these columns only as historical data; registration
 * never collects a TODA zone (both registration flows always wrote NULL), so the columns and the
 * toda_zones table are dropped outright here.
 *
 * Note: the "TODA clearance" document type (application_documents.document_type = 'toda_clearance')
 * and inspections.license_toda_docs are unrelated to TODA zones and are intentionally kept.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['tricycles' => 'toda_zone_id', 'bookings' => 'toda_zone_id', 'operators' => 'toda_id'] as $table => $column) {
            if (Schema::hasColumn($table, $column)) {
                Schema::table($table, function (Blueprint $blueprint) use ($column) {
                    $blueprint->dropColumn($column);
                });
            }
        }

        Schema::dropIfExists('toda_zones');
    }

    /**
     * Restores the schema only — dropped TODA data is not recoverable.
     */
    public function down(): void
    {
        if (! Schema::hasTable('toda_zones')) {
            Schema::create('toda_zones', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->string('barangay')->nullable();
                $table->string('terminal_name')->nullable();
                $table->string('address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('president_name')->nullable();
                $table->string('contact_number')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        foreach (['tricycles' => 'toda_zone_id', 'bookings' => 'toda_zone_id', 'operators' => 'toda_id'] as $table => $column) {
            if (! Schema::hasColumn($table, $column)) {
                Schema::table($table, function (Blueprint $blueprint) use ($column) {
                    $blueprint->unsignedBigInteger($column)->nullable();
                });
            }
        }
    }
};
