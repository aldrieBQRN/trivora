<?php

namespace Tests\Feature;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DriverApiTest extends TestCase
{
    use DatabaseTransactions;

    protected TodaZone $todaA;
    protected TodaZone $todaB;
    protected Operator $operatorA;
    protected Operator $operatorB;
    protected Tricycle $tricycleA;
    protected Tricycle $tricycleB;
    protected FranchiseScheme $franchiseA;
    protected FranchiseScheme $franchiseB;
    protected ColorCodingScheme $colorScheme;
    protected User $issuer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->todaA = TodaZone::firstOrCreate(
            ['code' => 'TEST-TODA-01'],
            ['name' => 'Test Toda Zone A', 'barangay' => 'Poblacion']
        );

        $this->todaB = TodaZone::firstOrCreate(
            ['code' => 'TEST-TODA-02'],
            ['name' => 'Test Toda Zone B', 'barangay' => 'Bucana']
        );

        $this->colorScheme = ColorCodingScheme::firstOrCreate(
            ['name' => 'Test Red'],
            ['color_hex' => '#FF0000', 'restricted_days' => ['Monday']]
        );

        $this->issuer = User::firstOrCreate(
            ['email' => 'test.bplo.issuer@trivora.test'],
            ['name' => 'Test BPLO Issuer', 'password' => bcrypt('irrelevant'), 'role' => 'bplo_staff', 'is_active' => true]
        );

        // Operator A — the primary eligible operator, with a real, active franchise scheme.
        $this->operatorA = Operator::firstOrCreate(
            ['license_number' => 'N01-TEST-123456'],
            [
                'toda_id'             => $this->todaA->id,
                'first_name'          => 'Juan',
                'last_name'           => 'Dela Cruz',
                'contact_number'      => '09171234567',
                'address'             => 'Block 1 Lot 2',
                'barangay'            => 'Poblacion',
                'date_of_birth'       => '1990-01-01',
                'license_expiry_date' => '2028-01-01',
            ]
        );

        $this->tricycleA = Tricycle::firstOrCreate(
            ['plate_number' => 'TST-1234'],
            [
                'operator_id'    => $this->operatorA->id,
                'toda_zone_id'   => $this->todaA->id,
                'engine_number'  => 'ENG-TEST-12345',
                'chassis_number' => 'CHS-TEST-12345',
                'make'           => 'Kawasaki',
                'model'          => 'Barako 175',
                'year_model'     => 2020,
                'body_color'     => 'Red',
                'body_type'      => 'Standard',
                'or_number'      => 'OR-TEST-12345',
                'cr_number'      => 'CR-TEST-12345',
                'status'         => 'active',
            ]
        );

        $this->franchiseA = FranchiseScheme::firstOrCreate(
            ['franchise_number' => 'FS-TEST-AAAA'],
            [
                'tricycle_id'            => $this->tricycleA->id,
                'color_coding_scheme_id' => $this->colorScheme->id,
                'issued_by'              => $this->issuer->id,
                'issue_date'             => now()->subYear(),
                'expiry_date'            => now()->addYear(),
                'is_active'              => true,
            ]
        );

        // Operator B — a second, independently eligible operator with their OWN tricycle,
        // franchise, and TODA zone, used to prove one operator's registration never touches
        // another's franchise/fleet data.
        $this->operatorB = Operator::firstOrCreate(
            ['license_number' => 'N01-TEST-654321'],
            [
                'toda_id'             => $this->todaB->id,
                'first_name'          => 'Mario',
                'last_name'           => 'Santos',
                'contact_number'      => '09179876543',
                'address'             => 'Block 3 Lot 4',
                'barangay'            => 'Bucana',
                'date_of_birth'       => '1985-05-05',
                'license_expiry_date' => '2028-01-01',
            ]
        );

        $this->tricycleB = Tricycle::firstOrCreate(
            ['plate_number' => 'TST-5678'],
            [
                'operator_id'    => $this->operatorB->id,
                'toda_zone_id'   => $this->todaB->id,
                'engine_number'  => 'ENG-TEST-54321',
                'chassis_number' => 'CHS-TEST-54321',
                'make'           => 'Suzuki',
                'model'          => 'Skydrive',
                'year_model'     => 2021,
                'body_color'     => 'Blue',
                'body_type'      => 'Standard',
                'or_number'      => 'OR-TEST-54321',
                'cr_number'      => 'CR-TEST-54321',
                'status'         => 'active',
            ]
        );

