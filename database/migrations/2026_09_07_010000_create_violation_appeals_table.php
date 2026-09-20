<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violation_appeals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('violation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->text('reason');
            $table->string('evidence_path')->nullable();
            $table->enum('status', ['under_review', 'approved', 'rejected'])->default('under_review');
            $table->timestamp('submitted_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            // One appeal per violation — the lifecycle is linear (issued -> appealed -> decided),
            // no re-appeal after a decision, so this also doubles as duplicate-appeal prevention.
            $table->unique('violation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violation_appeals');
    }
};
