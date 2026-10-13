<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Server-generated temporary passwords for staff accounts created in TMO / BPLO Staff
     * Management (see App\Services\StaffCredentials). Additive only: every existing account
     * gets must_change_password = false and keeps signing in exactly as before.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'must_change_password')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->timestamp('temporary_password_expires_at')->nullable()->after('must_change_password');
            $table->timestamp('credentials_sent_at')->nullable()->after('temporary_password_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['must_change_password', 'temporary_password_expires_at', 'credentials_sent_at']);
        });
    }
};
