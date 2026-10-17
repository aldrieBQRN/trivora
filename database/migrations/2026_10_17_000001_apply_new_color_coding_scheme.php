<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * New municipal color coding: 1-2 Blue, 3-4 Brown, 5-6 Green, 7-8 Red, 9-0 Yellow
     * (each digit pair keeps its weekday, Monday through Friday).
     *
     * Updating the scheme rows alone is not enough: the system evaluates a unit against the
     * scheme linked on its franchise, so every franchise is re-linked to the scheme matching
     * its sticker number's last digit. Historical violations keep the scheme they were issued under.
     */
    public function up(): void
    {
        if (! Schema::hasTable('color_coding_schemes') || ! Schema::hasColumn('color_coding_schemes', 'restricted_digits')) {
            return;
        }

        $schemes = [
            'Blue'   => ['hex' => '#3B82F6', 'day' => 'Monday',    'digits' => [1, 2]],
            'Brown'  => ['hex' => '#92400E', 'day' => 'Tuesday',   'digits' => [3, 4]],
            'Green'  => ['hex' => '#22C55E', 'day' => 'Wednesday', 'digits' => [5, 6]],
            'Red'    => ['hex' => '#EF4444', 'day' => 'Thursday',  'digits' => [7, 8]],
            'Yellow' => ['hex' => '#EAB308', 'day' => 'Friday',    'digits' => [9, 0]],
        ];

        DB::transaction(function () use ($schemes) {
            $now = now();
            $idForDigit = [];

            foreach ($schemes as $name => $cfg) {
                $digitList = implode(', ', $cfg['digits']);
                $values = [
                    'color_hex'         => $cfg['hex'],
                    'restricted_days'   => json_encode([$cfg['day']]),
                    'restricted_digits' => json_encode($cfg['digits']),
                    'description'       => "Tricycles with a {$name} coding scheme (ending digits {$digitList}) are NOT allowed to operate on {$cfg['day']}s.",
                    'is_active'         => true,
                    'updated_at'        => $now,
                ];

                $id = DB::table('color_coding_schemes')->where('name', $name)->value('id');
                if ($id) {
                    DB::table('color_coding_schemes')->where('id', $id)->update($values);
                } else {
                    $id = DB::table('color_coding_schemes')->insertGetId($values + [
                        'name'        => $name,
                        'fine_amount' => 500.00,
                        'created_at'  => $now,
                    ]);
                }

                foreach ($cfg['digits'] as $digit) {
                    $idForDigit[$digit] = $id;
                }
            }

            // Retire schemes outside the new rule set (White, Orange, Violet). Franchise rows
            // reference schemes with ON DELETE RESTRICT, so they are deactivated, never deleted.
            DB::table('color_coding_schemes')
                ->whereNotIn('name', array_keys($schemes))
                ->update([
                    'is_active'         => false,
                    'restricted_days'   => json_encode([]),
                    'restricted_digits' => json_encode([]),
                    'updated_at'        => $now,
                ]);

            DB::table('franchise_schemes')
                ->leftJoin('tricycles', 'tricycles.id', '=', 'franchise_schemes.tricycle_id')
                ->select('franchise_schemes.id', 'franchise_schemes.color_coding_scheme_id', 'franchise_schemes.sticker_number', 'tricycles.coding_scheme_number')
                ->orderBy('franchise_schemes.id')
                ->get()
                ->each(function ($fs) use ($idForDigit, $now) {
                    // Same identifier ColorCodingRuleService evaluates: the tricycle's sticker number.
                    $code = $fs->coding_scheme_number ?: $fs->sticker_number;
                    if (! preg_match('/(\d)\D*$/', (string) $code, $m)) {
                        return;
                    }

                    $schemeId = $idForDigit[(int) $m[1]];
                    if ((int) $fs->color_coding_scheme_id !== $schemeId) {
                        DB::table('franchise_schemes')->where('id', $fs->id)->update([
                            'color_coding_scheme_id' => $schemeId,
                            'updated_at'             => $now,
                        ]);
                    }
                });
        });
    }

    /**
     * Not reversible: the previous franchise-to-scheme links are not recorded anywhere.
     */
    public function down(): void
    {
        //
    }
};
