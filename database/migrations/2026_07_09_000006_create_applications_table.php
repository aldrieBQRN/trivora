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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 30)->unique(); // e.g. APP-2026-00042
            $table->foreignId('operator_id')
                ->constrained('operators')
                ->cascadeOnDelete();
            $table->foreignId('tricycle_id')
                ->constrained('tricycles')
                ->cascadeOnDelete();
            $table->enum('application_type', ['new', 'renewal', 'transfer'])->default('new');
            $table->unsignedTinyInteger('current_step')->default(1); // Steps 1–5
            $table->enum('status', [
                'draft',
                'pending_review',
                'under_review',
                'rejected',
                'pending_inspection',
                'under_inspection',
                'failed_inspection',
                'pending_payment',
                'paid',
                'scheme_issued',
                'completed',
                'cancelled',
            ])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            // Index for quick status filtering per operator
            $table->index(['operator_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
