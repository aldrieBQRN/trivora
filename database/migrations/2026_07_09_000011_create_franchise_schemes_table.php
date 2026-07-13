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
        Schema::create('franchise_schemes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')
                ->unique() // One franchise per application
                ->constrained('applications')
                ->cascadeOnDelete();
            $table->foreignId('tricycle_id')
                ->unique() // One active franchise per tricycle
                ->constrained('tricycles')
                ->cascadeOnDelete();
            $table->foreignId('color_coding_scheme_id')
                ->constrained('color_coding_schemes')
                ->restrictOnDelete();
            $table->foreignId('issued_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('franchise_number', 30)->unique();
            $table->date('issue_date');
            $table->date('expiry_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('franchise_schemes');
    }
};
