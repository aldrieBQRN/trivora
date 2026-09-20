<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The public registration form's "I have read, understood, and agree to the Terms & Conditions,
 * including the Data Privacy Consent..." checkbox was previously UI-only state — never sent to
 * the backend, never persisted. This adds real persistence for that single combined agreement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (!Schema::hasColumn('applications', 'terms_accepted')) {
                $table->boolean('terms_accepted')->default(false)->after('remarks');
            }
            if (!Schema::hasColumn('applications', 'privacy_policy_accepted')) {
                $table->boolean('privacy_policy_accepted')->default(false)->after('terms_accepted');
            }
            if (!Schema::hasColumn('applications', 'consent_accepted_at')) {
                $table->timestamp('consent_accepted_at')->nullable()->after('privacy_policy_accepted');
            }
            if (!Schema::hasColumn('applications', 'terms_version')) {
                $table->string('terms_version', 20)->nullable()->after('consent_accepted_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            foreach (['terms_version', 'consent_accepted_at', 'privacy_policy_accepted', 'terms_accepted'] as $column) {
                if (Schema::hasColumn('applications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
