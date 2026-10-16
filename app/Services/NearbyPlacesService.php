<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class NearbyPlacesService
{
    /** Cache duration for successfully fetched POIs: 24 hours */
    public const CACHE_TTL_SECONDS = 86400;

    /** Cache duration for the approximate local fallback list: short, so real OSM data replaces it soon after Overpass recovers */
    public const FALLBACK_CACHE_TTL_SECONDS = 600;

    /** Maximum POIs returned per request to keep payloads lightweight */
    public const MAX_RESULTS = 50;

    /** Coordinate precision for caching (~110 meters grid) */
    public const CACHE_COORDINATE_DECIMALS = 3;

    /** Supported category slugs and their display labels */
    public const CATEGORIES = [
        'all' => 'All',
        'restaurants' => 'Restaurants',
        'coffee' => 'Coffee',
        'hotels' => 'Hotels',
        'gas_stations' => 'Gas Stations',
        'hospitals' => 'Hospitals',
        'schools' => 'Schools',
        'banks' => 'Banks',
        'shops' => 'Shops',
        'government' => 'Government',
        'places' => 'Places',
    ];

    /**
     * Get the cache key for a nearby places query.
     */
    public function getCacheKey(string $category, float $lat, float $lng, int $radius): string
    {
        return sprintf(
            'places:nearby:%s:%.3f,%.3f:%d',
            $category,
            round($lat, self::CACHE_COORDINATE_DECIMALS),
            round($lng, self::CACHE_COORDINATE_DECIMALS),
            $radius
        );
    }

    /**
     * Fetch nearby places, checking cache first and falling back cleanly if Overpass is down.
     *
     * @param float $lat Search center latitude
     * @param float $lng Search center longitude
     * @param int $radius Search radius in meters (default 2000)
     * @param string $category Category slug (default 'all')
     * @return array Normalized place items
     */
    public function fetchNearby(float $lat, float $lng, int $radius = 2000, string $category = 'all'): array
    {
        $normalizedCategory = strtolower(trim($category));
        if (!array_key_exists($normalizedCategory, self::CATEGORIES)) {
            $normalizedCategory = 'all';
        }

        $cacheKey = $this->getCacheKey($normalizedCategory, $lat, $lng, $radius);

        // Check cache
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        // Query Overpass
        $places = $this->queryOverpass($lat, $lng, $radius, $normalizedCategory);

        $enableFallback = config('services.overpass.enable_fallback');
        if ($enableFallback === null) {
            $enableFallback = !app()->environment('testing');
        }

        // If Overpass returned results, cache and return them
        if ($places !== null && !empty($places)) {
            Cache::put($cacheKey, $places, self::CACHE_TTL_SECONDS);
            return $places;
        }

        // If Overpass failed (null) or returned 0 results, check local fallback
        if ($enableFallback) {
            $fallback = $this->getLocalFallbackPlaces($lat, $lng, $radius, $normalizedCategory);
            if (!empty($fallback)) {
                Cache::put($cacheKey, $fallback, self::FALLBACK_CACHE_TTL_SECONDS);
                return $fallback;
            }
        }

        // Return empty array on failure without caching
        return [];
    }

    /**
     * Execute Overpass QL query and parse results. Returns null on network/server error.
     */
    public function queryOverpass(float $lat, float $lng, int $radius, string $category): ?array
    {
        $ql = $this->buildOverpassQuery($lat, $lng, $radius, $category);
        $url = config('services.overpass.url', 'https://overpass-api.de/api/interpreter');
        $timeout = (int) config('services.overpass.timeout', 3);

        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'User-Agent' => 'TrivoraApp/1.0 (NearbyPlaces; contact: info@trivora.ph)',
                    'Accept' => 'application/json',
                ])
                ->asForm()
                ->post($url, [
                    'data' => $ql,
                ]);

            if ($response->status() === 429) {
                Log::warning('Overpass API rate limit reached (HTTP 429)');
                return null;
            }

            if (!$response->successful()) {
                Log::warning('Overpass API responded with error status: ' . $response->status(), [
                    'body' => substr($response->body(), 0, 300),
                ]);
                return null;
            }

            $json = $response->json();
            if (!isset($json['elements']) || !is_array($json['elements'])) {
                Log::warning('Overpass API response missing elements key');
                return [];
            }

            return $this->normalizeElements($json['elements'], $category);
        } catch (Throwable $e) {
            Log::warning('Overpass API request failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Build an Overpass QL statement targeting specific OSM tags.
     */
    public function buildOverpassQuery(float $lat, float $lng, int $radius, string $category): string
    {
        $clauses = $this->getCategoryClauses($category, $lat, $lng, $radius);
        $timeout = (int) config('services.overpass.timeout', 3);
        $maxResults = self::MAX_RESULTS;

        return "[out:json][timeout:{$timeout}];\n(\n  " . implode("\n  ", $clauses) . "\n);\nout center tags {$maxResults};";
    }

    /**
     * Generate Overpass QL clauses based on category and OSM tags.
     */
    protected function getCategoryClauses(string $category, float $lat, float $lng, int $radius): array
    {
        $around = "(around:{$radius},{$lat},{$lng})";

        switch ($category) {
            case 'restaurants':
                return [
                    "node[\"amenity\"=\"restaurant\"]{$around};",
                    "way[\"amenity\"=\"restaurant\"]{$around};",
                    "node[\"amenity\"=\"fast_food\"]{$around};",
                    "way[\"amenity\"=\"fast_food\"]{$around};",
                ];

            case 'coffee':
                return [
                    "node[\"amenity\"=\"cafe\"]{$around};",
                    "way[\"amenity\"=\"cafe\"]{$around};",
                ];

            case 'hotels':
                return [
                    "node[\"tourism\"~\"hotel|motel|guest_house|hostel\"]{$around};",
                    "way[\"tourism\"~\"hotel|motel|guest_house|hostel\"]{$around};",
                ];

            case 'gas_stations':
                return [
                    "node[\"amenity\"=\"fuel\"]{$around};",
                    "way[\"amenity\"=\"fuel\"]{$around};",
                ];

            case 'hospitals':
                return [
                    "node[\"amenity\"~\"hospital|clinic|pharmacy\"]{$around};",
                    "way[\"amenity\"~\"hospital|clinic|pharmacy\"]{$around};",
                ];

            case 'schools':
                return [
                    "node[\"amenity\"~\"school|college|university|kindergarten\"]{$around};",
                    "way[\"amenity\"~\"school|college|university|kindergarten\"]{$around};",
                ];

            case 'banks':
                return [
                    "node[\"amenity\"~\"bank|atm\"]{$around};",
                    "way[\"amenity\"~\"bank|atm\"]{$around};",
                ];

            case 'shops':
                return [
                    "node[\"shop\"]{$around};",
                    "way[\"shop\"]{$around};",
                ];

            case 'government':
                return [
                    "node[\"office\"=\"government\"]{$around};",
                    "way[\"office\"=\"government\"]{$around};",
                    "node[\"amenity\"~\"townhall|courthouse|police|post_office\"]{$around};",
                    "way[\"amenity\"~\"townhall|courthouse|police|post_office\"]{$around};",
                ];

            case 'places':
                return [
                    "node[\"tourism\"~\"attraction|viewpoint\"]{$around};",
                    "way[\"tourism\"~\"attraction|viewpoint\"]{$around};",
                    "node[\"amenity\"=\"place_of_worship\"]{$around};",
                    "way[\"amenity\"=\"place_of_worship\"]{$around};",
                    "node[\"leisure\"=\"park\"]{$around};",
                    "way[\"leisure\"=\"park\"]{$around};",
                ];

            case 'all':
            default:
                return [
                    "node[\"amenity\"=\"restaurant\"]{$around};",
                    "node[\"amenity\"=\"fast_food\"]{$around};",
                    "node[\"amenity\"=\"cafe\"]{$around};",
                    "node[\"amenity\"=\"fuel\"]{$around};",
                    "node[\"amenity\"=\"hospital\"]{$around};",
                    "node[\"amenity\"=\"clinic\"]{$around};",
                    "node[\"amenity\"=\"bank\"]{$around};",
                    "node[\"amenity\"=\"school\"]{$around};",
                    "node[\"tourism\"=\"hotel\"]{$around};",
                    "node[\"shop\"=\"supermarket\"]{$around};",
                    "node[\"shop\"=\"convenience\"]{$around};",
                    "node[\"office\"=\"government\"]{$around};",
                    "node[\"amenity\"=\"place_of_worship\"]{$around};",
                    "way[\"amenity\"=\"restaurant\"]{$around};",
                    "way[\"amenity\"=\"hospital\"]{$around};",
                    "way[\"tourism\"=\"hotel\"]{$around};",
                    "way[\"shop\"=\"supermarket\"]{$around};",
                ];
        }
    }

    /**
     * Normalize raw Overpass elements into clean, structured place items.
     */
    public function normalizeElements(array $elements, string $queriedCategory, int $limit = self::MAX_RESULTS): array
    {
        $places = [];
        $seenIds = [];

        foreach ($elements as $el) {
            if (!isset($el['tags']) || !is_array($el['tags'])) {
                continue;
            }

            $tags = $el['tags'];
            $name = trim($tags['name'] ?? $tags['brand'] ?? $tags['operator'] ?? '');
            if ($name === '') {
                continue; // Skip unnamed POIs
            }

            // Latitude and longitude resolution (nodes have direct lat/lon, ways/relations have center)
            $lat = $el['lat'] ?? ($el['center']['lat'] ?? null);
            $lng = $el['lon'] ?? ($el['center']['lon'] ?? null);

            if ($lat === null || $lng === null || !is_numeric($lat) || !is_numeric($lng)) {
                continue;
            }

            $id = ($el['type'] ?? 'node') . '/' . ($el['id'] ?? uniqid());
            if (isset($seenIds[$id])) {
                continue;
            }
            $seenIds[$id] = true;

            $itemCategory = $this->determineItemCategory($tags, $queriedCategory);
            $categoryLabel = self::CATEGORIES[$itemCategory] ?? 'Place';
            $address = $this->buildAddressString($tags);

            $places[] = [
                'id' => $id,
                'name' => $name,
                'category' => $itemCategory,
                'category_label' => $categoryLabel,
                'latitude' => round((float) $lat, 6),
                'longitude' => round((float) $lng, 6),
                'address' => $address ?: null,
            ];

            if (count($places) >= $limit) {
                break;
            }
        }

        return $places;
    }

    /**
     * Categorize an individual POI item based on its tags if the query was 'all'.
     */
    protected function determineItemCategory(array $tags, string $queriedCategory): string
    {
        if ($queriedCategory !== 'all' && isset(self::CATEGORIES[$queriedCategory])) {
            return $queriedCategory;
        }

        $amenity = $tags['amenity'] ?? '';
        $tourism = $tags['tourism'] ?? '';
        $shop = $tags['shop'] ?? '';
        $office = $tags['office'] ?? '';
        $leisure = $tags['leisure'] ?? '';

        if ($amenity === 'cafe') return 'coffee';
        if (in_array($amenity, ['restaurant', 'fast_food', 'food_court'])) return 'restaurants';
        if (in_array($tourism, ['hotel', 'motel', 'guest_house', 'hostel'])) return 'hotels';
        if ($amenity === 'fuel') return 'gas_stations';
        if (in_array($amenity, ['hospital', 'clinic', 'pharmacy', 'doctors'])) return 'hospitals';
        if (in_array($amenity, ['school', 'college', 'university', 'kindergarten'])) return 'schools';
        if (in_array($amenity, ['bank', 'atm'])) return 'banks';
        if (!empty($shop)) return 'shops';
        if ($office === 'government' || in_array($amenity, ['townhall', 'courthouse', 'police', 'post_office'])) return 'government';
        if (in_array($tourism, ['attraction', 'viewpoint']) || $amenity === 'place_of_worship' || $leisure === 'park') return 'places';

        return 'places';
    }

    /**
     * Assemble readable address line from OSM address tags.
     */
    protected function buildAddressString(array $tags): string
    {
        $parts = [];

        $houseNumber = trim($tags['addr:housenumber'] ?? '');
        $street = trim($tags['addr:street'] ?? '');
        if ($houseNumber !== '' && $street !== '') {
            $parts[] = "{$houseNumber} {$street}";
        } elseif ($street !== '') {
            $parts[] = $street;
        }

        $barangay = trim($tags['addr:barangay'] ?? $tags['addr:suburb'] ?? '');
        if ($barangay !== '') {
            $parts[] = str_starts_with(strtolower($barangay), 'brgy') ? $barangay : "Brgy. {$barangay}";
        }

        $city = trim($tags['addr:city'] ?? $tags['addr:municipality'] ?? '');
        if ($city !== '') {
            $parts[] = $city;
        }

        $province = trim($tags['addr:province'] ?? '');
        if ($province !== '' && $province !== $city) {
            $parts[] = $province;
        }

        return implode(', ', $parts);
    }

    /** Bundled OpenStreetMap snapshot used when Overpass is unavailable (real OSM coordinates). */
    public const FALLBACK_SNAPSHOT_PATH = 'data/nasugbu_places_osm.json';

    /**
     * Real Nasugbu points of interest from a bundled OpenStreetMap snapshot, used when the Overpass
     * API is unavailable, times out, or returns no results. Normalized exactly like a live Overpass
     * response, so the coordinates are the same ones the map and place search show.
     */
    public function getLocalFallbackPlaces(float $lat, float $lng, int $radius, string $category): array
    {
        $path = database_path(self::FALLBACK_SNAPSHOT_PATH);
        $snapshot = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        if (!is_array($snapshot) || !isset($snapshot['elements']) || !is_array($snapshot['elements'])) {
            Log::warning('Nearby places fallback snapshot missing or unreadable: ' . $path);
            return [];
        }

        $results = [];
        foreach ($this->normalizeElements($snapshot['elements'], 'all', PHP_INT_MAX) as $item) {
            if ($category !== 'all' && $item['category'] !== $category) {
                continue;
            }

            $dist = $this->calculateHaversineDistance($lat, $lng, $item['latitude'], $item['longitude']);
            // Allow within radius, or up to 6km to cover Poblacion & surrounding barangays
            if ($dist <= max($radius, 6000)) {
                $item['distance'] = round($dist);
                $results[] = $item;
            }
        }

        // Sort by distance ascending
        usort($results, fn($a, $b) => ($a['distance'] ?? 0) <=> ($b['distance'] ?? 0));

        return array_slice($results, 0, self::MAX_RESULTS);
    }

    /**
     * Calculate approximate distance in meters between two lat/lng coordinates.
     */
    protected function calculateHaversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}

