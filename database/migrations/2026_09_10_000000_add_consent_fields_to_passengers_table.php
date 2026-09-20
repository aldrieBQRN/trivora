<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->boolean('terms_accepted')->default(false)->after('emergency_contact');
            $table->boolean('privacy_policy_accepted')->default(false)->after('terms_accepted');
            $table->timestamp('consent_accepted_at')->nullable()->after('privacy_policy_accepted');
            $table->string('terms_version', 20)->nullable()->after('consent_accepted_at');
        });
    }

    public function down(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->dropColumn(['terms_accepted', 'privacy_policy_accepted', 'consent_accepted_at', 'terms_version']);
        });
    }
};
