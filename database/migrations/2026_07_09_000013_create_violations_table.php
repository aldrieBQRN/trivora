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
        Schema::create('violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tricycle_id')
                ->constrained('tricycles')
                ->cascadeOnDelete();
            $table->foreignId('franchise_scheme_id')
                ->constrained('franchise_schemes')
                ->cascadeOnDelete();
            $table->foreignId('color_coding_scheme_id')
                ->constrained('color_coding_schemes')
                ->restrictOnDelete();
            $table->foreignId('location_snapshot_id')
                ->nullable()
                ->constrained('tricycle_locations')
                ->nullOnDelete();
            $table->foreignId('detected_by')
                ->nullable() // NULL when system-automated
                ->constrained('users')
                ->nullOnDelete();
            $table->enum('violation_type', [
                'color_coding',
                'route_violation',
                'expired_franchise',
                'other',
            ]);
            $table->timestamp('detected_at');
            $table->enum('day_of_week', [
                'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday', 'Sunday',
            ]);
            $table->enum('detection_method', ['automated', 'manual'])->default('automated');
            $table->enum('status', [
                'open',
                'acknowledged',
                'contested',
                'resolved',
                'dismissed',
            ])->default('open');
            $table->decimal('fine_amount', 10, 2)->nullable();
            $table->timestamp('fine_paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Composite index for violation dashboards and lookups
            $table->index(['tricycle_id', 'status', 'detected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
