<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDriver;
use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
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
        // Owner-is-driver (no linked application): Juan Dela Cruz IS the person who verifies.
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
        // another's franchise/fleet data. Owner-is-driver by default; the separate-driver
        // tests attach a completed application with an application_drivers person.
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

    /**
     * Attaches a completed application with owner_is_driver = 0 to franchiseB and creates
     * the separate application_drivers person (Nemesio Ramos) — the ACTUAL driver of that
     * franchise, distinct from the owner Mario Santos. $withPerson = false models the broken
     * "flagged separate but nobody on file" state.
     */
    private function makeSeparateDriverApplication(bool $withPerson = true): ?ApplicationDriver
    {
        $application = Application::create([
            'reference_number' => 'APP-2026-99001',
            'operator_id'      => $this->operatorB->id,
            'tricycle_id'      => $this->tricycleB->id,
            'owner_is_driver'  => false,
            'application_type' => 'new',
            'current_step'     => 1,
            'status'           => 'completed',
        ]);

        $person = null;
        if ($withPerson) {
            $person = ApplicationDriver::create([
                'application_id' => $application->id,
                'first_name'     => 'Nemesio',
                'last_name'      => 'Ramos',
                'date_of_birth'  => '1995-06-12',
                'contact_number' => '09175551234',
                'barangay'       => 'Bucana',
            ]);
        }

        $this->franchiseB->update(['application_id' => $application->id]);

        return $person;
    }

    /**
     * Obtains a real verification token via the actual verify-eligibility endpoint. The
     * whole verification input is the franchise permit number alone — this helper sends
     * exactly that, mirroring the app's real Step-1 payload, and reads back the `people`
     * list the app offers for selection.
     */
    private function getVerificationToken(FranchiseScheme $franchise): ?string
    {
        $verifyRes = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $franchise->franchise_number,
        ]);

        return $verifyRes->json('verification_token');
    }

    /**
     * Registers via the real two-step flow (verify-eligibility -> register) and returns the
     * register() response. $personType is which of the franchise's actual people (the owner,
     * or the separate assigned driver) the account is being created for — the app sends only
     * this role key, never a name/birthday/mobile. $tokenOverride, when given, is what's
     * actually submitted instead — letting a test exercise register()'s OWN independent
     * checks with a validly-issued token. The register payload itself never carries a name:
     * franchise permit + person_type + password is the whole flow; all personal information
     * comes from the record the selection is validated against.
     */
    private function registerFranchise(
        FranchiseScheme $franchise,
        string $personType = 'owner',
        ?string $tokenOverride = null,
        ?string $trackingMode = 'mobile_app',
        ?string $iotDeviceId = null,
        array $extra = []
    ) {
        $token = $tokenOverride ?? $this->getVerificationToken($franchise);

        $payload = array_merge([
            'franchise_number'   => $franchise->franchise_number,
            'person_type'        => $personType,
            'verification_token' => $token,
            'password'           => 'DriverPass123!',
            'tracking_mode'      => $trackingMode,
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
            ->assertJsonFragment(['success' => false, 'code' => 'INVALID_FRANCHISE_PERMIT'])
            ->assertJsonFragment(['message' => 'Franchise not found.']);
    }

    #[Test]
    public function valid_franchise_number_alone_passes_eligibility_verification()
    {
        // The franchise permit number is the ENTIRE verification input — no date of birth,
        // no name, nothing else is asked for or checked.
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['success' => true, 'eligible' => true])
            ->assertJsonFragment(['franchise_number' => 'FS-TEST-AAAA'])
            ->assertJsonPath('owner_is_driver', true);
    }

    #[Test]
    public function verification_returns_the_franchises_registered_people_read_only()
    {
        $userCountBefore = User::count();

        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
        ]);

        // Owner-is-driver: exactly ONE selectable person — the owner, labeled
        // "Tricycle Owner & Driver" since they hold both roles — with their EXISTING
        // record (name, exact birthday, mobile, barangay) coming back read-only for the
        // selection step. `date_of_birth` is the exact date-only value and `birthday` its
        // display string, both straight off the record with no timezone round-trip.
        // Verification itself never creates any person or account record.
        $response->assertStatus(200)
            ->assertJsonPath('people.0.type', 'owner')
            ->assertJsonPath('people.0.role', 'Tricycle Owner & Driver')
            ->assertJsonPath('people.0.first_name', 'Juan')
            ->assertJsonPath('people.0.last_name', 'Dela Cruz')
            ->assertJsonPath('people.0.full_name', 'Juan Dela Cruz')
            ->assertJsonPath('people.0.birthday', 'Jan 01, 1990')
            ->assertJsonPath('people.0.date_of_birth', '1990-01-01')
            ->assertJsonPath('people.0.mobile_number', '09171234567')
            ->assertJsonPath('people.0.barangay', 'Poblacion')
            ->assertJsonCount(1, 'people')
            ->assertJsonPath('owner_is_driver', true)
            ->assertJsonPath('application_reference', null);

        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);
        $this->assertDatabaseCount('application_drivers', 0);
    }

    #[Test]
    public function verified_franchise_returns_the_correct_tricycle_plate_and_toda()
    {
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-BBBB',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['plate_number' => 'TST-5678'])
            ->assertJsonFragment(['toda_zone' => 'Test Toda Zone B']);
    }

    #[Test]
    public function verification_ignores_any_submitted_date_of_birth()
    {
        // The DOB is no longer part of the flow at all — even when a stray date_of_birth
        // rides along in the payload it plays no part: the franchise permit alone decides
        // eligibility and the response still returns the registered people unharmed.
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
            'date_of_birth'    => '1970-01-01',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('eligible', true)
            ->assertJsonPath('people.0.date_of_birth', '1990-01-01');
    }

    #[Test]
    public function verification_needs_only_the_franchise_permit_number()
    {
        // Step 1 collects exactly one field — the Franchise Permit No. Omitting it fails
        // validation; supplying it and nothing else passes. No name, date of birth, or any
        // other personal detail is ever asked for.
        $this->postJson('/api/v1/driver/verify-eligibility', [])
            ->assertStatus(422)->assertJsonValidationErrors(['franchise_number']);

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-AAAA',
        ])->assertStatus(200)->assertJsonPath('eligible', true);
    }

    #[Test]
    public function registry_display_permit_number_resolves_to_the_authoritative_franchise()
    {
        // The TMO Tricycle Registry Details page prints the permit as PERMIT-2026-<unit>
        // (TricycleDetails.jsx: PERMIT-{year}-{coding_scheme_number}) — an applicant
        // copies exactly that string. It must verify against the unit's Sticker Number, and
        // the response must echo the AUTHORITATIVE franchise_number, never the typed format.
        $this->tricycleA->update(['coding_scheme_number' => '0212']);

        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'PERMIT-2026-0212',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('eligible', true)
            ->assertJsonPath('franchise_number', 'FS-TEST-AAAA')
            ->assertJsonPath('people.0.type', 'owner')
            ->assertJsonPath('people.0.role', 'Tricycle Owner & Driver');
    }

    #[Test]
    public function permit_prefix_over_the_franchise_number_itself_still_verifies()
    {
        // PERMIT-<year>-<franchise number> resolves back to the franchise number itself, so
        // the echoed value (and everything downstream — token, register) uses the stored
        // franchise_schemes.franchise_number, not the display-prefixed string.
        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'PERMIT-2026-FS-TEST-AAAA',
        ])->assertStatus(200)
            ->assertJsonPath('eligible', true)
            ->assertJsonPath('franchise_number', 'FS-TEST-AAAA');
    }

    #[Test]
    public function separate_driver_franchise_lists_both_the_owner_and_the_assigned_driver()
    {
        $this->makeSeparateDriverApplication();

        // Franchise permit number ONLY. When a separate driver is assigned, the response
        // lists BOTH registered people for selection — the Tricycle Owner first, then the
        // Tricycle Driver — each with their own existing record, read-only.
        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseB->franchise_number,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('owner_is_driver', false)
            ->assertJsonPath('application_reference', 'APP-2026-99001')
            ->assertJsonCount(2, 'people')
            ->assertJsonPath('people.0.type', 'owner')
            ->assertJsonPath('people.0.role', 'Tricycle Owner')
            ->assertJsonPath('people.0.full_name', 'Mario Santos')
            ->assertJsonPath('people.0.birthday', 'May 05, 1985')
            ->assertJsonPath('people.0.date_of_birth', '1985-05-05')
            ->assertJsonPath('people.0.mobile_number', '09179876543')
            ->assertJsonPath('people.0.barangay', 'Bucana')
            ->assertJsonPath('people.1.type', 'driver')
            ->assertJsonPath('people.1.role', 'Tricycle Driver')
            ->assertJsonPath('people.1.full_name', 'Nemesio Ramos')
            ->assertJsonPath('people.1.birthday', 'Jun 12, 1995')
            ->assertJsonPath('people.1.date_of_birth', '1995-06-12')
            ->assertJsonPath('people.1.mobile_number', '09175551234')
            ->assertJsonPath('people.1.barangay', 'Bucana');
    }

    #[Test]
    public function verification_uses_the_same_registry_application_as_the_tmo_active_tricycle_registry()
    {
        // The TMO Active Tricycle Registry details page resolves owner/driver from the
        // tricycle's LATEST application (DashboardController: applications()->latest()->first()).
        // A legacy franchise has application_id = NULL — verification must still agree with
        // the registry by reading that same latest application, not silently treat the unit
        // as owner-is-driver while the registry shows an assigned driver.
        $this->assertNull($this->franchiseA->application_id);

        $registryApp = Application::create([
            'reference_number' => 'APP-2026-99010',
            'operator_id'      => $this->operatorA->id,
            'tricycle_id'      => $this->tricycleA->id,
            'owner_is_driver'  => false,
            'application_type' => 'new',
            'current_step'     => 1,
            'status'           => 'completed',
        ]);
        ApplicationDriver::create([
            'application_id' => $registryApp->id,
            'first_name'     => 'Ramon',
            'last_name'      => 'Dela Cruz',
            'date_of_birth'  => '1992-04-15',
            'contact_number' => '09171112222',
            'barangay'       => 'Poblacion',
        ]);

        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseA->franchise_number,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('owner_is_driver', false)
            ->assertJsonPath('application_reference', 'APP-2026-99010')
            ->assertJsonCount(2, 'people')
            ->assertJsonPath('people.0.full_name', 'Juan Dela Cruz')
            ->assertJsonPath('people.1.type', 'driver')
            ->assertJsonPath('people.1.full_name', 'Ramon Dela Cruz')
            ->assertJsonPath('people.1.date_of_birth', '1992-04-15')
            ->assertJsonPath('people.1.mobile_number', '09171112222')
            ->assertJsonPath('people.1.barangay', 'Poblacion');
    }

    #[Test]
    public function a_franchise_linked_to_an_older_application_still_follows_the_registry_latest()
    {
        // The franchise row links an OLDER application (owner-is-driver), but the unit's
        // latest application — the one the TMO registry displays — assigns a separate
        // driver. Verification must follow the registry's application, so a registry update
        // is automatically reflected here instead of the stale linked application winning.
        $older = Application::create([
            'reference_number' => 'APP-2026-99011',
            'operator_id'      => $this->operatorA->id,
            'tricycle_id'      => $this->tricycleA->id,
            'owner_is_driver'  => true,
            'application_type' => 'new',
            'current_step'     => 1,
            'status'           => 'completed',
        ]);
        $this->franchiseA->update(['application_id' => $older->id]);
        Application::where('id', $older->id)->update(['created_at' => now()->subDays(2)]);

        $newest = Application::create([
            'reference_number' => 'APP-2026-99012',
            'operator_id'      => $this->operatorA->id,
            'tricycle_id'      => $this->tricycleA->id,
            'owner_is_driver'  => false,
            'application_type' => 'renewal',
            'current_step'     => 1,
            'status'           => 'completed',
        ]);
        ApplicationDriver::create([
            'application_id' => $newest->id,
            'first_name'     => 'Pedro',
            'last_name'      => 'Santos',
            'date_of_birth'  => '1988-07-20',
            'contact_number' => '09173334444',
            'barangay'       => 'Poblacion',
        ]);

        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseA->franchise_number,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('owner_is_driver', false)
            ->assertJsonPath('application_reference', 'APP-2026-99012')
            ->assertJsonCount(2, 'people')
            ->assertJsonPath('people.1.full_name', 'Pedro Santos')
            ->assertJsonPath('people.1.date_of_birth', '1988-07-20');
    }

    #[Test]
    public function separate_driver_flag_without_a_person_on_file_is_rejected_not_faked()
    {
        $this->makeSeparateDriverApplication(withPerson: false);

        // Flagged as a separate driver but nobody on file: never invent a person and never
        // silently offer only the owner in that inconsistent state — surface the gap instead.
        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseB->franchise_number,
        ])->assertStatus(422)->assertJsonFragment(['code' => 'DRIVER_NOT_ON_FILE']);
    }

    #[Test]
    public function verifying_an_already_registered_franchise_stops_at_verify_with_a_friendly_message()
    {
        // CORE RULE: one franchise = one Driver App account. The check fires on the Verify
        // Franchise CLICK — before person selection — so the existing account gets used
        // through the normal login flow and no second selection/registration screen appears.
        $this->registerFranchise($this->franchiseA)->assertStatus(201);

        $response = $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseA->franchise_number,
        ]);

        $response->assertStatus(409)
            ->assertJsonFragment(['success' => false, 'code' => 'ACCOUNT_ALREADY_EXISTS'])
            ->assertJsonFragment(['message' => 'Franchise already registered.'])
            // The people-selection payload is entirely absent — there is nothing left to
            // select, so the app cannot render the owner/driver screen from this response.
            ->assertJsonMissingPath('people');

        // Still exactly ONE account for this franchise — the check never creates anything.
        $this->assertDatabaseCount('drivers', 1);
    }

    #[Test]
    public function already_registered_is_keyed_on_the_franchise_unit_not_only_the_owner()
    {
        // Uniqueness is a property of the FRANCHISE: an account bound to this franchise's
        // own unit means it is taken even when the account row names a different operator
        // (e.g. ownership transferred after registration) — still refused at verify time.
        $this->registerFranchise($this->franchiseA)->assertStatus(201);
        Driver::where('tricycle_id', $this->tricycleA->id)
            ->update(['operator_id' => $this->operatorB->id]);

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseA->franchise_number,
        ])->assertStatus(409)
            ->assertJsonFragment(['code' => 'ACCOUNT_ALREADY_EXISTS'])
            ->assertJsonFragment(['message' => 'Franchise already registered.']);
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
        ])->assertStatus(403)
            ->assertJsonFragment(['code' => 'FRANCHISE_NOT_APPROVED'])
            ->assertJsonFragment(['message' => 'Franchise not found.']);

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => 'FS-TEST-EXPIRED',
        ])->assertStatus(403)
            ->assertJsonFragment(['code' => 'FRANCHISE_EXPIRED'])
            ->assertJsonFragment(['message' => 'Franchise not found.']);
    }

    #[Test]
    public function driver_can_register_and_login_with_sanctum_token()
    {
        $regRes = $this->registerFranchise($this->franchiseA);

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
    public function driver_can_login_with_their_franchise_number()
    {
        // An unregistered franchise has no Driver row yet, so it can never log in.
        $this->postJson('/api/v1/driver/login', [
            'login'    => 'FS-TEST-AAAA',
            'password' => 'DriverPass123!',
        ])->assertStatus(401);

        $this->registerFranchise($this->franchiseA)
            ->assertStatus(201);

        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => 'FS-TEST-AAAA',
            'password' => 'DriverPass123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user', 'tricycle'])
            ->assertJsonFragment(['plate_number' => 'TST-1234']);
    }

    #[Test]
    public function driver_can_login_with_their_mobile_number_and_email_login_is_rejected()
    {
        $this->registerFranchise($this->franchiseA)
            ->assertStatus(201);

        // The driver app's user-facing credential: the person's EXISTING mobile number.
        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => '09171234567',
            'password' => 'DriverPass123!',
        ]);
        $loginRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user', 'tricycle']);

        // Any stored equivalent form resolves to that same account.
        $this->postJson('/api/v1/driver/login', [
            'login'    => '+63 917 123 4567',
            'password' => 'DriverPass123!',
        ])->assertStatus(200);

        $this->postJson('/api/v1/driver/login', [
            'login'    => '9171234567',
            'password' => 'DriverPass123!',
        ])->assertStatus(200);

        // Email-based login was removed from the flow — an email identifier never resolves.
        $this->postJson('/api/v1/driver/login', [
            'login'    => 'driver.' . $this->franchiseA->id . '@trivora.test',
            'password' => 'DriverPass123!',
        ])->assertStatus(401);
    }

    #[Test]
    public function registration_succeeds_and_creates_all_records_with_the_operators_real_tricycle()
    {
        $res = $this->registerFranchise($this->franchiseA);

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
        // The driver never supplies an email — a deterministic per-franchise address is
        // derived server-side (users.email is NOT NULL UNIQUE).
        $this->assertSame('driver.' . $this->franchiseA->id . '@trivora.test', $user->email);
        // Name and mobile are derived from the VERIFIED PERSON, never client input.
        $this->assertSame('Juan Dela Cruz', $user->name);
        $this->assertSame('tricycle_driver', $user->role);
        $this->assertSame('09171234567', $driver->mobile_number);

        $this->operatorA->refresh();
        $this->assertSame($user->id, $this->operatorA->user_id);
    }

    #[Test]
    public function registration_ignores_client_supplied_personal_information()
    {
        $res = $this->registerFranchise($this->franchiseA, extra: [
            'name'           => 'Totally Different Name',
            'email'          => 'attacker@evil.test',
            'mobile_number'  => '09999999999',
            'contact_number' => '09999999999',
        ]);

        $res->assertStatus(201);

        $this->assertDatabaseMissing('users', ['email' => 'attacker@evil.test']);

        $user = User::find($res->json('user.id'));
        $this->assertSame('Juan Dela Cruz', $user->name);
        $this->assertSame('driver.' . $this->franchiseA->id . '@trivora.test', $user->email);

        $driver = Driver::find($res->json('driver.id'));
        $this->assertSame('09171234567', $driver->mobile_number);
    }

    #[Test]
    public function registration_rejects_mismatched_confirm_password()
    {
        $token = $this->getVerificationToken($this->franchiseA);
        $userCountBefore = User::count();

        $res = $this->registerFranchise(
            $this->franchiseA,
            tokenOverride: $token,
            extra: ['confirm_password' => 'CompletelyDifferent1!']
        );

        $res->assertStatus(422)->assertJsonValidationErrors('confirm_password');
        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);
    }

    #[Test]
    public function registration_accepts_matching_confirm_password()
    {
        $this->registerFranchise(
            $this->franchiseA,
            extra: ['confirm_password' => 'DriverPass123!']
        )->assertStatus(201);
    }

    #[Test]
    public function registration_requires_a_person_type_that_belongs_to_this_franchise()
    {
        // A validly-issued token, but no selection of WHICH franchise person the account is
        // for (or an impossible one) — register() must independently validate the choice
        // against the franchise's actual records, never let an account attach to a person
        // who isn't its owner/driver.
        $userCountBefore = User::count();
        $token = $this->getVerificationToken($this->franchiseA);

        // Missing selection entirely.
        $this->postJson('/api/v1/driver/register', [
            'franchise_number'   => $this->franchiseA->franchise_number,
            'verification_token' => $token,
            'password'           => 'DriverPass123!',
            'confirm_password'   => 'DriverPass123!',
            'tracking_mode'      => 'mobile_app',
        ])->assertStatus(422)->assertJsonValidationErrors(['person_type']);

        // A role that can never exist for any franchise.
        $this->postJson('/api/v1/driver/register', [
            'franchise_number'   => $this->franchiseA->franchise_number,
            'person_type'        => 'random_stranger',
            'verification_token' => $token,
            'password'           => 'DriverPass123!',
            'confirm_password'   => 'DriverPass123!',
            'tracking_mode'      => 'mobile_app',
        ])->assertStatus(422)->assertJsonValidationErrors(['person_type']);

        // This franchise is owner-is-driver: there IS no separate driver person to select,
        // so `driver` is not one of its available people and registration is refused.
        $this->registerFranchise($this->franchiseA, personType: 'driver')
            ->assertStatus(422)
            ->assertJsonFragment(['code' => 'DRIVER_NOT_ON_FILE']);

        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);
        $this->operatorA->refresh();
        $this->assertNull($this->operatorA->user_id);
    }

    #[Test]
    public function registration_does_not_require_a_full_name()
    {
        // Mirrors the app's real payload: franchise permit + person_type + password, with
        // NO name/email/mobile/date-of-birth anywhere — all personal information comes from
        // the record the selection is validated against.
        $token = $this->getVerificationToken($this->franchiseA);
        $userCountBefore = User::count();

        $res = $this->postJson('/api/v1/driver/register', [
            'franchise_number'   => $this->franchiseA->franchise_number,
            'person_type'        => 'owner',
            'verification_token' => $token,
            'password'           => 'DriverPass123!',
            'confirm_password'   => 'DriverPass123!',
            'tracking_mode'      => 'mobile_app',
        ]);

        $res->assertStatus(201);

        // The account's name still comes from the VERIFIED PERSON record, never input.
        $user = User::find($res->json('user.id'));
        $this->assertSame('Juan Dela Cruz', $user->name);
        $this->assertSame($userCountBefore + 1, User::count());
    }

    #[Test]
    public function registration_rejects_unknown_franchise_number()
    {
        $userCountBefore = User::count();
        $res = $this->postJson('/api/v1/driver/register', [
            'franchise_number'   => 'FS-DOES-NOT-EXIST',
            'person_type'        => 'owner',
            'verification_token' => 'anything',
            'password'           => 'DriverPass123!',
            'tracking_mode'      => 'mobile_app',
        ]);

        $res->assertStatus(404)->assertJsonFragment(['code' => 'INVALID_FRANCHISE_PERMIT']);
        $this->assertSame($userCountBefore, User::count());
    }

    #[Test]
    public function registration_rejects_already_claimed_franchise()
    {
        // The token is a deterministic signature over operator+franchise number+app key (not a
        // one-time nonce), so the same one obtained here legitimately remains valid for both
        // attempts — the second fails purely because a Driver row now claims the franchise.
        $token = $this->getVerificationToken($this->franchiseA);

        $this->registerFranchise($this->franchiseA, tokenOverride: $token)
            ->assertStatus(201);

        $userCountAfterFirst = User::count();

        $res = $this->registerFranchise($this->franchiseA, tokenOverride: $token);

        $res->assertStatus(409)
            ->assertJsonFragment(['code' => 'ACCOUNT_ALREADY_EXISTS'])
            ->assertJsonFragment(['message' => 'Franchise already registered.']);
        $this->assertSame($userCountAfterFirst, User::count());
        $this->assertDatabaseCount('drivers', 1);
    }

    #[Test]
    public function registration_requires_a_valid_verification_token()
    {
        $userCountBefore = User::count();
        $res = $this->registerFranchise($this->franchiseA, tokenOverride: 'not-a-real-token');

        $res->assertStatus(422)->assertJsonFragment(['code' => 'INVALID_VERIFICATION_TOKEN']);
        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);
    }

    #[Test]
    public function owner_with_an_existing_user_account_verifies_and_links_instead_of_conflicting()
    {
        // CORE REGRESSION: public registration always sets operators.user_id for the owner,
        // yet that owner has NO drivers row (never registered in the app). The old check
        // keyed on operators.user_id and 409'd every such owner; the claim check is now the
        // existence of a real Driver row, so verification succeeds.
        $ownerUser = User::create([
            'name'      => 'Juan Dela Cruz',
            'email'     => 'owner.web@trivora.test',
            'password'  => Hash::make('OriginalPass123!'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);
        $this->operatorA->update(['user_id' => $ownerUser->id]);

        $this->postJson('/api/v1/driver/verify-eligibility', [
            'franchise_number' => $this->franchiseA->franchise_number,
        ])->assertStatus(200)->assertJsonFragment(['eligible' => true]);

        $userCountBefore = User::count();
        $res = $this->registerFranchise($this->franchiseA);

        $res->assertStatus(201);

        // The existing user is REUSED — no duplicate account for the same person.
        $this->assertSame($userCountBefore, User::count());
        $this->assertSame($ownerUser->id, $res->json('user.id'));

        $ownerUser->refresh();
        $this->assertSame('owner.web@trivora.test', $ownerUser->email); // email untouched
        $this->assertTrue(Hash::check('DriverPass123!', $ownerUser->password)); // typed password set

        $this->operatorA->refresh();
        $this->assertSame($ownerUser->id, $this->operatorA->user_id);

        $driver = Driver::find($res->json('driver.id'));
        $this->assertSame($ownerUser->id, $driver->user_id);
    }

    #[Test]
    public function separate_driver_registration_creates_its_own_account_and_never_touches_the_owner_login()
    {
        $this->makeSeparateDriverApplication();

        // The OWNER already has their own login — registering the separate driver must not
        // hijack it, overwrite it, or duplicate the owner as a person.
        $ownerUser = User::create([
            'name'      => 'Mario Santos',
            'email'     => 'owner.b@trivora.test',
            'password'  => Hash::make('OwnerPass123!'),
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);
        $this->operatorB->update(['user_id' => $ownerUser->id]);

        $res = $this->registerFranchise($this->franchiseB, personType: 'driver');

        $res->assertStatus(201)
            ->assertJsonPath('owner_is_driver', false)
            ->assertJsonPath('personal_information.first_name', 'Nemesio');

        // A NEW account for the driver person, linked to the Driver row.
        $driverUserId = $res->json('user.id');
        $this->assertNotSame($ownerUser->id, $driverUserId);

        $driverUser = User::find($driverUserId);
        $this->assertSame('Nemesio Ramos', $driverUser->name);
        $this->assertSame('driver.' . $this->franchiseB->id . '@trivora.test', $driverUser->email);
        $this->assertSame('tricycle_driver', $driverUser->role);

        // The owner's link on operators stays exactly as it was.
        $this->operatorB->refresh();
        $this->assertSame($ownerUser->id, $this->operatorB->user_id);

        $ownerUser->refresh();
        $this->assertTrue(Hash::check('OwnerPass123!', $ownerUser->password)); // owner password untouched

        $driver = Driver::find($res->json('driver.id'));
        $this->assertSame($driverUserId, $driver->user_id);
        $this->assertSame($this->operatorB->id, $driver->operator_id);
        $this->assertSame($this->tricycleB->id, $driver->tricycle_id);
        $this->assertSame('09175551234', $driver->mobile_number); // driver person's number

        // No second personal-information record was created — one application_drivers row.
        $this->assertDatabaseCount('application_drivers', 1);

        // The separate driver logs in with their OWN mobile number (the driver app's
        // user-facing credential) and gets THEIR account, never the owner's.
        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => '09175551234',
            'password' => 'DriverPass123!',
        ]);

        $loginRes->assertStatus(200);
        $this->assertSame($driverUserId, $loginRes->json('user.id'));
    }

    #[Test]
    public function two_operators_registering_sequentially_each_receive_their_own_tricycle_and_neither_is_reassigned()
    {
        $resA = $this->registerFranchise($this->franchiseA);
        $resA->assertStatus(201);

        $resB = $this->registerFranchise($this->franchiseB);
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
        $res = $this->registerFranchise($this->franchiseA, trackingMode: 'mobile_app');

        $res->assertStatus(201)
            ->assertJsonFragment(['active_tracking_mode' => 'mobile_app'])
            ->assertJsonFragment(['iot_device_id' => null]);

        $this->tricycleA->refresh();
        $this->assertSame('mobile_app', $this->tricycleA->active_tracking_mode);
        $this->assertSame('mobile_only', $this->tricycleA->tracking_capability);
        $this->assertNull($this->tricycleA->iot_device_id);
    }

    #[Test]
    public function omitting_tracking_mode_leaves_the_tricycles_tracking_configuration_untouched()
    {
        $this->tricycleA->update([
            'active_tracking_mode' => 'iot_device',
            'tracking_capability'  => 'iot_enabled',
            'iot_device_id'        => 'TRV-KEEP-ME',
        ]);

        $res = $this->registerFranchise($this->franchiseA, trackingMode: null);

        $res->assertStatus(201);

        $this->tricycleA->refresh();
        $this->assertSame('iot_device', $this->tricycleA->active_tracking_mode);
        $this->assertSame('iot_enabled', $this->tricycleA->tracking_capability);
        $this->assertSame('TRV-KEEP-ME', $this->tricycleA->iot_device_id);
    }

    #[Test]
    public function gps_method_iot_hardware_requires_a_device_id()
    {
        $userCountBefore = User::count();
        $res = $this->registerFranchise($this->franchiseA, trackingMode: 'iot_device');

        $res->assertStatus(422)->assertJsonFragment(['code' => 'IOT_DEVICE_ID_REQUIRED']);
        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);
    }

    #[Test]
    public function valid_iot_registration_persists_the_device_id_correctly()
    {
        $res = $this->registerFranchise(
            $this->franchiseA,
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
            trackingMode: 'iot_device',
            iotDeviceId: 'TRV-GPS-CONSISTENCY'
        );
        $regRes->assertStatus(201);
        $registeredTricycleId = $regRes->json('tricycle.id');
        $registeredPlate = $regRes->json('tricycle.plate_number');

        $loginRes = $this->postJson('/api/v1/driver/login', [
            'login'    => '09179876543',
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
        $userCountBefore = User::count();

        $this->registerFranchise($this->franchiseA, personType: 'driver');
        $this->postJson('/api/v1/driver/register', [
            'franchise_number'   => $this->franchiseA->franchise_number,
            'person_type'        => 'owner',
            'verification_token' => 'forged-token',
            'password'           => 'DriverPass123!',
            'tracking_mode'      => 'mobile_app',
        ]);

        $this->assertSame($userCountBefore, User::count());
        $this->assertDatabaseCount('drivers', 0);

        $this->operatorA->refresh();
        $this->assertNull($this->operatorA->user_id);
    }
}
