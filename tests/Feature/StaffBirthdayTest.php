<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Staff birthday: set in TMO / BPLO Staff Management and in Account Settings.
 */
class StaffBirthdayTest extends TestCase
{
    use DatabaseTransactions;

    public static function portals(): array
    {
        return [
            'TMO'  => ['tmo_personnel', '/tmo/users', 'tmo.users'],
            'BPLO' => ['bplo_staff', '/bplo/users', 'bplo.users'],
        ];
    }

    private function manager(string $role): User
    {
        return User::create([
            'name' => 'Manager ' . $role, 'email' => 'mgr.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => $role, 'is_active' => true,
        ]);
    }

    #[Test]
    #[DataProvider('portals')]
    public function staff_management_saves_and_lists_the_birthday(string $role, string $base, string $routeName): void
    {
        $manager = $this->manager($role);
        $email = 'bday.' . uniqid() . '@trivora.gov.ph';

        $this->actingAs($manager)->post($base, [
            'name' => 'Birthday Staff', 'email' => $email, 'password' => 'SecurePass123', 'birthday' => '1990-05-17',
        ])->assertSessionHasNoErrors()->assertRedirect(route($routeName));

        $staff = User::where('email', $email)->firstOrFail();
        $this->assertSame('1990-05-17', $staff->birthday->format('Y-m-d'));

        // Update to another date.
        $this->actingAs($manager)->put("{$base}/{$staff->id}", [
            'name' => 'Birthday Staff', 'email' => $email, 'birthday' => '1991-02-03',
        ])->assertSessionHasNoErrors();
        $this->assertSame('1991-02-03', $staff->fresh()->birthday->format('Y-m-d'));

        // Listed with both the form value and a display label.
        $row = null;
        $this->actingAs($manager)->get($base)->assertOk()->assertInertia(function ($page) use (&$row, $email) {
            $row = collect($page->toArray()['props']['users'])->firstWhere('email', $email);
        });
        $this->assertSame('1991-02-03', $row['birthday']);
        $this->assertSame('Feb 03, 1991', $row['birthday_label']);

        // Clearing it is allowed.
        $this->actingAs($manager)->put("{$base}/{$staff->id}", ['name' => 'Birthday Staff', 'email' => $email, 'birthday' => ''])
            ->assertSessionHasNoErrors();
        $this->assertNull($staff->fresh()->birthday);
    }

    #[Test]
    #[DataProvider('portals')]
    public function staff_management_rejects_future_or_invalid_birthdays(string $role, string $base): void
    {
        $manager = $this->manager($role);

        $this->actingAs($manager)->post($base, [
            'name' => 'Future', 'email' => 'future.' . uniqid() . '@trivora.gov.ph', 'password' => 'SecurePass123',
            'birthday' => now()->addDay()->toDateString(),
        ])->assertSessionHasErrors('birthday');

        $this->actingAs($manager)->post($base, [
            'name' => 'Garbage', 'email' => 'garbage.' . uniqid() . '@trivora.gov.ph', 'password' => 'SecurePass123',
            'birthday' => 'not-a-date',
        ])->assertSessionHasErrors('birthday');
    }

    #[Test]
    public function staff_can_set_their_birthday_in_account_settings(): void
    {
        $tmo = $this->manager('tmo_personnel');

        $this->actingAs($tmo)->patch('/profile', ['name' => $tmo->name, 'email' => $tmo->email, 'birthday' => '1988-12-01'])
            ->assertSessionHasNoErrors();
        $this->assertSame('1988-12-01', $tmo->fresh()->birthday->format('Y-m-d'));

        $account = null;
        $this->actingAs($tmo)->get('/profile')->assertInertia(function ($page) use (&$account) {
            $account = $page->toArray()['props']['account'];
        });
        $this->assertSame('1988-12-01', $account['birthday']);

        $this->actingAs($tmo)->patch('/profile', ['name' => $tmo->name, 'email' => $tmo->email, 'birthday' => now()->addYear()->toDateString()])
            ->assertSessionHasErrors('birthday');
    }

    #[Test]
    public function drivers_see_the_birthday_and_mobile_from_their_franchise_registration(): void
    {
        $driver = User::create([
            'name' => 'Reg Driver', 'email' => 'regdrv.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);
        \App\Models\Operator::create([
            'user_id' => $driver->id, 'first_name' => 'Reg', 'last_name' => 'Driver',
            'contact_number' => '09175550000', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1992-07-15', 'license_number' => 'LIC-REG-' . uniqid(), 'license_expiry_date' => '2029-01-01',
        ]);

        $account = null;
        $this->actingAs($driver)->get('/profile')->assertOk()->assertInertia(function ($page) use (&$account) {
            $account = $page->toArray()['props']['account'];
        });
        $this->assertSame('Jul 15, 1992', $account['registration']['birthday']);
        $this->assertSame('09175550000', $account['registration']['contact_number']);
    }

    #[Test]
    public function drivers_birthday_is_not_changed_from_account_settings(): void
    {
        $driver = User::create([
            'name' => 'Driver', 'email' => 'drv.' . uniqid() . '@trivora.test',
            'password' => bcrypt('password'), 'role' => 'tricycle_driver', 'is_active' => true,
        ]);

        $this->actingAs($driver)->patch('/profile', ['name' => 'Driver', 'email' => $driver->email, 'birthday' => '1995-01-01'])
            ->assertSessionHasNoErrors();
        $this->assertNull($driver->fresh()->birthday);
    }
}
