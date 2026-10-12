<?php

namespace Tests\Feature\Concerns;

use App\Models\ColorCodingScheme;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Carbon\Carbon;
use Laravel\Sanctum\Sanctum;

/**
 * A minimal active unit restricted on Mondays (Sticker Number ending in 2), owned and driven by
 * one driver account, for the violation email tests. Mirrors DriverTelematicsColorCodingTest's
 * fixture, except the driver has a real-looking (deliverable) email by default.
 */
trait BuildsViolationNotificationFixtures
{
    protected User $driverUser;
    protected Operator $operator;
    protected Tricycle $tricycle;
    protected ?Driver $driver = null;
    protected ColorCodingScheme $colorScheme;
    protected User $issuer;

    protected function buildViolationFixture(?string $driverEmail = null, bool $withDriverRow = true): void
    {
        $suffix = uniqid();


        $this->colorScheme = ColorCodingScheme::create([
            'name' => 'Violation Mail Scheme ' . $suffix, 'color_hex' => '#FF0000',
            'restricted_days' => ['Monday'], 'is_active' => true,
        ]);

        $this->driverUser = User::create([
            'name' => 'Juan Dela Cruz',
            'email' => $driverEmail ?? "juan.{$suffix}@example.com",
            'password' => bcrypt('password'), 'role' => 'tricycle_driver',
        ]);

        $this->operator = Operator::create([
            'user_id' => $this->driverUser->id,
            'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
            'contact_number' => '09170000777', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01',
            'license_number' => 'LIC-VM-' . $suffix, 'license_expiry_date' => '2028-01-01',
        ]);

        $this->tricycle = Tricycle::create([
            'operator_id' => $this->operator->id, 'coding_scheme_number' => '0002',
            'plate_number' => 'VM-' . substr($suffix, -6), 'engine_number' => 'ENG-VM-' . $suffix, 'chassis_number' => 'CHS-VM-' . $suffix,
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2021,
            'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-VM-' . $suffix, 'cr_number' => 'CR-VM-' . $suffix, 'status' => 'active',
            'active_tracking_mode' => 'mobile_app',
        ]);

        $this->issuer = User::create([
            'name' => 'BPLO Issuer VM', 'email' => "bplo.vm.{$suffix}@trivora.test",
            'password' => bcrypt('password'), 'role' => 'bplo_staff',
        ]);

        FranchiseScheme::create([
            'tricycle_id' => $this->tricycle->id,
            'color_coding_scheme_id' => $this->colorScheme->id,
            'issued_by' => $this->issuer->id,
            'franchise_number' => 'FR-VM-' . $suffix,
            'issue_date' => '2024-01-01', 'expiry_date' => '2029-01-01',
            'is_active' => true,
        ]);

        if ($withDriverRow) {
            $this->driver = Driver::create([
                'user_id' => $this->driverUser->id,
                'operator_id' => $this->operator->id,
                'tricycle_id' => $this->tricycle->id,
                'license_number' => 'LIC-VM-' . $suffix,
                'is_online' => false, 'is_available' => false,
            ]);
        }
    }

    protected function restrictedMonday(): Carbon
    {
        return Carbon::parse('next Monday')->setTime(9, 0);
    }

    protected function metersNorth(float $lat, float $meters): float
    {
        return $lat + rad2deg($meters / 6371000.0);
    }

    /** Go online and send the anchor + candidate pings; the next ping >=100m away confirms. */
    protected function goOnlineAndSendAnchorAndCandidate(Carbon $monday): void
    {
        Sanctum::actingAs($this->driverUser, ['*']);
        $this->postJson('/api/v1/driver/status', ['is_online' => true])->assertOk();

        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => 14.07, 'longitude' => 120.63, 'recorded_at' => $monday->toISOString(),
        ])->assertJsonPath('violation.flagged', false);

        $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, 102), 'longitude' => 120.63,
            'recorded_at' => $monday->copy()->addSeconds(15)->toISOString(),
        ])->assertJsonPath('violation.flagged', false);
    }

    /** The confirming ping that records the violation (or, later the same day, re-attempts it). */
    protected function sendConfirmingPing(Carbon $at, float $meters = 107)
    {
        return $this->postJson('/api/v1/driver/telematics', [
            'latitude' => $this->metersNorth(14.07, $meters), 'longitude' => 120.63,
            'speed_kmh' => 15, 'heading_deg' => 90, 'accuracy_m' => 5,
            'recorded_at' => $at->toISOString(),
        ]);
    }
}
