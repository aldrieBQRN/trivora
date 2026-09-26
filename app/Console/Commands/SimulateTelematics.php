<?php

namespace App\Console\Commands;

use App\Models\Tricycle;
use App\Models\TricycleLocation;
use Illuminate\Console\Command;

class SimulateTelematics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telematics:simulate {--interval=3 : Interval in seconds between location updates} {--count=10 : Number of movement cycles to perform}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulate live GPS telematics movement along TODA routes for active tricycles';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $interval = (int) $this->option('interval');
        $count = (int) $this->option('count');

        $this->info("🚀 Starting TODA Telematics Simulator ({$count} cycles, {$interval}s interval)...");

        // Only simulate for tricycles whose franchise has actually been activated — a unit still
        // mid-application has no real GPS history yet, and the Driver Portal now relies on that
        // absence to correctly hide tracking data for pending applications (see operator.fleet /
        // operator.tracking in routes/web.php). Simulating pings for a pending unit would defeat
        // that guard with fake-but-present data.
        $tricycles = Tricycle::where('status', 'active')->get();

        if ($tricycles->isEmpty()) {
            $this->warn('No active tricycles found in database. Nothing to simulate for pending/unregistered units.');
            return;
        }

        // Base coordinates for Nasugbu TODA routes
        $routePoints = [
            [14.0725, 120.6322],
            [14.0726, 120.6327],
            [14.0714, 120.6330],
            [14.0703, 120.6332],
            [14.0673, 120.6331],
            [14.0640, 120.6298],
        ];

        for ($cycle = 1; $cycle <= $count; $cycle++) {
            $this->line("Cycle {$cycle}/{$count} — Updating " . $tricycles->count() . " tricycles...");

            foreach ($tricycles as $idx => $trike) {
                $pointIdx = ($cycle + $idx) % count($routePoints);
                [$baseLat, $baseLng] = $routePoints[$pointIdx];

                // Add slight micro-offset for realistic GPS jitter
                $lat = $baseLat + ((rand(-5, 5)) / 10000);
                $lng = $baseLng + ((rand(-5, 5)) / 10000);
                $speed = rand(18, 35);
                $heading = rand(0, 359);

                TricycleLocation::create([
                    'tricycle_id'   => $trike->id,
                    'latitude'       => $lat,
                    'longitude'      => $lng,
                    'speed_kmh'      => $speed,
                    'heading'        => $heading,
                    'tracking_source' => $trike->active_tracking_mode ?? 'mobile_app',
                    'recorded_at'    => now(),
                ]);
            }

            if ($cycle < $count) {
                sleep($interval);
            }
        }

        $this->info("✅ Telematics simulation completed successfully!");
    }
}
