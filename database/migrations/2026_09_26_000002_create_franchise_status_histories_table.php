<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only audit trail of FranchiseScheme status changes — same shape as the retired
     * driver_status_histories table (which tracked the wrong entity: operational authorization
     * belongs to the franchise, not the individual driver account), just re-pointed at
     * franchise_scheme_id.
     */
    public function up(): void
    {
        if (Schema::hasTable('franchise_status_histories')) {
            return;
        }

        Schema::create('franchise_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('franchise_scheme_id')->constrained('franchise_schemes')->onDelete('cascade');
            $table->foreignId('changed_by')->constrained('users')->onDelete('restrict');
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['franchise_scheme_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('franchise_status_histories');
    }
};
