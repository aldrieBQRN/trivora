<?php

namespace Tests\Feature;

use App\Models\Tricycle;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

class PublicRegistrationValidationUpdatesTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedColorScheme();
    }

    #[Test]
    public function mobile_number_must_be_valid_philippine_format_and_rejects_letters_and_symbols(): void
    {
        // Letters in mobile number
        $payloadWithLetters = $this->registrationPayload([
            'contact' => '0917ABC4567',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadWithLetters);
        $response->assertSessionHasErrors(['contact']);

        // Symbols in mobile number
        $payloadWithSymbols = $this->registrationPayload([
            'contact' => '0917-123-456',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadWithSymbols);
        $response->assertSessionHasErrors(['contact']);

        // Non-09 prefix
        $payloadWrongPrefix = $this->registrationPayload([
            'contact' => '08123456789',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadWrongPrefix);
        $response->assertSessionHasErrors(['contact']);

        // Invalid length
        $payloadShort = $this->registrationPayload([
            'contact' => '091234567',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadShort);
        $response->assertSessionHasErrors(['contact']);

        // Valid 11-digit 09 format
        $payloadValid = $this->registrationPayload([
            'contact' => '09171234567',
            'email' => 'validmobile@example.com',
            'plate_number' => 'VAL-MOB-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadValid);
        $response->assertSessionDoesntHaveErrors(['contact']);
    }

    #[Test]
    public function email_address_must_be_valid_format(): void
    {
        $payloadInvalidEmail = $this->registrationPayload([
            'email' => 'not-an-email-address',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadInvalidEmail);
        $response->assertSessionHasErrors(['email']);

        $payloadValidEmail = $this->registrationPayload([
            'email' => 'john.doe@example.com',
            'plate_number' => 'EML-VAL-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadValidEmail);
        $response->assertSessionDoesntHaveErrors(['email']);
    }

    #[Test]
    public function password_confirmation_is_required_and_must_match(): void
    {
        // Mismatched confirmation
        $payloadMismatched = $this->registrationPayload([
            'password' => 'SecurePass123!',
            'password_confirmation' => 'DifferentPass456!',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadMismatched);
        $response->assertSessionHasErrors(['password']);

        // Missing confirmation
        $payloadMissing = $this->registrationPayload([
            'password' => 'SecurePass123!',
        ]);
        unset($payloadMissing['password_confirmation']);
        $response = $this->post(route('register.public.submit'), $payloadMissing);
        $response->assertSessionHasErrors(['password']);

        // Matching confirmation
        $payloadMatching = $this->registrationPayload([
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'email' => 'matching.pass@example.com',
            'plate_number' => 'PSS-MAT-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadMatching);
        $response->assertSessionDoesntHaveErrors(['password']);
    }

    #[Test]
    public function year_model_validates_min_2000_and_max_current_year(): void
    {
        $currentYear = (int) now()->format('Y');

        // Year before 2000 rejected
        $payloadBefore2000 = $this->registrationPayload([
            'year_model' => 1999,
        ]);
        $response = $this->post(route('register.public.submit'), $payloadBefore2000);
        $response->assertSessionHasErrors(['year_model']);

        // Future year rejected
        $payloadFuture = $this->registrationPayload([
            'year_model' => $currentYear + 1,
        ]);
        $response = $this->post(route('register.public.submit'), $payloadFuture);
        $response->assertSessionHasErrors(['year_model']);

        // Year 2000 accepted
        $payload2000 = $this->registrationPayload([
            'year_model' => 2000,
            'email' => 'year2000@example.com',
            'plate_number' => 'YR-2000-01',
        ]);
        $response = $this->post(route('register.public.submit'), $payload2000);
        $response->assertSessionDoesntHaveErrors(['year_model']);

        // Current year accepted
        $payloadCurrent = $this->registrationPayload([
            'year_model' => $currentYear,
            'email' => 'yearcurrent@example.com',
            'plate_number' => 'YR-CURR-01',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadCurrent);
        $response->assertSessionDoesntHaveErrors(['year_model']);
    }

    #[Test]
    public function body_color_accepts_predefined_or_other_with_custom_color(): void
    {
        // Predefined color accepted
        $payloadPredefined = $this->registrationPayload([
            'body_color' => 'Blue',
            'email' => 'color.predefined@example.com',
            'plate_number' => 'CLR-PRE-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadPredefined);
        $response->assertSessionDoesntHaveErrors(['body_color']);

        // Other with valid custom color accepted and stored
        $payloadOtherValid = $this->registrationPayload([
            'body_color' => 'Other',
            'body_color_other' => 'Metallic Lavender',
            'email' => 'color.other@example.com',
            'plate_number' => 'CLR-OTH-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadOtherValid);
        $response->assertSessionDoesntHaveErrors(['body_color', 'body_color_other']);

        $tricycle = Tricycle::where('plate_number', 'CLR-OTH-001')->firstOrFail();
        $this->assertEquals('Metallic Lavender', $tricycle->body_color);

        // Other without custom value rejected
        $payloadOtherEmpty = $this->registrationPayload([
            'body_color' => 'Other',
            'body_color_other' => '',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadOtherEmpty);
        $response->assertSessionHasErrors(['body_color_other']);

        // Arbitrary unapproved color without Other rejected
        $payloadArbitrary = $this->registrationPayload([
            'body_color' => 'Neon Turquoise',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadArbitrary);
        $response->assertSessionHasErrors(['body_color']);
    }

    #[Test]
    public function body_type_accepts_predefined_or_other_and_rejects_automobile_body_types(): void
    {
        // Predefined tricycle type accepted
        $payloadPredefined = $this->registrationPayload([
            'body_type' => 'Standard Side Car',
            'email' => 'type.predefined@example.com',
            'plate_number' => 'TYP-PRE-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadPredefined);
        $response->assertSessionDoesntHaveErrors(['body_type']);

        // Other with valid custom type accepted and stored
        $payloadOtherValid = $this->registrationPayload([
            'body_type' => 'Other',
            'body_type_other' => 'Heavy Duty Delivery Sidecar',
            'email' => 'type.other@example.com',
            'plate_number' => 'TYP-OTH-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadOtherValid);
        $response->assertSessionDoesntHaveErrors(['body_type', 'body_type_other']);

        $tricycle = Tricycle::where('plate_number', 'TYP-OTH-001')->firstOrFail();
        $this->assertEquals('Heavy Duty Delivery Sidecar', $tricycle->body_type);

        // Other without custom value rejected
        $payloadOtherEmpty = $this->registrationPayload([
            'body_type' => 'Other',
            'body_type_other' => '',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadOtherEmpty);
        $response->assertSessionHasErrors(['body_type_other']);

        // Generic car body types rejected
        $payloadSedan = $this->registrationPayload([
            'body_type' => 'Sedan',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadSedan);
        $response->assertSessionHasErrors(['body_type']);

        $payloadSuv = $this->registrationPayload([
            'body_type' => 'SUV',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadSuv);
        $response->assertSessionHasErrors(['body_type']);
    }

    #[Test]
    public function separate_driver_mobile_number_must_be_valid_philippine_format(): void
    {
        // Invalid driver mobile
        $payloadInvalidDriver = $this->registrationPayload([
            'owner_is_driver' => '0',
            'driver_first_name' => 'Pedro',
            'driver_last_name' => 'Penduko',
            'driver_birthday' => '1995-05-15',
            'driver_contact' => '123456789',
            'driver_barangay' => 'Pantalan',
            'email' => 'driver.invalid@example.com',
            'plate_number' => 'DRV-INV-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadInvalidDriver);
        $response->assertSessionHasErrors(['driver_contact']);

        // Valid driver mobile
        $payloadValidDriver = $this->registrationPayload([
            'owner_is_driver' => '0',
            'driver_first_name' => 'Pedro',
            'driver_last_name' => 'Penduko',
            'driver_birthday' => '1995-05-15',
            'driver_contact' => '09181234567',
            'driver_barangay' => 'Pantalan',
            'email' => 'driver.valid@example.com',
            'plate_number' => 'DRV-VAL-001',
        ]);
        $response = $this->post(route('register.public.submit'), $payloadValidDriver);
        $response->assertSessionDoesntHaveErrors(['driver_contact']);
    }

    #[Test]
    public function mtop_new_unit_registration_validates_year_color_and_body_type(): void
    {
        [, $user] = $this->registerNewApplication(['plate_number' => 'MTOP-TST-0001']);
        $currentYear = (int) now()->format('Y');

        $baseDocuments = [
            'police_clearance'   => [$this->fakeDocument('police.pdf')],
            'health_certificate' => [$this->fakeDocument('health.pdf')],
            'orcr_photocopy'     => [$this->fakeDocument('orcr.pdf')],
            'drivers_license'    => [$this->fakeDocument('license.pdf')],
            'barangay_clearance' => [$this->fakeDocument('brgy.pdf')],
            'toda_clearance'     => [$this->fakeDocument('toda.pdf')],
            'cedula'             => [$this->fakeDocument('cedula.pdf')],
            'driver_id'          => [$this->fakeDocument('driverid.pdf')],
            'tariff_list'        => [$this->fakeDocument('tariff.pdf')],
        ];

        // 1. Year Model < 2000 rejected in MTOP
        $res = $this->actingAs($user)->post(route('operator.mtop.store'), [
            'application_type' => 'new',
            'plate_number' => 'MTOP-YR-0001',
            'make_model' => 'Kawasaki Barako',
            'year_model' => 1999,
            'body_color' => 'Red',
            'body_type' => 'Standard Side Car',
            'engine_number' => 'ENG-YR-001',
            'chassis_number' => 'CHS-YR-001',
            'or_number' => 'OR-YR-001',
            'cr_number' => 'CR-YR-001',
            'documents' => $baseDocuments,
        ]);
        $res->assertSessionHasErrors(['year_model']);

        // 2. Future Year Model rejected in MTOP
        $res = $this->actingAs($user)->post(route('operator.mtop.store'), [
            'application_type' => 'new',
            'plate_number' => 'MTOP-YR-0002',
            'make_model' => 'Kawasaki Barako',
            'year_model' => $currentYear + 1,
            'body_color' => 'Red',
            'body_type' => 'Standard Side Car',
            'engine_number' => 'ENG-YR-002',
            'chassis_number' => 'CHS-YR-002',
            'or_number' => 'OR-YR-002',
            'cr_number' => 'CR-YR-002',
            'documents' => $baseDocuments,
        ]);
        $res->assertSessionHasErrors(['year_model']);

        // 3. Body Color Other with custom text stored in Tricycle
        $res = $this->actingAs($user)->post(route('operator.mtop.store'), [
            'application_type' => 'new',
            'plate_number' => 'MTOP-CLR-0003',
            'make_model' => 'Kawasaki Barako',
            'year_model' => $currentYear,
            'body_color' => 'Other',
            'body_color_other' => 'Emerald Green Pearlescent',
            'body_type' => 'Other',
            'body_type_other' => 'Cargo Carrier Sidecar',
            'engine_number' => 'ENG-CLR-003',
            'chassis_number' => 'CHS-CLR-003',
            'or_number' => 'OR-CLR-003',
            'cr_number' => 'CR-CLR-003',
            'documents' => $baseDocuments,
        ]);
        $res->assertSessionDoesntHaveErrors(['body_color', 'body_color_other', 'body_type', 'body_type_other', 'year_model']);

        $tricycle = Tricycle::where('plate_number', 'MTOP-CLR-0003')->firstOrFail();
        $this->assertEquals('Emerald Green Pearlescent', $tricycle->body_color);
        $this->assertEquals('Cargo Carrier Sidecar', $tricycle->body_type);

        // 4. Automobile type rejected in MTOP
        $res = $this->actingAs($user)->post(route('operator.mtop.store'), [
            'application_type' => 'new',
            'plate_number' => 'MTOP-AUT-0004',
            'make_model' => 'Kawasaki Barako',
            'year_model' => 2022,
            'body_color' => 'Black',
            'body_type' => 'Hatchback',
            'engine_number' => 'ENG-AUT-004',
            'chassis_number' => 'CHS-AUT-004',
            'or_number' => 'OR-AUT-004',
            'cr_number' => 'CR-AUT-004',
            'documents' => $baseDocuments,
        ]);
        $res->assertSessionHasErrors(['body_type']);
    }
}
