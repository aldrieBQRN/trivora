<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Email of the separate (non-owner) tricycle driver, collected at registration. Login is
     * email-only, so this is the address the driver's own Driver App account uses. Nullable:
     * drivers on applications filed before this column existed simply have none on file.
     */
    public function up(): void
    {
        if (Schema::hasColumn('application_drivers', 'email')) {
            return;
        }

        Schema::table('application_drivers', function (Blueprint $table) {
            $table->string('email', 255)->nullable()->after('contact_number');
        });
    }

    public function down(): void
    {
        Schema::table('application_drivers', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
