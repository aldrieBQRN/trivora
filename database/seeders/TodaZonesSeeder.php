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
                'name'        => 'TODA Bucana',
                'code'        => 'TODA-BUCANA',
                'barangay'    => 'Bucana',
                'description' => 'Covers Bucana coastal and residential TODA route.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.0640, 'lng' => 120.6298],
                    ['lat' => 14.0660, 'lng' => 120.6295],
                    ['lat' => 14.0660, 'lng' => 120.6303],
                ],
            ],
            [
                'name'        => 'TODA Brgy. 10',
                'code'        => 'TODA-BRGY10',
                'barangay'    => 'Brgy. 10',
                'description' => 'Covers Barangay 10 TODA route.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.0725, 'lng' => 120.6322],
                    ['lat' => 14.0726, 'lng' => 120.6327],
                    ['lat' => 14.0714, 'lng' => 120.6330],
                ],
            ],
            [
                'name'        => 'TODA Brgy. 8',
                'code'        => 'TODA-BRGY8',
                'barangay'    => 'Brgy. 8',
                'description' => 'Covers Barangay 8 Poblacion TODA route.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.0715, 'lng' => 120.6330],
                    ['lat' => 14.0703, 'lng' => 120.6332],
                    ['lat' => 14.0691, 'lng' => 120.6335],
                ],
            ],
            [
                'name'        => 'TODA Brgy. 4',
                'code'        => 'TODA-BRGY4',
                'barangay'    => 'Brgy. 4',
                'description' => 'Covers Barangay 4 TODA route.',
                'is_active'   => true,
                'routes'      => [
                    ['lat' => 14.0673, 'lng' => 120.6331],
                    ['lat' => 14.0673, 'lng' => 120.6325],
                    ['lat' => 14.0689, 'lng' => 120.6322],
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
