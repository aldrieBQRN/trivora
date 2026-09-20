<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\GpsDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Covers the Phase 1/2 GPS device pairing foundation added to
 * TMO\FinalConfirmationController::confirm(): the gps_devices table as the source of truth for
 * physical tracker identity, and the guard that stops the same Tracker ID from being silently
 * claimed by two different tricycles. Does not touch/assume any real ST-901L telemetry ingestion
 * — that is a later phase, once real hardware packets have been captured.
 */
class GpsDevicePairingTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    /**
     * Drives a fresh application through the real workflow (registration -> document review ->
     * physical inspection -> payment verification -> BPLO release) up to
     * 'awaiting_tmo_confirmation', mirroring FranchiseWorkflowTest's stage progression exactly so
     * this test exercises the real Final Confirmation entry point, not a shortcut.
     */
    private function driveApplicationToAwaitingFinalConfirmation(string $plateNumber): Application
    {
        [, , $application] = $this->registerNewApplication(['plate_number' => $plateNumber]);
        $tmo = $this->makeTmoUser();

        $this->actingAs($tmo)->post(route('tmo.review.submit', $application), [
            'action'      => 'approve',
            'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
        ]);

        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $application), [
            'action'             => 'pass',
            'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);

        $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $application), [
            'action'                  => 'verify',
            'official_receipt_number' => 'OR-' . $plateNumber,
            'amount'                  => 750,
            'payment_date'            => now()->toDateString(),
        ]);

        $bplo = $this->makeBploUser();
        $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'body_number'    => substr($plateNumber, -4),
            'sticker_number' => 'STK-' . $plateNumber,
        ]);

        $application->refresh();
        $this->assertSame('awaiting_tmo_confirmation', $application->status);

        return $application;
    }

    private function makeTmoUserActor(): User
    {
        return $this->makeTmoUser();
    }

    #[Test]
    public function confirming_with_iot_device_creates_a_gps_device_paired_to_the_tricycle(): void
    {
        $application = $this->driveApplicationToAwaitingFinalConfirmation('GPS-0001');
        $tmo = $this->makeTmoUserActor();

        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'iot_device',
            'iot_device_id'                => 'TRK-0001',
            'imei'                         => '123456789012345',
            'sim_number'                   => '09170001111',
            'officer_notes'                => '',
        ])->assertRedirect(route('tmo.final-confirmation'));

        $application->refresh();
        $this->assertSame('completed', $application->status);

        $device = GpsDevice::where('device_identifier', 'TRK-0001')->first();
        $this->assertNotNull($device);
        $this->assertSame($application->tricycle_id, $device->tricycle_id);
        $this->assertSame('paired', $device->status);
        $this->assertSame('123456789012345', $device->imei);
        $this->assertSame('09170001111', $device->sim_number);
        $this->assertSame('ST-901L', $device->model);
        $this->assertSame($tmo->id, $device->paired_by);
        $this->assertNotNull($device->paired_at);

        // No telemetry exists yet — pairing alone must never fabricate a live signal.
        $this->assertNull($device->last_seen_at);
        $this->assertSame('awaiting', $device->connectionStatus());
    }

    #[Test]
    public function confirming_with_mobile_gps_never_creates_a_gps_device(): void
    {
        $application = $this->driveApplicationToAwaitingFinalConfirmation('GPS-0002');
        $tmo = $this->makeTmoUserActor();

        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $application), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'mobile_gps',
            'officer_notes'                => '',
        ])->assertRedirect(route('tmo.final-confirmation'));

        $this->assertSame(0, GpsDevice::count());
    }

    #[Test]
    public function pairing_a_tracker_already_paired_to_another_tricycle_is_rejected_without_explicit_reassignment(): void
    {
        $applicationA = $this->driveApplicationToAwaitingFinalConfirmation('GPS-0003');
        $applicationB = $this->driveApplicationToAwaitingFinalConfirmation('GPS-0004');
        $tmo = $this->makeTmoUserActor();

        // Pair TRK-SHARED to tricycle A first.
        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $applicationA), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'iot_device',
            'iot_device_id'                => 'TRK-SHARED',
            'officer_notes'                => '',
        ])->assertRedirect(route('tmo.final-confirmation'));

        $applicationA->refresh();
        $tricycleAId = $applicationA->tricycle_id;

        // Attempting to pair the SAME identifier to tricycle B, without acknowledging
        // reassignment, must be rejected — the device must stay exactly where it was.
        $response = $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $applicationB), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'iot_device',
            'iot_device_id'                => 'TRK-SHARED',
            'officer_notes'                => '',
        ]);

        $response->assertSessionHasErrors('iot_device_id');

        $applicationB->refresh();
        $this->assertSame('awaiting_tmo_confirmation', $applicationB->status, 'Rejected pairing must not activate the franchise.');

        $this->assertSame(1, GpsDevice::where('device_identifier', 'TRK-SHARED')->count());
        $device = GpsDevice::where('device_identifier', 'TRK-SHARED')->first();
        $this->assertSame($tricycleAId, $device->tricycle_id, 'The device must remain paired to tricycle A.');

        // Explicit reassignment must succeed, and must repoint the SAME row rather than
        // creating a duplicate.
        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $applicationB), [
            'signed_ticket_verified'       => true,
            'bplo_approval_confirmed'      => true,
            'sticker_possession_confirmed' => true,
            'tracking_method'              => 'iot_device',
            'iot_device_id'                => 'TRK-SHARED',
            'reassign_confirmed'           => true,
            'officer_notes'                => '',
        ])->assertRedirect(route('tmo.final-confirmation'));

        $applicationB->refresh();
        $this->assertSame('completed', $applicationB->status);

        $this->assertSame(1, GpsDevice::where('device_identifier', 'TRK-SHARED')->count(), 'Reassignment must repoint the existing row, never duplicate it.');
        $device->refresh();
        $this->assertSame($applicationB->tricycle_id, $device->tricycle_id);
    }
}
