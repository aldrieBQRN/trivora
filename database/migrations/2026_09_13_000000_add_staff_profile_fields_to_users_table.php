<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds staff-profile fields used by department personnel accounts
     * (TMO, BPLO, etc.) — not applicable to driver/passenger accounts.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id')->nullable()->unique()->after('role');
            $table->string('position')->nullable()->after('employee_id');
            $table->string('contact_number')->nullable()->after('position');
            $table->string('address')->nullable()->after('contact_number');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['employee_id', 'position', 'contact_number', 'address']);
        });
    }
};
