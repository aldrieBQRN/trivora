<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDriver;
use App\Models\Operator;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers the Owner vs separate Tricycle Driver distinction introduced on the public
 * registration flow (RegistrationController::store(), POST /register-mtop):
 *
 *  - The tricycle OWNER is the existing `operators` record (no duplicate person/user
 *    records), with the submitted birthday persisted on operators.date_of_birth — a real
 *    date column, not formatted display text.
 *  - applications.owner_is_driver persists whether the owner is also the driver (never
 *    frontend-only state); an absent flag is treated as "owner is also the driver", which
 *    is how every pre-existing application is migrated/backfilled.
 *  - When the owner is NOT the driver, a single application_drivers row captures the
 *    separate driver person (first/last name, date of birth, mobile, Nasugbu barangay).
 *  - Barangay submissions must come from the canonical Nasugbu barangay list.
 *  - The TMO Franchise/Application Details page receives owner + driver payloads, with the
 *    driver only present when it is a different person.
 */
class OwnerTricycleDriverDistinctionTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    /**
     * The driver payload for a registration where the owner is a different person.
     */
    private function driverFields(): array
    {
        return [
            'owner_is_driver'    => false,
            'driver_first_name'  => 'Roberto',
            'driver_last_name'   => 'Santos',
            'driver_birthday'    => '1988-01-15',
            'driver_contact'     => '09179876543',
            'driver_barangay'    => 'Papaya',
        ];
    }

    #[Test]
    public function default_registration_marks_the_owner_as_driver_without_creating_a_driver_person(): void
    {
        [$response, $user, $application] = $this->registerNewApplication();

        $response->assertSessionHasNoErrors();

        // Persisted distinction (backend truth, not frontend state).
        $this->assertTrue($application->owner_is_driver);
        $this->assertNull($application->tricycleDriver);
        $this->assertSame(0, ApplicationDriver::where('application_id', $application->id)->count());

        // The owner's submitted birthday is stored on the operators record as a real date.
        $operator = Operator::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('1990-05-20', $operator->date_of_birth->format('Y-m-d'));
        $this->assertSame('date', Schema::getColumnType('operators', 'date_of_birth'));
    }

    #[Test]
    public function an_absent_owner_is_driver_flag_is_treated_as_owner_also_driving(): void
    {
        // Legacy/other clients that never send the flag must behave exactly like the
        // backfilled pre-existing records: the owner is also the driver.
        $payload = $this->registrationPayload();
        unset($payload['owner_is_driver']);

        $response = $this->post(route('register.public.submit'), $payload);
        $response->assertSessionHasNoErrors();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $application = Application::where('operator_id', $user->operator->id)->latest('id')->firstOrFail();

        $this->assertTrue($application->owner_is_driver);
        $this->assertSame(0, ApplicationDriver::where('application_id', $application->id)->count());
    }

    #[Test]
    public function an_owner_with_a_different_driver_persists_the_separate_driver_person(): void
    {
        [$response, $user, $application] = $this->registerNewApplication($this->driverFields());

        $response->assertSessionHasNoErrors();

        $this->assertFalse($application->owner_is_driver);

        $driver = ApplicationDriver::where('application_id', $application->id)->firstOrFail();
        $this->assertSame('Roberto', $driver->first_name);
        $this->assertSame('Santos', $driver->last_name);
        $this->assertSame('1988-01-15', $driver->date_of_birth->format('Y-m-d'));
        $this->assertSame('date', Schema::getColumnType('application_drivers', 'date_of_birth'));
        $this->assertSame('09179876543', $driver->contact_number);
        $this->assertSame('Papaya', $driver->barangay);

        // The owner keeps their OWN person data — the driver never replaces them.
        $operator = Operator::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('Juan', $operator->first_name);
        $this->assertSame('Dela Cruz', $operator->last_name);
        $this->assertSame('1990-05-20', $operator->date_of_birth->format('Y-m-d'));
        $this->assertSame('Bucana', $operator->barangay);

        // Exactly one driver person per application (no parallel/duplicate person rows).
        $this->assertSame(1, ApplicationDriver::where('application_id', $application->id)->count());
    }

    #[Test]
    public function driver_fields_are_required_when_the_owner_is_not_the_driver(): void
    {
        $response = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            ['owner_is_driver' => false],
        ));

        $response->assertSessionHasErrors([
            'driver_first_name',
            'driver_last_name',
            'driver_birthday',
            'driver_contact',
            'driver_barangay',
        ]);
    }

    #[Test]
    public function separate_driver_fields_are_ignored_when_the_owner_is_the_driver(): void
    {
        // Stray driver fields alongside owner_is_driver=true must not create a driver person.
        [$response, , $application] = $this->registerNewApplication(array_merge(
            $this->driverFields(),
            ['owner_is_driver' => true],
        ));

        $response->assertSessionHasNoErrors();
        $this->assertTrue($application->owner_is_driver);
        $this->assertSame(0, ApplicationDriver::where('application_id', $application->id)->count());
    }

    #[Test]
    public function barangay_must_be_one_of_the_official_nasugbu_barangays_for_owner_and_driver(): void
    {
        // Owner: 'Poblacion' is not one of the 42 official Nasugbu barangays.
        $ownerResponse = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            ['barangay' => 'Poblacion'],
        ));
        $ownerResponse->assertSessionHasErrors('barangay');

        // Driver: same canonical list applies to the separate driver person.
        $driverResponse = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            $this->driverFields(),
            ['driver_barangay' => 'Not A Barangay'],
        ));
        $driverResponse->assertSessionHasErrors('driver_barangay');
    }

    #[Test]
    public function birthdays_must_be_real_dates_and_never_in_the_future(): void
    {
        $ownerResponse = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            ['birthday' => now()->addYear()->toDateString()],
        ));
        $ownerResponse->assertSessionHasErrors('birthday');

        // Display/free text is not a valid birthday.
        $formatResponse = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            ['birthday' => 'not a date at all'],
        ));
        $formatResponse->assertSessionHasErrors('birthday');

        $driverResponse = $this->post(route('register.public.submit'), array_merge(
            $this->registrationPayload(),
            $this->driverFields(),
            ['driver_birthday' => now()->addYear()->toDateString()],
        ));
        $driverResponse->assertSessionHasErrors('driver_birthday');
    }

    #[Test]
    public function a_human_readable_birthday_is_normalized_and_stored_as_a_real_date(): void
    {
        // Whatever parseable shape arrives, storage is always a proper date value.
        [$response, $user, ] = $this->registerNewApplication(['birthday' => 'May 20, 1990']);

        $response->assertSessionHasNoErrors();

        $operator = Operator::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('1990-05-20', $operator->date_of_birth->format('Y-m-d'));
        $this->assertSame('date', Schema::getColumnType('operators', 'date_of_birth'));
    }

    #[Test]
    public function application_details_expose_the_owner_and_a_separate_driver(): void
    {
        [, , $application] = $this->registerNewApplication($this->driverFields());

        $tmo = $this->makeTmoUser();
        $response = $this->actingAs($tmo)->get(route('tmo.review.docs', $application));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/DocumentReview')
            ->where('application.owner.first_name', 'Juan')
            ->where('application.owner.last_name', 'Dela Cruz')
            ->where('application.owner.birthday', 'May 20, 1990')
            ->where('application.owner.contact_number', '09171234567')
            ->where('application.owner.barangay', 'Bucana')
            ->where('application.ownerIsDriver', false)
            ->where('application.tricycleDriver.first_name', 'Roberto')
            ->where('application.tricycleDriver.last_name', 'Santos')
            ->where('application.tricycleDriver.birthday', 'Jan 15, 1988')
            ->where('application.tricycleDriver.contact_number', '09179876543')
            ->where('application.tricycleDriver.barangay', 'Papaya')
            // The list/detail primary person remains the owner, never the driver.
            ->where('application.operator', 'Juan Dela Cruz')
        );
    }

    #[Test]
    public function application_details_show_no_driver_person_when_the_owner_drives(): void
    {
        [, , $application] = $this->registerNewApplication();

        $tmo = $this->makeTmoUser();
        $response = $this->actingAs($tmo)->get(route('tmo.review.docs', $application));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('TMODashboard/DocumentReview')
            ->where('application.owner.first_name', 'Juan')
            ->where('application.ownerIsDriver', true)
            ->where('application.tricycleDriver', null)
        );
    }

    #[Test]
    public function deleting_an_application_cascades_its_separate_driver_row(): void
    {
        [, , $application] = $this->registerNewApplication($this->driverFields());
        $driverId = ApplicationDriver::where('application_id', $application->id)->firstOrFail()->id;

        $application->delete();

        $this->assertSame(0, ApplicationDriver::where('id', $driverId)->count());
    }
}
