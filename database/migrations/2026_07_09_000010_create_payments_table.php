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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')
                ->unique() // One payment per application
                ->constrained('applications')
                ->cascadeOnDelete();
            $table->foreignId('processed_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('official_receipt_number', 50)->unique();
            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', [
                'cash',
                'gcash',
                'bank_transfer',
                'check',
            ])->default('cash');
            $table->date('payment_date');
            $table->time('payment_time')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
