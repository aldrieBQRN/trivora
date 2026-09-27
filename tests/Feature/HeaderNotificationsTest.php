<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\WorkflowNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\DrivesFranchiseWorkflow;
use Tests\TestCase;

/**
 * Header notification bell: real franchise-workflow events notify the portal that must act next
 * (TMO or BPLO only), link to the existing record page, and can be read / marked read only by their
 * owner.
 */
class HeaderNotificationsTest extends TestCase
{
    use DatabaseTransactions, DrivesFranchiseWorkflow;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedTodaAndColorScheme();
    }

    private function eventsFor(User $user): array
    {
        return $user->fresh()->notifications->map(fn ($n) => $n->data['event'])->all();
    }

    private function sharedBell(User $user): ?array
    {
        $bell = null;
        $this->actingAs($user)->get(route('profile.edit'))->assertOk()
            ->assertInertia(function ($page) use (&$bell) {
                $bell = $page->toArray()['props']['notifications'] ?? null;
            });

        return $bell;
    }

    #[Test]
    public function the_workflow_notifies_only_the_portal_that_must_act_next_with_links_to_the_record(): void
    {
        $tmoA = $this->makeTmoUser();
        $tmoB = $this->makeTmoUser();
        $bplo = $this->makeBploUser();

        // 1. Public registration -> TMO Document Review.
        [, , $application] = $this->registerNewApplication();
        $this->assertContains('application_submitted', $this->eventsFor($tmoA));
        $this->assertContains('application_submitted', $this->eventsFor($tmoB));
        $this->assertSame([], $this->eventsFor($bplo), 'BPLO never receives TMO events');
        $submitted = $tmoA->fresh()->notifications->firstWhere('data.event', 'application_submitted');
        $this->assertSame(route('tmo.review.docs', $application->id, false), $submitted->data['url']);

        // 2. TMO A approves documents -> the OTHER TMO staff get "inspection pending" (not the actor).
        $this->actingAs($tmoA)->post(route('tmo.review.submit', $application), [
            'action' => 'approve',
            'docStatuses' => ['orcr_photocopy' => 'approved', 'drivers_license' => 'approved', 'barangay_clearance' => 'approved', 'toda_clearance' => 'approved'],
        ])->assertRedirect(route('tmo.docs'));
        $this->assertContains('inspection_pending', $this->eventsFor($tmoB));
        $this->assertNotContains('inspection_pending', $this->eventsFor($tmoA));

        // 3. Inspection passes -> BPLO release (TMO gets nothing for this step).
        $this->actingAs($tmoA)->post(route('tmo.review.physical.submit', $application), [
            'action' => 'pass', 'inspectionStatuses' => $this->allInspectionItemsPassed(),
        ])->assertRedirect(route('tmo.physical'));
        $this->assertSame(['release_pending'], $this->eventsFor($bplo));
        $this->assertSame(
            route('bplo.issue', $application->id, false),
            $bplo->fresh()->notifications->first()->data['url']
        );
        $this->assertNotContains('release_pending', $this->eventsFor($tmoB));

        // 4. BPLO releases -> TMO Final Confirmation.
        $this->actingAs($bplo)->post(route('bplo.release.submit', $application), [
            'coding_scheme_number' => '0001', 'sticker_number' => 'STK-0001',
        ])->assertRedirect(route('bplo.releasing'));
        $this->assertContains('final_confirmation_pending', $this->eventsFor($tmoA));
        $this->assertSame(['release_pending'], $this->eventsFor($bplo), 'the BPLO actor is not notified of its own release');
    }

    #[Test]
    public function a_rejected_application_notifies_no_staff_and_its_resubmission_asks_tmo_for_re_review(): void
    {
        $tmoA = $this->makeTmoUser();
        $tmoB = $this->makeTmoUser();
        [, $driver, $application] = $this->registerNewApplication();

        $this->actingAs($tmoA)->post(route('tmo.review.submit', $application), [
            'action' => 'reject',
            'docStatuses' => ['orcr_photocopy' => 'rejected'],
            'rejectionReasons' => ['orcr_photocopy' => 'Blurry scan, please resubmit.'],
        ]);
        $this->assertSame(['application_submitted'], $this->eventsFor($tmoB), 'a rejection waits on the driver');

        $this->actingAs($driver)->post(route('operator.mtop.submit-fix', $application->id), [
            'documents' => ['orcr_photocopy' => [$this->fakeDocument('orcr.pdf')]],
        ]);
        $this->assertSame('pending_review', $application->fresh()->status);
        $this->assertContains('application_resubmitted', $this->eventsFor($tmoB));
        $resubmitted = $tmoB->fresh()->notifications->firstWhere('data.event', 'application_resubmitted');
        $this->assertSame(route('tmo.review.docs', $application->id, false), $resubmitted->data['url']);
    }

    #[Test]
    public function shared_bell_shows_only_the_users_own_portal_notifications_with_unread_count(): void
    {
        $tmo = $this->makeTmoUser();
        $bplo = $this->makeBploUser();
        $tmo->notify(new WorkflowNotification('tmo', 'application_submitted', 'New application for Document Review', 'APP-1', '/tmo/docs'));
        $bplo->notify(new WorkflowNotification('bplo', 'release_pending', 'Ready for sticker & plate release', 'APP-2', '/bplo/releasing'));
        // A TMO-portal row that somehow belongs to the BPLO user must never be shown to them.
        $bplo->notify(new WorkflowNotification('tmo', 'application_submitted', 'Wrong portal', 'APP-3', '/tmo/docs'));

        $tmoBell = $this->sharedBell($tmo);
        $this->assertSame(1, $tmoBell['unread_count']);
        $this->assertSame('New application for Document Review', $tmoBell['items'][0]['title']);
        $this->assertSame('/tmo/docs', $tmoBell['items'][0]['url']);
        $this->assertMatchesRegularExpression('/secs? ago$/', $tmoBell['items'][0]['time_label']);

        $bploBell = $this->sharedBell($bplo);
        $this->assertSame(1, $bploBell['unread_count']);
        $this->assertSame(['Ready for sticker & plate release'], array_column($bploBell['items'], 'title'));
    }

    #[Test]
    public function empty_state_and_non_portal_users(): void
    {
        $tmo = $this->makeTmoUser();
        $this->assertSame(['unread_count' => 0, 'items' => []], $this->sharedBell($tmo));

        [, $driver] = $this->registerNewApplication();
        $this->assertNull($this->sharedBell($driver), 'drivers have no portal workflow notifications');
    }

    #[Test]
    public function open_marks_read_and_redirects_and_mark_all_read_works(): void
    {
        $tmo = $this->makeTmoUser();
        $tmo->notify(new WorkflowNotification('tmo', 'inspection_pending', 'Vehicle inspection pending', 'APP-1', '/tmo/physical'));
        $tmo->notify(new WorkflowNotification('tmo', 'application_submitted', 'New application', 'APP-2', '/tmo/docs'));
        $first = $tmo->notifications()->latest()->first();

        $this->actingAs($tmo)->get(route('notifications.open', $first->id))->assertRedirect($first->data['url']);
        $this->assertNotNull($first->fresh()->read_at);
        $this->assertSame(1, $tmo->fresh()->unreadNotifications()->count());

        $this->actingAs($tmo)->post(route('notifications.read-all'))->assertRedirect();
        $this->assertSame(0, $tmo->fresh()->unreadNotifications()->count());
    }

    #[Test]
    public function mark_read_marks_one_notification(): void
    {
        $tmo = $this->makeTmoUser();
        $tmo->notify(new WorkflowNotification('tmo', 'inspection_pending', 'Vehicle inspection pending', 'APP-1', '/tmo/physical'));
        $n = $tmo->notifications()->first();

        $this->actingAs($tmo)->post(route('notifications.read', $n->id))->assertRedirect();
        $this->assertNotNull($n->fresh()->read_at);
    }

    #[Test]
    public function a_user_cannot_open_or_mark_another_users_notification(): void
    {
        $tmo = $this->makeTmoUser();
        $other = $this->makeTmoUser();
        $other->notify(new WorkflowNotification('tmo', 'inspection_pending', 'Not yours', 'APP-9', '/tmo/physical'));
        $theirs = $other->notifications()->first();

        $this->actingAs($tmo)->get(route('notifications.open', $theirs->id))->assertNotFound();
        $this->actingAs($tmo)->post(route('notifications.read', $theirs->id))->assertNotFound();
        $this->assertNull($theirs->fresh()->read_at);
    }

    #[Test]
    public function open_never_redirects_off_site(): void
    {
        $tmo = $this->makeTmoUser();
        $tmo->notify(new WorkflowNotification('tmo', 'x', 'Bad link', 'm', 'https://evil.example/phish'));
        $n = $tmo->notifications()->first();

        $response = $this->actingAs($tmo)->from('/tmo-dashboard')->get(route('notifications.open', $n->id));
        $response->assertRedirect('/tmo-dashboard');
    }
}
