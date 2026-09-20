<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\RideRating;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MobileAppDataSeeder extends Seeder
{
    /**
     * Seed realistic mobile application data:
     *  - Links drivers to tricycles and TODA zones
     *  - Real-time driver online status, GPS location, rating & earnings
     *  - Live location breadcrumb pings (TricycleLocation)
     *  - Active bookings (pending, accepted, arrived, in_transit)
     *  - Historical completed bookings with fares & distance
     *  - Cancelled bookings with reasons
     *  - Passenger ride ratings & detailed customer feedback
     */
    public function run(): void
    {
        $this->command->info('📱 Seeding Mobile Application Data...');

        // ---------------------------------------------------------------------
        // 1. Ensure Drivers are linked to Tricycles and TODA Zones
        // ---------------------------------------------------------------------
        $driverTriMap = [
            'driver.pramos@trivora.ph'     => ['plate' => 'AAA-1234', 'zone' => 'TODA-BUCANA', 'lat' => 14.0645, 'lng' => 120.6298, 'online' => true,  'avail' => false, 'trips' => 84, 'earnings' => 740.00, 'rating' => 4.92],
            'driver.jbautista@trivora.ph'  => ['plate' => 'BBB-5678', 'zone' => 'TODA-BRGY10', 'lat' => 14.0725, 'lng' => 120.6322, 'online' => true,  'avail' => false, 'trips' => 62, 'earnings' => 580.00, 'rating' => 4.88],
            'driver.evillanueva@trivora.ph'=> ['plate' => 'CCC-9012', 'zone' => 'TODA-BRGY8',  'lat' => 14.0715, 'lng' => 120.6330, 'online' => false, 'avail' => true,  'trips' => 45, 'earnings' => 320.00, 'rating' => 4.75],
            'driver.mclara@trivora.ph'     => ['plate' => 'DDD-3456', 'zone' => 'TODA-BRGY4',  'lat' => 14.0673, 'lng' => 120.6331, 'online' => true,  'avail' => true,  'trips' => 91, 'earnings' => 890.00, 'rating' => 4.95],
            'driver.rsantos@trivora.ph'    => ['plate' => 'TRV-MOBGPS','zone' => 'TODA-BUCANA', 'lat' => 14.0655, 'lng' => 120.6305, 'online' => true,  'avail' => false, 'trips' => 110,'earnings' => 950.00, 'rating' => 4.98],
        ];

        foreach ($driverTriMap as $email => $data) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                continue;
            }

            $tri = Tricycle::where('plate_number', $data['plate'])->first();
            $driver = Driver::where('user_id', $user->id)->first();

            if ($driver && $tri) {
                $driver->update([
                    'tricycle_id'              => $tri->id,
                    'is_online'                => $data['online'],
                    'is_available'             => $data['avail'],
                    'current_lat'              => $data['lat'],
                    'current_lng'              => $data['lng'],
                    'last_location_updated_at' => now(),
                    'rating'                   => $data['rating'],
                    'total_trips'              => $data['trips'],
                    'today_earnings'           => $data['earnings'],
                ]);
            }
        }

        // ---------------------------------------------------------------------
        // 2. Seed Live GPS Location Pings (TricycleLocation)
        // ---------------------------------------------------------------------
        $activeTricycles = Tricycle::whereIn('plate_number', ['AAA-1234', 'BBB-5678', 'DDD-3456', 'TRV-MOBGPS'])->get();

        foreach ($activeTricycles as $tri) {
            if (TricycleLocation::where('tricycle_id', $tri->id)->exists()) {
                continue;
            }

            $baseLat = 14.0650 + (rand(-20, 20) / 10000);
            $baseLng = 120.6300 + (rand(-20, 20) / 10000);

            for ($i = 10; $i >= 0; $i--) {
                TricycleLocation::create([
                    'tricycle_id' => $tri->id,
                    'latitude'    => $baseLat + ($i * 0.0003),
                    'longitude'   => $baseLng + ($i * 0.0004),
                    'speed_kmh'   => rand(18, 36),
                    'heading_deg' => rand(45, 180),
                    'accuracy_m'  => rand(3, 8),
                    'source'      => $tri->active_tracking_mode === 'iot_device' ? 'gps_device' : 'mobile_app',
                    'recorded_at' => now()->subMinutes($i * 2),
                ]);
            }
        }

        // ---------------------------------------------------------------------
        // 3. Fetch Passengers and TODA Zones for Booking Creation
        // ---------------------------------------------------------------------
        $passengers = Passenger::all();
        if ($passengers->isEmpty()) {
            $this->command->warn('⚠ No passengers found to seed bookings.');
            return;
        }

        $p1 = $passengers->firstWhere('user.email', 'passenger@trivora.ph') ?? $passengers[0];
        $p2 = $passengers->firstWhere('user.email', 'passenger.maria@trivora.ph') ?? ($passengers[1] ?? $p1);
        $p3 = $passengers->firstWhere('user.email', 'passenger.juan@trivora.ph') ?? ($passengers[2] ?? $p1);
        $p4 = $passengers->firstWhere('user.email', 'passenger.ana@trivora.ph') ?? ($passengers[3] ?? $p1);
        $p5 = $passengers->firstWhere('user.email', 'passenger.carlo@trivora.ph') ?? ($passengers[4] ?? $p1);

        $dPedro   = Driver::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        $dJose    = Driver::whereHas('user', fn ($q) => $q->where('email', 'driver.jbautista@trivora.ph'))->first();
        $dErnesto = Driver::whereHas('user', fn ($q) => $q->where('email', 'driver.evillanueva@trivora.ph'))->first();
        $dMaria   = Driver::whereHas('user', fn ($q) => $q->where('email', 'driver.mclara@trivora.ph'))->first();
        $dRicardo = Driver::whereHas('user', fn ($q) => $q->where('email', 'driver.rsantos@trivora.ph'))->first();

        $zBucana = TodaZone::where('code', 'TODA-BUCANA')->first();
        $zBrgy10 = TodaZone::where('code', 'TODA-BRGY10')->first();
        $zBrgy8  = TodaZone::where('code', 'TODA-BRGY8')->first();
        $zBrgy4  = TodaZone::where('code', 'TODA-BRGY4')->first();

        // ---------------------------------------------------------------------
        // 4. Seed Active Bookings (For Real-Time Mobile App Demo)
        // ---------------------------------------------------------------------

        // Booking A: PENDING Request (TODA Bucana) - Appears in Driver's Request Feed
        Booking::updateOrCreate(
            ['booking_code' => 'BK-' . date('Ymd') . '-PND1'],
            [
                'passenger_id'            => $p1->id,
                'toda_zone_id'            => $zBucana?->id,
                'pickup_name'             => 'Poblacion Public Market',
                'pickup_lat'              => 14.0725,
                'pickup_lng'              => 120.6322,
                'dropoff_name'            => 'Bucana Beach Park',
                'dropoff_lat'             => 14.0640,
                'dropoff_lng'             => 120.6298,
                'fare_amount'             => 45.00,
                'distance_km'             => 1.8,
                'estimated_duration_mins' => 7,
                'passenger_notes'         => 'Wait at market gate 2 near bakery',
                'status'                  => 'pending',
                'payment_method'          => 'cash',
                'payment_status'          => 'pending',
                'requested_at'            => now()->subMinutes(3),
            ]
        );

        // Booking B: PENDING Request (TODA Brgy 8)
        Booking::updateOrCreate(
            ['booking_code' => 'BK-' . date('Ymd') . '-PND2'],
            [
                'passenger_id'            => $p2->id,
                'toda_zone_id'            => $zBrgy8?->id,
                'pickup_name'             => 'Nasugbu Municipal Hall',
                'pickup_lat'              => 14.0715,
                'pickup_lng'              => 120.6330,
                'dropoff_name'            => 'Barangay 8 Chapel',
                'dropoff_lat'             => 14.0691,
                'dropoff_lng'             => 120.6335,
                'fare_amount'             => 35.00,
                'distance_km'             => 1.2,
                'estimated_duration_mins' => 5,
                'passenger_notes'         => 'With 2 small bags',
                'status'                  => 'pending',
                'payment_method'          => 'gcash',
                'payment_status'          => 'pending',
                'requested_at'            => now()->subMinutes(1),
            ]
        );

        // Booking C: ACCEPTED (Pedro Ramos accepted passenger Juan Mercado)
        if ($dPedro) {
            Booking::updateOrCreate(
                ['booking_code' => 'BK-' . date('Ymd') . '-ACT1'],
                [
                    'passenger_id'            => $p3->id,
                    'driver_id'               => $dPedro->id,
                    'tricycle_id'             => $dPedro->tricycle_id,
                    'toda_zone_id'            => $zBucana?->id,
                    'pickup_name'             => 'San Isidro Parish Church',
                    'pickup_lat'              => 14.0710,
                    'pickup_lng'              => 120.6318,
                    'dropoff_name'            => 'Coastal View Subdivision Gate 1',
                    'dropoff_lat'             => 14.0642,
                    'dropoff_lng'             => 120.6285,
                    'fare_amount'             => 55.00,
                    'distance_km'             => 2.4,
                    'estimated_duration_mins' => 8,
                    'passenger_notes'         => 'Wearing blue shirt near church portal',
                    'status'                  => 'accepted',
                    'payment_method'          => 'cash',
                    'payment_status'          => 'pending',
                    'requested_at'            => now()->subMinutes(8),
                    'accepted_at'             => now()->subMinutes(6),
                ]
            );
        }

        // Booking D: ARRIVED (Jose Bautista arrived at pickup for Ana Reyes)
        if ($dJose) {
            Booking::updateOrCreate(
                ['booking_code' => 'BK-' . date('Ymd') . '-ACT2'],
                [
                    'passenger_id'            => $p4->id,
                    'driver_id'               => $dJose->id,
                    'tricycle_id'             => $dJose->tricycle_id,
                    'toda_zone_id'            => $zBrgy10?->id,
                    'pickup_name'             => 'Brgy. 10 Elementary School',
                    'pickup_lat'              => 14.0726,
                    'pickup_lng'              => 120.6327,
                    'dropoff_name'            => 'Nasugbu Doctors Hospital',
                    'dropoff_lat'             => 14.0700,
                    'dropoff_lng'             => 120.6345,
                    'fare_amount'             => 40.00,
                    'distance_km'             => 1.5,
                    'estimated_duration_mins' => 6,
                    'passenger_notes'         => 'Senior passenger assistance requested',
                    'status'                  => 'arrived',
                    'payment_method'          => 'gcash',
                    'payment_status'          => 'pending',
                    'requested_at'            => now()->subMinutes(12),
                    'accepted_at'             => now()->subMinutes(10),
                    'arrived_at'              => now()->subMinutes(2),
                ]
            );
        }

        // Booking E: IN_TRANSIT (Ricardo Santos driving Carlo Mendoza)
        if ($dRicardo) {
            Booking::updateOrCreate(
                ['booking_code' => 'BK-' . date('Ymd') . '-ACT3'],
                [
                    'passenger_id'            => $p5->id,
                    'driver_id'               => $dRicardo->id,
                    'tricycle_id'             => $dRicardo->tricycle_id,
                    'toda_zone_id'            => $zBucana?->id,
                    'pickup_name'             => 'Wawa Fish Port Terminal',
                    'pickup_lat'              => 14.0673,
                    'pickup_lng'              => 120.6325,
                    'dropoff_name'            => 'Batangas State University Gate',
                    'dropoff_lat'             => 14.0750,
                    'dropoff_lng'             => 120.6300,
                    'fare_amount'             => 60.00,
                    'distance_km'             => 2.8,
                    'estimated_duration_mins' => 10,
                    'passenger_notes'         => null,
                    'status'                  => 'in_transit',
                    'payment_method'          => 'cash',
                    'payment_status'          => 'pending',
                    'requested_at'            => now()->subMinutes(15),
                    'accepted_at'             => now()->subMinutes(13),
                    'arrived_at'              => now()->subMinutes(8),
                    'started_at'              => now()->subMinutes(6),
                ]
            );
        }

        // ---------------------------------------------------------------------
        // 5. Seed Historical Completed Bookings & Ratings (Past 14 Days)
        // ---------------------------------------------------------------------
        $completedScenarios = [
            // Today trips (0 days ago) for Pedro Ramos & others
            [$p2, $dPedro,   $zBucana, 'Nasugbu Town Plaza', 'Bucana Public Beach', 55.00, 2.4, 8, 0, 5, 'Super polite driver! On time and safe ride.', ['Polite Driver', 'Clean Tricycle', 'Safe Driving']],
            [$p3, $dPedro,   $zBucana, 'Barangay 8 Market', 'Nasugbu Doctors Hospital', 40.00, 1.5, 5, 0, 5, 'Very helpful driver, assisted with bags.', ['On Time', 'Helpful']],
            [$p4, $dPedro,   $zBucana, 'Savemore Market Nasugbu', 'Coastal View Subd Gate 2', 60.00, 2.8, 9, 0, 5, 'Great route choice and smooth drive.', ['Great Route', 'Smooth Ride']],
            
            // Yesterday trips (1 day ago)
            [$p1, $dRicardo, $zBucana, 'Nasugbu Town Plaza', 'Bucana Beach Resort', 50.00, 2.1, 7, 1, 5, 'Very courteous driver! Smooth ride to the beach.', ['Polite Driver', 'Clean Tricycle', 'Safe Driving']],
            [$p5, $dPedro,   $zBucana, 'San Isidro Parish', 'Wawa Port Terminal', 50.00, 2.2, 7, 1, 5, 'Arrived very quickly. Excellent driver.', ['On Time', 'Safe Driving']],
            [$p1, $dPedro,   $zBucana, 'Poblacion Commercial Center', 'Sunset View Bay', 45.00, 1.9, 6, 2, 5, 'Quick pickup and very helpful with my groceries.', ['On Time', 'Helpful']],

            // Earlier trips (3-12 days ago)
            [$p2, $dJose,    $zBrgy10, 'Brgy. 10 Public Market', 'San Isidro Street', 35.00, 1.1, 4, 2, 5, 'Fast and safe driving.', ['Safe Driving', 'Smooth Ride']],
            [$p2, $dMaria,   $zBrgy4,  'Wawa Terminal', 'Poblacion Plaza', 40.00, 1.5, 5, 3, 4, 'Polite driver, clean sidecar.', ['Clean Tricycle', 'Polite Driver']],
            [$p3, $dPedro,   $zBucana, 'Municipal Hall Compound', 'Bucana Fisherman Village', 50.00, 2.2, 8, 3, 5, 'Great route choice, avoided traffic completely.', ['Great Route', 'Polite Driver']],
            [$p4, $dPedro,   $zBucana, 'Brgy. 10 Chapel', 'Batangas State University Gate 1', 65.00, 3.2, 11, 4, 5, 'Punctual and very respectful.', ['On Time', 'Safe Driving']],
            [$p3, $dRicardo, $zBucana, 'San Isidro Parish', 'Central Terminal', 40.00, 1.4, 5, 4, 5, 'Punctual and very respectful.', ['On Time', 'Safe Driving']],
            [$p4, $dJose,    $zBrgy10, 'Brgy. 10 Market Gate 1', 'Nasugbu Doctors Hospital', 45.00, 1.7, 6, 4, 5, 'Clean tricycle and smooth acceleration.', ['Clean Tricycle', 'Smooth Ride']],
            [$p4, $dErnesto, $zBrgy8,  'Barangay 8 Hall', 'Nasugbu Integrated School', 30.00, 1.0, 4, 5, 4, 'Good ride, fair charge.', ['On Time']],
            [$p5, $dMaria,   $zBrgy4,  'Brgy. 4 Covered Court', 'Wawa Beach Front', 35.00, 1.3, 5, 5, 5, 'Exemplary service! Very polite lady driver.', ['Polite Driver', 'Clean Tricycle', 'Safe Driving']],
            [$p2, $dPedro,   $zBucana, 'Central Bus Terminal', 'Nasugbu Public Market', 35.00, 1.2, 5, 6, 4, 'Good driver service.', ['Safe Driving']],
            [$p5, $dRicardo, $zBucana, 'BSU Nasugbu Campus', 'Poblacion Market', 45.00, 1.8, 7, 6, 5, 'Always dependable driver in Nasugbu.', ['Safe Driving', 'Great Route']],
            [$p1, $dPedro,   $zBucana, 'Bucana Elementary School', 'Town Plaza', 40.00, 1.6, 6, 7, 5, 'Smooth and pleasant commute.', ['Polite Driver']],
            [$p2, $dJose,    $zBrgy10, 'Nasugbu Hospital', 'Brgy. 10 Residence', 35.00, 1.2, 4, 8, 5, 'Very careful driver, felt very safe.', ['Safe Driving']],
            [$p3, $dErnesto, $zBrgy8,  'Brgy. 8 Chapel', 'Market Terminal', 30.00, 0.9, 3, 9, 4, 'On time pickup.', ['On Time']],
            [$p4, $dMaria,   $zBrgy4,  'Wawa Port Gate', 'Municipal Plaza', 40.00, 1.5, 5, 10, 5, 'Friendly conversation and clean ride.', ['Polite Driver', 'Clean Tricycle']],
            [$p5, $dRicardo, $zBucana, 'Coastal Subdivision', 'Nasugbu High School', 55.00, 2.5, 9, 12, 5, 'Excellent driver service as always!', ['Polite Driver', 'Safe Driving', 'On Time']],
        ];

        foreach ($completedScenarios as $idx => $sc) {
            [$pass, $driver, $zone, $pick, $drop, $fare, $dist, $dur, $daysAgo, $score, $comment, $tags] = $sc;

            if (! $driver) {
                continue;
            }

            $reqTime  = now()->subDays($daysAgo)->setTime(rand(7, 18), rand(10, 50), 0);
            $accTime  = (clone $reqTime)->addMinutes(1);
            $arrTime  = (clone $accTime)->addMinutes(3);
            $startTime= (clone $arrTime)->addMinutes(1);
            $compTime = (clone $startTime)->addMinutes($dur);

            $bookingCode = 'BK-' . $reqTime->format('Ymd') . '-' . str_pad($idx + 100, 4, '0', STR_PAD_LEFT);
            $bk = Booking::updateOrCreate(
                ['booking_code' => $bookingCode],
                [
                    'passenger_id'            => $pass->id,
                    'driver_id'               => $driver->id,
                    'tricycle_id'             => $driver->tricycle_id,
                    'toda_zone_id'            => $zone?->id,
                    'pickup_name'             => $pick,
                    'pickup_lat'              => 14.0700 + (rand(-10, 10) / 1000),
                    'pickup_lng'              => 120.6300 + (rand(-10, 10) / 1000),
                    'dropoff_name'            => $drop,
                    'dropoff_lat'             => 14.0650 + (rand(-10, 10) / 1000),
                    'dropoff_lng'             => 120.6280 + (rand(-10, 10) / 1000),
                    'fare_amount'             => $fare,
                    'distance_km'             => $dist,
                    'estimated_duration_mins' => $dur,
                    'status'                  => 'completed',
                    'payment_method'          => $idx % 2 === 0 ? 'cash' : 'gcash',
                    'payment_status'          => 'paid',
                    'requested_at'            => $reqTime,
                    'accepted_at'             => $accTime,
                    'arrived_at'              => $arrTime,
                    'started_at'              => $startTime,
                    'completed_at'            => $compTime,
                ]
            );

            // Ride Rating
            RideRating::updateOrCreate(
                ['booking_id' => $bk->id],
                [
                    'passenger_id' => $pass->id,
                    'driver_id'    => $driver->id,
                    'score'        => $score,
                    'feedback_tags'=> $tags,
                    'comment'      => $comment,
                ]
            );
        }

        // ---------------------------------------------------------------------
        // 6. Seed Cancelled Bookings (Presenting Exception Flow)
        // ---------------------------------------------------------------------
        $cancelledScenarios = [
            [$p2, $dPedro,   $zBucana, 'Poblacion Market Gate 3', 'Bucana Resort', 45.00, 'passenger', 'Passenger changed plans / found alternative transport', 2],
            [$p4, $dErnesto, $zBrgy8,  'Brgy. 8 Chapel', 'Doctors Hospital', 35.00, 'driver', 'Driver flat tire emergency', 5],
            [$p5, null,      $zBrgy10, 'Brgy. 10 Elementary School', 'Municipal Hall', 30.00, 'system', 'No driver accepted within timeout limit', 8],
        ];

        foreach ($cancelledScenarios as $idx => $cs) {
            [$pass, $driver, $zone, $pick, $drop, $fare, $by, $reason, $daysAgo] = $cs;

            $reqTime = now()->subDays($daysAgo)->setTime(rand(8, 17), rand(10, 50), 0);
            $bookingCode = 'BK-' . $reqTime->format('Ymd') . '-CXL' . ($idx + 1);

            Booking::updateOrCreate(
                ['booking_code' => $bookingCode],
                [
                    'passenger_id'            => $pass->id,
                    'driver_id'               => $driver?->id,
                    'tricycle_id'             => $driver?->tricycle_id,
                    'toda_zone_id'            => $zone?->id,
                    'pickup_name'             => $pick,
                    'pickup_lat'              => 14.0710,
                    'pickup_lng'              => 120.6320,
                    'dropoff_name'            => $drop,
                    'dropoff_lat'             => 14.0660,
                    'dropoff_lng'             => 120.6290,
                    'fare_amount'             => $fare,
                    'distance_km'             => 1.5,
                    'estimated_duration_mins' => 6,
                    'status'                  => 'cancelled',
                    'payment_method'          => 'cash',
                    'payment_status'          => 'pending',
                    'cancelled_by'            => $by,
                    'cancellation_reason'     => $reason,
                    'requested_at'            => $reqTime,
                    'cancelled_at'            => (clone $reqTime)->addMinutes(4),
                ]
            );
        }

        $this->command->info('✔ Mobile application data seeded (5 linked drivers, live GPS pings, 5 active bookings, 15 completed rides with ratings, 3 cancelled bookings).');
    }
}
