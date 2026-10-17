<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per reference series (e.g. "APP-2026-"), incremented under a row lock so
     * simultaneous submissions always receive different numbers (Application::generateReferenceNumber).
     */
    public function up(): void
    {
        Schema::create('reference_counters', function (Blueprint $table) {
            $table->string('name', 30)->primary();
            $table->unsignedBigInteger('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_counters');
    }
};
