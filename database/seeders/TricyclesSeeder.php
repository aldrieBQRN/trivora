<?php

namespace Database\Seeders;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use Illuminate\Database\Seeder;

class TricyclesSeeder extends Seeder
{
    /**
     * Seed sample tricycle units linked to the seeded operators.
     */
    public function run(): void
    {
        $operator1 = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        $operator2 = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.jbautista@trivora.ph'))->first();
        $operator3 = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.evillanueva@trivora.ph'))->first();
        $operator4 = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.mclara@trivora.ph'))->first();
        $operator5 = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.rsantos@trivora.ph'))->first();

        $toda1 = TodaZone::where('code', 'TODA-01')->first();
        $toda2 = TodaZone::where('code', 'TODA-02')->first();
        $toda3 = TodaZone::where('code', 'TODA-03')->first();

        $tricycles = [
            [
                'operator_id'    => $operator1?->id,
                'toda_zone_id'   => $toda1?->id,
                'plate_number'   => 'AAA-1234',
                'engine_number'  => 'KBE185E-0012345',
                'chassis_number' => 'JKABKE10AAA012345',
                'make'           => 'Kawasaki',
                'model'          => 'Barako II 175',
                'year_model'     => 2019,
                'body_color'     => 'Red',
                'body_type'      => 'Standard Side Car',
                'or_number'      => 'OR-2019-001001',
                'cr_number'      => 'CR-2019-001001',
                'status'         => 'active',
            ],
            [
                'operator_id'    => $operator2?->id,
                'toda_zone_id'   => $toda2?->id,
                'plate_number'   => 'BBB-5678',
                'engine_number'  => 'HF150E-0023456',
                'chassis_number' => 'MRHJE1800LA023456',
                'make'           => 'Honda',
                'model'          => 'Super Cub 150',
                'year_model'     => 2021,
                'body_color'     => 'Blue',
                'body_type'      => 'Deluxe Side Car',
                'or_number'      => 'OR-2021-002002',
                'cr_number'      => 'CR-2021-002002',
                'status'         => 'active',
            ],
            [
                'operator_id'    => $operator3?->id,
                'toda_zone_id'   => $toda3?->id,
                'plate_number'   => 'CCC-9012',
                'engine_number'  => 'YFM150E-0034567',
                'chassis_number' => 'JYACE0703JA034567',
                'make'           => 'Yamaha',
                'model'          => 'Mio i 125',
                'year_model'     => 2018,
                'body_color'     => 'Yellow',
                'body_type'      => 'Economy Side Car',
                'or_number'      => 'OR-2018-003003',
                'cr_number'      => 'CR-2018-003003',
                'status'         => 'unregistered',
            ],
            [
                'operator_id'    => $operator4?->id,
                'toda_zone_id'   => $toda1?->id,
                'plate_number'   => 'DDD-3456',
                'engine_number'  => 'HFE125E-0045678',
                'chassis_number' => 'MRHJE1200LA045678',
                'make'           => 'Honda',
                'model'          => 'TMX 125 Alpha',
                'year_model'     => 2020,
                'body_color'     => 'Black',
                'body_type'      => 'Standard Side Car',
                'or_number'      => 'OR-2020-004004',
                'cr_number'      => 'CR-2020-004004',
                'status'         => 'active',
            ],
            [
                'operator_id'    => $operator5?->id,
                'toda_zone_id'   => $toda2?->id,
                'plate_number'   => 'EEE-7890',
                'engine_number'  => 'KBE175E-0056789',
                'chassis_number' => 'JKABKE10AAA056789',
                'make'           => 'Kawasaki',
                'model'          => 'Barako 175',
                'year_model'     => 2022,
                'body_color'     => 'Blue',
                'body_type'      => 'Deluxe Side Car',
                'or_number'      => 'OR-2022-005005',
                'cr_number'      => 'CR-2022-005005',
                'status'         => 'active',
            ],
        ];

        foreach ($tricycles as $data) {
            if (! $data['operator_id']) {
                continue; // skip if operator wasn't seeded yet
            }

            Tricycle::firstOrCreate(
                ['plate_number' => $data['plate_number']],
                $data
            );
        }

        $this->command->info('✔ Tricycles seeded (' . count($tricycles) . ' units).');
    }
}
