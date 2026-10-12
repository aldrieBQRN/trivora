<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\Violation;
use App\Notifications\ColorCodingViolationDriverNotice;
use App\Notifications\ColorCodingViolationTmoAlert;
use App\Services\ViolationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\BuildsViolationNotificationFixtures;
use Tests\TestCase;

/**
 * Exercises violation emails against REAL commits and rollbacks. Like
 * FareCacheCommitInvalidationTest, this class deliberately does NOT use DatabaseTransactions — the
 * test wrapper would otherwise stand in for the commit — so it removes everything it commits in
 * tearDown.
 */
class ColorCodingViolationNotificationCommitTest extends TestCase
{
    use BuildsViolationNotificationFixtures;

    private ?User $tmo = null;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'violations.emails_enabled' => true,
            'violations.tmo_email' => 'tmo.violations@nasugbu-tmo.example.com',
        ]);
        ViolationNotifier::forceDeferUntilAfterResponse(false);
        Notification::fake();

        $this->buildViolationFixture();
        $this->tmo = User::create([
            'name' => 'TMO Officer Commit', 'email' => 'tmo.commit.' . uniqid() . '@example.com',
            'password' => bcrypt('password'), 'role' => 'tmo_personnel', 'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        // Operator delete cascades to the tricycle, its franchise scheme, locations and violations;
        // user deletes cascade to the driver row.
        AuditLog::where('user_id', $this->tmo?->id)->delete();
        $this->operator->delete();
        $this->colorScheme->delete();
        User::whereIn('id', array_filter([$this->driverUser->id, $this->issuer->id, $this->tmo?->id]))->delete();

        ViolationNotifier::forceDeferUntilAfterResponse(null);
        parent::tearDown();
    }

    #[Test]
    public function a_committed_manual_violation_is_emailed_after_the_commit(): void
    {
        $this->assertSame(0, DB::transactionLevel(), 'this class must run without a wrapping test transaction');

        $this->actingAs($this->tmo)->post(route('tmo.violations.store'), [
            'tricycle_id' => $this->tricycle->id, 'violation_type' => 'color_coding',
            'fine_amount' => 500, 'location' => 'Brgy. Wawa',
        ])->assertRedirect(route('tmo.violations'));

        $this->assertSame(1, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertSentTimes(ColorCodingViolationTmoAlert::class, 1);
        Notification::assertSentTo($this->driverUser, ColorCodingViolationDriverNotice::class);
    }

    #[Test]
    public function a_violation_whose_transaction_rolls_back_is_never_emailed(): void
    {
        try {
            DB::transaction(function () {
                $violation = Violation::create([
                    'tricycle_id'            => $this->tricycle->id,
                    'franchise_scheme_id'    => $this->tricycle->franchiseScheme->id,
                    'color_coding_scheme_id' => $this->colorScheme->id,
                    'violation_type'         => 'color_coding',
                    'detected_at'            => now(),
                    'day_of_week'            => now()->format('l'),
                    'detection_method'       => 'manual',
                    'status'                 => 'open',
                    'fine_amount'            => 500,
                ]);

                // Same call storeViolation() makes inside its transaction.
                ViolationNotifier::colorCodingViolationRecorded($violation);
                Notification::assertNothingSent();

                throw new \RuntimeException('force a rollback');
            });
            $this->fail('the transaction should have rethrown');
        } catch (\RuntimeException $e) {
            $this->assertSame('force a rollback', $e->getMessage());
        }

        $this->assertSame(0, Violation::where('tricycle_id', $this->tricycle->id)->count());
        Notification::assertNothingSent();
    }
}
