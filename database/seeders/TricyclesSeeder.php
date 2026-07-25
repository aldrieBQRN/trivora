<?php

namespace Database\Seeders;

use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use Illuminate\Database\Seeder;

class TricyclesSeeder extends Seeder
{
    /**
     * Seed sample tricycle units linked to official TODA zones.
     */
    public function run(): void
    {
        $operators = Operator::all();
        $fallbackOperator = $operators->first();

        $todaBucana = TodaZone::where('code', 'TODA-BUCANA')->orWhere('name', 'TODA Bucana')->first()
            ?: TodaZone::firstOrCreate(['code' => 'TODA-BUCANA'], ['name' => 'TODA Bucana', 'color_hex' => '#7C3AED']);
        $todaBrgy10 = TodaZone::where('code', 'TODA-BRGY10')->orWhere('name', 'TODA Brgy. 10')->first()
            ?: TodaZone::firstOrCreate(['code' => 'TODA-BRGY10'], ['name' => 'TODA Brgy. 10', 'color_hex' => '#F59E0B']);
        $todaBrgy8  = TodaZone::where('code', 'TODA-BRGY8')->orWhere('name', 'TODA Brgy. 8')->first()
            ?: TodaZone::firstOrCreate(['code' => 'TODA-BRGY8'], ['name' => 'TODA Brgy. 8', 'color_hex' => '#4F5BCB']);
        $todaBrgy14 = TodaZone::where('code', 'TODA-BRGY14')->orWhere('name', 'TODA Brgy. 14')->first()
            ?: TodaZone::firstOrCreate(['code' => 'TODA-BRGY14'], ['name' => 'TODA Brgy. 14', 'color_hex' => '#059669']);

        $unitsData = [
            ['plate' => 'AAA-1234', 'coding_number' => '0142', 'make' => 'Kawasaki', 'model' => 'Barako II 175', 'status' => 'active', 'toda' => $todaBucana, 'iot' => 'TRV-GPS-991'],
            ['plate' => 'BBB-5678', 'coding_number' => '0089', 'make' => 'Honda', 'model' => 'TMX 125', 'status' => 'active', 'toda' => $todaBrgy10, 'iot' => 'TRV-GPS-992'],
            ['plate' => 'CCC-9012', 'coding_number' => '0301', 'make' => 'Yamaha', 'model' => 'STX 125', 'status' => 'suspended', 'toda' => $todaBrgy8, 'iot' => 'TRV-GPS-993'],
            ['plate' => 'DDD-3456', 'coding_number' => '0012', 'make' => 'Honda', 'model' => 'TMX Alpha', 'status' => 'active', 'toda' => $todaBrgy14, 'iot' => 'TRV-GPS-994'],
            ['plate' => 'EEE-7890', 'coding_number' => '0204', 'make' => 'Kawasaki', 'model' => 'Barako 175', 'status' => 'active', 'toda' => $todaBucana, 'iot' => 'TRV-GPS-995'],
            ['plate' => 'FFF-2468', 'coding_number' => '0512', 'make' => 'Suzuki', 'model' => 'GD 110', 'status' => 'suspended', 'toda' => $todaBrgy10, 'iot' => 'TRV-GPS-996'],
            ['plate' => 'GGG-1357', 'coding_number' => '0108', 'make' => 'Honda', 'model' => 'TMX 125', 'status' => 'active', 'toda' => $todaBrgy8, 'iot' => 'TRV-GPS-997'],
            ['plate' => 'HHH-9876', 'coding_number' => '0330', 'make' => 'Yamaha', 'model' => 'Sight 115', 'status' => 'active', 'toda' => $todaBrgy14, 'iot' => 'TRV-GPS-998'],
            ['plate' => 'JJJ-5432', 'coding_number' => '0415', 'make' => 'Kawasaki', 'model' => 'Barako II', 'status' => 'suspended', 'toda' => $todaBucana, 'iot' => 'TRV-GPS-999'],
            ['plate' => 'KKK-1122', 'coding_number' => '0602', 'make' => 'Honda', 'model' => 'Supra GTR', 'status' => 'active', 'toda' => $todaBrgy10, 'iot' => 'TRV-GPS-1000'],
            ['plate' => 'LLL-3344', 'coding_number' => '0711', 'make' => 'Yamaha', 'model' => 'Mio i 125', 'status' => 'active', 'toda' => $todaBrgy8, 'iot' => 'TRV-GPS-1001'],
            ['plate' => 'MMM-5566', 'coding_number' => '0820', 'make' => 'Kawasaki', 'model' => 'Barako 175', 'status' => 'active', 'toda' => $todaBrgy14, 'iot' => 'TRV-GPS-1002'],
            ['plate' => 'NNN-7788', 'coding_number' => '0935', 'make' => 'Honda', 'model' => 'TMX 125', 'status' => 'active', 'toda' => $todaBucana, 'iot' => 'TRV-GPS-1003'],
            ['plate' => 'PPP-9900', 'coding_number' => '0150', 'make' => 'Suzuki', 'model' => 'Raider J', 'status' => 'suspended', 'toda' => $todaBrgy10, 'iot' => 'TRV-GPS-1004'],
            ['plate' => 'QQQ-1230', 'coding_number' => '0264', 'make' => 'Honda', 'model' => 'TMX Alpha', 'status' => 'active', 'toda' => $todaBrgy8, 'iot' => 'TRV-GPS-1005'],
            ['plate' => 'RRR-4560', 'coding_number' => '0378', 'make' => 'Kawasaki', 'model' => 'Barako II', 'status' => 'active', 'toda' => $todaBrgy14, 'iot' => 'TRV-GPS-1006'],
            ['plate' => 'SSS-7890', 'coding_number' => '0489', 'make' => 'Yamaha', 'model' => 'STX 125', 'status' => 'active', 'toda' => $todaBucana, 'iot' => 'TRV-GPS-1007'],
            ['plate' => 'TTT-0123', 'coding_number' => '0590', 'make' => 'Honda', 'model' => 'TMX 125', 'status' => 'suspended', 'toda' => $todaBrgy10, 'iot' => 'TRV-GPS-1008'],
            ['plate' => 'VVV-3456', 'coding_number' => '0611', 'make' => 'Kawasaki', 'model' => 'Barako 175', 'status' => 'active', 'toda' => $todaBrgy8, 'iot' => 'TRV-GPS-1009'],
            ['plate' => 'WWW-6789', 'coding_number' => '0722', 'make' => 'Honda', 'model' => 'TMX Alpha', 'status' => 'active', 'toda' => $todaBrgy14, 'iot' => 'TRV-GPS-1010'],
        ];

        foreach ($unitsData as $idx => $data) {
            $operator = ($operators && $operators->count() > 0) ? $operators[$idx % $operators->count()] : $fallbackOperator;

            Tricycle::updateOrCreate(
                ['plate_number' => $data['plate']],
                [
                    'operator_id'          => $operator?->id,
                    'toda_zone_id'         => $data['toda']?->id,
                    'coding_scheme_number' => $data['coding_number'],
                    'engine_number'        => 'ENG-' . str_pad($idx + 100, 6, '0', STR_PAD_LEFT),
                    'chassis_number'       => 'CHS-' . str_pad($idx + 100, 6, '0', STR_PAD_LEFT),
                    'make'                 => $data['make'],
                    'model'                => $data['model'],
                    'year_model'           => 2021,
                    'body_color'           => 'Red',
                    'body_type'            => 'Standard Side Car',
                    'or_number'            => 'OR-2022-' . (1000 + $idx),
                    'cr_number'            => 'CR-2022-' . (1000 + $idx),
                    'status'               => $data['status'],
                    'iot_device_id'        => $data['iot'],
                    'tracking_capability'  => 'iot_enabled',
                    'active_tracking_mode' => 'iot_device',
                ]
            );
        }

        $this->command->info('✔ Tricycles seeded (' . count($unitsData) . ' units with coding_scheme_number).');
    }
}
