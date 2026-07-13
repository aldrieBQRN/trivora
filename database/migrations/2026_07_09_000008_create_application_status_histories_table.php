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
        Schema::create('application_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')
                ->constrained('applications')
                ->cascadeOnDelete();
            $table->foreignId('changed_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('from_status', 50)->nullable();
            $table->string('to_status', 50);
            $table->unsignedTinyInteger('from_step')->nullable();
            $table->unsignedTinyInteger('to_step')->nullable();
            $table->text('notes')->nullable();
            // No updated_at — this is an append-only audit log
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_status_histories');
    }
};
