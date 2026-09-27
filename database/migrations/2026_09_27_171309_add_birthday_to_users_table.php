<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Staff birthday (TMO / BPLO Staff Management and Account Settings). Nullable and additive —
     * existing accounts are untouched until a birthday is entered.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'birthday')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->date('birthday')->nullable()->after('position');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'birthday')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('birthday');
            });
        }
    }
};
