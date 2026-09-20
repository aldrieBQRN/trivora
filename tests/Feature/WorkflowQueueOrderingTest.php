<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Tricycle;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Proves the fixed queue ordering across TMO/BPLO pages: workflow queues show the
 * longest-waiting (oldest queue-entry) application first, using the append-only
 * application_status_histories.created_at timestamp rather than updated_at — which an
 * unrelated field edit could otherwise bump, silently reshuffling the queue. Registry orders
 * newest-record-first instead.
 */
class WorkflowQueueOrderingTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seedTodaAndColorScheme();
    }

    /** Backdates the LATEST status-history row for this application by $minutes, so it reads as
     * having entered its current queue earlier than a naturally-created later fixture — making
     * the ordering assertion deterministic regardless of real wall-clock execution speed. */
    private function backdateQueueEntry(Application $application, int $minutes): void
    {
        // Shifts ALL of this application's history rows back by the same offset, preserving their
        // relative order — backdating only the latest row would make it artificially appear OLDER
        // than that same application's own earlier transitions (e.g. its original
        // draft->pending_review entry), so "latest by created_at" would then pick the wrong row.
        ApplicationStatusHistory::where('application_id', $application->id)
            ->update(['created_at' => DB::raw("created_at - INTERVAL {$minutes} MINUTE")]);
    }

    #[Test]
    public function physical_inspection_queue_shows_the_oldest_entered_application_first(): void
    {
        $tmo = $this->makeTmoUser();

        [, , $appNewer] = $this->registerNewApplication(['plate_number' => 'ORD-NEWER']);
        [, , $appOlder] = $this->registerNewApplication(['plate_number' => 'ORD-OLDER']);

        foreach ([$appNewer, $appOlder] as $app) {
            $this->actingAs($tmo)->post(route('tmo.review.submit', $app), [
                'action' => 'approve',
                'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
            ])->assertRedirect();
        }

        // $appOlder was actually approved into the queue AFTER $appNewer in real time — backdate
        // its entry so it reads as the longest-waiting one, proving the order comes from this
        // timestamp field and not mere insertion order.
        $this->backdateQueueEntry($appOlder->fresh(), 30);

        $response = $this->actingAs($tmo)->get(route('tmo.physical'));
        $response->assertInertia(function ($page) use ($appOlder, $appNewer) {
            $page->where('applications', function ($apps) use ($appOlder, $appNewer) {
                $ids = $apps->pluck('id')->all();
                $olderPos = array_search($appOlder->id, $ids, true);
                $newerPos = array_search($appNewer->id, $ids, true);
                \PHPUnit\Framework\Assert::assertNotFalse($olderPos);
                \PHPUnit\Framework\Assert::assertNotFalse($newerPos);
                \PHPUnit\Framework\Assert::assertLessThan($newerPos, $olderPos, 'The longer-waiting application must be listed first.');

                return true;
            });
        });
    }

    #[Test]
    public function an_unrelated_update_does_not_reshuffle_the_physical_inspection_queue(): void
    {
        $tmo = $this->makeTmoUser();

        [, , $appA] = $this->registerNewApplication(['plate_number' => 'ORD-STABLE-A']);
        [, , $appB] = $this->registerNewApplication(['plate_number' => 'ORD-STABLE-B']);

        foreach ([$appA, $appB] as $app) {
            $this->actingAs($tmo)->post(route('tmo.review.submit', $app), [
                'action' => 'approve',
                'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
            ])->assertRedirect();
        }
        $this->backdateQueueEntry($appA->fresh(), 30); // A is the genuinely older/first-in-line one.

        // Simulate an unrelated field edit AFTER both are already queued — must NOT touch the
        // status-history table, so it must not affect ordering (unlike the old updated_at-based sort).
        $appB->fresh()->update(['remarks' => 'unrelated note edited later']);

        $response = $this->actingAs($tmo)->get(route('tmo.physical'));
        $response->assertInertia(function ($page) use ($appA, $appB) {
            $page->where('applications', function ($apps) use ($appA, $appB) {
                $ids = $apps->pluck('id')->all();
                \PHPUnit\Framework\Assert::assertLessThan(
                    array_search($appB->id, $ids, true),
                    array_search($appA->id, $ids, true),
                    'An unrelated edit to B must not move A behind it in the queue.'
                );

                return true;
            });
        });
    }

    #[Test]
    public function payment_verification_queue_shows_the_oldest_entered_application_first(): void
    {
        $tmo = $this->makeTmoUser();
        $applications = [];

        foreach (['ORD-PAY-NEWER', 'ORD-PAY-OLDER'] as $plate) {
            [, , $app] = $this->registerNewApplication(['plate_number' => $plate]);
            $this->actingAs($tmo)->post(route('tmo.review.submit', $app), [
                'action' => 'approve',
                'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
            ]);
            $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $app), [
                'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
            ]);
            $applications[$plate] = $app->fresh();
        }

        $this->backdateQueueEntry($applications['ORD-PAY-OLDER'], 30);

        $response = $this->actingAs($tmo)->get(route('tmo.payments'));
        $response->assertInertia(function ($page) use ($applications) {
            $page->where('applications', function ($apps) use ($applications) {
                $ids = $apps->pluck('id')->all();
                \PHPUnit\Framework\Assert::assertLessThan(
                    array_search($applications['ORD-PAY-NEWER']->id, $ids, true),
                    array_search($applications['ORD-PAY-OLDER']->id, $ids, true)
                );

                return true;
            });
        });
    }

    #[Test]
    public function bplo_releasing_queue_shows_the_oldest_entered_application_first(): void
    {
        $tmo = $this->makeTmoUser();
        $applications = [];

        foreach (['ORD-BPLO-NEWER', 'ORD-BPLO-OLDER'] as $plate) {
            [, , $app] = $this->registerNewApplication(['plate_number' => $plate]);
            $this->actingAs($tmo)->post(route('tmo.review.submit', $app), [
                'action' => 'approve',
                'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
            ]);
            $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $app), [
                'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
            ]);
            $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $app), [
                'action' => 'verify', 'official_receipt_number' => 'OR-' . $plate, 'amount' => 750, 'payment_date' => now()->toDateString(),
            ]);
            $applications[$plate] = $app->fresh();
        }

        $this->backdateQueueEntry($applications['ORD-BPLO-OLDER'], 30);

        $bplo = $this->makeBploUser();
        $response = $this->actingAs($bplo)->get(route('bplo.releasing'));
        $response->assertInertia(function ($page) use ($applications) {
            $page->where('applications', function ($apps) use ($applications) {
                $ids = $apps->pluck('id')->all();
                \PHPUnit\Framework\Assert::assertLessThan(
                    array_search($applications['ORD-BPLO-NEWER']->id, $ids, true),
                    array_search($applications['ORD-BPLO-OLDER']->id, $ids, true)
                );

                return true;
            });
        });
    }

    #[Test]
    public function final_confirmation_queue_shows_the_oldest_entered_application_first_and_still_includes_completed_for_its_own_tab(): void
    {
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $applications = [];

        foreach (['ORD-FC-NEWER', 'ORD-FC-OLDER'] as $plate) {
            [, , $app] = $this->registerNewApplication(['plate_number' => $plate]);
            $this->actingAs($tmo)->post(route('tmo.review.submit', $app), [
                'action' => 'approve',
                'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
            ]);
            $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $app), [
                'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
            ]);
            $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $app), [
                'action' => 'verify', 'official_receipt_number' => 'OR-' . $plate, 'amount' => 750, 'payment_date' => now()->toDateString(),
            ]);
            $this->actingAs($bplo)->post(route('bplo.release.submit', $app), [
                'body_number' => substr(md5($plate), 0, 4), 'sticker_number' => 'STK-' . $plate,
            ]);
            $applications[$plate] = $app->fresh();
        }

        $this->backdateQueueEntry($applications['ORD-FC-OLDER'], 30);

        // A THIRD application, driven all the way to 'completed' — must still appear in the raw
        // backend response (the page's own "Completed"/"All" tab needs it), just not first.
        [, , $appCompleted] = $this->registerNewApplication(['plate_number' => 'ORD-FC-DONE']);
        $this->actingAs($tmo)->post(route('tmo.review.submit', $appCompleted), [
            'action' => 'approve', 'docStatuses' => ['orcr' => 'approved', 'license' => 'approved', 'brgy' => 'approved', 'toda' => 'approved'],
        ]);
        $this->actingAs($tmo)->post(route('tmo.review.physical.submit', $appCompleted), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ]);
        $this->actingAs($tmo)->post(route('tmo.verify-payment.submit', $appCompleted), [
            'action' => 'verify', 'official_receipt_number' => 'OR-DONE', 'amount' => 750, 'payment_date' => now()->toDateString(),
        ]);
        $this->actingAs($bplo)->post(route('bplo.release.submit', $appCompleted), [
            'body_number' => 'DONE', 'sticker_number' => 'STK-DONE',
        ]);
        $this->actingAs($tmo)->post(route('tmo.final-confirmation.confirm', $appCompleted), [
            'signed_ticket_verified' => true, 'bplo_approval_confirmed' => true, 'sticker_possession_confirmed' => true,
            'tracking_method' => 'mobile_gps', 'officer_notes' => '',
        ]);

        $response = $this->actingAs($tmo)->get(route('tmo.final-confirmation'));
        $response->assertInertia(function ($page) use ($applications, $appCompleted) {
            $page->where('applications', function ($apps) use ($applications, $appCompleted) {
                $ids = $apps->pluck('id')->all();

                // Both awaiting ones present, oldest-entered first.
                \PHPUnit\Framework\Assert::assertLessThan(
                    array_search($applications['ORD-FC-NEWER']->id, $ids, true),
                    array_search($applications['ORD-FC-OLDER']->id, $ids, true)
                );

                // The completed one is still present (for the page's own Completed/All tab) —
                // hiding it by default is a FRONTEND concern (statusFilter defaults to 'awaiting'),
                // not something the backend query should drop entirely.
                \PHPUnit\Framework\Assert::assertContains($appCompleted->id, $ids, 'Completed applications must still be returned for the Completed tab.');

                $completedRow = $apps->firstWhere('id', $appCompleted->id);
                \PHPUnit\Framework\Assert::assertSame('completed', $completedRow['raw_status']);

                return true;
            });
        });
    }

    #[Test]
    public function tricycle_registry_shows_the_newest_record_first(): void
    {
        $toda = \App\Models\TodaZone::firstOrCreate(
            ['code' => 'TODA-REGORDER-TEST'],
            ['name' => 'Registry Order Test Zone', 'barangay' => 'Poblacion', 'is_active' => true]
        );
        $operator = \App\Models\Operator::create([
            'toda_id' => $toda->id, 'first_name' => 'Registry', 'last_name' => 'Order',
            'contact_number' => '09170000050', 'address' => 'Poblacion', 'barangay' => 'Poblacion',
            'date_of_birth' => '1990-01-01', 'license_number' => 'LIC-REGORDER-001', 'license_expiry_date' => '2028-01-01',
        ]);

        $older = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'REG-OLDER', 'engine_number' => 'ENG-REG-OLDER', 'chassis_number' => 'CHS-REG-OLDER',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2020, 'body_color' => 'Blue', 'body_type' => 'Standard',
            'or_number' => 'OR-REG-OLDER', 'cr_number' => 'CR-REG-OLDER', 'status' => 'active',
        ]);
        $newer = Tricycle::create([
            'operator_id' => $operator->id, 'toda_zone_id' => $toda->id,
            'plate_number' => 'REG-NEWER', 'engine_number' => 'ENG-REG-NEWER', 'chassis_number' => 'CHS-REG-NEWER',
            'make' => 'Honda', 'model' => 'TMX', 'year_model' => 2024, 'body_color' => 'Red', 'body_type' => 'Standard',
            'or_number' => 'OR-REG-NEWER', 'cr_number' => 'CR-REG-NEWER', 'status' => 'active',
        ]);
        // created_at isn't mass-assignable — backdate the older row directly so ordering is
        // deterministic regardless of how fast the two creates above actually ran.
        \Illuminate\Support\Facades\DB::table('tricycles')->where('id', $older->id)->update(['created_at' => now()->subDays(5)]);

        $tmo = $this->makeTmoUser();
        $response = $this->actingAs($tmo)->get(route('tmo.registry'));
        $response->assertInertia(function ($page) use ($older, $newer) {
            $page->where('initialUnits', function ($list) use ($older, $newer) {
                $plates = $list->pluck('plate_no')->all();
                \PHPUnit\Framework\Assert::assertLessThan(
                    array_search($older->plate_number, $plates, true),
                    array_search($newer->plate_number, $plates, true),
                    'The newest tricycle record must be listed before the older one.'
                );

                return true;
            });
        });
    }
}
