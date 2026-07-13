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
                'name'            => 'Red',
                'color_hex'       => '#EF4444',
                'restricted_days' => ['Monday'],
                'description'     => 'Tricycles with a Red coding scheme are NOT allowed to operate on Mondays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'Blue',
                'color_hex'       => '#3B82F6',
                'restricted_days' => ['Tuesday'],
                'description'     => 'Tricycles with a Blue coding scheme are NOT allowed to operate on Tuesdays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'Yellow',
                'color_hex'       => '#EAB308',
                'restricted_days' => ['Wednesday'],
                'description'     => 'Tricycles with a Yellow coding scheme are NOT allowed to operate on Wednesdays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'Green',
                'color_hex'       => '#22C55E',
                'restricted_days' => ['Thursday'],
                'description'     => 'Tricycles with a Green coding scheme are NOT allowed to operate on Thursdays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'White',
                'color_hex'       => '#94A3B8',
                'restricted_days' => ['Friday'],
                'description'     => 'Tricycles with a White coding scheme are NOT allowed to operate on Fridays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'Orange',
                'color_hex'       => '#F97316',
                'restricted_days' => ['Saturday'],
                'description'     => 'Tricycles with an Orange coding scheme are NOT allowed to operate on Saturdays.',
                'is_active'       => true,
            ],
            [
                'name'            => 'Violet',
                'color_hex'       => '#8B5CF6',
                'restricted_days' => ['Sunday'],
                'description'     => 'Tricycles with a Violet coding scheme are NOT allowed to operate on Sundays.',
                'is_active'       => true,
            ],
        ];

        foreach ($schemes as $scheme) {
            ColorCodingScheme::firstOrCreate(
                ['name' => $scheme['name']],
                $scheme
            );
        }

        $this->command->info('✔ Color coding schemes seeded (' . count($schemes) . ' records).');
    }
}
