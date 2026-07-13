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
        Schema::create('toda_zone_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('toda_zone_id')
                ->constrained('toda_zones')
                ->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence_order');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('toda_zone_routes');
    }
};
