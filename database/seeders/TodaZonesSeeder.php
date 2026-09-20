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
                'name'           => 'TODA Brgy. 1',
                'code'           => 'TODA-BRGY1',
                'barangay'       => 'Brgy. 1',
                'terminal_name'  => 'Brgy. 1 Poblacion Terminal',
                'address'        => 'J.P. Laurel St. cor. Concepcion St., Barangay 1, Nasugbu, Batangas',
                'latitude'       => 14.0755,
                'longitude'      => 120.6315,
                'president_name' => 'Eduardo "Eddie" Ramos',
                'contact_number' => '0917-234-5601',
                'description'    => 'Serving Barangay 1 Poblacion commercial center, municipal trial court, and residential community.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 2',
                'code'           => 'TODA-BRGY2',
                'barangay'       => 'Brgy. 2',
                'terminal_name'  => 'Brgy. 2 Central Terminal',
                'address'        => 'F. Alix St., Barangay 2, Nasugbu, Batangas',
                'latitude'       => 14.0746,
                'longitude'      => 120.6332,
                'president_name' => 'Roberto "Bert" Mendoza',
                'contact_number' => '0918-345-6702',
                'description'    => 'Primary route along F. Alix St. providing direct connectivity to town plaza and local schools.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 3',
                'code'           => 'TODA-BRGY3',
                'barangay'       => 'Brgy. 3',
                'terminal_name'  => 'Brgy. 3 Plaza Terminal',
                'address'        => 'P. Burgos St. near Town Plaza, Barangay 3, Nasugbu, Batangas',
                'latitude'       => 14.0738,
                'longitude'      => 120.6348,
                'president_name' => 'Danilo "Danny" Santos',
                'contact_number' => '0920-456-7803',
                'description'    => 'Serving Barangay 3 perimeter, historic church, and municipal town square access.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 4',
                'code'           => 'TODA-BRGY4',
                'barangay'       => 'Brgy. 4',
                'terminal_name'  => 'Brgy. 4 North Terminal',
                'address'        => 'Concepcion St., Barangay 4, Nasugbu, Batangas',
                'latitude'       => 14.0673,
                'longitude'      => 120.6331,
                'president_name' => 'Arsenio "Senyong" Bautista',
                'contact_number' => '0922-567-8904',
                'description'    => 'Covers Barangay 4 residential areas and northern highway junction.',
                'is_active'      => true,
                'routes'         => [
                    ['lat' => 14.0673, 'lng' => 120.6331],
                    ['lat' => 14.0673, 'lng' => 120.6325],
                    ['lat' => 14.0689, 'lng' => 120.6322],
                ],
            ],
            [
                'name'           => 'TODA Brgy. 5',
                'code'           => 'TODA-BRGY5',
                'barangay'       => 'Brgy. 5',
                'terminal_name'  => 'Brgy. 5 Riverside Terminal',
                'address'        => 'Rizal St. cor. Riverbank Rd., Barangay 5, Nasugbu, Batangas',
                'latitude'       => 14.0718,
                'longitude'      => 120.6305,
                'president_name' => 'Vicente "Enteng" Mercado',
                'contact_number' => '0917-678-9005',
                'description'    => 'Serving Barangay 5 community, riverside residences, and west Poblacion routes.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 6',
                'code'           => 'TODA-BRGY6',
                'barangay'       => 'Brgy. 6',
                'terminal_name'  => 'Brgy. 6 Heritage Terminal',
                'address'        => 'G. Alvarez St., Barangay 6, Nasugbu, Batangas',
                'latitude'       => 14.0708,
                'longitude'      => 120.6322,
                'president_name' => 'Manuel "Manny" De Silva',
                'contact_number' => '0919-789-0106',
                'description'    => 'Barangay 6 heritage zone, parish perimeter, and commercial district feeder.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 7',
                'code'           => 'TODA-BRGY7',
                'barangay'       => 'Brgy. 7',
                'terminal_name'  => 'Brgy. 7 East Access Terminal',
                'address'        => 'M.H. Del Pilar St., Barangay 7, Nasugbu, Batangas',
                'latitude'       => 14.0698,
                'longitude'      => 120.6348,
                'president_name' => 'Ferdinand "Bong" Castillo',
                'contact_number' => '0927-890-1207',
                'description'    => 'Serving Barangay 7 eastern perimeter, residential subdivisions, and national highway access.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 8',
                'code'           => 'TODA-BRGY8',
                'barangay'       => 'Brgy. 8',
                'terminal_name'  => 'Brgy. 8 South Terminal',
                'address'        => 'P. Gomez St., Barangay 8, Nasugbu, Batangas',
                'latitude'       => 14.0715,
                'longitude'      => 120.6330,
                'president_name' => 'Rolando "Roly" Hernandez',
                'contact_number' => '0917-901-2308',
                'description'    => 'Covers Barangay 8 Poblacion TODA route, hospital access, and clinic district.',
                'is_active'      => true,
                'routes'         => [
                    ['lat' => 14.0715, 'lng' => 120.6330],
                    ['lat' => 14.0703, 'lng' => 120.6332],
                    ['lat' => 14.0691, 'lng' => 120.6335],
                ],
            ],
            [
                'name'           => 'TODA Brgy. 9',
                'code'           => 'TODA-BRGY9',
                'barangay'       => 'Brgy. 9',
                'terminal_name'  => 'Brgy. 9 Public Market Terminal',
                'address'        => 'Market Rd. cor. P. Burgos St., Barangay 9, Nasugbu, Batangas',
                'latitude'       => 14.0732,
                'longitude'      => 120.6362,
                'president_name' => 'Crisanto "Cris" Villanueva',
                'contact_number' => '0918-012-3409',
                'description'    => 'Main transport terminal servicing the Nasugbu Public Market, grocery hubs, and Barangay 9.',
                'is_active'      => true,
            ],
            [
                'name'           => 'TODA Brgy. 10',
                'code'           => 'TODA-BRGY10',
                'barangay'       => 'Brgy. 10',
                'terminal_name'  => 'Brgy. 10 Municipal Terminal',
                'address'        => 'L. De Castro St. near Municipal Hall, Barangay 10, Nasugbu, Batangas',
                'latitude'       => 14.0725,
                'longitude'      => 120.6322,
                'president_name' => 'Antonio "Tony" Gutierrez',
                'contact_number' => '0920-123-4510',
                'description'    => 'Covers Barangay 10 TODA route, municipal hall complex, and government center.',
                'is_active'      => true,
                'routes'         => [
                    ['lat' => 14.0725, 'lng' => 120.6322],
                    ['lat' => 14.0726, 'lng' => 120.6327],
                    ['lat' => 14.0714, 'lng' => 120.6330],
                ],
            ],
            [
                'name'           => 'TODA Bucana',
                'code'           => 'TODA-BUCANA',
                'barangay'       => 'Bucana',
                'terminal_name'  => 'Bucana Main Coastal Terminal',
                'address'        => 'Bucana Coastal Access Rd., Barangay Bucana, Nasugbu, Batangas',
                'latitude'       => 14.0640,
                'longitude'      => 120.6298,
                'president_name' => 'Domingo "Inggo" Carandang',
                'contact_number' => '0917-234-5611',
                'description'    => 'Covers Bucana coastal, beach resort, fisherman port, and residential TODA route.',
                'is_active'      => true,
                'routes'         => [
                    ['lat' => 14.0640, 'lng' => 120.6298],
                    ['lat' => 14.0660, 'lng' => 120.6295],
                    ['lat' => 14.0660, 'lng' => 120.6303],
                ],
            ],
        ];

        foreach ($zones as $zoneData) {
            $routes = $zoneData['routes'] ?? [];
            unset($zoneData['routes']);

            $zone = TodaZone::updateOrCreate(
                ['code' => $zoneData['code']],
                $zoneData
            );

            // Only seed routes if this zone doesn't already have them
            if (!empty($routes) && $zone->routes()->count() === 0) {
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

        $this->command->info('✔ TODA zones seeded (' . count($zones) . ' zones with terminal locations).');
    }
}
