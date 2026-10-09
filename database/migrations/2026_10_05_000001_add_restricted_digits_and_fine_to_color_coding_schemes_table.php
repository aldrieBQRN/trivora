<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('color_coding_schemes')) {
            Schema::table('color_coding_schemes', function (Blueprint $table) {
                if (!Schema::hasColumn('color_coding_schemes', 'restricted_digits')) {
                    $table->json('restricted_digits')->nullable()->after('restricted_days');
                }
                if (!Schema::hasColumn('color_coding_schemes', 'fine_amount')) {
                    $table->decimal('fine_amount', 8, 2)->default(500.00)->after('description');
                }
            });

            // Backfill existing schemes with authoritative digits and fine amounts
            $defaults = [
                'Red'    => ['days' => ['Monday'],    'digits' => [1, 2]],
                'Blue'   => ['days' => ['Tuesday'],   'digits' => [3, 4]],
                'Yellow' => ['days' => ['Wednesday'], 'digits' => [5, 6]],
                'Green'  => ['days' => ['Thursday'],  'digits' => [7, 8]],
                'White'  => ['days' => ['Friday'],    'digits' => [9, 0]],
                'Orange' => ['days' => [],            'digits' => []],
                'Violet' => ['days' => [],            'digits' => []],
            ];

            foreach ($defaults as $name => $cfg) {
                DB::table('color_coding_schemes')
                    ->where('name', $name)
                    ->update([
                        'restricted_days'   => json_encode($cfg['days']),
                        'restricted_digits' => json_encode($cfg['digits']),
                        'fine_amount'       => 500.00,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('color_coding_schemes')) {
            Schema::table('color_coding_schemes', function (Blueprint $table) {
                if (Schema::hasColumn('color_coding_schemes', 'fine_amount')) {
                    $table->dropColumn('fine_amount');
                }
                if (Schema::hasColumn('color_coding_schemes', 'restricted_digits')) {
                    $table->dropColumn('restricted_digits');
                }
            });
        }
    }
};
