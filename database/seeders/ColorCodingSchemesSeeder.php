<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use Illuminate\Database\Seeder;

class ColorCodingSchemesSeeder extends Seeder
{
    /**
     * Seed the color-coding schemes table.
     * Each color maps to a specific restricted day of the week.
     */
    public function run(): void
    {
        $schemes = [
            [
                'name'              => 'Blue',
                'color_hex'         => '#3B82F6',
                'restricted_days'   => ['Monday'],
                'restricted_digits' => [1, 2],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Blue coding scheme (ending digits 1, 2) are NOT allowed to operate on Mondays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Brown',
                'color_hex'         => '#92400E',
                'restricted_days'   => ['Tuesday'],
                'restricted_digits' => [3, 4],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Brown coding scheme (ending digits 3, 4) are NOT allowed to operate on Tuesdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Green',
                'color_hex'         => '#22C55E',
                'restricted_days'   => ['Wednesday'],
                'restricted_digits' => [5, 6],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Green coding scheme (ending digits 5, 6) are NOT allowed to operate on Wednesdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Red',
                'color_hex'         => '#EF4444',
                'restricted_days'   => ['Thursday'],
                'restricted_digits' => [7, 8],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Red coding scheme (ending digits 7, 8) are NOT allowed to operate on Thursdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Yellow',
                'color_hex'         => '#EAB308',
                'restricted_days'   => ['Friday'],
                'restricted_digits' => [9, 0],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Yellow coding scheme (ending digits 9, 0) are NOT allowed to operate on Fridays.',
                'is_active'         => true,
            ],
        ];

        foreach ($schemes as $scheme) {
            ColorCodingScheme::updateOrCreate(
                ['name' => $scheme['name']],
                $scheme
            );
        }

        // Retire schemes no longer in the municipal rule set (e.g. White, Orange, Violet) instead of
        // deleting them, so older franchise/violation records keep a valid reference.
        ColorCodingScheme::whereNotIn('name', array_column($schemes, 'name'))
            ->get()
            ->each(fn (ColorCodingScheme $old) => $old->update([
                'is_active'         => false,
                'restricted_days'   => [],
                'restricted_digits' => [],
            ]));

        $this->command->info('✔ Color coding schemes seeded (' . count($schemes) . ' records).');
    }
}
