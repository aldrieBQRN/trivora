<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Operational authorization status for a FranchiseScheme — distinct from the existing
     * `is_active` boolean, which only marks whether this row is the tricycle's CURRENT scheme
     * record (superseded rows from a renewal keep is_active=false forever). `status` instead
     * tracks whether TMO currently authorizes this franchise to operate: active/suspended/
     * revoked. A suspended/revoked scheme is still the tricycle's current (is_active=true) one.
     */
    public function up(): void
    {
        Schema::table('franchise_schemes', function (Blueprint $table) {
            if (!Schema::hasColumn('franchise_schemes', 'status')) {
                $table->enum('status', ['active', 'suspended', 'revoked'])
                    ->default('active')
                    ->after('is_active');
            }
            if (!Schema::hasColumn('franchise_schemes', 'status_reason')) {
                $table->text('status_reason')->nullable()->after('status');
            }
            if (!Schema::hasColumn('franchise_schemes', 'status_changed_at')) {
                $table->timestamp('status_changed_at')->nullable()->after('status_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('franchise_schemes', function (Blueprint $table) {
            foreach (['status', 'status_reason', 'status_changed_at'] as $column) {
                if (Schema::hasColumn('franchise_schemes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
