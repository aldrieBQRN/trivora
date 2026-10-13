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
        if (!Schema::hasTable('violation_enforcements')) {
            Schema::create('violation_enforcements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('violation_id')->constrained('violations')->cascadeOnDelete()->unique();
                $table->foreignId('franchise_scheme_id')->nullable()->constrained('franchise_schemes')->nullOnDelete();
                $table->unsignedTinyInteger('offense_number');
                $table->string('action_type', 50); // 'impoundment_and_suspension', 'revocation'
                $table->string('status', 50)->default('completed'); // 'completed', 'pending_confirmation', 'action_required'
                $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('confirmed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violation_enforcements');
    }
};
