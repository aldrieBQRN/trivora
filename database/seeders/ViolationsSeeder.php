<?php

namespace Database\Seeders;

use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Database\Seeders\Concerns\ResolvesColorCoding;
use Illuminate\Database\Seeder;

class ViolationsSeeder extends Seeder
{
    use ResolvesColorCoding;

    /**
     * Seed sample GPS location pings and auto-detected violations
     * for the tricycle that has an active franchise (Pedro Ramos / AAA-1234).
     */
    public function run(): void
    {
        $tricycle = Tricycle::where('plate_number', 'AAA-1234')->first();
        $franchise = FranchiseScheme::where('franchise_number', 'FS-2023-00001')->first() ?: FranchiseScheme::first();
        $aaaScheme = $this->schemeForCoding($tricycle?->coding_scheme_number);
        $tmo = User::where('email', 'tmo.msantos@trivora.gov.ph')->first();

        // Ensure AAA-1234 is owned by legitimate operator Pedro Ramos
        $opPedro = \App\Models\Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        if ($tricycle && $opPedro && $tricycle->operator_id !== $opPedro->id) {
            $tricycle->update(['operator_id' => $opPedro->id]);
        }

        if (! $tricycle || ! $franchise || ! $aaaScheme) {
            $this->command->warn('⚠  Skipping violations seeder — required franchise/scheme data not found.');
            return;
        }

        // -----------------------------------------------------------------
        // Seed recent GPS location pings (map monitoring data in Nasugbu, Batangas)
        // -----------------------------------------------------------------
        $locationPings = [
            ['lat' => 14.0725000, 'lng' => 120.6320000, 'offset_minutes' => 5],
            ['lat' => 14.0728000, 'lng' => 120.6324000, 'offset_minutes' => 10],
            ['lat' => 14.0732000, 'lng' => 120.6328000, 'offset_minutes' => 15],
            ['lat' => 14.0735000, 'lng' => 120.6331000, 'offset_minutes' => 20],
            ['lat' => 14.0738000, 'lng' => 120.6335000, 'offset_minutes' => 25],
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
                'source'      => self::pingSource($tricycle),
                'recorded_at' => now()->subMinutes($ping['offset_minutes']),
            ]);
            $locationRecords[] = $location;
        }

        // -----------------------------------------------------------------
        // Seed a past AUTOMATED color-coding violation (resolved)
        // Scenario: the unit was detected operating on its own coding day.
        // AAA-1234's three citations sit a week apart — at most one color-coding
        // violation per unit per day (violations_color_coding_daily_unique).
        // -----------------------------------------------------------------
        $pastAt = $this->codingDayOnOrBefore($aaaScheme, now()->subDays(14)->setTime(8, 30, 0));
        $pastLocation = TricycleLocation::create([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0728000,
            'longitude'   => 120.6322000,
            'speed_kmh'   => 22.5,
            'heading_deg' => 90,
            'accuracy_m'  => 5.0,
            'source'      => self::pingSource($tricycle),
            'recorded_at' => $pastAt,
        ]);

        if (! Violation::where('tricycle_id', $tricycle->id)
            ->where('detection_method', 'automated')
            ->where('status', 'resolved')
            ->exists()
        ) {
            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $aaaScheme->id,
                'location_snapshot_id'    => $pastLocation->id,
                'detected_by'             => null, // automated — no officer
                'violation_type'          => 'color_coding',
                'detected_at'             => $pastAt,
                'day_of_week'             => $pastAt->format('l'),
                'detection_method'        => 'automated',
                'status'                  => 'resolved',
                'fine_amount'             => 500.00,
                'fine_paid_at'            => now()->subDays(5),
                'notes'                   => "System detected {$aaaScheme->name}-coded tricycle (AAA-1234) operating on {$pastAt->format('l')}. Fine collected.",
            ]);
        }

        // -----------------------------------------------------------------
        // Seed a current OPEN automated violation
        // Scenario: Same tricycle detected again on a restricted day.
        // -----------------------------------------------------------------
        $latestLocation = $locationRecords[0] ?? null;
        $openAt = $this->codingDayOnOrBefore($aaaScheme, now()->subMinutes(5));

        if ($latestLocation && ! Violation::where('tricycle_id', $tricycle->id)
            ->where('status', 'open')
            ->exists()
        ) {
            // The detection ping must be from the coding day itself, not just the latest ping.
            if (! $openAt->equalTo($latestLocation->recorded_at)) {
                $latestLocation = TricycleLocation::create([
                    'tricycle_id' => $tricycle->id,
                    'latitude'    => $latestLocation->latitude,
                    'longitude'   => $latestLocation->longitude,
                    'speed_kmh'   => $latestLocation->speed_kmh,
                    'heading_deg' => $latestLocation->heading_deg,
                    'accuracy_m'  => $latestLocation->accuracy_m,
                    'source'      => self::pingSource($tricycle),
                    'recorded_at' => $openAt,
                ]);
            }

            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $aaaScheme->id,
                'location_snapshot_id'    => $latestLocation->id,
                'detected_by'             => null, // automated
                'violation_type'          => 'color_coding',
                'detected_at'             => $openAt,
                'day_of_week'             => $openAt->format('l'),
                'detection_method'        => 'automated',
                'status'                  => 'open',
                'fine_amount'             => 1000.00, // repeat offense
                'fine_paid_at'            => null,
                'notes'                   => "Repeat color-coding violation. Tricycle AAA-1234 detected operating on restricted day ({$openAt->format('l')}).",
            ]);
        }

        // -----------------------------------------------------------------
        // Seed a COLOR CODING violation filed by a TMO officer
        // Scenario: officer-logged citation for the same restricted-day offence.
        // The officer supplies the location by observation, but the record still carries the
        // unit's real GPS ping so the Detection Method resolves to a genuine GPS source.
        // -----------------------------------------------------------------
        if ($tmo && ! Violation::where('tricycle_id', $tricycle->id)
            ->where('detection_method', 'manual')
            ->exists()
        ) {
            $officerAt = $this->codingDayOnOrBefore($aaaScheme, now()->subDays(7)->setTime(11, 0, 0));
            $officerLocation = TricycleLocation::create([
                'tricycle_id' => $tricycle->id,
                'latitude'    => 14.0725000,
                'longitude'   => 120.6320000,
                'speed_kmh'   => 18.0,
                'heading_deg' => 270,
                'accuracy_m'  => 6.0,
                'source'      => self::pingSource($tricycle),
                'recorded_at' => $officerAt,
            ]);

            Violation::create([
                'tricycle_id'             => $tricycle->id,
                'franchise_scheme_id'     => $franchise->id,
                'color_coding_scheme_id'  => $aaaScheme->id,
                'location_snapshot_id'    => $officerLocation->id,
                'detected_by'             => $tmo->id,
                'violation_type'          => 'color_coding',
                'detected_at'             => $officerAt,
                'day_of_week'             => $officerAt->format('l'),
                'detection_method'        => 'manual',
                'status'                  => 'acknowledged',
                'fine_amount'             => 500.00,
                'fine_paid_at'            => null,
                'notes'                   => "{$aaaScheme->name}-coded tricycle observed operating on a restricted {$officerAt->format('l')}. Manually filed by TMO Officer Maria Santos.",
            ]);
        }

        // -----------------------------------------------------------------
        // Seed franchise schemes & violations for newly active tricycles
        // to populate the cashier and operator compliance queues rich data
        // -----------------------------------------------------------------
        $tri4 = Tricycle::where('plate_number', 'DDD-3456')->first();
        $tri5 = Tricycle::where('plate_number', 'EEE-7890')->first();
        $tri4Scheme = $this->schemeForCoding($tri4?->coding_scheme_number);
        $tri5Scheme = $this->schemeForCoding($tri5?->coding_scheme_number);

        $app4 = \App\Models\Application::where('reference_number', 'APP-2026-00004')->first();
        $app5 = \App\Models\Application::where('reference_number', 'APP-2026-00005')->first();

        if ($tri4 && $tri5 && $tri4Scheme && $tri5Scheme) {
            // NOTE on Franchise Number: both schemes below are linked to applications that
            // never reached BPLO release (APP-2026-00004 is rejected, APP-2026-00005 failed
            // inspection), so no STK-YYYY-NNNN was ever issued for them. The real workflow
            // only writes franchise_schemes.sticker_number in BPLOController::release(),
            // which these applications never reached — deliberately left NULL rather than
            // inventing a serial the municipality never handed out.
            $fs4 = FranchiseScheme::firstOrCreate(
                ['franchise_number' => 'FS-2026-00004'],
                [
                    'application_id'         => $app4 ? $app4->id : 4,
                    'tricycle_id'            => $tri4->id,
                    'color_coding_scheme_id' => $tri4Scheme->id,
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
                    'color_coding_scheme_id' => $tri5Scheme->id,
                    'issued_by'              => $tmo->id,
                    'issue_date'             => now()->subYear()->toDateString(),
                    'expiry_date'            => now()->addMonths(4)->toDateString(),
                    'is_active'              => true,
                ]
            );

            // Open officer-filed color coding violation for Maria Clara (DDD-3456)
            if (! Violation::where('tricycle_id', $tri4->id)->exists()) {
                $dddAt = $this->codingDayOnOrBefore($tri4Scheme, now()->subDays(2)->setTime(14, 15, 0));
                $dddLocation = TricycleLocation::create([
                    'tricycle_id' => $tri4->id,
                    'latitude'    => 14.0733000,
                    'longitude'   => 120.6302000,
                    'speed_kmh'   => 16.5,
                    'heading_deg' => 45,
                    'accuracy_m'  => 5.5,
                    'source'      => self::pingSource($tri4),
                    'recorded_at' => $dddAt,
                ]);

                Violation::create([
                    'tricycle_id'             => $tri4->id,
                    'franchise_scheme_id'     => $fs4->id,
                    'color_coding_scheme_id'  => $tri4Scheme->id,
                    'location_snapshot_id'    => $dddLocation->id,
                    'detected_by'             => $tmo->id,
                    'violation_type'          => 'color_coding',
                    'detected_at'             => $dddAt,
                    'day_of_week'             => $dddAt->format('l'),
                    'detection_method'        => 'manual',
                    'status'                  => 'open',
                    'fine_amount'             => 500.00,
                    'fine_paid_at'            => null,
                    'notes'                   => "{$tri4Scheme->name}-coded tricycle observed operating on a restricted day. Filed by TMO Officer.",
                ]);
            }

            // Open automated violation for Ricardo Santos (EEE-7890)
            $eeeAt = $this->codingDayOnOrBefore($tri5Scheme, now()->subMinutes(12));
            $pingLocation = TricycleLocation::create([
                'tricycle_id' => $tri5->id,
                'latitude'    => 14.0740,
                'longitude'   => 120.6380,
                'speed_kmh'   => 28.0,
                'heading_deg' => 180,
                'accuracy_m'  => 4.5,
                'source'      => self::pingSource($tri5),
                'recorded_at' => $eeeAt,
            ]);

            if (! Violation::where('tricycle_id', $tri5->id)->exists()) {
                Violation::create([
                    'tricycle_id'             => $tri5->id,
                    'franchise_scheme_id'     => $fs5->id,
                    'color_coding_scheme_id'  => $tri5Scheme->id,
                    'location_snapshot_id'    => $pingLocation->id,
                    'detected_by'             => null,
                    'violation_type'          => 'color_coding',
                    'detected_at'             => $eeeAt,
                    'day_of_week'             => $eeeAt->format('l'),
                    'detection_method'        => 'automated',
                    'status'                  => 'open',
                    'fine_amount'             => 500.00,
                    'fine_paid_at'            => null,
                    'notes'                   => "Color coding detection logic warning. {$tri5Scheme->name} coding scheme operating on {$eeeAt->format('l')}.",
                ]);
            }
        }

        // -----------------------------------------------------------------
        // Guarantee every record this seeder owns carries a real GPS ping.
        // The active violation UI resolves Detection Method from tricycle_locations.source —
        // never from detection_method — so a record with no ping would have no GPS source at
        // all. Coordinates are the same seeded operating position each scenario above uses.
        // -----------------------------------------------------------------
        $seededCoords = [
            'AAA-1234' => [14.0725000, 120.6320000],
            'DDD-3456' => [14.0733000, 120.6302000],
            'EEE-7890' => [14.0740000, 120.6380000],
        ];

        foreach ([$tricycle, $tri4, $tri5] as $unit) {
            if (! $unit || ! isset($seededCoords[$unit->plate_number])) {
                continue;
            }

            [$lat, $lng] = $seededCoords[$unit->plate_number];

            Violation::where('tricycle_id', $unit->id)
                ->whereNull('location_snapshot_id')
                ->get()
                ->each(fn (Violation $v) => $this->ensureGpsSnapshot($v, $lat, $lng));
        }

        $this->command->info('✔ Violations seeded (1 resolved automated, 3 open violations, 1 officer-filed color coding violation) + location pings.');
    }

    /**
     * Attach a real tricycle_locations ping to a record that has none, recorded at the
     * violation's own detected_at so it is that record's true position rather than a stray ping
     * from another time.
     */
    private function ensureGpsSnapshot(Violation $violation, float $lat, float $lng): void
    {
        if ($violation->location_snapshot_id) {
            return;
        }

        $location = TricycleLocation::create([
            'tricycle_id' => $violation->tricycle_id,
            'latitude'    => $lat,
            'longitude'   => $lng,
            'speed_kmh'   => 21.0,
            'heading_deg' => 90,
            'accuracy_m'  => 5.0,
            'source'      => self::pingSource(Tricycle::find($violation->tricycle_id)),
            'recorded_at' => $violation->detected_at,
        ]);

        $violation->forceFill(['location_snapshot_id' => $location->id])->save();
    }

    /**
     * The project's canonical ping source — the exact rule MobileAppDataSeeder already applies.
     * A unit actually fitted with an IoT tracker reports from its gps_device; every other unit
     * reports from the driver's phone. Using it here means every seeded violation carries a real
     * tricycle_locations.source, so the Detection Method resolves to Mobile GPS or IoT GPS
     * without ever having to guess from detection_method.
     */
    private static function pingSource(?Tricycle $tricycle): string
    {
        return $tricycle?->active_tracking_mode === 'iot_device' ? 'gps_device' : 'mobile_app';
    }
}
