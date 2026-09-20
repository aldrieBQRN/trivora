<?php

namespace Tests\Unit;

use App\Models\TodaZone;
use App\Services\TodaRouteMatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * TODA matching is now purely nearest-active-pin (haversine to each TODA's own lat/lng) — no
 * GeoJSON route corridors, no ROUTE_MAP, no barangay-name heuristics. These tests deliberately
 * place pins where the OLD route-file boundaries would have disagreed with straight-line
 * distance, to prove the route files no longer influence the result at all.
 */
class TodaRouteMatcherTest extends TestCase
{
    use DatabaseTransactions;

    #[\PHPUnit\Framework\Attributes\Test]
    public function pickup_near_toda_a_pin_selects_toda_a()
    {
        $todaA = TodaZone::create([
            'code' => 'TODA-A', 'name' => 'TODA A', 'barangay' => 'Brgy. A',
            'latitude' => 14.0700, 'longitude' => 120.6300, 'is_active' => true,
        ]);
        TodaZone::create([
            'code' => 'TODA-B', 'name' => 'TODA B', 'barangay' => 'Brgy. B',
            'latitude' => 14.1000, 'longitude' => 120.6600, 'is_active' => true,
        ]);

        // A few meters from TODA A's own pin.
        $zone = TodaRouteMatcher::matchRoute(14.0701, 120.6301);

        $this->assertNotNull($zone);
        $this->assertEquals($todaA->id, $zone->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function pickup_near_toda_b_pin_selects_toda_b()
    {
        TodaZone::create([
            'code' => 'TODA-A', 'name' => 'TODA A', 'barangay' => 'Brgy. A',
            'latitude' => 14.0700, 'longitude' => 120.6300, 'is_active' => true,
        ]);
        $todaB = TodaZone::create([
            'code' => 'TODA-B', 'name' => 'TODA B', 'barangay' => 'Brgy. B',
            'latitude' => 14.1000, 'longitude' => 120.6600, 'is_active' => true,
        ]);

        $zone = TodaRouteMatcher::matchRoute(14.0999, 120.6599);

        $this->assertNotNull($zone);
        $this->assertEquals($todaB->id, $zone->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function a_pickup_can_match_a_geographically_closer_toda_regardless_of_name_or_barangay()
    {
        // "TODA Brgy. 9" pin sits right where the pickup actually is; "TODA Brgy. 1" is far away.
        // Old barangay/route-name mapping would have no bearing here — only real distance should.
        $closeButDifferentlyNamed = TodaZone::create([
            'code' => 'TODA-BRGY9', 'name' => 'TODA Brgy. 9', 'barangay' => 'Brgy. 9',
            'latitude' => 14.0500, 'longitude' => 120.6000, 'is_active' => true,
        ]);
        TodaZone::create([
            'code' => 'TODA-BRGY1', 'name' => 'TODA Brgy. 1', 'barangay' => 'Brgy. 1',
            'latitude' => 14.2000, 'longitude' => 120.8000, 'is_active' => true,
        ]);

        $zone = TodaRouteMatcher::matchRoute(14.0501, 120.6001);

        $this->assertEquals($closeButDifferentlyNamed->id, $zone->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function old_route_geojson_does_not_affect_pickup_toda_matching()
    {
        // Coordinate that sits exactly on the old routeA.json corridor (previously mapped to
        // TODA-BRGY8 by ROUTE_MAP) but is now geographically nearer to a differently-coded TODA.
        TodaZone::create([
            'code' => 'TODA-BRGY8', 'name' => 'TODA Brgy. 8', 'barangay' => 'Brgy. 8',
            'latitude' => 14.0900, 'longitude' => 120.6600, 'is_active' => true,
        ]);
        $nearestByPin = TodaZone::create([
            'code' => 'TODA-BUCANA', 'name' => 'TODA Bucana', 'barangay' => 'Bucana',
            'latitude' => 14.071514, 'longitude' => 120.633083, 'is_active' => true,
        ]);

        // Same coordinate the old GeoJSON-based test asserted must resolve to TODA-BRGY8.
        $zone = TodaRouteMatcher::matchRoute(14.071514, 120.633083);

        $this->assertEquals($nearestByPin->id, $zone->id);
        $this->assertNotEquals('TODA-BRGY8', $zone->code);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function inactive_todas_are_ignored()
    {
        TodaZone::create([
            'code' => 'TODA-INACTIVE', 'name' => 'TODA Inactive', 'barangay' => 'Brgy. X',
            'latitude' => 14.0700, 'longitude' => 120.6300, 'is_active' => false,
        ]);
        $activeButFarther = TodaZone::create([
            'code' => 'TODA-ACTIVE', 'name' => 'TODA Active', 'barangay' => 'Brgy. Y',
            'latitude' => 14.1000, 'longitude' => 120.6600, 'is_active' => true,
        ]);

        // Right on top of the inactive zone's pin.
        $zone = TodaRouteMatcher::matchRoute(14.0700, 120.6300);

        $this->assertEquals($activeButFarther->id, $zone->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function todas_without_coordinates_are_ignored()
    {
        TodaZone::create([
            'code' => 'TODA-NO-PIN', 'name' => 'TODA No Pin', 'barangay' => 'Brgy. X',
            'latitude' => null, 'longitude' => null, 'is_active' => true,
        ]);
        $onlyValidPin = TodaZone::create([
            'code' => 'TODA-WITH-PIN', 'name' => 'TODA With Pin', 'barangay' => 'Brgy. Y',
            'latitude' => 14.1000, 'longitude' => 120.6600, 'is_active' => true,
        ]);

        $zone = TodaRouteMatcher::matchRoute(14.0700, 120.6300);

        $this->assertEquals($onlyValidPin->id, $zone->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function latitude_and_longitude_are_not_reversed()
    {
        // Nasugbu is roughly lat 14, lng 120 — a zone placed at (lat 14.2, lng 120.9) is far from
        // one at (lat 14.07, lng 120.63). If lat/lng were swapped anywhere in the distance
        // calculation, this pickup (close to the second zone in real lat/lng terms) would
        // incorrectly resolve to the first.
        TodaZone::create([
            'code' => 'TODA-FAR', 'name' => 'TODA Far', 'barangay' => 'Brgy. Far',
            'latitude' => 14.2000, 'longitude' => 120.9000, 'is_active' => true,
        ]);
        $near = TodaZone::create([
            'code' => 'TODA-NEAR', 'name' => 'TODA Near', 'barangay' => 'Brgy. Near',
            'latitude' => 14.0715, 'longitude' => 120.6330, 'is_active' => true,
        ]);

        $zone = TodaRouteMatcher::matchRoute(14.0716, 120.6331);

        $this->assertEquals($near->id, $zone->id);
    }
}