        $this->franchiseB = FranchiseScheme::firstOrCreate(
            ['franchise_number' => 'FS-TEST-BBBB'],
            [
                'tricycle_id'            => $this->tricycleB->id,
                'color_coding_scheme_id' => $this->colorScheme->id,
                'issued_by'              => $this->issuer->id,
                'issue_date'             => now()->subYear(),
                'expiry_date'            => now()->addYear(),
                'is_active'              => true,
            ]
        );
    }

    /** Creates an unclaimed operator + tricycle + franchise scheme with the given validity flags, for the ineligible-franchise tests. */
    private function makeOperatorWithFranchise(
        string $licenseNumber,
        string $plateNumber,
        string $franchiseNumber,
        bool $isActive,
        string $expiryDate
    ): FranchiseScheme {
        $operator = Operator::create([
            'toda_id'             => $this->todaA->id,
            'first_name'          => 'Test',
            'last_name'           => 'Operator',
            'contact_number'      => '09170000000',
            'address'             => 'Test Address',
            'barangay'            => 'Poblacion',
            'date_of_birth'       => '1992-02-02',
            'license_number'      => $licenseNumber,
            'license_expiry_date' => '2028-01-01',
        ]);

        $tricycle = Tricycle::create([
            'operator_id'    => $operator->id,
            'toda_zone_id'   => $this->todaA->id,
            'plate_number'   => $plateNumber,
            'engine_number'  => 'ENG-' . $plateNumber,
            'chassis_number' => 'CHS-' . $plateNumber,
            'make'           => 'Honda',
            'model'          => 'TMX 125',
            'year_model'     => 2020,
            'body_color'     => 'Black',
            'status'         => 'active',
        ]);

        return FranchiseScheme::create([
            'tricycle_id'            => $tricycle->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'issued_by'              => $this->issuer->id,
            'franchise_number'       => $franchiseNumber,
            'issue_date'             => now()->subYears(2),
            'expiry_date'            => $expiryDate,
            'is_active'              => $isActive,
        ]);
    }

    /** Obtains a real verification token via the actual verify-eligibility endpoint, using the operator's correct DOB. */
    private function getVerificationToken(FranchiseScheme $franchise, string $correctDob): ?string
    {
        $verifyRes = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $franchise->franchise_number,
            'date_of_birth'    => $correctDob,
        ]);

        return $verifyRes->json('verification_token');
    }

    /**
     * Registers via the real two-step flow (verify-eligibility -> register) and returns the
     * register() response. $correctDob is always used to obtain the token (mirroring a client
     * who genuinely passed eligibility); $dobOverride, when given, is what's actually submitted
     * to register() instead — letting a test exercise register()'s OWN independent DOB check
     * with a token that was validly issued.
     */
    private function registerFranchise(
        FranchiseScheme $franchise,
        string $email,
        string $correctDob,
        ?string $dobOverride = null,
        ?string $tokenOverride = null,
        string $trackingMode = 'mobile_app',
        ?string $iotDeviceId = null,
        array $extra = []
    ) {
        $token = $tokenOverride ?? $this->getVerificationToken($franchise, $correctDob);

        $payload = array_merge([
            'franchise_number'    => $franchise->franchise_number,
            'date_of_birth'       => $dobOverride ?? $correctDob,
            'verification_token'  => $token,
            'email'               => $email,
            'password'            => 'DriverPass123!',
            'tracking_mode'       => $trackingMode,
        ], $extra);

        if ($iotDeviceId !== null) {
            $payload['iot_device_id'] = $iotDeviceId;
        }

        return $this->postJson('/api/v1/driver/register', $payload);
    }

    #[Test]
    public function unverified_franchise_number_is_rejected()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-INVALID-999',
        ]);

        $response->assertStatus(404)
            ->assertJsonFragment(['success' => false, 'code' => 'INVALID_FRANCHISE_PERMIT']);
    }

    #[Test]
    public function valid_franchise_number_and_correct_dob_passes_eligibility_verification()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
            'date_of_birth'    => '1990-01-01',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['success' => true, 'eligible' => true])
            ->assertJsonFragment(['franchise_number' => 'FS-TEST-AAAA']);
    }

    #[Test]
    public function verified_franchise_returns_the_correct_tricycle_plate_and_toda()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-BBBB',
            'date_of_birth'    => '1985-05-05',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['plate_number' => 'TST-5678'])
            ->assertJsonFragment(['toda_zone' => 'Test Toda Zone B']);
    }

    #[Test]
    public function correct_franchise_with_wrong_dob_fails_verification()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
            'date_of_birth'    => '1970-01-01',
        ]);

        $response->assertStatus(422)->assertJsonFragment(['code' => 'DOB_MISMATCH']);
    }

    #[Test]
    public function inactive_or_expired_franchise_fails_verification()
    {
        $inactive = $this->makeOperatorWithFranchise(
            'N01-TEST-INACTIVE',
            'TST-INACT',
            'FS-TEST-INACTIVE',
            isActive: false,
            expiryDate: now()->addYear()->toDateString()
        );
        $expired = $this->makeOperatorWithFranchise(
            'N01-TEST-EXPIRED',
            'TST-EXPRD',
            'FS-TEST-EXPIRED',
            isActive: true,
            expiryDate: now()->subMonth()->toDateString()
        );

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-INACTIVE',
            'date_of_birth'    => '1992-02-02',
        ])->assertStatus(403)->assertJsonFragment(['code' => 'FRANCHISE_NOT_APPROVED']);

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-EXPIRED',
            'date_of_birth'    => '1992-02-02',
        ])->assertStatus(403)->assertJsonFragment(['code' => 'FRANCHISE_EXPIRED']);
    }

    #[Test]
    public function driver_can_register_and_login_with_sanctum_token()
    {
        $regRes = $this->registerFranchise($this->franchiseA, 'test.driver@trivora.ph', '1990-01-01');

        $regRes->assertStatus(201)
            ->assertJsonStructure(['token', 'user', 'operator', 'tricycle', 'franchise_number'])
            ->assertJsonFragment(['plate_number' => 'TST-1234']);

        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => 'N01-TEST-123456',
            'password' => 'DriverPass123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user', 'tricycle']);

        $bearerToken = $loginRes->json('token');

        // Confirms the issued Sanctum token actually authenticates a protected endpoint, and that
        // a cold-start session restore (/driver/me) still resolves the same tricycle as login().
        $meRes = $this->withHeader('Authorization', "Bearer {$bearerToken}")
            ->getJson('/api/v1/driver/me');

        $meRes->assertStatus(200)
            ->assertJsonFragment(['success' => true, 'plate_number' => 'TST-1234']);
    }

    #[Test]
    public function registration_succeeds_and_creates_all_records_with_the_operators_real_tricycle()
    {
        $res = $this->registerFranchise($this->franchiseA, 'new.driver.a@trivora.test', '1990-01-01');

        $res->assertStatus(201);

        $driverId = $res->json('driver.id');
        $driver = Driver::find($driverId);

        $this->assertNotNull($driver);
        $this->assertSame($this->tricycleA->id, $driver->tricycle_id);
        $this->assertSame($this->operatorA->id, $driver->operator_id);
        $this->assertSame('TST-1234', $res->json('tricycle.plate_number'));
        $this->assertSame('FS-TEST-AAAA', $res->json('franchise_number'));

        $user = User::find($driver->user_id);
        $this->assertNotNull($user);
        $this->assertSame('new.driver.a@trivora.test', $user->email);
        $this->assertSame('tricycle_driver', $user->role);

        $this->operatorA->refresh();
        $this->assertSame($user->id, $this->operatorA->user_id);
    }

    #[Test]
    public function registration_rejects_incorrect_date_of_birth()
    {
        // A validly-issued token (correct DOB used to obtain it), but the actual register() call
        // submits a wrong DOB — proves register() independently re-checks DOB itself rather than
        // trusting that the client already passed this at the eligibility step.
        $res = $this->registerFranchise($this->franchiseA, 'wrong.dob@trivora.test', '1990-01-01', dobOverride: '1980-01-01');

        $res->assertStatus(422)->assertJsonFragment(['code' => 'DOB_MISMATCH']);

        $this->assertDatabaseMissing('users', ['email' => 'wrong.dob@trivora.test']);
        $this->operatorA->refresh();
        $this->assertNull($this->operatorA->user_id);
    }

    #[Test]
    public function registration_rejects_unknown_franchise_number()
    {
        $res = $this->postJson('/api/v1/driver/register', [
            'franchise_number'    => 'FS-DOES-NOT-EXIST',
            'date_of_birth'       => '1990-01-01',
            'verification_token'  => 'anything',
            'email'               => 'unknown.franchise@trivora.test',
            'password'            => 'DriverPass123!',
            'tracking_mode'       => 'mobile_app',
        ]);

        $res->assertStatus(404)->assertJsonFragment(['code' => 'INVALID_FRANCHISE_PERMIT']);
        $this->assertDatabaseMissing('users', ['email' => 'unknown.franchise@trivora.test']);
    }

    #[Test]
    public function registration_rejects_already_claimed_operator()
    {
        // The token is a deterministic signature over operator+franchise number+app key (not a
        // one-time nonce), so the same one obtained here legitimately remains valid for both
        // attempts.
        $token = $this->getVerificationToken($this->franchiseA, '1990-01-01');

        $this->registerFranchise($this->franchiseA, 'first.claim@trivora.test', '1990-01-01', tokenOverride: $token)
            ->assertStatus(201);

        $res = $this->registerFranchise($this->franchiseA, 'second.claim@trivora.test', '1990-01-01', tokenOverride: $token);

        $res->assertStatus(409)->assertJsonFragment(['code' => 'ACCOUNT_ALREADY_EXISTS']);
        $this->assertDatabaseMissing('users', ['email' => 'second.claim@trivora.test']);
    }

    #[Test]
    public function registration_requires_a_valid_verification_token()
    {
        $res = $this->registerFranchise($this->franchiseA, 'bad.token@trivora.test', '1990-01-01', tokenOverride: 'not-a-real-token');

        $res->assertStatus(422)->assertJsonFragment(['code' => 'INVALID_VERIFICATION_TOKEN']);
        $this->assertDatabaseMissing('users', ['email' => 'bad.token@trivora.test']);
    }

    #[Test]
    public function two_operators_registering_sequentially_each_receive_their_own_tricycle_and_neither_is_reassigned()
    {
        $resA = $this->registerFranchise($this->franchiseA, 'driver.a@trivora.test', '1990-01-01');
        $resA->assertStatus(201);

        $resB = $this->registerFranchise($this->franchiseB, 'driver.b@trivora.test', '1985-05-05');
        $resB->assertStatus(201);

        $driverA = Driver::find($resA->json('driver.id'));
        $driverB = Driver::find($resB->json('driver.id'));

        $this->assertSame($this->tricycleA->id, $driverA->tricycle_id);
        $this->assertSame($this->tricycleB->id, $driverB->tricycle_id);
        $this->assertNotSame($driverA->tricycle_id, $driverB->tricycle_id);

        $this->tricycleA->refresh();
        $this->tricycleB->refresh();
        $this->assertSame($this->operatorA->id, $this->tricycleA->operator_id);
        $this->assertSame($this->operatorB->id, $this->tricycleB->operator_id);
    }

    #[Test]
    public function registration_cannot_attach_another_operators_tricycle_via_client_supplied_plate_number()
    {
        // Operator B registers while supplying Operator A's plate number in the payload — the
        // field is no longer even part of the accepted/consulted input, so it must have zero
        // effect on which tricycle gets attached.
        $res = $this->registerFranchise(
            $this->franchiseB,
            'hijack.attempt@trivora.test',
            '1985-05-05',
            extra: ['plate_number' => $this->tricycleA->plate_number]
        );

        $res->assertStatus(201);
        $this->assertSame($this->tricycleB->id, $res->json('tricycle.id'));
        $this->assertSame('TST-5678', $res->json('tricycle.plate_number'));

        $this->tricycleA->refresh();
        $this->assertSame($this->operatorA->id, $this->tricycleA->operator_id);
    }

    #[Test]
    public function gps_method_mobile_hides_device_id_and_registers_successfully_without_one()
    {
        $res = $this->registerFranchise($this->franchiseA, 'mobile.gps@trivora.test', '1990-01-01', trackingMode: 'mobile_app');

        $res->assertStatus(201)
            ->assertJsonFragment(['active_tracking_mode' => 'mobile_app'])
            ->assertJsonFragment(['iot_device_id' => null]);

        $this->tricycleA->refresh();
        $this->assertSame('mobile_app', $this->tricycleA->active_tracking_mode);
        $this->assertSame('mobile_only', $this->tricycleA->tracking_capability);
        $this->assertNull($this->tricycleA->iot_device_id);
    }

    #[Test]
    public function gps_method_iot_hardware_requires_a_device_id()
    {
        $res = $this->registerFranchise($this->franchiseA, 'iot.missing@trivora.test', '1990-01-01', trackingMode: 'iot_device');

        $res->assertStatus(422)->assertJsonFragment(['code' => 'IOT_DEVICE_ID_REQUIRED']);
        $this->assertDatabaseMissing('users', ['email' => 'iot.missing@trivora.test']);
    }

    #[Test]
    public function valid_iot_registration_persists_the_device_id_correctly()
    {
        $res = $this->registerFranchise(
            $this->franchiseA,
            'iot.valid@trivora.test',
            '1990-01-01',
            trackingMode: 'iot_device',
            iotDeviceId: 'TRV-GPS-TEST-001'
        );

        $res->assertStatus(201)
            ->assertJsonFragment(['active_tracking_mode' => 'iot_device'])
            ->assertJsonFragment(['iot_device_id' => 'TRV-GPS-TEST-001']);

        $this->tricycleA->refresh();
        $this->assertSame('iot_device', $this->tricycleA->active_tracking_mode);
        $this->assertSame('iot_enabled', $this->tricycleA->tracking_capability);
        $this->assertSame('TRV-GPS-TEST-001', $this->tricycleA->iot_device_id);
    }

    #[Test]
    public function login_and_me_return_the_same_verified_tricycle_and_gps_configuration()
    {
        $regRes = $this->registerFranchise(
            $this->franchiseB,
            'consistency@trivora.test',
            '1985-05-05',
            trackingMode: 'iot_device',
            iotDeviceId: 'TRV-GPS-CONSISTENCY'
        );
        $regRes->assertStatus(201);
        $registeredTricycleId = $regRes->json('tricycle.id');
        $registeredPlate = $regRes->json('tricycle.plate_number');

        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => 'consistency@trivora.test',
            'password' => 'DriverPass123!',
        ]);
        $loginRes->assertStatus(200);

        $this->assertSame($registeredTricycleId, $loginRes->json('tricycle.id'));
        $this->assertSame($registeredPlate, $loginRes->json('tricycle.plate_number'));
        $this->assertSame('iot_device', $loginRes->json('tricycle.active_tracking_mode'));
        $this->assertSame('TRV-GPS-CONSISTENCY', $loginRes->json('tricycle.iot_device_id'));

        $meRes = $this->withHeader('Authorization', 'Bearer ' . $loginRes->json('token'))
            ->getJson('/api/v1/driver/me');
        $meRes->assertStatus(200);

        $this->assertSame($registeredTricycleId, $meRes->json('tricycle.id'));
        $this->assertSame($registeredPlate, $meRes->json('tricycle.plate_number'));
        $this->assertSame('iot_device', $meRes->json('tricycle.active_tracking_mode'));
        $this->assertSame('TRV-GPS-CONSISTENCY', $meRes->json('tricycle.iot_device_id'));
    }

    #[Test]
    public function registration_leaves_no_partial_records_when_rejected_at_any_validation_stage()
    {
        $this->registerFranchise($this->franchiseA, 'partial.dob@trivora.test', '1990-01-01', dobOverride: '1970-01-01');
        $this->postJson('/api/v1/driver/register', [
            'franchise_number'    => $this->franchiseA->franchise_number,
            'date_of_birth'       => '1990-01-01',
            'verification_token'  => 'forged-token',
            'email'               => 'partial.token@trivora.test',
            'password'            => 'DriverPass123!',
            'tracking_mode'       => 'mobile_app',
        ]);

        $this->assertDatabaseMissing('users', ['email' => 'partial.dob@trivora.test']);
        $this->assertDatabaseMissing('users', ['email' => 'partial.token@trivora.test']);
        $this->assertDatabaseCount('drivers', 0);

        $this->operatorA->refresh();
        $this->assertNull($this->operatorA->user_id);
    }
}
