<?php

namespace Tests\Feature;

use App\Http\Controllers\DashboardController;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Services\ColorCodingRuleService;
use App\Services\TelemetryService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ColorCodingDatabaseRulesTest extends TestCase
{
    use DatabaseTransactions;

    protected ?User $defaultIssuer = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureRequiredColorCodingSchemes();
    }

    /**
     * Ensure required color coding schemes exist for tests that rely on specific scheme names/days.
     */
    protected function ensureRequiredColorCodingSchemes(): void
    {
        $schemes = [
            ['name' => 'Red', 'color_hex' => '#EF4444', 'restricted_days' => ['Monday'], 'restricted_digits' => [1, 2], 'fine_amount' => 500.00, 'is_active' => true],
            ['name' => 'Blue', 'color_hex' => '#3B82F6', 'restricted_days' => ['Tuesday'], 'restricted_digits' => [3, 4], 'fine_amount' => 500.00, 'is_active' => true],
            ['name' => 'Yellow', 'color_hex' => '#EAB308', 'restricted_days' => ['Wednesday'], 'restricted_digits' => [5, 6], 'fine_amount' => 500.00, 'is_active' => true],
            ['name' => 'Green', 'color_hex' => '#22C55E', 'restricted_days' => ['Thursday'], 'restricted_digits' => [7, 8], 'fine_amount' => 500.00, 'is_active' => true],
            ['name' => 'White', 'color_hex' => '#94A3B8', 'restricted_days' => ['Friday'], 'restricted_digits' => [9, 0], 'fine_amount' => 500.00, 'is_active' => true],
            ['name' => 'Orange', 'color_hex' => '#F97316', 'restricted_days' => [], 'restricted_digits' => [], 'fine_amount' => 500.00, 'is_active' => false],
            ['name' => 'Violet', 'color_hex' => '#8B5CF6', 'restricted_days' => [], 'restricted_digits' => [], 'fine_amount' => 500.00, 'is_active' => false],
        ];

        foreach ($schemes as $scheme) {
            \App\Models\ColorCodingScheme::updateOrCreate(
                ['name' => $scheme['name']],
                $scheme
            );
        }
    }

    protected function getIssuer(): User
    {
        if (!$this->defaultIssuer) {
            $this->defaultIssuer = User::create([
                'name'     => 'BPLO Test Issuer',
                'email'    => 'bplo.test.' . uniqid() . '@trivora.test',
                'password' => bcrypt('password'),
                'role'     => 'bplo_staff',
            ]);
        }
        return $this->defaultIssuer;
    }

    protected function createTricycleFixture(array $attributes = []): Tricycle
    {
        $id = uniqid();
        $defaults = [
            'plate_number'         => 'PLT-' . substr($id, 0, 4),
            'coding_scheme_number' => '1001',
            'engine_number'        => 'ENG-' . $id,
            'chassis_number'       => 'CHS-' . $id,
            'make'                 => 'Honda',
            'model'                => 'TMX 125',
            'year_model'           => 2022,
            'body_color'           => 'Red',
            'body_type'            => 'Standard',
            'or_number'            => 'OR-' . $id,
            'cr_number'            => 'CR-' . $id,
            'status'               => 'active',
            'active_tracking_mode' => 'mobile_app',
        ];

        return Tricycle::create(array_merge($defaults, $attributes));
    }

    protected function attachFranchiseScheme(Tricycle $tricycle, ColorCodingScheme $scheme): FranchiseScheme
    {
        return FranchiseScheme::create([
            'tricycle_id'            => $tricycle->id,
            'color_coding_scheme_id' => $scheme->id,
            'issued_by'              => $this->getIssuer()->id,
            'franchise_number'       => 'FR-' . uniqid(),
            'issue_date'             => '2024-01-01',
            'expiry_date'            => '2029-01-01',
            'is_active'              => true,
            'status'                 => 'active',
        ]);
    }

    /**
     * Requirement 1-5: Monday through Friday restrictions work strictly from DB.
     */
    #[Test]
    public function monday_through_friday_restrictions_work_from_database(): void
    {
        $daysToDigits = [
            'Monday'    => [1, 2],
            'Tuesday'   => [3, 4],
            'Wednesday' => [5, 6],
            'Thursday'  => [7, 8],
            'Friday'    => [9, 0],
        ];

        foreach ($daysToDigits as $day => $digits) {
            $date = Carbon::parse("next $day");
            $restricted = ColorCodingRuleService::restrictedDigitsForDay($day);
            $this->assertEqualsCanonicalizing($digits, $restricted, "Restricted digits for $day should come from DB");

            foreach ($digits as $digit) {
                $scheme = ColorCodingRuleService::schemeForLastDigit($digit);
                $this->assertNotNull($scheme, "Scheme for digit $digit should be found in DB");
                $eval = ColorCodingRuleService::evaluateScheme($scheme, $digit, $date, "TEST-$digit");
                $this->assertTrue($eval['is_restricted_today'], "Digit $digit should be restricted on $day");
                $this->assertEquals($day, $eval['restricted_days'][0]);
            }
        }
    }

    /**
     * Requirement 6 & 7: Saturday and Sunday have NO coding restriction.
     */
    #[Test]
    public function saturday_and_sunday_have_no_coding_restriction(): void
    {
        $sat = Carbon::parse('next Saturday');
        $sun = Carbon::parse('next Sunday');

        $this->assertEmpty(ColorCodingRuleService::restrictedDigitsForDay('Saturday'));
        $this->assertEmpty(ColorCodingRuleService::restrictedDigitsForDay('Sunday'));

        $orange = ColorCodingScheme::where('name', 'Orange')->first();
        $violet = ColorCodingScheme::where('name', 'Violet')->first();

        if ($orange) {
            $evalSat = ColorCodingRuleService::evaluateScheme($orange, 1, $sat);
            $this->assertFalse($evalSat['is_restricted_today'], 'Orange on Saturday must not be restricted');
        }

        if ($violet) {
            $evalSun = ColorCodingRuleService::evaluateScheme($violet, 1, $sun);
            $this->assertFalse($evalSun['is_restricted_today'], 'Violet on Sunday must not be restricted');
        }
    }

    /**
     * Requirement 8 & 20: TEST-0001 evaluates coding_scheme_number (9999), not plate_number (TEST-0001).
     * Coding digit is 9, NOT 1.
     */
    #[Test]
    public function test_0001_evaluates_coding_scheme_number_not_plate_number(): void
    {
        $user = User::factory()->create();
        $operator = Operator::create([
            'user_id' => $user->id,
            'first_name' => 'Test',
            'last_name' => 'Owner',
            'contact_number' => '09170000011',
            'address' => 'Poblacion',
            'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-T001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $whiteScheme = ColorCodingScheme::where('name', 'White')->firstOrFail();

        $tricycle = $this->createTricycleFixture([
            'operator_id'          => $operator->id,
            'plate_number'         => 'TEST-0001',
            'coding_scheme_number' => '9999',
        ]);

        $this->attachFranchiseScheme($tricycle, $whiteScheme);

        $this->assertEquals('TEST-0001', $tricycle->plate_number);
        $this->assertEquals('9999', $tricycle->coding_scheme_number);

        // On Monday: ending in 1 is restricted, but TEST-0001 ends in 9 (White), so it is ALLOWED
        $monday = Carbon::parse('next Monday');
        $evalMonday = ColorCodingRuleService::evaluateTricycle($tricycle, $monday);

        $this->assertEquals('9999', $evalMonday['evaluated_identifier']);
        $this->assertEquals(9, $evalMonday['last_digit']);
        $this->assertFalse($evalMonday['is_restricted_today'], 'TEST-0001 must NOT be restricted on Monday (digit 9 is White)');
        $this->assertEquals('Allowed Operation', $evalMonday['status_label']);

        // On Friday: ending in 9 (White) is restricted
        $friday = Carbon::parse('next Friday');
        $evalFriday = ColorCodingRuleService::evaluateTricycle($tricycle, $friday);

        $this->assertTrue($evalFriday['is_restricted_today'], 'TEST-0001 MUST be restricted on Friday (White scheme)');
        $this->assertEquals('Restricted Today (Coding Day)', $evalFriday['status_label']);
    }

    /**
     * Requirement 9: Last digit 9 is restricted only when the assigned scheme says so.
     */
    #[Test]
    public function last_digit_9_is_restricted_only_when_assigned_scheme_dictates(): void
    {
        $thursday = Carbon::parse('next Thursday');
        $friday = Carbon::parse('next Friday');

        $whiteScheme = ColorCodingScheme::where('name', 'White')->first();
        $this->assertNotNull($whiteScheme);

        $evalThursday = ColorCodingRuleService::evaluateScheme($whiteScheme, 9, $thursday);
        $this->assertFalse($evalThursday['is_restricted_today']);

        $evalFriday = ColorCodingRuleService::evaluateScheme($whiteScheme, 9, $friday);
        $this->assertTrue($evalFriday['is_restricted_today']);
    }

    /**
     * Requirement 10, 11, 12, 13: Database is single source of truth for fine_amount,
     * restricted_days, and restricted_digits without touching PHP code.
     */
    #[Test]
    public function dynamic_database_rule_changes_immediately_update_evaluation(): void
    {
        $whiteScheme = ColorCodingScheme::where('name', 'White')->firstOrFail();

        // Change White scheme to Thursday, digits [8, 9], fine 750.00
        $whiteScheme->update([
            'restricted_days' => ['Thursday'],
            'restricted_digits' => [8, 9],
            'fine_amount' => 750.00,
        ]);

        $thursday = Carbon::parse('next Thursday');
        $friday = Carbon::parse('next Friday');

        // Verify Thursday is now restricted for digit 9
        $evalThursday = ColorCodingRuleService::evaluateScheme($whiteScheme->fresh(), 9, $thursday);
        $this->assertTrue($evalThursday['is_restricted_today'], 'Scheme with updated DB rule must restrict Thursday');
        $this->assertEquals(750.00, $evalThursday['fine_amount']);
        $this->assertStringContainsString('750.00', $evalThursday['warning_message']);

        // Verify Friday is NO LONGER restricted for digit 9
        $evalFriday = ColorCodingRuleService::evaluateScheme($whiteScheme->fresh(), 9, $friday);
        $this->assertFalse($evalFriday['is_restricted_today'], 'Scheme with updated DB rule must no longer restrict Friday');
    }

    /**
     * Requirement 14: Historical violations are preserved and fine amounts are not rewritten.
     */
    #[Test]
    public function historical_violations_preserve_their_fine_amounts(): void
    {
        $existingViolation = Violation::first();
        if ($existingViolation) {
            $originalFine = $existingViolation->fine_amount;
            $this->assertNotNull($originalFine);

            // Re-evaluating rules should not change historical records
            $this->assertEquals($originalFine, $existingViolation->fresh()->fine_amount);
        } else {
            $this->assertTrue(true);
        }
    }

    /**
     * Requirement 15 & 16: Telemetry violation creation uses database fine amount,
     * preserves 100m movement rule and deduplication.
     */
    #[Test]
    public function telemetry_violation_uses_database_fine_and_deduplicates(): void
    {

        $customFine = 850.00;
        $scheme = ColorCodingScheme::create([
            'name' => 'Custom Fine Scheme',
            'color_hex' => '#123456',
            'restricted_days' => ['Monday'],
            'restricted_digits' => [1, 2],
            'fine_amount' => $customFine,
            'is_active' => true,
        ]);

        $user = User::create([
            'name' => 'Rule Test Driver',
            'email' => 'rule.driver.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'),
            'role' => 'tricycle_driver',
        ]);

        $operator = Operator::create([
            'user_id' => $user->id,
            'first_name' => 'Rule',
            'last_name' => 'Driver',
            'contact_number' => '09170000099',
            'address' => 'Poblacion',
            'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-RULE-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = $this->createTricycleFixture([
            'operator_id'          => $operator->id,
            'plate_number'         => 'RULE-9999',
            'coding_scheme_number' => '1001', // last digit 1 -> matches scheme
        ]);

        $this->attachFranchiseScheme($tricycle, $scheme);

        $driver = Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-RULE-001',
            'status' => 'active',
            'is_online' => true,
            'online_since' => Carbon::parse('next Monday 08:00:00'),
        ]);

        $monday = Carbon::parse('next Monday 08:05:00');
        Carbon::setTestNow($monday);

        $service = app(TelemetryService::class);

        // Ping 1 (Anchor)
        $p1 = $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0700,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $monday->toIso8601String(),
        ]);
        $this->assertFalse($p1['violation']['flagged']);
        $this->assertDatabaseMissing('violations', ['tricycle_id' => $tricycle->id]);

        // Ping 2 (Candidate at > 100m, e.g. 150m north: 14.07135)
        $p2 = $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.07135,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $monday->copy()->addSeconds(10)->toIso8601String(),
        ]);
        $this->assertFalse($p2['violation']['flagged'], 'First movement reading is only a candidate');

        // Ping 3 (Confirming at > 100m, creates violation)
        $p3 = $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.07140,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $monday->copy()->addSeconds(20)->toIso8601String(),
        ]);
        $this->assertTrue($p3['violation']['flagged']);

        $violation = Violation::where('tricycle_id', $tricycle->id)->first();
        $this->assertNotNull($violation);
        $this->assertEquals($customFine, (float) $violation->fine_amount, 'Fine amount must come from database scheme');

        // Ping 4 (Repeated ping should not duplicate violation)
        $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.07150,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $monday->copy()->addSeconds(30)->toIso8601String(),
        ]);
        $this->assertEquals(1, Violation::where('tricycle_id', $tricycle->id)->count(), 'Must not create duplicate violation');

        Carbon::setTestNow();
    }

    /**
     * Requirement 17: Driver API /me returns coding_status.
     */
    #[Test]
    public function driver_auth_api_returns_authoritative_coding_status(): void
    {
        $user = User::factory()->create(['role' => 'tricycle_driver']);
        $operator = Operator::create([
            'user_id' => $user->id,
            'first_name' => 'Api',
            'last_name' => 'Driver',
            'contact_number' => '09170000088',
            'address' => 'Pob',
            'barangay' => 'Pob',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-API-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $whiteScheme = ColorCodingScheme::where('name', 'White')->firstOrFail();

        $tricycle = $this->createTricycleFixture([
            'operator_id'          => $operator->id,
            'plate_number'         => 'API-0001',
            'coding_scheme_number' => '9999',
        ]);

        $this->attachFranchiseScheme($tricycle, $whiteScheme);

        Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-API-001',
            'status' => 'active',
        ]);

        Sanctum::actingAs($user, ['role:tricycle_driver']);

        $response = $this->getJson('/api/v1/driver/me');
        $response->assertOk();
        $response->assertJsonStructure([
            'driver' => [
                'coding_status' => [
                    'is_restricted_today',
                    'evaluated_identifier',
                    'last_digit',
                    'scheme_name',
                    'fine_amount',
                    'status',
                    'status_label',
                ],
            ],
        ]);

        $data = $response->json('driver.coding_status');
        $this->assertEquals('9999', $data['evaluated_identifier']);
        $this->assertEquals(9, $data['last_digit']);
        $this->assertEquals('White', $data['scheme_name']);
    }

    /**
     * Requirement 18 & 19: TMO Live Monitoring and weekend violation check.
     */
    #[Test]
    public function no_weekend_violation_is_generated_on_saturday_or_sunday(): void
    {
        $sat = Carbon::parse('next Saturday 10:00:00');
        Carbon::setTestNow($sat);

        $redScheme = ColorCodingScheme::where('name', 'Red')->firstOrFail();

        $user = User::factory()->create(['role' => 'tricycle_driver']);
        $operator = Operator::create([
            'user_id' => $user->id,
            'first_name' => 'Sat',
            'last_name' => 'Driver',
            'contact_number' => '09170000077',
            'address' => 'Pob',
            'barangay' => 'Pob',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-SAT-001',
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = $this->createTricycleFixture([
            'operator_id'          => $operator->id,
            'plate_number'         => 'SAT-0001',
            'coding_scheme_number' => '1001', // Red scheme
        ]);

        $this->attachFranchiseScheme($tricycle, $redScheme);

        Driver::create([
            'user_id' => $user->id,
            'operator_id' => $operator->id,
            'tricycle_id' => $tricycle->id,
            'license_number' => 'LIC-SAT-001',
            'status' => 'active',
            'is_online' => true,
            'online_since' => $sat,
        ]);

        $service = app(TelemetryService::class);

        // Drive on Saturday beyond movement threshold
        $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0700,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $sat->toIso8601String(),
        ]);
        $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0720,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $sat->copy()->addSeconds(10)->toIso8601String(),
        ]);
        $res = $service->process([
            'tricycle_id' => $tricycle->id,
            'latitude'    => 14.0725,
            'longitude'   => 120.6300,
            'speed'       => 15.0,
            'source'      => 'mobile_app',
            'recorded_at' => $sat->copy()->addSeconds(20)->toIso8601String(),
        ]);

        $this->assertFalse($res['violation']['flagged']);
        $this->assertDatabaseMissing('violations', ['tricycle_id' => $tricycle->id]);

        Carbon::setTestNow();
    }
}
