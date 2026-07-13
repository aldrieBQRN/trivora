<?php

namespace Database\Seeders;

use App\Models\TodaZone;
use App\Models\TodaZoneRoute;
use Illuminate\Database\Seeder;

class TodaZonesSeeder extends Seeder
{
    /**
     * Seed TODA zones with their barangay coverage and sample route waypoints.
     */
    public function run(): void
    {
        $zones = [
            [
                'name'        => 'TODA Zone 1 — Poblacion',
                'code'        => 'TODA-01',
                'barangay'    => 'Poblacion',
                'description' => 'Covers the town center, municipal hall, and public market area.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.5995124, 'lng' => 120.9842195],
                    ['lat' => 14.6010000, 'lng' => 120.9850000],
                    ['lat' => 14.6020000, 'lng' => 120.9830000],
                    ['lat' => 14.6005000, 'lng' => 120.9820000],
                    ['lat' => 14.5995124, 'lng' => 120.9842195], // close polygon
                ],
            ],
            [
                'name'        => 'TODA Zone 2 — Bagong Silang',
                'code'        => 'TODA-02',
                'barangay'    => 'Bagong Silang',
                'description' => 'Covers the residential areas of Bagong Silang and nearby sitios.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.6100000, 'lng' => 120.9900000],
                    ['lat' => 14.6120000, 'lng' => 120.9915000],
                    ['lat' => 14.6130000, 'lng' => 120.9895000],
                    ['lat' => 14.6110000, 'lng' => 120.9880000],
                    ['lat' => 14.6100000, 'lng' => 120.9900000],
                ],
            ],
            [
                'name'        => 'TODA Zone 3 — San Isidro',
                'code'        => 'TODA-03',
                'barangay'    => 'San Isidro',
                'description' => 'Covers San Isidro barangay including the school and health center routes.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.5950000, 'lng' => 120.9780000],
                    ['lat' => 14.5965000, 'lng' => 120.9795000],
                    ['lat' => 14.5975000, 'lng' => 120.9775000],
                    ['lat' => 14.5960000, 'lng' => 120.9760000],
                    ['lat' => 14.5950000, 'lng' => 120.9780000],
                ],
            ],
            [
                'name'        => 'TODA Zone 4 — Maligaya',
                'code'        => 'TODA-04',
                'barangay'    => 'Maligaya',
                'description' => 'Serves Maligaya and surrounding farming barangays.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.6200000, 'lng' => 120.9750000],
                    ['lat' => 14.6215000, 'lng' => 120.9770000],
                    ['lat' => 14.6225000, 'lng' => 120.9745000],
                    ['lat' => 14.6210000, 'lng' => 120.9730000],
                    ['lat' => 14.6200000, 'lng' => 120.9750000],
                ],
            ],
            [
                'name'        => 'TODA Zone 5 — Rizal',
                'code'        => 'TODA-05',
                'barangay'    => 'Rizal',
                'description' => 'Covers Barangay Rizal including the terminal and highway access routes.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.5900000, 'lng' => 120.9850000],
                    ['lat' => 14.5915000, 'lng' => 120.9865000],
                    ['lat' => 14.5925000, 'lng' => 120.9845000],
                    ['lat' => 14.5910000, 'lng' => 120.9830000],
                    ['lat' => 14.5900000, 'lng' => 120.9850000],
                ],
            ],
        ];

        foreach ($zones as $zoneData) {
            $routes = $zoneData['routes'];
            unset($zoneData['routes']);

            $zone = TodaZone::firstOrCreate(
                ['code' => $zoneData['code']],
                $zoneData
            );

            // Only seed routes if this zone doesn't already have them
            if ($zone->routes()->count() === 0) {
                foreach ($routes as $order => $point) {
                    TodaZoneRoute::create([
                        'toda_zone_id'   => $zone->id,
                        'sequence_order' => $order + 1,
                        'latitude'       => $point['lat'],
                        'longitude'      => $point['lng'],
                    ]);
                }
            }
        }

        $this->command->info('✔ TODA zones seeded (' . count($zones) . ' zones with route waypoints).');
    }
}
