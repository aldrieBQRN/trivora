<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')
                ->constrained('applications')
                ->cascadeOnDelete();
            $table->foreignId('inspector_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->unsignedTinyInteger('attempt_number')->default(1);
            $table->date('inspection_date');
            $table->time('inspection_time')->nullable();
            $table->string('location_address', 255)->nullable();
            $table->enum('result', ['passed', 'failed', 'pending'])->default('pending');

            // Inspection checklist items (null = not yet evaluated)
            $table->boolean('safety_equipment')->nullable();
            $table->boolean('brakes_steering')->nullable();
            $table->boolean('lights_reflectors')->nullable();
            $table->boolean('tires_suspension')->nullable();
            $table->boolean('emissions_test')->nullable();
            $table->boolean('license_toda_docs')->nullable();

            $table->text('inspector_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
