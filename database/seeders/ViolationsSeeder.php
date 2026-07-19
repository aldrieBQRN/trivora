<?php

namespace Database\Seeders;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Database\Seeder;

class ViolationsSeeder extends Seeder
{
    /**
     * Seed sample GPS location pings and auto-detected violations
     * for the tricycle that has an active franchise (Pedro Ramos / AAA-1234).
     */
    public function run(): void
    {
        $tricycle = Tricycle::where('plate_number', 'AAA-1234')->first();
        $franchise = FranchiseScheme::where('franchise_number', 'FS-2026-00001')->first();
        $redScheme = ColorCodingScheme::where('name', 'Red')->first();
        $tmo = User::where('email', 'tmo.msantos@trivora.gov.ph')->first();

        if (! $tricycle || ! $franchise || ! $redScheme) {
            $this->command->warn('⚠  Skipping violations seeder — required franchise/scheme data not found.');
            return;
        }

        // -----------------------------------------------------------------
        // Seed recent GPS location pings (map monitoring data)
        // -----------------------------------------------------------------
        $locationPings = [
            ['lat' => 14.5996000, 'lng' => 120.9843000, 'offset_minutes' => 5],
            ['lat' => 14.5998000, 'lng' => 120.9845000, 'offset_minutes' => 10],
            ['lat' => 14.6001000, 'lng' => 120.9847000, 'offset_minutes' => 15],
            ['lat' => 14.6003000, 'lng' => 120.9844000, 'offset_minutes' => 20],
            ['lat' => 14.5999000, 'lng' => 120.9840000, 'offset_minutes' => 25],
        ];

        $locationRecords = [];
        foreach ($locationPings as $ping) {
            $location = TricycleLocation::create([
                'tricycle_id' => $tricycle->id,
                'latitude'    => $ping['lat'],
                'longitude'   => $ping['lng'],
                'speed_kmh'   => rand(15, 35),
                'heading_deg' => rand(0, 359),
                'accuracy_m'  => rand(3, 15),
                'source'      => 'mobile_app',
                'recorded_at' => now()->subMinutes($ping['offset_minutes']),
            ]);
            $locationRecords[] = $location;
        }

        // -----------------------------------------------------------------
        // Seed a past AUTOMATED color-coding violation (resolved)
        // Scenario: Red-coded tricycle was detected operating on a Monday.
        // -----------------------------------------------------------------
        $pastLocation = TricycleLocation::create([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.5997500,
            'longitude'   => 120.9844000,
            'speed_kmh'   => 22.5,
            'heading_deg' => 90,
            'accuracy_m'  => 5.0,
            'source'      => 'mobile_app',
            'recorded_at' => now()->subDays(7)->setTime(8, 30, 0),
        ]);

        if (! Violation::where('tricycle_id', $tricycle->id)
            ->where('detection_method', 'automated')
            ->where('status', 'resolved')
            ->exists()
        ) {
            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $redScheme->id,
                'location_snapshot_id'    => $pastLocation->id,
                'detected_by'             => null, // automated — no officer
                'violation_type'          => 'color_coding',
                'detected_at'             => now()->subDays(7)->setTime(8, 30, 0),
                'day_of_week'             => 'Monday',
                'detection_method'        => 'automated',
                'status'                  => 'resolved',
                'fine_amount'             => 500.00,
                'fine_paid_at'            => now()->subDays(5),
                'notes'                   => 'System detected Red-coded tricycle (AAA-1234) operating on Monday. Fine collected.',
            ]);
        }

        // -----------------------------------------------------------------
        // Seed a current OPEN automated violation
        // Scenario: Same tricycle detected again on a restricted day.
        // -----------------------------------------------------------------
        $latestLocation = $locationRecords[0] ?? null;

        if ($latestLocation && ! Violation::where('tricycle_id', $tricycle->id)
            ->where('status', 'open')
            ->exists()
        ) {
            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $redScheme->id,
                'location_snapshot_id'    => $latestLocation->id,
                'detected_by'             => null, // automated
                'violation_type'          => 'color_coding',
                'detected_at'             => now()->subMinutes(5),
                'day_of_week'             => 'Monday',
                'detection_method'        => 'automated',
                'status'                  => 'open',
                'fine_amount'             => 1000.00, // repeat offense
                'fine_paid_at'            => null,
                'notes'                   => 'Repeat color-coding violation. Tricycle AAA-1234 detected operating on restricted day (Monday).',
            ]);
        }

        // -----------------------------------------------------------------
        // Seed a MANUAL violation filed by a TMO officer
        // -----------------------------------------------------------------
        if ($tmo && ! Violation::where('tricycle_id', $tricycle->id)
            ->where('detection_method', 'manual')
            ->exists()
        ) {
            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $redScheme->id,
                'location_snapshot_id'    => null,
                'detected_by'             => $tmo->id,
                'violation_type'          => 'route_violation',
                'detected_at'             => now()->subDays(3)->setTime(11, 0, 0),
                'day_of_week'             => 'Friday',
                'detection_method'        => 'manual',
                'status'                  => 'acknowledged',
                'fine_amount'             => 300.00,
                'fine_paid_at'            => null,
                'notes'                   => 'Tricycle observed operating outside assigned TODA-01 route. Manually filed by TMO Officer Maria Santos.',
            ]);
        }

        // -----------------------------------------------------------------
        // Seed franchise schemes & violations for newly active tricycles
        // to populate the cashier and operator compliance queues rich data
        // -----------------------------------------------------------------
        $tri4 = Tricycle::where('plate_number', 'DDD-3456')->first();
        $tri5 = Tricycle::where('plate_number', 'EEE-7890')->first();
        $blueScheme = ColorCodingScheme::where('name', 'Blue')->first();

        $app4 = \App\Models\Application::where('reference_number', 'APP-2026-00004')->first();
        $app5 = \App\Models\Application::where('reference_number', 'APP-2026-00005')->first();

        if ($tri4 && $tri5 && $blueScheme) {
            $fs4 = FranchiseScheme::firstOrCreate(
                ['franchise_number' => 'FS-2026-00004'],
                [
                    'application_id'         => $app4 ? $app4->id : 4,
                    'tricycle_id'            => $tri4->id,
                    'color_coding_scheme_id' => $redScheme->id,
                    'issued_by'              => $tmo->id,
                    'issue_date'             => now()->subYear()->toDateString(),
                    'expiry_date'            => now()->addMonths(6)->toDateString(),
                    'is_active'              => true,
                ]
            );

            $fs5 = FranchiseScheme::firstOrCreate(
                ['franchise_number' => 'FS-2026-00005'],
                [
                    'application_id'         => $app5 ? $app5->id : 5,
                    'tricycle_id'            => $tri5->id,
                    'color_coding_scheme_id' => $blueScheme->id,
                    'issued_by'              => $tmo->id,
                    'issue_date'             => now()->subYear()->toDateString(),
                    'expiry_date'            => now()->addMonths(4)->toDateString(),
                    'is_active'              => true,
                ]
            );

            // Open manual violation for Maria Clara (DDD-3456)
            if (! Violation::where('tricycle_id', $tri4->id)->exists()) {
                Violation::create([
                    'tricycle_id'             => $tri4->id,
                    'franchise_scheme_id'     => $fs4->id,
                    'color_coding_scheme_id'  => $redScheme->id,
                    'location_snapshot_id'    => null,
                    'detected_by'             => $tmo->id,
                    'violation_type'          => 'route_violation',
                    'detected_at'             => now()->subDays(2)->setTime(14, 15, 0),
                    'day_of_week'             => now()->subDays(2)->format('l'),
                    'detection_method'        => 'manual',
                    'status'                  => 'open',
                    'fine_amount'             => 300.00,
                    'fine_paid_at'            => null,
                    'notes'                   => 'TODA Boundary Checkpoint — Operator operating inside unauthorized TODA-02 zone.',
                ]);
            }

            // Open automated violation for Ricardo Santos (EEE-7890)
            $pingLocation = TricycleLocation::create([
                'tricycle_id' => $tri5->id,
                'latitude'    => 14.0740,
                'longitude'   => 120.6380,
                'speed_kmh'   => 28.0,
                'heading_deg' => 180,
                'accuracy_m'  => 4.5,
                'source'      => 'mobile_app',
                'recorded_at' => now()->subMinutes(12),
            ]);

            if (! Violation::where('tricycle_id', $tri5->id)->exists()) {
                Violation::create([
                    'tricycle_id'             => $tri5->id,
                    'franchise_scheme_id'     => $fs5->id,
                    'color_coding_scheme_id'  => $blueScheme->id,
                    'location_snapshot_id'    => $pingLocation->id,
                    'detected_by'             => null,
                    'violation_type'          => 'color_coding',
                    'detected_at'             => now()->subMinutes(12),
                    'day_of_week'             => 'Tuesday',
                    'detection_method'        => 'automated',
                    'status'                  => 'open',
                    'fine_amount'             => 500.00,
                    'fine_paid_at'            => null,
                    'notes'                   => 'Color coding detection logic warning. Blue coding scheme operating on Tuesday.',
                ]);
            }
        }

        $this->command->info('✔ Violations seeded (1 resolved automated, 3 open violations, 1 manual route violation) + location pings.');
    }
}
