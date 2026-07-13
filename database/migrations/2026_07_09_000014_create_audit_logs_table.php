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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable() // NULL for system-triggered events
                ->constrained('users')
                ->nullOnDelete();
            $table->string('event', 100); // e.g. "application.submitted", "violation.auto_detected"
            $table->string('auditable_type', 100)->nullable(); // e.g. "App\Models\Application"
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            // Append-only — no updated_at
            $table->timestamp('created_at')->nullable();

            // Polymorphic index for looking up all logs for a specific record
            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
