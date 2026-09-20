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
        Schema::table('toda_zones', function (Blueprint $table) {
            $table->string('terminal_name', 150)->nullable()->after('barangay');
            $table->string('address', 255)->nullable()->after('terminal_name');
            $table->decimal('latitude', 10, 7)->nullable()->after('address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('president_name', 150)->nullable()->after('longitude');
            $table->string('contact_number', 30)->nullable()->after('president_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('toda_zones', function (Blueprint $table) {
            $table->dropColumn([
                'terminal_name',
                'address',
                'latitude',
                'longitude',
                'president_name',
                'contact_number',
            ]);
        });
    }
};
