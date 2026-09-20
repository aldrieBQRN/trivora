<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\FranchiseScheme;
use App\Models\GpsDevice;
use App\Models\TodaZone;
use App\Models\Tricycle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FinalConfirmationController extends Controller
{
    /**
     * Display the TMO Final Confirmation & GPS Setup single page queue.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        $query = Application::with([
            'operator.user',
            'operator.todaZone',
            'tricycle.todaZone',
            'payment',
            'franchiseScheme.colorCodingScheme',
            'inspections.inspector'
        ])
            // 'completed' rows are still fetched here (not dropped) because the page's own
            // "Completed" tab/count (FinalConfirmationQueue.jsx's statusFilter) reviews them —
            // removing them from the query would silently break that existing feature. What
            // actually needed fixing was the page defaulting to showing both mixed together;
            // that default now lives on the frontend (statusFilter starts on 'awaiting').
            ->whereIn('status', ['awaiting_tmo_confirmation', 'completed'])
            ->when($search, function ($q, $term) {
                $q->where(function ($sub) use ($term) {
                    $sub->where('reference_number', 'like', "%{$term}%")
                        ->orWhere('sticker_number', 'like', "%{$term}%")
                        ->orWhereHas('operator', function ($op) use ($term) {
                            $op->where('first_name', 'like', "%{$term}%")
                               ->orWhere('last_name', 'like', "%{$term}%");
                        })
                        ->orWhereHas('tricycle', function ($tri) use ($term) {
                            $tri->where('plate_number', 'like', "%{$term}%")
                                ->orWhere('coding_scheme_number', 'like', "%{$term}%");
                        });
                });
            })
            // See InspectionController::index() for why this is the status-history timestamp
            // rather than updated_at — the true, immutable "entered this queue" moment.
            ->addSelect(['queue_entered_at' => ApplicationStatusHistory::select('created_at')
                ->whereColumn('application_id', 'applications.id')
                ->orderByDesc('created_at')
                ->orderByDesc('id') // tiebreaker when two transitions land in the same second
                ->limit(1),
            ])
            ->orderByRaw("CASE WHEN status = 'awaiting_tmo_confirmation' THEN 0 ELSE 1 END")
            ->orderBy('queue_entered_at', 'asc');

        $applications = $query->get()->map(function ($app) {
            $scheme = $app->franchiseScheme;
            $operator = $app->operator;
            $tricycle = $app->tricycle;
            $payment = $app->payment;
            $ticket = $app->payment_ticket;
            $lastInspection = $app->inspections->where('result', 'passed')->last();

            $todaName = ($tricycle && $tricycle->todaZone)
                ? $tricycle->todaZone->name
                : (($operator && $operator->todaZone) ? $operator->todaZone->name : 'Unassigned');
            $todaId = $tricycle?->toda_zone_id ?? $operator?->toda_id;

            $driverUser = $operator?->user;
            $driverEmail = $driverUser?->email ?? ('driver.' . strtolower(preg_replace('/[^a-z0-9]/i', '', $operator?->first_name ?? 'driver')) . '@trivora.ph');
            $driverPhone = $operator?->contact_number ?? '09XXXXXXXXX';

            $suggestedSerial = $tricycle?->iot_device_id ?: ('TRV-GPS-' . str_pad($tricycle?->id ?? $app->id, 4, '0', STR_PAD_LEFT));
            $gpsStatus = $tricycle ? $tricycle->gpsStatus() : ['status' => 'awaiting', 'last_seen_at' => null];
            $pairedDevice = $tricycle?->gpsDevice;

            return [
                'id'                  => $app->id,
                'reference'           => $app->reference_number,
                'status'              => $app->status === 'completed' ? 'Completed / Active' : 'Awaiting Final Confirmation',
                'raw_status'          => $app->status,
                'application_type'    => ucfirst($app->application_type),
                'operator_name'       => $operator ? $operator->full_name : 'N/A',
                'driver_email'        => $driverEmail,
                'driver_phone'        => $driverPhone,
                'contact_number'      => $driverPhone,
                'address'             => $operator ? $operator->address : 'N/A',
                'barangay'            => $operator ? $operator->barangay : 'N/A',
                'toda_zone'           => $todaName,
                'toda_id'             => $todaId,
                'plate_number'        => $tricycle ? $tricycle->plate_number : 'N/A',
                'make_model'          => $tricycle ? "{$tricycle->make} {$tricycle->model}" : 'N/A',
                'engine_number'       => $tricycle ? $tricycle->engine_number : 'N/A',
                'chassis_number'      => $tricycle ? $tricycle->chassis_number : 'N/A',
                'coding_number'       => $tricycle?->coding_scheme_number ?: ($scheme?->franchise_number ?: 'N/A'),
                'body_number'         => $tricycle?->coding_scheme_number ?: ($scheme?->franchise_number ?: 'N/A'),
                'sticker_number'      => $app->sticker_number ?: ($scheme ? $scheme->sticker_number : 'N/A'),
                'color_scheme'        => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->name : 'Standard',
                'color_hex'           => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->color_hex : '#1C2340',
                'restricted_days'     => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->restricted_days : [],
                'or_number'           => $payment ? $payment->official_receipt_number : 'N/A',
                'payment_amount'      => $payment ? (float)$payment->amount : 750.00,
                'payment_date'        => $payment && $payment->payment_date ? $payment->payment_date->format('M d, Y') : 'N/A',
                'ticket_number'       => $ticket['ticket_number'] ?? 'TKT-2026-00000',
                'inspection_date'     => $lastInspection && $lastInspection->inspection_date ? $lastInspection->inspection_date->format('M d, Y') : 'N/A',
                'inspector_name'      => $lastInspection && $lastInspection->inspector ? $lastInspection->inspector->name : 'TMO Inspector',
                'tracking_method'     => $app->tracking_method ?: ($tricycle && $tricycle->active_tracking_mode === 'iot_device' ? 'iot_device' : 'mobile_gps'),
                'iot_device_id'       => $app->iot_device_id ?: ($tricycle ? $tricycle->iot_device_id : ''),
                'suggested_iot_id'    => $suggestedSerial,
                'gps_status'          => $gpsStatus['status'],
                'gps_last_seen_at'    => $gpsStatus['last_seen_at'] ? $gpsStatus['last_seen_at']->format('M d, Y · h:i A') : null,
                'device_imei'         => $pairedDevice?->imei,
                'device_sim_number'   => $pairedDevice?->sim_number,
                'updated_at'          => $app->updated_at ? $app->updated_at->format('M d, Y · h:i A') : 'N/A',
            ];
        });

        $awaitingCount = Application::where('status', 'awaiting_tmo_confirmation')->count();
        $confirmedTodayCount = ApplicationStatusHistory::where('changed_by', Auth::id())
            ->whereDate('created_at', now()->toDateString())
            ->where('to_status', 'completed')
            ->distinct('application_id')
            ->count();
        $iotActiveCount = Tricycle::where('active_tracking_mode', 'iot_device')->where('status', 'active')->count();
        $mobileActiveCount = Tricycle::where('active_tracking_mode', 'mobile_app')->where('status', 'active')->count();
        $todaZones = TodaZone::orderBy('name')->get(['id', 'name']);

        return Inertia::render('TMODashboard/FinalConfirmationQueue', [
            'applications'        => $applications,
            'searchTerm'          => $search ?: '',
            'awaitingCount'       => $awaitingCount,
            'confirmedTodayCount' => $confirmedTodayCount,
            'iotActiveCount'      => $iotActiveCount,
            'mobileActiveCount'   => $mobileActiveCount,
            'todaZones'           => $todaZones,
        ]);
    }

    /**
     * Show dedicated TMO Final Confirmation verification screen.
     */
    public function show(Application $application): Response
    {
        $application->load([
            'operator.user',
            'operator.todaZone',
            'tricycle.todaZone',
            'payment',
            'franchiseScheme.colorCodingScheme',
            'inspections.inspector',
            'statusHistories.changedBy'
        ]);

        $scheme = $application->franchiseScheme;
        $operator = $application->operator;
        $tricycle = $application->tricycle;
        $payment = $application->payment;
        $ticket = $application->payment_ticket;

        $todaName = ($tricycle && $tricycle->todaZone)
            ? $tricycle->todaZone->name
            : (($operator && $operator->todaZone) ? $operator->todaZone->name : 'Unassigned');

        $driverUser = $operator?->user;
        $driverEmail = $driverUser?->email ?? ('driver.' . strtolower(preg_replace('/[^a-z0-9]/i', '', $operator?->first_name ?? 'driver')) . '@trivora.ph');
        $driverPhone = $operator?->contact_number ?? '09XXXXXXXXX';

        $suggestedSerial = $tricycle?->iot_device_id ?: ('TRV-GPS-' . str_pad($tricycle?->id ?? $application->id, 4, '0', STR_PAD_LEFT));
        $gpsStatus = $tricycle ? $tricycle->gpsStatus() : ['status' => 'awaiting', 'last_seen_at' => null];
        $pairedDevice = $tricycle?->gpsDevice;

        $appData = [
            'id'                  => $application->id,
            'reference'           => $application->reference_number,
            'status'              => $application->status,
            'application_type'    => ucfirst($application->application_type),
            'operator_name'       => $operator ? $operator->full_name : 'N/A',
            'driver_email'        => $driverEmail,
            'driver_phone'        => $driverPhone,
            'contact_number'      => $driverPhone,
            'address'             => $operator ? $operator->address : 'N/A',
            'barangay'            => $operator ? $operator->barangay : 'N/A',
            'toda_zone'           => $todaName,
            'plate_number'        => $tricycle ? $tricycle->plate_number : 'N/A',
            'make_model'          => $tricycle ? "{$tricycle->make} {$tricycle->model}" : 'N/A',
            'engine_number'       => $tricycle ? $tricycle->engine_number : 'N/A',
            'chassis_number'      => $tricycle ? $tricycle->chassis_number : 'N/A',
            'coding_number'       => $tricycle?->coding_scheme_number ?: ($scheme?->franchise_number ?: 'N/A'),
            'body_number'         => $tricycle?->coding_scheme_number ?: ($scheme?->franchise_number ?: 'N/A'),
            'sticker_number'      => $application->sticker_number ?: ($scheme ? $scheme->sticker_number : 'N/A'),
            'color_scheme'        => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->name : 'N/A',
            'color_hex'           => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->color_hex : '#1C2340',
            'restricted_days'     => ($scheme && $scheme->colorCodingScheme) ? $scheme->colorCodingScheme->restricted_days : [],
            'payment'             => $payment ? [
                'or_number' => $payment->official_receipt_number,
                'amount'    => (float)$payment->amount,
                'date'      => $payment->payment_date ? $payment->payment_date->format('M d, Y') : 'N/A',
            ] : null,
            'ticket_number'       => $ticket['ticket_number'] ?? 'TKT-2026-00000',
            'tracking_method'     => $application->tracking_method ?: ($tricycle && $tricycle->active_tracking_mode === 'iot_device' ? 'iot_device' : 'mobile_gps'),
            'iot_device_id'       => $application->iot_device_id ?: ($tricycle ? $tricycle->iot_device_id : ''),
            'suggested_iot_id'    => $suggestedSerial,
            'gps_status'          => $gpsStatus['status'],
            'gps_last_seen_at'    => $gpsStatus['last_seen_at'] ? $gpsStatus['last_seen_at']->format('M d, Y · h:i A') : null,
            'device_imei'         => $pairedDevice?->imei,
            'device_sim_number'   => $pairedDevice?->sim_number,
        ];

        return Inertia::render('TMODashboard/FinalConfirmationDetail', [
            'application' => $appData,
        ]);
    }

    /**
     * Complete final confirmation, record GPS tracking method, issue IoT device if selected, and activate franchise.
     */
    public function confirm(Request $request, Application $application): RedirectResponse
    {
        $request->validate([
            'signed_ticket_verified'        => 'required|accepted',
            'bplo_approval_confirmed'       => 'required|accepted',
            'sticker_possession_confirmed'  => 'required|accepted',
            'tracking_method'               => 'required|in:mobile_gps,iot_device',
            'iot_device_id'                 => 'nullable|required_if:tracking_method,iot_device|string|max:50',
            // Optional foundation fields for the physical tracker record (gps_devices) — the
            // real ST-901L wire identifier format is unverified until hardware is captured, so
            // neither is required yet. Not stored on applications/tricycles; gps_devices is the
            // sole home for device identity.
            'imei'                          => 'nullable|string|max:20',
            'sim_number'                    => 'nullable|string|max:20',
            // Set only when the officer has explicitly acknowledged re-pairing a tracker that is
            // currently paired to a different tricycle — see the duplicate-pairing guard below.
            'reassign_confirmed'            => 'nullable|boolean',
            'officer_notes'                 => 'nullable|string|max:500',
        ]);

        // The queue (index()) only ever lists 'awaiting_tmo_confirmation' applications, but that's
        // just a display filter — it doesn't stop this POST action from being invoked directly
        // against an application in any other state. Enforce the workflow state here too, so a
        // stale page, a replayed request, or a direct call can never activate a franchise or touch
        // GPS configuration out of order.
        if ($application->status !== 'awaiting_tmo_confirmation') {
            return back()->withErrors([
                'status' => "This application cannot be finally confirmed — its current status is \"{$application->status}\", not \"awaiting_tmo_confirmation\".",
            ]);
        }

        $trackingMethod = $request->input('tracking_method');
        $iotDeviceId = $trackingMethod === 'iot_device' ? trim($request->input('iot_device_id')) : null;
        $imei = $trackingMethod === 'iot_device' ? $request->input('imei') : null;
        $simNumber = $trackingMethod === 'iot_device' ? $request->input('sim_number') : null;
        $officerNotes = $request->input('officer_notes');
        $tricycle = $application->tricycle;

        // Guard against the same physical tracker being silently claimed by two tricycles at
        // once. This only ever blocks when the identifier is currently 'paired' to a *different*
        // tricycle than this application's own unit — re-submitting the same form for the same
        // tricycle (or pairing a brand-new/unprovisioned/revoked identifier) is never blocked.
        // Reassignment is still possible, just explicit: the officer must acknowledge it via
        // reassign_confirmed before the swap is allowed to proceed.
        $reassignFromTricycleId = null;
        if ($trackingMethod === 'iot_device' && $tricycle) {
            $conflictingDevice = GpsDevice::where('device_identifier', $iotDeviceId)
                ->where('status', 'paired')
                ->where('tricycle_id', '!=', $tricycle->id)
                ->first();

            if ($conflictingDevice) {
                if (!$request->boolean('reassign_confirmed')) {
                    return back()->withErrors([
                        'iot_device_id' => "Tracker #{$iotDeviceId} is already paired to another tricycle (unit #{$conflictingDevice->tricycle_id}). Confirm reassignment to move it to this tricycle instead.",
                    ])->withInput();
                }

                $reassignFromTricycleId = $conflictingDevice->tricycle_id;
            }
        }

        DB::transaction(function () use ($application, $tricycle, $trackingMethod, $iotDeviceId, $imei, $simNumber, $officerNotes, $reassignFromTricycleId) {
            // 0. If this tracker is being moved off another tricycle, that tricycle no longer has
            // ANY device paired to it — its own iot_device_id must be cleared (tricycles has a DB
            // unique constraint on iot_device_id, so leaving the old copy in place would collide
            // with the new pairing below) and its tracking mode reverted to mobile, since it now
            // has no working IoT device. Re-pairing a different physical unit onto that tricycle
            // is a separate, later action — not fabricated here.
            if ($reassignFromTricycleId) {
                Tricycle::where('id', $reassignFromTricycleId)->update([
                    'iot_device_id'        => null,
                    'tracking_capability'  => 'mobile_only',
                    'active_tracking_mode' => 'mobile_app',
                ]);
            }

            $fromStatus = $application->status;
            $fromStep = $application->current_step;

            $scheme = $application->franchiseScheme;

            // 1. Activate the unit and record the chosen tracking method. Deliberately does NOT
            // seed a TricycleLocation row here — a freshly-activated tricycle has zero GPS
            // history until its driver's phone (or IoT device, once paired) actually reports a
            // real fix. The TMO map and this queue's gps_status already handle "no ping yet"
            // gracefully, so faking one would only make an unconnected unit look connected.
            if ($tricycle) {
                $tricycle->update([
                    'status'               => 'active',
                    'iot_device_id'        => $iotDeviceId,
                    'tracking_capability'  => $trackingMethod === 'iot_device' ? 'iot_enabled' : 'mobile_only',
                    'active_tracking_mode' => $trackingMethod === 'iot_device' ? 'iot_device' : 'mobile_app',
                ]);
            }

            // 1b. Register/re-pair the physical tracker record. gps_devices is the source of
            // truth for device identity; tricycles.iot_device_id above stays only as a
            // human-facing display copy. updateOrCreate on device_identifier means re-pairing an
            // already-known tracker (including one moved from another tricycle, once the guard
            // above has cleared it) updates its single existing row rather than creating a
            // duplicate — the old device record is never deleted, only repointed. Status starts
            // 'paired' but connectionStatus() still reports 'awaiting' until real telemetry
            // exists (last_seen_at stays null — nothing here fabricates a signal).
            if ($tricycle && $trackingMethod === 'iot_device') {
                GpsDevice::updateOrCreate(
                    ['device_identifier' => $iotDeviceId],
                    [
                        'imei'        => $imei,
                        'sim_number'  => $simNumber,
                        'model'       => 'ST-901L',
                        'tricycle_id' => $tricycle->id,
                        'status'      => 'paired',
                        'paired_at'   => now(),
                        'paired_by'   => Auth::id(),
                    ]
                );
            }

            // 2. Activate Franchise Scheme Permit
            if ($scheme) {
                $trackingSummary = $trackingMethod === 'iot_device'
                    ? "IoT Hardware Device #{$iotDeviceId}"
                    : "Trivora Driver Mobile App GPS";

                $scheme->update([
                    'is_active' => true,
                    'notes'     => DB::raw("CONCAT(COALESCE(notes, ''), ' [Activated by TMO Officer " . Auth::user()->name . " on " . now()->toDateTimeString() . " | Tracking: {$trackingSummary}]')"),
                ]);
            }

            // 3. Mark Application as Completed
            $toStatus = 'completed';
            $toStep = 6;
            $finalRemarks = "Franchise completed and activated. Tracking method: " .
                ($trackingMethod === 'iot_device' ? "IoT Device #{$iotDeviceId}" : "Mobile GPS") .
                ($officerNotes ? " (Remarks: {$officerNotes})" : "");

            $application->update([
                'status'          => $toStatus,
                'current_step'    => $toStep,
                'tracking_method' => $trackingMethod,
                'iot_device_id'   => $iotDeviceId,
                'completed_at'    => now(),
                'remarks'         => $finalRemarks,
            ]);

            // 4. Log status change history
            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'changed_by'     => Auth::id(),
                'from_status'    => $fromStatus,
                'to_status'      => $toStatus,
                'from_step'      => $fromStep,
                'to_step'        => $toStep,
                'notes'          => $finalRemarks,
                'created_at'     => now(),
            ]);
        });

        $methodLabel = $trackingMethod === 'iot_device' ? "IoT Hardware Device #{$iotDeviceId}" : "Mobile App GPS";
        $driverName = $application->operator ? $application->operator->full_name : 'Driver';

        return redirect()->route('tmo.final-confirmation')->with('success', "Franchise for {$driverName} is now ACTIVE! Tracking method registered: {$methodLabel}.");
    }
}
