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
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('actor_name', 150)->nullable()->after('user_id');
            $table->string('actor_role', 50)->nullable()->after('actor_name');
            $table->string('module', 50)->nullable()->after('actor_role');
            $table->string('action', 100)->nullable()->after('module');
            $table->string('target_type', 100)->nullable()->after('auditable_id');
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
            $table->string('target_reference', 100)->nullable()->after('target_id');
            $table->text('description')->nullable()->after('target_reference');
            $table->string('channel', 20)->default('web')->after('description');
            $table->json('metadata')->nullable()->after('new_values');

            // Targeted indexes for administrative log queries
            $table->index(['channel', 'module', 'created_at'], 'audit_logs_channel_module_created_idx');
            $table->index(['actor_role', 'created_at'], 'audit_logs_actor_role_created_idx');
            $table->index('action', 'audit_logs_action_idx');
            $table->index('target_reference', 'audit_logs_target_reference_idx');
            $table->index('created_at', 'audit_logs_created_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_channel_module_created_idx');
            $table->dropIndex('audit_logs_actor_role_created_idx');
            $table->dropIndex('audit_logs_action_idx');
            $table->dropIndex('audit_logs_target_reference_idx');
            $table->dropIndex('audit_logs_created_at_idx');

            $table->dropColumn([
                'actor_name',
                'actor_role',
                'module',
                'action',
                'target_type',
                'target_id',
                'target_reference',
                'description',
                'channel',
                'metadata',
            ]);
        });
    }
};
