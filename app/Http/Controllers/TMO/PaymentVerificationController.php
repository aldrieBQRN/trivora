<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PaymentVerificationController extends Controller
{
    /**
     * Display TMO Payment Verification Queue.
     * Drivers present the physical Municipal Treasurer Official Receipt + Payment Ticket here.
     */
    public function index(): Response
    {
        // See InspectionController::index() for why this uses the append-only status-history
        // timestamp (the real "entered this queue" moment) instead of updated_at.
        $applications = Application::with(['operator.todaZone', 'tricycle', 'payment'])
            ->whereIn('status', ['pending_payment', 'payment_issue'])
            ->addSelect(['queue_entered_at' => ApplicationStatusHistory::select('created_at')
                ->whereColumn('application_id', 'applications.id')
                ->orderByDesc('created_at')
                ->orderByDesc('id') // tiebreaker when two transitions land in the same second
                ->limit(1),
            ])
            ->orderBy('queue_entered_at', 'asc')
            ->get()
            ->map(function ($app) {
                $statusLabel = $app->status === 'payment_issue' ? 'Payment Issue Flagged' : 'Awaiting Receipt Verification';

                return [
                    'id'               => $app->id,
                    'reference'        => $app->reference_number,
                    'ticket_number'    => $app->payment_ticket['ticket_number'],
                    'operator'         => $app->operator ? $app->operator->full_name : 'N/A',
                    'contact'          => $app->operator ? $app->operator->contact_number : 'N/A',
                    'toda'             => ($app->operator && $app->operator->todaZone) ? $app->operator->todaZone->name : 'Unassigned',
                    'make'             => $app->tricycle ? "{$app->tricycle->make} {$app->tricycle->model}" : 'N/A',
                    'plate'            => $app->tricycle ? $app->tricycle->plate_number : 'N/A',
                    'amount_due'       => 750.00,
                    'inspection_passed'=> $app->updated_at ? $app->updated_at->format('M d, Y · h:i A') : 'N/A',
                    'status'           => $statusLabel,
                    'raw_status'       => $app->status,
                ];
            });

        $awaitingCount = $applications->where('raw_status', 'pending_payment')->count();
        $issueCount = $applications->where('raw_status', 'payment_issue')->count();

        $verifiedTodayCount = ApplicationStatusHistory::where('changed_by', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->where('to_status', 'payment_verified')
            ->distinct('application_id')
            ->count();

        return Inertia::render('TMODashboard/PaymentQueue', [
            'applications'       => $applications,
            'awaitingCount'      => $awaitingCount,
            'issueCount'         => $issueCount,
            'verifiedTodayCount' => $verifiedTodayCount,
        ]);
    }

    /**
     * Show form to inspect & verify physical Municipal Treasurer payment.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle', 'payment', 'statusHistories']);

        $operator = $application->operator;
        $tricycle = $application->tricycle;

        $lastIssue = $application->statusHistories()
            ->where('to_status', 'payment_issue')
            ->latest()
            ->first();

        $appData = [
            'id'             => $application->id,
            'reference'      => $application->reference_number,
            'ticket_number'  => $application->payment_ticket['ticket_number'],
            'total_amount'   => $application->payment_ticket['total_amount'],
            'fees_breakdown' => $application->payment_ticket['fees_breakdown'],
            'operator'       => $operator ? $operator->full_name : 'N/A',
            'contact'        => $operator ? $operator->contact_number : 'N/A',
            'barangay'       => $operator ? $operator->barangay : 'N/A',
            'address'        => $operator ? $operator->address : 'N/A',
            'toda'           => ($operator && $operator->todaZone) ? $operator->todaZone->name : 'Unassigned',
            'make'           => $tricycle ? "{$tricycle->make} {$tricycle->model}" : 'N/A',
            'plate'          => $tricycle ? $tricycle->plate_number : 'N/A',
            'engine_number'  => $tricycle ? $tricycle->engine_number : 'N/A',
            'chassis_number' => $tricycle ? $tricycle->chassis_number : 'N/A',
            'status'         => $application->status,
            'last_issue'     => $lastIssue ? $lastIssue->notes : null,
            'payment'        => $application->payment ? [
                'or_number'      => $application->payment->official_receipt_number,
                'amount'         => (float)$application->payment->amount,
                'payment_date'   => $application->payment->payment_date ? $application->payment->payment_date->toDateString() : now()->toDateString(),
                'notes'          => $application->payment->notes,
            ] : null,
        ];

        return Inertia::render('TMODashboard/VerifyPayment', [
            'application' => $appData,
        ]);
    }

    /**
     * Submit TMO payment verification result (confirm or flag issue).
     */
    public function verify(Request $request, Application $application): RedirectResponse
    {
        $action = $request->input('action');

        $request->validate([
            'action'                  => 'required|in:verify,flag_issue',
            'official_receipt_number' => 'required_if:action,verify|nullable|string|max:50',
            'amount'                  => 'required_if:action,verify|nullable|numeric|min:0',
            'payment_date'            => 'required_if:action,verify|nullable|date',
            'notes'                   => 'nullable|string|max:500',
            'issue_notes'             => 'required_if:action,flag_issue|nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($application, $action, $request) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            if ($action === 'verify') {
                $orNumber = trim($request->input('official_receipt_number'));
                $amount   = (float)$request->input('amount', 750.00);
                $date     = $request->input('payment_date', now()->toDateString());
                $notes    = $request->input('notes') ?: 'Official Treasury Receipt verified by TMO.';

                Payment::updateOrCreate(
                    ['application_id' => $application->id],
                    [
                        'processed_by'            => Auth::id() ?: 1,
                        'official_receipt_number' => $orNumber,
                        'amount'                  => $amount,
                        'payment_method'          => 'cash',
                        'payment_date'            => $date,
                        'payment_time'            => now()->toTimeString(),
                        'is_verified'             => true,
                        'verified_at'             => now(),
                        'notes'                   => $notes,
                    ]
                );

                $toStatus = 'payment_verified';
                $toStep = 5; // Forward to Step 5: BPLO Sticker Release
                $historyNotes = "Municipal Treasurer Official Receipt #{$orNumber} (Amount: ₱" . number_format($amount, 2) . ") verified by TMO. Cleared for BPLO Sticker Release.";
            } else {
                $toStatus = 'payment_issue';
                $toStep = 4; // Stay at payment step
                $issueReason = $request->input('issue_notes');
                $historyNotes = "TMO flagged issue with payment documents: " . $issueReason;
            }

            $application->update([
                'status'       => $toStatus,
                'current_step' => $toStep,
                'remarks'      => $historyNotes,
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => Auth::id(),
                'from_status'    => $fromStatus,
                'to_status'      => $toStatus,
                'from_step'      => $fromStep,
                'to_step'        => $toStep,
                'notes'          => $historyNotes,
                'created_at'     => now(),
            ]);
        });

        if ($action === 'verify') {
            return redirect()->route('tmo.payments')->with('success', 'Payment verified successfully. Application forwarded to BPLO for sticker release.');
        }

        return redirect()->route('tmo.payments')->with('warning', 'Payment issue recorded. Application remains pending resolution.');
    }
}
