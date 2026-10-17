<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use Illuminate\Database\Seeder;

class TricyclesSeeder extends Seeder
{
    /**
     * Seed realistic municipal tricycle units linked to official TODA zones,
     * operators, and franchise schemes.
     */
    public function run(): void
    {
        // Clean up any corrupt or faker test data
        Tricycle::where('plate_number', 'Et in mollit labore')->delete();
        Operator::where('contact_number', 'Omnis blanditiis dol')->delete();
        Operator::where('first_name', 'like', '%Voluptas%')->delete();
        Operator::where('first_name', 'like', '%Assumenda%')->delete();
        \App\Models\User::where('name', 'like', '%Voluptas%')->delete();
        \App\Models\User::where('name', 'like', '%Assumenda%')->delete();

        // Valid operators only
        $operators = Operator::whereNotNull('contact_number')
            ->where('contact_number', '!=', 'Omnis blanditiis dol')
            ->where('first_name', 'not like', '%Nostrum%')
            ->where('first_name', 'not like', '%Voluptas%')
            ->where('first_name', 'not like', '%Assumenda%')
            ->get();
        $fallbackOperator = $operators->first();

        // Designated operators for core registered units
        $opPedro = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        $opJose = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.jbautista@trivora.ph'))->first();
        $opErnesto = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.evillanueva@trivora.ph'))->first();
        $opClara = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.mclara@trivora.ph'))->first();
        $opRicardo = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.rsantos@trivora.ph'))->first();

        $designatedOperators = array_filter([
            'AAA-1234'   => $opPedro,
            'BBB-5678'   => $opJose,
            'CCC-9012'   => $opErnesto,
            'DDD-3456'   => $opClara,
            'EEE-7890'   => $opRicardo,
            'TRV-MOBGPS' => $opRicardo,
        ]);

        // TODA Zones

        $adminUser = \App\Models\User::where('role', 'admin')->orWhere('role', 'bplo_staff')->first() ?: \App\Models\User::first();

        // Authentic Nasugbu Registered Tricycle Units across all TODAs
        $unitsData = [
            ['plate' => 'AAA-1234', 'coding_number' => '0142', 'make' => 'Kawasaki', 'model' => 'Barako II 175', 'status' => 'active',    'iot' => 'TRV-GPS-991'],
            ['plate' => 'BBB-5678', 'coding_number' => '0089', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-992'],
            ['plate' => 'CCC-9012', 'coding_number' => '0301', 'make' => 'Yamaha',   'model' => 'STX 125',       'status' => 'suspended', 'iot' => 'TRV-GPS-993'],
            ['plate' => 'DDD-3456', 'coding_number' => '0012', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-994'],
            ['plate' => 'EEE-7890', 'coding_number' => '0204', 'make' => 'Kawasaki', 'model' => 'Barako 175',   'status' => 'active',    'iot' => 'TRV-GPS-995'],
            ['plate' => 'FFF-2468', 'coding_number' => '0512', 'make' => 'Suzuki',   'model' => 'GD 110',        'status' => 'suspended', 'iot' => 'TRV-GPS-996'],
            ['plate' => 'GGG-1357', 'coding_number' => '0108', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-997'],
            ['plate' => 'HHH-9876', 'coding_number' => '0330', 'make' => 'Yamaha',   'model' => 'Sight 115',     'status' => 'active',    'iot' => 'TRV-GPS-998'],
            ['plate' => 'JJJ-5432', 'coding_number' => '0415', 'make' => 'Kawasaki', 'model' => 'Barako II',     'status' => 'suspended', 'iot' => 'TRV-GPS-999'],
            ['plate' => 'KKK-1122', 'coding_number' => '0602', 'make' => 'Honda',    'model' => 'Supra GTR',     'status' => 'active',    'iot' => 'TRV-GPS-1000'],
            ['plate' => 'LLL-3344', 'coding_number' => '0711', 'make' => 'Yamaha',   'model' => 'Mio i 125',     'status' => 'active',    'iot' => 'TRV-GPS-1001'],
            ['plate' => 'MMM-5566', 'coding_number' => '0820', 'make' => 'Kawasaki', 'model' => 'Barako 175',   'status' => 'active',    'iot' => 'TRV-GPS-1002'],
            ['plate' => 'NNN-7788', 'coding_number' => '0935', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1003'],
            ['plate' => 'PPP-9900', 'coding_number' => '0150', 'make' => 'Suzuki',   'model' => 'Raider J',      'status' => 'suspended', 'iot' => 'TRV-GPS-1004'],
            ['plate' => 'QQQ-1230', 'coding_number' => '0264', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-1005'],
            ['plate' => 'RRR-4560', 'coding_number' => '0378', 'make' => 'Kawasaki', 'model' => 'Barako II',     'status' => 'active',    'iot' => 'TRV-GPS-1006'],
            ['plate' => 'SSS-7890', 'coding_number' => '0489', 'make' => 'Yamaha',   'model' => 'STX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1007'],
            ['plate' => 'TTT-0123', 'coding_number' => '0590', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'suspended', 'iot' => 'TRV-GPS-1008'],
            ['plate' => 'VVV-3456', 'coding_number' => '0611', 'make' => 'Kawasaki', 'model' => 'Barako 175',   'status' => 'active',    'iot' => 'TRV-GPS-1009'],
            ['plate' => 'WWW-6789', 'coding_number' => '0722', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-1010'],
            ['plate' => 'XXX-9012', 'coding_number' => '0833', 'make' => 'Kawasaki', 'model' => 'Barako 175',   'status' => 'active',    'iot' => 'TRV-GPS-1011'],
            ['plate' => 'YYY-2345', 'coding_number' => '0944', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'suspended', 'iot' => 'TRV-GPS-1012'],
            ['plate' => 'ZZZ-5678', 'coding_number' => '0055', 'make' => 'Yamaha',   'model' => 'STX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1013'],
            ['plate' => 'ABC-8901', 'coding_number' => '0166', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-1014'],
            ['plate' => 'XYZ-2346', 'coding_number' => '0277', 'make' => 'Kawasaki', 'model' => 'Barako II',     'status' => 'active',    'iot' => 'TRV-GPS-1015'],
            // Brgy. 1
            ['plate' => 'B01-1001', 'coding_number' => '1101', 'make' => 'Kawasaki', 'model' => 'Barako II 175', 'status' => 'active',    'iot' => 'TRV-GPS-1016'],
            ['plate' => 'B01-1002', 'coding_number' => '1102', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1017'],
            // Brgy. 2
            ['plate' => 'B02-2001', 'coding_number' => '1201', 'make' => 'Yamaha',   'model' => 'STX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1018'],
            ['plate' => 'B02-2002', 'coding_number' => '1202', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-1019'],
            // Brgy. 3
            ['plate' => 'B03-3001', 'coding_number' => '1301', 'make' => 'Kawasaki', 'model' => 'Barako 175',   'status' => 'active',    'iot' => 'TRV-GPS-1020'],
            ['plate' => 'B03-3002', 'coding_number' => '1302', 'make' => 'Suzuki',   'model' => 'GD 110',        'status' => 'active',    'iot' => 'TRV-GPS-1021'],
            // Brgy. 5
            ['plate' => 'B05-5001', 'coding_number' => '1501', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1022'],
            ['plate' => 'B05-5002', 'coding_number' => '1502', 'make' => 'Yamaha',   'model' => 'Sight 115',     'status' => 'active',    'iot' => 'TRV-GPS-1023'],
            // Brgy. 6
            ['plate' => 'B06-6001', 'coding_number' => '1601', 'make' => 'Kawasaki', 'model' => 'Barako II',     'status' => 'active',    'iot' => 'TRV-GPS-1024'],
            ['plate' => 'B06-6002', 'coding_number' => '1602', 'make' => 'Honda',    'model' => 'TMX Alpha',     'status' => 'active',    'iot' => 'TRV-GPS-1025'],
            // Brgy. 7
            ['plate' => 'B07-7001', 'coding_number' => '1701', 'make' => 'Yamaha',   'model' => 'Mio i 125',     'status' => 'active',    'iot' => 'TRV-GPS-1026'],
            ['plate' => 'B07-7002', 'coding_number' => '1702', 'make' => 'Honda',    'model' => 'TMX 125',       'status' => 'active',    'iot' => 'TRV-GPS-1027'],
            // Brgy. 9
            ['plate' => 'B09-9001', 'coding_number' => '1901', 'make' => 'Suzuki',   'model' => 'Raider J',      'status' => 'active',    'iot' => 'TRV-GPS-1028'],
            ['plate' => 'B09-9002', 'coding_number' => '1902', 'make' => 'Kawasaki', 'model' => 'Barako II',     'status' => 'active',    'iot' => 'TRV-GPS-1029'],
        ];

        foreach ($unitsData as $idx => $data) {
            $operator = $designatedOperators[$data['plate']]
                ?? (($operators && $operators->count() > 0)
                    ? $operators[$idx % $operators->count()]
                    : $fallbackOperator);

            $existing = Tricycle::where('plate_number', $data['plate'])->first();
            // Never re-home a unit that already has MTOP applications unless it is one of the designated core units:
            $hasApplications = $existing && $existing->applications()->exists();

            $payload = [
                'coding_scheme_number' => $data['coding_number'],
                'engine_number'        => 'ENG-' . str_pad($idx + 100, 6, '0', STR_PAD_LEFT),
                'chassis_number'       => 'CHS-' . str_pad($idx + 100, 6, '0', STR_PAD_LEFT),
                'make'                 => $data['make'],
                'model'                => $data['model'],
                'year_model'           => 2022 + ($idx % 3),
                'body_color'           => ($idx % 2 === 0) ? 'Black/Red' : 'Blue/Silver',
                'body_type'            => 'Pass-Thru Sidecar',
                'or_number'            => 'OR-2026-' . str_pad($idx + 100, 5, '0', STR_PAD_LEFT),
                'cr_number'            => 'CR-2026-' . str_pad($idx + 100, 5, '0', STR_PAD_LEFT),
                'status'               => $data['status'],
                'iot_device_id'        => $data['iot'],
                'tracking_capability'  => 'iot_enabled',
                'active_tracking_mode' => 'iot_device',
            ];
            if (! $hasApplications || isset($designatedOperators[$data['plate']])) {
                $payload['operator_id'] = $operator?->id;
            }

            $trike = Tricycle::updateOrCreate(
                ['plate_number' => $data['plate']],
                $payload
            );

            // Determine matching color coding scheme by last digit of 4-digit number from DB rules
            $lastDigit = (int)substr($data['coding_number'], -1);
            $schemeModel = \App\Services\ColorCodingRuleService::schemeForLastDigit($lastDigit);
            if ($schemeModel) {
                // Never clobber a franchise issued by a real application (application_id set):
                // e.g. Pedro Ramos's completed APP-2026-00001 deliberately holds an EXPIRED
                // permit, and an awaiting-confirmation permit is deliberately inactive —
                // overwriting either here would break the expired/pending states the
                // Application Tracker and My Tricycles show.
                $applicationIssued = FranchiseScheme::where('tricycle_id', $trike->id)
                    ->whereNotNull('application_id')
                    ->exists();

                if (! $applicationIssued) {
                    $serial = 'MTOP-' . now()->format('Y') . '-' . str_pad($data['coding_number'], 4, '0', STR_PAD_LEFT);
                    FranchiseScheme::updateOrCreate(
                        ['tricycle_id' => $trike->id],
                        [
                            'color_coding_scheme_id' => $schemeModel->id,
                            'franchise_number'       => $serial,
                            'sticker_number'         => $data['coding_number'],
                            'issued_by'              => $adminUser?->id ?: 1,
                            'issue_date'             => now()->subMonths(6),
                            'expiry_date'            => now()->addMonths(6),
                            'is_active'              => true,
                        ]
                    );
                }
            }
        }

        // Ensure mobile GPS test trike also has clean TODA zone and franchise scheme
        $mobTrike = Tricycle::where('plate_number', 'TRV-MOBGPS')->first();
        if ($mobTrike) {
            $mobTrike->update([
                'coding_scheme_number' => '0141',
            ]);
            $mobScheme = \App\Services\ColorCodingRuleService::schemeForLastDigit(1);
            if ($mobScheme) {
                $mobSerial = 'MTOP-' . now()->format('Y') . '-0141';
                FranchiseScheme::updateOrCreate(
                    ['tricycle_id' => $mobTrike->id],
                    [
                        'color_coding_scheme_id' => $mobScheme->id,
                        'franchise_number'       => $mobSerial,
                        'sticker_number'         => '0141',
                        'issued_by'              => $adminUser?->id ?: 1,
                        'issue_date'             => now()->subMonths(6),
                        'expiry_date'            => now()->addMonths(6),
                        'is_active'              => true,
                    ]
                );
            }
        }

        $this->command->info('✔ Tricycles seeded (' . count($unitsData) . ' units with real coding_scheme_numbers and franchise schemes).');
    }
}
