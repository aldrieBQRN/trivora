<?php

namespace App\Console\Commands;

use App\Models\Driver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoOfflineStaleDriversCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'drivers:auto-offline-stale';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically transition drivers whose telemetry has stopped for >= 10 minutes to Offline.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $timeoutSeconds = (int) config('tracking.fleet_auto_offline_seconds', 600);
        $cutoff = now()->subSeconds($timeoutSeconds);

        $staleDrivers = Driver::where('is_online', true)
            ->where(function ($query) use ($cutoff) {
                $query->where('last_location_updated_at', '<=', $cutoff)
                      ->orWhereNull('last_location_updated_at');
            })
            ->get();

        $count = $staleDrivers->count();

        foreach ($staleDrivers as $driver) {
            $driver->transitionToOffline('telemetry_timeout');
            Log::info("Driver ID {$driver->id} auto-transitioned to Offline (telemetry missing since {$driver->last_location_updated_at}).");
        }

        $this->info("Auto-offline check completed. Transitioned {$count} stale drivers to Offline.");

        return self::SUCCESS;
    }
}
