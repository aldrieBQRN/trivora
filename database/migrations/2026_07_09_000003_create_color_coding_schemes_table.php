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
        Schema::create('color_coding_schemes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->string('color_hex', 7);
            $table->json('restricted_days');  // e.g. ["Monday"] or ["Monday","Tuesday"]
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('color_coding_schemes');
    }
};
