<?php

namespace Tests\Feature\Concerns;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Passenger;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

/**
 * Fixtures for the QR Ride feature tests: an operating unit (tricycle + active franchise + its
 * one driver account), passengers, a faked OSRM, and scan / quote / join shortcuts.
 */
trait BuildsQrRides
{
    protected const PICKUP = ['lat' => 14.0715, 'lng' => 120.6330];
    protected const DEST_A = ['name' => 'Nasugbu Town Plaza', 'lat' => 14.0900, 'lng' => 120.6500];
    protected const DEST_B = ['name' => 'Bucana Beach', 'lat' => 14.0600, 'lng' => 120.6200];

    /** Every OSRM call is faked; nothing leaves the test. Routes are $routeMeters long, snaps exact. */
    protected function fakeOsrm(float $routeMeters = 5400, float $durationSeconds = 900): void
    {
        Cache::flush();
        Http::swap(new HttpFactory()); // replace (not stack on) any earlier fake
        Http::preventStrayRequests();
        Http::fake([
            'router.project-osrm.org/nearest/*' => function (HttpRequest $request) {
                preg_match('#/nearest/v1/driving/([-0-9.]+),([-0-9.]+)#', $request->url(), $m);

                return Http::response(['code' => 'Ok', 'waypoints' => [['location' => [(float) $m[1], (float) $m[2]]]]]);
            },
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'routes' => [['distance' => $routeMeters, 'duration' => $durationSeconds]],
            ]),
        ]);
    }

    protected function fakeOsrmDown(): void
    {
        Cache::flush();
        Http::swap(new HttpFactory());
        Http::preventStrayRequests();
        Http::fake(['router.project-osrm.org/*' => Http::response('Service Unavailable', 503)]);
    }

    /** @return array{0: Tricycle, 1: Driver} */
    protected function makeUnit(?int $capacity = 4, bool $online = true, string $tricycleStatus = 'active'): array
    {
        $suffix = strtoupper(substr(uniqid(), -7)) . rand(10, 99);
        $operator = Operator::create([
            'first_name' => 'Qr', 'last_name' => 'Unit ' . $suffix,
            'contact_number' => '0917' . rand(1000000, 9999999),
            'address' => 'Nasugbu', 'barangay' => 'Brgy 8', 'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-QR-' . $suffix, 'license_expiry_date' => '2028-01-01',
        ]);
        $tricycle = Tricycle::create([
            'operator_id' => $operator->id,
            'plate_number' => 'QR-' . $suffix,
            'coding_scheme_number' => (string) rand(1000, 9999),
            'engine_number' => 'ENG-QR-' . $suffix,
            'chassis_number' => 'CHS-QR-' . $suffix,
            'make' => 'Honda', 'model' => 'TMX 125', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'status' => $tricycleStatus,
            'passenger_capacity' => $capacity,
        ]);
        $colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'QR Ride Test Scheme'],
            ['color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'is_active' => true]
        );
        FranchiseScheme::create([
            'tricycle_id' => $tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by' => $this->qrIssuer()->id,
            'franchise_number' => 'FR-QR-' . $suffix,
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
            'status' => FranchiseScheme::STATUS_ACTIVE,
        ]);
        $user = User::create([
            'name' => 'Pedro Ramos ' . $suffix,
            'email' => 'qr.driver.' . strtolower($suffix) . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);
        $driver = Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-QR-' . $suffix,
            'mobile_number' => '09171112222',
            'is_online' => $online,
            'is_available' => $online,
            'current_lat' => self::PICKUP['lat'],
            'current_lng' => self::PICKUP['lng'],
            'last_location_updated_at' => now(),
        ]);

        return [$tricycle, $driver];
    }

    protected function qrIssuer(): User
    {
        return User::firstOrCreate(
            ['email' => 'qr.issuer@trivora.test'],
            ['name' => 'QR Issuer', 'password' => bcrypt('password'), 'role' => 'bplo_staff']
        );
    }

    protected function makePassengerUser(): User
    {
        $user = User::create([
            'name' => 'Juan Pasahero ' . uniqid(),
            'email' => 'qr.passenger.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'passenger',
        ]);
        Passenger::create(['user_id' => $user->id, 'mobile_number' => '0918' . rand(1000000, 9999999)]);

        return $user;
    }

    protected function passengerOf(User $user): Passenger
    {
        return Passenger::where('user_id', $user->id)->firstOrFail();
    }

    protected function as(User $user): static
    {
        Sanctum::actingAs($user, ['*']);

        return $this;
    }

    protected function scan(User $passenger, Tricycle $tricycle): TestResponse
    {
        return $this->as($passenger)->getJson('/api/v1/passenger/qr-rides/tricycle/' . $tricycle->qr_token);
    }

    protected function quote(User $passenger, Tricycle $tricycle, array $dest = self::DEST_A, int $party = 1): TestResponse
    {
        return $this->as($passenger)->postJson('/api/v1/passenger/qr-rides/quote', [
            'token' => $tricycle->qr_token,
            'party_size' => $party,
            'pickup_lat' => self::PICKUP['lat'], 'pickup_lng' => self::PICKUP['lng'],
            'dropoff_name' => $dest['name'], 'dropoff_lat' => $dest['lat'], 'dropoff_lng' => $dest['lng'],
        ]);
    }

    protected function join(User $passenger, string $quote): TestResponse
    {
        return $this->as($passenger)->postJson('/api/v1/passenger/qr-rides/join', ['quote' => $quote]);
    }

    /** Quote + join in one step; returns the join response. */
    protected function quoteAndJoin(User $passenger, Tricycle $tricycle, array $dest = self::DEST_A, int $party = 1): TestResponse
    {
        $quote = $this->quote($passenger, $tricycle, $dest, $party)->assertOk()->json('quote');

        return $this->join($passenger, $quote);
    }
}
