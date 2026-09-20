<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\TricycleLocation;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LiveMonitoringViolationDateTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected Tricycle $tricycle;
    protected FranchiseScheme $franchiseScheme;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::create([
            'name'      => 'TMO Officer ' . uniqid(),
            'email'     => 'tmo.officer.' . uniqid() . '@trivora.test',
            'password'  => bcrypt('password'),
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);

        $toda = TodaZone::firstOrCreate(
            ['code' => 'TODA-LM-TEST'],
            ['name' => 'TODA Live Monitor Test', 'barangay' => 'Poblacion', 'is_active' => true]
        );

        $driverUser = User::create([
            'name'     => 'Driver ' . uniqid(),
            'email'    => 'driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role'     => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id'             => $driverUser->id,
            'toda_id'             => $toda->id,
            'first_name'          => 'Juan',
            'last_name'           => 'Dela Cruz',
            'contact_number'      => '09171234567',
            'address'             => 'Nasugbu Poblacion',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1985-05-15',
            'license_number'      => 'LIC-LM-' . uniqid(),
            'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id'          => $operator->id,
            'toda_zone_id'         => $toda->id,
            'coding_scheme_number' => '9999',
            'body_number'          => '9999',
            'plate_number'         => 'LM-9999',
            'engine_number'        => 'ENG-LM-' . uniqid(),
            'chassis_number'       => 'CHS-LM-' . uniqid(),
            'make'                 => 'Kawasaki',
            'model'                => 'Barako 175',
            'year_model'           => 2023,
            'body_color'           => 'Blue',
            'body_type'            => 'Standard',
            'or_number'            => 'OR-LM-' . uniqid(),
            'cr_number'            => 'CR-LM-' . uniqid(),
            'status'               => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $colorScheme = ColorCodingScheme::create([
            'name'            => 'LM Test Scheme ' . uniqid(),
            'color_hex'       => '#3B82F6',
            'restricted_days' => ['Sunday'], // Ensure not restricted on regular weekdays for our test
            'is_active'       => true,
        ]);

        $this->franchiseScheme = FranchiseScheme::create([
            'tricycle_id'            => $this->tricycle->id,
            'color_coding_scheme_id' => $colorScheme->id,
            'issued_by'              => $this->tmoUser->id,
            'franchise_number'       => 'FR-LM-9999',
            'issue_date'             => '2024-01-01',
            'expiry_date'            => '2029-01-01',
            'is_active'              => true,
        ]);

        // Fresh GPS location so unit is considered "online"
        TricycleLocation::create([
            'tricycle_id' => $this->tricycle->id,
            'latitude'    => 14.0733,
            'longitude'   => 120.6320,
            'speed_kmh'   => 20,
            'heading_deg' => 90,
            'accuracy_m'  => 5,
            'source'      => 'mobile_app',
            'recorded_at' => now(),
        ]);
    }

    #[Test]
    public function violation_detected_today_marks_tricycle_as_violator(): void
    {
        Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now(),
            'day_of_week'            => now()->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.live'));
        $response->assertOk();

        $response->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                $match = $tricycles->firstWhere('plate', 'LM-9999');
                \PHPUnit\Framework\Assert::assertNotNull($match);
                \PHPUnit\Framework\Assert::assertSame('violator', $match['status']);
                return true;
            });
        });
    }

    #[Test]
    public function violation_detected_yesterday_does_not_mark_tricycle_as_violator(): void
    {
        Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now()->subDay(),
            'day_of_week'            => now()->subDay()->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.live'));
        $response->assertOk();

        $response->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                $match = $tricycles->firstWhere('plate', 'LM-9999');
                \PHPUnit\Framework\Assert::assertNotNull($match);
                \PHPUnit\Framework\Assert::assertNotSame('violator', $match['status']);
                return true;
            });
        });
    }

    #[Test]
    public function violation_detected_two_days_ago_does_not_mark_tricycle_as_violator(): void
    {
        Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now()->subDays(2),
            'day_of_week'            => now()->subDays(2)->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.live'));
        $response->assertOk();

        $response->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                $match = $tricycles->firstWhere('plate', 'LM-9999');
                \PHPUnit\Framework\Assert::assertNotNull($match);
                \PHPUnit\Framework\Assert::assertNotSame('violator', $match['status']);
                return true;
            });
        });
    }

    #[Test]
    public function new_violation_today_becomes_violator_after_refresh(): void
    {
        // First check: no violation today, status is not violator
        $firstResponse = $this->actingAs($this->tmoUser)->get(route('tmo.live'));
        $firstResponse->assertOk();
        $firstResponse->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                $match = $tricycles->firstWhere('plate', 'LM-9999');
                \PHPUnit\Framework\Assert::assertNotNull($match);
                \PHPUnit\Framework\Assert::assertNotSame('violator', $match['status']);
                return true;
            });
        });

        // Add new violation today
        Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now(),
            'day_of_week'            => now()->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        // Next poll / refresh
        $secondResponse = $this->actingAs($this->tmoUser)->get(route('tmo.live'));
        $secondResponse->assertOk();
        $secondResponse->assertInertia(function ($page) {
            $page->where('initialTricycles', function ($tricycles) {
                $match = $tricycles->firstWhere('plate', 'LM-9999');
                \PHPUnit\Framework\Assert::assertNotNull($match);
                \PHPUnit\Framework\Assert::assertSame('violator', $match['status']);
                return true;
            });
        });
    }

    #[Test]
    public function historical_violations_still_appear_in_violation_records(): void
    {
        $v1 = Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now()->subDays(2),
            'day_of_week'            => now()->subDays(2)->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        $v2 = Violation::create([
            'tricycle_id'            => $this->tricycle->id,
            'franchise_scheme_id'    => $this->franchiseScheme->id,
            'color_coding_scheme_id' => $this->franchiseScheme->color_coding_scheme_id,
            'violation_type'         => 'color_coding',
            'detected_at'            => now()->subDay(),
            'day_of_week'            => now()->subDay()->format('l'),
            'detection_method'       => 'automated',
            'status'                 => 'open',
            'fine_amount'            => 500.00,
        ]);

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.violations'));
        $response->assertOk();

        $response->assertInertia(function ($page) use ($v1, $v2) {
            $page->where('initialViolations', function ($violations) use ($v1, $v2) {
                $ids = collect($violations)->pluck('db_id')->all();
                \PHPUnit\Framework\Assert::assertContains($v1->id, $ids);
                \PHPUnit\Framework\Assert::assertContains($v2->id, $ids);
                return true;
            });
        });
    }
}
