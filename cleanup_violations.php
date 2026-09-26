<?php
/**
 * One-time, targeted cleanup for the development database (trivora).
 *
 *  1. Removes route_violation as an active type — the two obsolete seeded/development rows are
 *     converted in place to color_coding so their scenario (plate, detected_at, status, notes)
 *     survives, which is what the migration brief asks for.
 *  2. Gives every active record a real GPS ping (tricycle_locations.source = mobile_app /
 *     gps_device), so Detection Method resolves to Mobile GPS or IoT GPS from real data.
 *
 * Never touches violations.detection_method, never wipes tables, never runs migrate:fresh.
 * Reports exactly what it changed.
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

function pingSourceFor(?string $mode): string
{
    return $mode === 'iot_device' ? 'gps_device' : 'mobile_app';
}

$before = DB::table('violations')
    ->leftJoin('tricycles', 'tricycles.id', '=', 'violations.tricycle_id')
    ->leftJoin('tricycle_locations', 'tricycle_locations.id', '=', 'violations.location_snapshot_id')
    ->select('violations.id', 'tricycles.plate_number', 'tricycles.active_tracking_mode',
             'violations.violation_type', 'violations.status', 'violations.location_snapshot_id',
             'tricycle_locations.source as src')
    ->orderBy('violations.id')->get();

echo "BEFORE: " . $before->count() . " violations | by type: "
    . json_encode($before->groupBy('violation_type')->map->count()) . PHP_EOL;

// ---------------------------------------------------------------------------
// 1. Convert obsolete route_violation rows to color_coding (in place)
// ---------------------------------------------------------------------------
$converted = [];
foreach (DB::table('violations')->where('violation_type', 'route_violation')->get() as $v) {
    // Pre-flight: dedup_date = DATE(detected_at) for color_coding rows and there is a unique
    // (tricycle_id, dedup_date) index — refuse to convert if it would collide.
    $clash = DB::table('violations')
        ->where('tricycle_id', $v->tricycle_id)
        ->where('violation_type', 'color_coding')
        ->whereDate('detected_at', date('Y-m-d', strtotime($v->detected_at)))
        ->count();

    if ($clash > 0) {
        echo "!! violation #{$v->id} would collide on (tricycle_id, dedup_date) — left untouched" . PHP_EOL;
        continue;
    }

    DB::table('violations')->where('id', $v->id)->update(['violation_type' => 'color_coding']);
    $converted[] = "#{$v->id}";
    echo "CONVERTED violation #{$v->id} route_violation -> color_coding "
        . "(status={$v->status}, detected_at={$v->detected_at}, dedup_date="
        . (DB::table('violations')->where('id', $v->id)->value('dedup_date') ?? 'NULL') . ")" . PHP_EOL;
}

// ---------------------------------------------------------------------------
// 2. Attach a real GPS ping to every record that has none
// ---------------------------------------------------------------------------
// Seeded operating position each scenario was written for (same coordinates the seeders use).
$coordsByPlate = [
    'AAA-1234' => [14.5996000, 120.9843000],
    'DDD-3456' => [14.0733000, 120.6302000],
    'EEE-7890' => [14.0740000, 120.6380000],
    'TEST-0001' => [14.0705000, 120.6341000],
    'DEMO-0001' => [14.0728000, 120.6319000],
    'DEMO-0002' => [14.0689000, 120.6274000],
    'DEMO-0003' => [14.0642000, 120.6350000],
];
// Per-record landmark override (TEST-0001 pending scenario sits at a different landmark).
$coordsByDetectedAt = [
    '2026-09-07 07:45:00' => [14.0718000, 120.6325000],
];

$healed = [];
$missing = [];

$orphans = DB::table('violations')
    ->leftJoin('tricycles', 'tricycles.id', '=', 'violations.tricycle_id')
    ->select('violations.*', 'tricycles.plate_number', 'tricycles.active_tracking_mode')
    ->whereNull('violations.location_snapshot_id')
    ->orderBy('violations.id')->get();

foreach ($orphans as $v) {
    $coords = $coordsByDetectedAt[$v->detected_at] ?? $coordsByPlate[$v->plate_number] ?? null;

    if (! $coords || ! $v->plate_number) {
        $missing[] = "#{$v->id} ({$v->plate_number}) — no safe coordinates";
        continue;
    }

    [$lat, $lng] = $coords;
    $source = pingSourceFor($v->active_tracking_mode);

    $locationId = DB::table('tricycle_locations')->insertGetId([
        'tricycle_id' => $v->tricycle_id,
        'latitude'    => $lat,
        'longitude'   => $lng,
        'speed_kmh'   => 21.00,
        'heading_deg' => 90,
        'accuracy_m'  => 5.00,
        'source'      => $source,
        'recorded_at' => $v->detected_at,
        'created_at'  => now(),
    ]);

    DB::table('violations')->where('id', $v->id)->update(['location_snapshot_id' => $locationId]);

    $healed[] = sprintf(
        '#%-3s %-10s type=%-14s status=%-13s -> ping#%-5s source=%-11s label=%s',
        $v->id, $v->plate_number, $v->violation_type, $v->status,
        $locationId, $source, $source === 'gps_device' ? 'IoT GPS' : 'Mobile GPS'
    );
}

echo PHP_EOL . "HEALED (attached a real GPS ping): " . count($healed) . PHP_EOL;
foreach ($healed as $line) { echo "  " . $line . PHP_EOL; }
if ($missing) {
    echo PHP_EOL . "SKIPPED: " . PHP_EOL;
    foreach ($missing as $line) { echo "  " . $line . PHP_EOL; }
}

// ---------------------------------------------------------------------------
// 3. Verification
// ---------------------------------------------------------------------------
$after = DB::table('violations')
    ->leftJoin('tricycles', 'tricycles.id', '=', 'violations.tricycle_id')
    ->leftJoin('tricycle_locations', 'tricycle_locations.id', '=', 'violations.location_snapshot_id')
    ->select('violations.id', 'tricycles.plate_number', 'violations.violation_type',
             'violations.status', 'tricycle_locations.source as src', 'violations.location_snapshot_id')
    ->orderBy('violations.id')->get();

echo PHP_EOL . "AFTER: " . $after->count() . " violations | by type: "
    . json_encode($after->groupBy('violation_type')->map->count()) . PHP_EOL;

$labels = [];
foreach ($after as $r) {
    $label = $r->src === 'gps_device' ? 'IoT GPS' : ($r->src === 'mobile_app' ? 'Mobile GPS' : '!! NO GPS !!');
    $labels[$label] = ($labels[$label] ?? 0) + 1;
    printf("  #%-3s %-10s %-14s %-13s ping=%-6s source=%-11s => %s\n",
        $r->id, $r->plate_number, $r->violation_type, $r->status,
        $r->location_snapshot_id ?? 'NULL', $r->src ?? 'NULL', $label);
}

echo PHP_EOL . "Detection Method resolution: " . json_encode($labels) . PHP_EOL;

$bad = DB::table('violations')->whereIn('violation_type', ['route_violation', 'expired_franchise', 'other'])->count();
$noGps = $after->filter(fn ($r) => ! in_array($r->src, ['gps_device', 'mobile_app'], true))->count();
$appeals = DB::table('violation_appeals')->count();

echo "route_violation/expired_franchise/other rows remaining : {$bad}  (expect 0)" . PHP_EOL;
echo "active rows without a real GPS source                 : {$noGps}  (expect 0)" . PHP_EOL;
echo "appeals still present                                 : {$appeals}  (expect 2)" . PHP_EOL;
echo "paid violations still present                         : "
    . DB::table('violations')->whereNotNull('fine_paid_at')->count() . "  (expect 2)" . PHP_EOL;
echo "detection_method values still present (untouched)     : "
    . json_encode(DB::table('violations')->select('detection_method', DB::raw('count(*) c'))->groupBy('detection_method')->pluck('c', 'detection_method')) . PHP_EOL;
