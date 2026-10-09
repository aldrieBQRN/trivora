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
                'name'              => 'Red',
                'color_hex'         => '#EF4444',
                'restricted_days'   => ['Monday'],
                'restricted_digits' => [1, 2],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Red coding scheme (ending digits 1, 2) are NOT allowed to operate on Mondays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Blue',
                'color_hex'         => '#3B82F6',
                'restricted_days'   => ['Tuesday'],
                'restricted_digits' => [3, 4],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Blue coding scheme (ending digits 3, 4) are NOT allowed to operate on Tuesdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Yellow',
                'color_hex'         => '#EAB308',
                'restricted_days'   => ['Wednesday'],
                'restricted_digits' => [5, 6],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Yellow coding scheme (ending digits 5, 6) are NOT allowed to operate on Wednesdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Green',
                'color_hex'         => '#22C55E',
                'restricted_days'   => ['Thursday'],
                'restricted_digits' => [7, 8],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a Green coding scheme (ending digits 7, 8) are NOT allowed to operate on Thursdays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'White',
                'color_hex'         => '#94A3B8',
                'restricted_days'   => ['Friday'],
                'restricted_digits' => [9, 0],
                'fine_amount'       => 500.00,
                'description'       => 'Tricycles with a White coding scheme (ending digits 9, 0) are NOT allowed to operate on Fridays.',
                'is_active'         => true,
            ],
            [
                'name'              => 'Orange',
                'color_hex'         => '#F97316',
                'restricted_days'   => [],
                'restricted_digits' => [],
                'fine_amount'       => 500.00,
                'description'       => 'Orange coding scheme (Saturday). No weekend coding restriction.',
                'is_active'         => false,
            ],
            [
                'name'              => 'Violet',
                'color_hex'         => '#8B5CF6',
                'restricted_days'   => [],
                'restricted_digits' => [],
                'fine_amount'       => 500.00,
                'description'       => 'Violet coding scheme (Sunday). No weekend coding restriction.',
                'is_active'         => false,
            ],
        ];

        foreach ($schemes as $scheme) {
            ColorCodingScheme::updateOrCreate(
                ['name' => $scheme['name']],
                $scheme
            );
        }

        $this->command->info('✔ Color coding schemes seeded (' . count($schemes) . ' records).');
    }
}
