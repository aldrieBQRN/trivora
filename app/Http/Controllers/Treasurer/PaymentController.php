<?php

namespace App\Http\Controllers\Treasurer;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Payment;
use App\Models\Violation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    /**
     * Display the Treasurer Dashboard.
     */
    public function dashboard(): Response
    {
        // 1. Calculate collections today
        $todayCollection = Payment::where('is_verified', true)
            ->whereDate('payment_date', now()->toDateString())
            ->sum('amount');

        // 2. Calculate this month's collections
        $monthCollection = Payment::where('is_verified', true)
            ->whereMonth('payment_date', now()->month)
            ->whereYear('payment_date', now()->year)
            ->sum('amount');

        // 3. Count total verified payments
        $totalProcessed = Payment::where('is_verified', true)->count();

        // 4. Fetch 7-day revenue trend data (last 7 days)
        $weeklyData = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo);
            $amount = Payment::where('is_verified', true)
                ->whereDate('payment_date', $date->toDateString())
                ->sum('amount');

            return [
                'day'    => $date->format('D'),
                'amount' => (float)$amount,
            ];
        })->toArray();

        // 5. Category breakdown
        // - Renewals (MTOP Renewal type payments)
        // - New (New Franchise type payments)
        // - Fines (Violation payments - if any, or we can placeholder violation collections)
        $newAmount = Payment::where('is_verified', true)
            ->whereHas('application', fn ($q) => $q->where('application_type', 'new'))
            ->sum('amount');

        $renewalAmount = Payment::where('is_verified', true)
            ->whereHas('application', fn ($q) => $q->where('application_type', 'renewal'))
            ->sum('amount');

        $fineAmount = Violation::where('status', 'resolved')
            ->whereNotNull('fine_paid_at')
            ->sum('fine_amount');

        $breakdown = [
            'renewals' => ['val' => (float)$renewalAmount, 'color' => '#4F5BCB', 'label' => 'MTOP Renewals'],
            'new'      => ['val' => (float)$newAmount, 'color' => '#059669', 'label' => 'New Franchises'],
            'fines'    => ['val' => (float)$fineAmount, 'color' => '#D97706', 'label' => 'Violation Fines'],
        ];

        // 6. Latest payments received (verified transactions)
        $transactions = Payment::with(['application.operator'])
            ->where('is_verified', true)
            ->orderBy('payment_date', 'desc')
            ->orderBy('payment_time', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($pay) {
                return [
                    'id'       => $pay->id,
                    'app_id'   => $pay->application ? $pay->application->reference_number : 'N/A',
                    'operator' => ($pay->application && $pay->application->operator) ? $pay->application->operator->full_name : 'N/A',
                    'type'     => $pay->application ? ($pay->application->application_type === 'new' ? 'New Franchise Fee' : 'MTOP Renewal Fee') : 'Fee',
                    'amount'   => (float)$pay->amount,
                    'method'   => ucfirst($pay->payment_method),
                    'ref'      => $pay->official_receipt_number,
                    'date'     => $pay->payment_date->format('M d, Y') . ' - ' . ($pay->payment_time ? date('h:i A', strtotime($pay->payment_time)) : 'N/A'),
                ];
            });

        return Inertia::render('Treasurer/Dashboard', [
            'stats' => [
                'todayCollection' => $todayCollection,
                'monthCollection' => $monthCollection,
                'totalProcessed'  => $totalProcessed,
            ],
            'weeklyData'   => $weeklyData,
            'breakdown'    => $breakdown,
            'transactions' => $transactions,
        ]);
    }

    /**
     * List applications currently pending payment.
     */
    public function index(): Response
    {
        $transactions = Application::with(['operator.todaZone'])
            ->where('status', 'pending_payment')
            ->get()
            ->map(function ($app) {
                return [
                    'id'       => $app->id,
                    'app_id'   => $app->reference_number,
                    'operator' => $app->operator ? $app->operator->full_name : 'N/A',
                    'type'     => $app->application_type === 'new' ? 'New Franchise Fee' : 'MTOP Renewal Fee',
                    'amount'   => 750.00, // Standard local tricycle application fee
                    'method'   => 'Walk-in (Cash)',
                    'ref'      => 'Awaiting Cashier',
                    'date'     => $app->updated_at->format('M d, Y - h:i A'),
                ];
            });

        return Inertia::render('Treasurer/PendingPayments', [
            'transactions' => $transactions,
        ]);
    }

    /**
     * Show verification form for a specific application.
     */
    public function show(Application $application): Response
    {
        $application->load(['operator.todaZone', 'tricycle']);

        $record = [
            'id'            => $application->id,
            'appId'         => $application->reference_number,
            'driver'        => $application->operator ? $application->operator->full_name : 'N/A',
            'toda'          => ($application->operator && $application->operator->todaZone) ? $application->operator->todaZone->name : 'Unassigned',
            'type'          => $application->application_type === 'new' ? 'New Franchise Application Fee' : 'MTOP Renewal Application Fee',
            'amount'        => 750.00,
            'method'        => 'Cashier Counter (OTC)',
            'refNo'         => 'OTC-' . $application->reference_number,
            'date'          => now()->format('M d, Y - h:i A'),
            'gatewayStatus' => 'PENDING_OTC_VERIFICATION'
        ];

        return Inertia::render('Treasurer/VerifyPayment', [
            'paymentId' => $application->id,
            'record'    => $record,
        ]);
    }

    /**
     * Confirm / Verify cash payment and issue official receipt.
     */
    public function store(Request $request, Application $application): RedirectResponse
    {
        $request->validate([
            'action'                  => 'required|in:verify,reject',
            'official_receipt_number' => 'required_if:action,verify|string|max:50|unique:payments,official_receipt_number',
            'amount'                  => 'required|numeric|min:0',
            'payment_method'          => 'required|in:cash,gcash,bank_transfer,check',
            'notes'                   => 'nullable|string',
        ]);

        $action = $request->input('action');

        DB::transaction(function () use ($application, $action, $request) {
            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            if ($action === 'verify') {
                $toStatus = 'paid';
                $toStep = 5; // Forward to Step 5: Scheme Issuance (BPLO)
                $notes = 'Payment captured and verified by Municipal Treasurer. Official Receipt issued.';

                // Register Payment in DB
                Payment::create([
                    'application_id'          => $application->id,
                    'processed_by'            => Auth::id(),
                    'official_receipt_number' => $request->input('official_receipt_number'),
                    'amount'                  => $request->input('amount'),
                    'payment_method'          => $request->input('payment_method'),
                    'payment_date'            => now()->toDateString(),
                    'payment_time'            => now()->toTimeString(),
                    'is_verified'             => true,
                    'verified_at'             => now(),
                    'notes'                   => $request->input('notes'),
                ]);
            } else {
                // If payment was rejected / voided, return back to review or inspection
                $toStatus = 'pending_inspection';
                $toStep = 3;
                $notes = 'Payment transaction voided by Treasurer. Forwarded back to physical inspection.';
            }

            $application->update([
                'status'       => $toStatus,
                'current_step' => $toStep,
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => Auth::id(),
                'from_status'    => $fromStatus,
                'to_status'      => $toStatus,
                'from_step'      => $fromStep,
                'to_step'        => $toStep,
                'notes'          => $notes,
                'created_at'     => now(),
            ]);
        });

        $message = $action === 'verify'
            ? 'Payment verified successfully. Official Receipt generated.'
            : 'Payment voided. Application returned to inspection queue.';

        return redirect()->route('treasurer.pending')->with('success', $message);
    }

    /**
     * Show all transaction records.
     */
    public function transactions(): Response
    {
        $transactions = Payment::with(['application.operator'])
            ->where('is_verified', true)
            ->orderBy('payment_date', 'desc')
            ->get()
            ->map(function ($pay) {
                return [
                    'id'       => $pay->id,
                    'app_id'   => $pay->application ? $pay->application->reference_number : 'N/A',
                    'operator' => ($pay->application && $pay->application->operator) ? $pay->application->operator->full_name : 'N/A',
                    'type'     => $pay->application ? ($pay->application->application_type === 'new' ? 'New Franchise Fee' : 'MTOP Renewal Fee') : 'Fee',
                    'amount'   => (float)$pay->amount,
                    'method'   => ucfirst($pay->payment_method),
                    'ref'      => $pay->official_receipt_number,
                    'date'     => $pay->payment_date->format('M d, Y') . ' - ' . ($pay->payment_time ? date('h:i A', strtotime($pay->payment_time)) : 'N/A'),
                ];
            });

        return Inertia::render('Treasurer/TransactionRecord', [
            'transactions' => $transactions,
        ]);
    }

    /**
     * Show official receipt details.
     */
    public function receipt($id): Response
    {
        $payment = Payment::with(['application.operator', 'application.tricycle', 'processedBy'])
            ->findOrFail($id);

        $receiptData = [
            'receipt_number' => $payment->official_receipt_number,
            'amount'         => (float)$payment->amount,
            'payment_method' => ucfirst($payment->payment_method),
            'payment_date'   => $payment->payment_date->format('F j, Y'),
            'payment_time'   => $payment->payment_time ? date('h:i A', strtotime($payment->payment_time)) : 'N/A',
            'operator'       => $payment->application->operator->full_name,
            'contact'        => $payment->application->operator->contact_number,
            'address'        => $payment->application->operator->address,
            'plate_number'   => $payment->application->tricycle->plate_number,
            'make_model'     => $payment->application->tricycle->make . ' ' . $payment->application->tricycle->model,
            'processed_by'   => $payment->processedBy->name,
            'reference_no'   => $payment->application->reference_number,
        ];

        return Inertia::render('Treasurer/Receipt', [
            'receipt' => $receiptData,
        ]);
    }
}
