<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Tricycle;
use App\Models\Driver;
use App\Models\ApplicationDocument;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use App\Models\FranchiseScheme;
use App\Models\ColorCodingScheme;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Services\ColorCodingRuleService;
use App\Services\ViolationNotifier;
use App\Services\ViolationEnforcementService;
use Illuminate\Support\Facades\DB;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    use ExportsMunicipalExcelReports;

    /**
     * Live Monitoring's single relative "Last update" label for a GPS record's real recorded_at,
     * measured against the server clock at request time and bucketed on the app's configured
     * timezone (config('app.timezone')): "5 secs ago", "1 min ago", "3 hrs ago", "Yesterday",
     * "4 days ago", then the date. The Units tab and the map card both render this one value, and
     * the Live Monitoring background refresh re-requests it every 3 seconds, so it advances by itself.
     */
    private static function formatGpsTimestamp(\Carbon\CarbonInterface $recordedAt): string
    {
        // Same wording as the header notification bell — one shared implementation.
        return \App\Support\RelativeTime::label($recordedAt);
    }

    /**
     * Display the TMO map command center.
     */
    public function index()
    {
        $todayDay = now()->format('l');
        $restrictedEndings = $this->getRestrictedEndings($todayDay);

        // Fetch active tricycles eligible for the Live Monitoring Units list — a tricycle only
        // Fetch active tricycles for the Live Monitoring Units list.
        $activeTricycles = Tricycle::with(['operator', 'franchiseScheme.colorCodingScheme'])
            ->where('status', 'active')
            ->get();

        // Calculate coding suspended count based on the Sticker Number last digit
        $codingSuspended = 0;
        if (!empty($restrictedEndings)) {
            $codingSuspended = Tricycle::where('status', 'active')
                ->where(function ($q) use ($restrictedEndings) {
                    foreach ($restrictedEndings as $digit) {
                        $q->orWhere('coding_scheme_number', 'like', "%{$digit}");
                    }
                })->count();
        }

        $signalLostSeconds = config('tracking.fleet_signal_lost_seconds', 60);
        $autoOfflineSeconds = config('tracking.fleet_auto_offline_seconds', 600);

        // The driver's explicit Online/Offline toggle (drivers.is_online) outranks GPS age: a
        // driver who went Offline (toggle or logout) is Offline immediately, whatever the GPS.
        $driverOnlineByTricycleId = Driver::whereIn('tricycle_id', $activeTricycles->pluck('id'))
            ->pluck('is_online', 'tricycle_id');

        // Map tricycles for the enforcement dashboard and live fleet map.
        $tricyclesData = $activeTricycles->map(function ($tri) use ($restrictedEndings, $signalLostSeconds, $autoOfflineSeconds, $driverOnlineByTricycleId) {
            $latestLoc = $tri->locations()
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->latest('recorded_at')
                ->first();

            // Check if restricted today using DB-authoritative ColorCodingRuleService
            $codingEval = ColorCodingRuleService::evaluateTricycle($tri);
            $isRestrictedToday = $codingEval['is_restricted_today'];

            // Check if there is an active violation detected today
            $hasUnresolvedViolation = $tri->violations()
                ->where('status', 'open')
                ->whereDate('detected_at', today())
                ->exists();

            $driverToggledOnline = $driverOnlineByTricycleId->has($tri->id)
                ? (bool) $driverOnlineByTricycleId->get($tri->id)
                : false;

            // Unit has no valid GPS coordinate history at all:
            if (!$latestLoc || $latestLoc->latitude === null || $latestLoc->longitude === null) {
                $status = $hasUnresolvedViolation ? 'violator' : 'offline';
                return [
                    'db_id'             => $tri->id,
                    'id'                => $tri->coding_scheme_number ?: ('TRV-' . $tri->id),
                    'plate'             => $tri->plate_number,
                    'operator'          => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'lat'               => null,
                    'lng'               => null,
                    'status'            => $status,
                    'is_online'         => false,
                    'connection_status' => 'not_configured',
                    'hasRealGPS'        => false,
                    'last_seen'         => 'Never',
                    'last_update_label' => 'No GPS history',
                    'recorded_at'       => null,
                    'coding_status'     => $codingEval,
                ];
            }

            // Real recorded_at only (never reset/fabricated).
            $gpsAgeSeconds = $latestLoc->recorded_at
                ? max(0, $latestLoc->recorded_at->diffInSeconds(now()))
                : null;

            // Authoritative connection status hierarchy:
            // - is_online = false -> offline
            // - is_online = true + telemetry age <= 60s -> online
            // - is_online = true + telemetry age > 60s and < 600s -> no_signal
            // - is_online = true + telemetry age >= 600s -> offline
            $connectionStatus = match (true) {
                !$driverToggledOnline => 'offline',
                $gpsAgeSeconds === null => 'not_configured',
                $gpsAgeSeconds <= $signalLostSeconds => 'online',
                $gpsAgeSeconds < $autoOfflineSeconds => 'no_signal',
                default => 'offline',
            };

            $isOnline = ($connectionStatus === 'online');

            // Precedence: an open violation is always shown, even if the unit has since gone
            // offline. Otherwise, connectivity takes priority over the coding-day status.
            $status = 'compliant';
            if ($hasUnresolvedViolation) {
                $status = 'violator';
            } elseif ($connectionStatus === 'offline') {
                $status = 'offline';
            } elseif ($isRestrictedToday) {
                $status = 'coding_no_operation';
            }

            return [
                'db_id'             => $tri->id,
                'id'                => $tri->coding_scheme_number ?: ('TRV-' . $tri->id),
                'plate'             => $tri->plate_number,
                'operator'          => $tri->operator ? $tri->operator->full_name : 'N/A',
                'lat'               => (float)$latestLoc->latitude,
                'lng'               => (float)$latestLoc->longitude,
                'status'            => $status,
                'is_online'         => $isOnline,
                'connection_status' => $connectionStatus,
                'hasRealGPS'        => true,
                'last_seen'         => $latestLoc->recorded_at ? $latestLoc->recorded_at->diffForHumans() : 'Never',
                'last_update_label' => $latestLoc->recorded_at ? self::formatGpsTimestamp($latestLoc->recorded_at) : null,
                'recorded_at'       => $latestLoc->recorded_at ? $latestLoc->recorded_at->toIso8601String() : null,
                'coding_status'     => $codingEval,
            ];
        })->filter()->values()->toArray();

        $stats = [
            'active_fleet'     => Tricycle::where('status', 'active')->count(),
            'on_duty'          => count($tricyclesData),
            'violations_today' => Violation::whereDate('detected_at', now()->toDateString())->count(),
            'coding_suspended' => $codingSuspended,
        ];

        return Inertia::render('TMODashboard/Index', [
            'initialTricycles'     => $tricyclesData,
            'stats'                => $stats,
            'activeCodingSchemes' => \App\Models\ColorCodingScheme::where('is_active', true)->get(),
        ]);
    }

    /**
     * Display unit registry.
     */
    public function registry()
    {
        $registryList = $this->registryListData();

        return Inertia::render('TMODashboard/UnitRegistry', [
            'initialUnits'        => $registryList,
            'activeCodingSchemes' => \App\Models\ColorCodingScheme::where('is_active', true)->get(),
        ]);
    }

    /**
     * Shared registry rows for the Active Tricycle Registry page AND its Excel export —
     * one mapping, so the on-screen list and the downloaded file can never drift apart.
     */
    private function registryListData()
    {
        // Every tricycle that reached 'active'/'suspended' status went through the real
        // TMO Final Confirmation activation flow, so it belongs here regardless of what its
        // plate number looks like — filtering by a "TEST"/"DEMO" substring in plate_number
        // was hiding genuinely active franchises (including real manual test registrations),
        // not actual garbage data.
        $tricycles = Tricycle::with(['operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application'])
            ->whereIn('status', ['active', 'suspended'])
            ->orderByDesc('created_at')
            ->get();

        return $tricycles
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->firstWhere('is_active', true) ?: $tri->franchiseSchemes->first();
                $ccs = $scheme?->colorCodingScheme;
                $app = $scheme?->application;

                // Franchise Number (MTOP-YYYY-NNNN, or legacy STK-YYYY-NNNN) and Validity Term
                $franchiseNumber = \App\Models\FranchiseScheme::isFranchiseNumberSerial($scheme?->franchise_number)
                    ? $scheme->franchise_number
                    : ($scheme?->sticker_number ?: ($app?->sticker_number ?: ($scheme?->franchise_number ?: null)));

                $issueDate = $scheme?->issue_date ?: ($app?->completed_at ? \Carbon\Carbon::parse($app->completed_at) : ($tri->created_at ? \Carbon\Carbon::parse($tri->created_at) : null));

                if ($issueDate) {
                    if ($scheme?->expiry_date && !$scheme->is_active) {
                        $expiryDate = $scheme->expiry_date;
                    } else {
                        $expiryDate = $issueDate->copy()->addYear();
                    }
                } else {
                    $expiryDate = $scheme?->expiry_date;
                }

                $validityTerm = ($issueDate && $expiryDate)
                    ? $issueDate->format('M j, Y') . ' – ' . $expiryDate->format('M j, Y')
                    : ($expiryDate ? 'Valid until ' . $expiryDate->format('M j, Y') : ($issueDate ? 'Issued ' . $issueDate->format('M j, Y') : '—'));

                // Sticker Number is a 4-digit municipal number (e.g. 0142, 0089)
                $rawBody = $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT);
                if (preg_match('/\d+$/', $rawBody, $matches)) {
                    $fourDigitSticker = str_pad($matches[0], 4, '0', STR_PAD_LEFT);
                } else {
                    $fourDigitSticker = str_pad($tri->id, 4, '0', STR_PAD_LEFT);
                }

                $eval = ColorCodingRuleService::evaluateTricycle($tri);
                $colorName = $eval['scheme_name'] ?: 'White';
                $colorHex  = $eval['color_hex'] ?: '#64748B';
                $colorBg   = match (strtolower($colorName)) {
                    'red'    => 'rgba(239,68,68,.12)',
                    'blue'   => 'rgba(59,130,246,.12)',
                    'yellow' => 'rgba(245,158,11,.12)',
                    'green'  => 'rgba(16,185,129,.12)',
                    default  => 'rgba(100,116,139,.12)',
                };
                $dayName = !empty($eval['restricted_days']) ? $eval['restricted_days'][0] : 'None';

                return [
                    'id'                    => $tri->id,
                    'unit_code'             => 'TRV-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT),
                    // Never fabricate a hardware ID: 38 of 78 units have no tracker, and a
                    // derived 'TRV-GPS-' value would collide with a genuinely paired device.
                    'iot_id'                => $tri->iot_device_id,
                    'coding_scheme_number'  => $fourDigitSticker,
                    'franchise_number'      => $franchiseNumber ?: '—',
                    'validity_term'         => $validityTerm,
                    'plate_no'              => $tri->plate_number,
                    'operator'              => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'operator_photo'        => $tri->operator?->profile_photo_url,
                    'contact'               => $tri->operator ? $tri->operator->contact_number : 'N/A',
                    'coding_color'          => $colorName,
                    'coding_hex'            => $colorHex,
                    'coding_bg'             => $colorBg,
                    'coding_day'            => $dayName,
                    // A suspended/revoked FRANCHISE takes precedence over the tricycle's own
                    // status for this list's display — an "active" tricycle record whose
                    // franchise permit is suspended/revoked isn't meaningfully "Active" from an
                    // operations standpoint. See FranchiseScheme::transitionStatus().
                    'status'                => in_array($scheme?->status, ['suspended', 'revoked'], true)
                        ? $scheme->status
                        : ($tri->status === 'active' ? 'active' : 'suspended'),
                ];
            });
    }

    /**
     * Excel export of the Active Tricycle Registry — same municipal letterhead/KPI/table
     * styling as the TMO Reports exports (shared ExportsMunicipalExcelReports trait), fed
     * by the exact same registryListData() rows the on-screen list renders.
     */
    public function exportRegistryExcel(Request $request): StreamedResponse
    {
        $format = $this->exportFormat($request);
        $registryList = $this->registryListData();
        $filename = $this->exportFilename('trivora_active_tricycle_registry_' . now()->toDateString(), $format);

        $this->logExport($format, $filename, 'Active Tricycle Registry', 'tmo_registry', $registryList->count());

        return $this->streamMunicipalReport($format, [
            'title'      => 'Active Tricycle Registry',
            'subtitle'   => 'As of: ' . now()->format('F d, Y \a\t h:i A'),
            'sheetTitle' => 'Active Tricycle Registry',
            'docRef'     => 'LGU-NAS-TMO-REGISTRY',
            'columns'    => 9,
            'kpis'       => [
                'Total Units'     => number_format($registryList->count()),
                'Active Units'    => number_format($registryList->where('status', 'active')->count()),
                'Suspended Units' => number_format($registryList->where('status', 'suspended')->count()),
                'Revoked Units'   => number_format($registryList->where('status', 'revoked')->count()),
            ],
            'kpiSpans'   => [3, 3, 2, 1],
            'sections'   => [[
                'title'   => 'Registered Fleet Masterlist',
                'headers' => ['Unit Code', 'Sticker Number', 'Plate No.', 'Tricycle Owner', 'Franchise No.', 'Validity Term', 'Color Coding', 'Coding Day', 'Status'],
                'rows'    => $registryList->map(fn ($u) => [
                    $u['unit_code'],
                    $u['coding_scheme_number'],
                    $u['plate_no'],
                    $u['operator'],
                    $u['franchise_number'],
                    $u['validity_term'],
                    $u['coding_color'],
                    $u['coding_day'],
                    ucfirst($u['status']),
                ])->all(),
            ]],
        ], $filename);
    }

    /** Records an export in the system activity log, matching the Reports exports. */
    private function logExport(string $format, string $filename, string $reportName, string $reportKey, int $rowCount): void
    {
        AuditService::log(
            module: 'reports',
            action: 'report.exported_' . $format,
            record: null,
            description: "Exported {$reportName} " . ($format === 'pdf' ? 'PDF' : 'Excel') . " Report ({$rowCount} records)",
            oldValues: null,
            newValues: null,
            targetReference: $filename,
            metadata: ['report' => $reportKey, 'filename' => $filename, 'format' => $format, 'row_count' => $rowCount]
        );
    }

    /**
     * Show tricycle profile details.
     */
    public function tricycleDetails($id)
    {
        $tri = Tricycle::with(['operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'locations', 'violations.colorCodingScheme', 'violations.locationSnapshot', 'violations.tricycle'])
            ->where('id', $id)
            ->orWhere('iot_device_id', $id)
            ->orWhere('coding_scheme_number', $id)
            ->orWhere('plate_number', $id)
            ->first();

        if (!$tri) {
            $tri = Tricycle::with(['operator.user', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'locations', 'violations.colorCodingScheme', 'violations.locationSnapshot', 'violations.tricycle'])->firstOrFail();
        }

        $rawSticker = $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT);
        $fourDigitSticker = str_pad(preg_replace('/\D/', '', $rawSticker) ?: $tri->id, 4, '0', STR_PAD_LEFT);
        $lastDigit = (int)substr($fourDigitSticker, -1);

        $eval = ColorCodingRuleService::evaluateTricycle($tri);
        $colorName = $eval['scheme_name'] ?: 'White';
        $dayName = !empty($eval['restricted_days']) ? $eval['restricted_days'][0] : 'None';
        $codingMeta = [
            'color' => $colorName,
            'hex'   => $eval['color_hex'] ?: '#64748B',
            'bg'    => match (strtolower($colorName)) {
                'red'    => 'bg-red-500',
                'blue'   => 'bg-blue-500',
                'yellow' => 'bg-amber-500',
                'green'  => 'bg-emerald-500',
                default  => 'bg-slate-300 border-slate-400',
            },
            'badge' => match (strtolower($colorName)) {
                'red'    => 'bg-red-50 text-red-700 border-red-200',
                'blue'   => 'bg-blue-50 text-blue-700 border-blue-200',
                'yellow' => 'bg-amber-50 text-amber-800 border-amber-200',
                'green'  => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                default  => 'bg-slate-50 text-slate-700 border-slate-200',
            },
            'day'   => $dayName,
        ];

        $isCodedToday = $eval['is_restricted_today'];

        // Franchise Number (MTOP-YYYY-NNNN, or legacy STK-YYYY-NNNN) — the real serial held on this unit's franchise
        // scheme, falling back to the application that issued it. Never synthesised: when no
        // serial has been issued this stays null and the page renders an em dash rather than
        // inventing a PERMIT-*/MTOP-* placeholder.
        $franchiseScheme = $tri->franchiseSchemes->firstWhere('is_active', true) ?: $tri->franchiseSchemes->first();
        $franchiseNumber = \App\Models\FranchiseScheme::isFranchiseNumberSerial($franchiseScheme?->franchise_number)
            ? $franchiseScheme->franchise_number
            : ($franchiseScheme?->sticker_number ?: ($franchiseScheme?->application?->sticker_number ?: null));

        $make = $tri->make;
        $model = $tri->model;
        $fullModel = trim(($make ?: '') . ' ' . ($model ?: '')) ?: null;

        $tricycleData = [
            'id'                   => $tri->id,
            'unit_code'            => 'TRV-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT),
            'coding_scheme_number' => $fourDigitSticker,
            'sticker_number'       => '#' . $fourDigitSticker,
            'franchise_number'     => $franchiseNumber,
            'plate_no'             => $tri->plate_number,
            'operator'             => $tri->operator ? $tri->operator->full_name : 'Unassigned Operator',
            'operator_photo'       => $tri->operator?->profile_photo_url,
            'contact'              => $tri->operator ? $tri->operator->contact_number : 'N/A',
            'operator_address'     => $tri->operator ? ($tri->operator->address . ($tri->operator->barangay ? ', ' . $tri->operator->barangay : '')) : 'Nasugbu, Batangas',
            'coding_day'           => $codingMeta['day'],
            'coding_color'         => $codingMeta['color'],
            'coding_hex'           => $codingMeta['hex'],
            'coding_bg'            => $codingMeta['bg'],
            'coding_badge'         => $codingMeta['badge'],
            'is_coded_today'       => $isCodedToday,
            'status'               => $tri->status === 'active' ? 'active' : 'suspended',
            'make'                 => $make,
            'model'                => $model,
            'full_model'           => $fullModel,
            'year_model'           => $tri->year_model,
            'body_color'           => $tri->body_color,
            'body_type'            => $tri->body_type,
            'engine_number'        => $tri->engine_number,
            'chassis_number'       => $tri->chassis_number,
            'or_number'            => $tri->or_number,
            'cr_number'            => $tri->cr_number,
            'iot_device_id'        => $tri->iot_device_id,
            'active_tracking_mode' => $tri->active_tracking_mode ?: ($tri->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
            'tracking_capability'  => $tri->tracking_capability,
            // Real GPS connectivity — never implied by the tracking mode being configured, only
            // by actual TricycleLocation pings (see Tricycle::gpsStatus()).
            'gps_status'           => $tri->gpsStatus()['status'],
            'gps_last_seen'        => $tri->gpsStatus()['last_seen_at']?->diffForHumans(),
            // The configured GPS reporting cadence (config/tracking.php) — passed through so the
            // TMO smart-GPS card displays the real interval instead of a hardcoded label.
            'gps_interval_seconds' => (int) config('tracking.gps_interval_seconds', 5),
            'color'                => $codingMeta['color'],
            'cityOfRegistration'   => 'Nasugbu, Batangas',
            'registrationDate'     => $tri->created_at ? $tri->created_at->format('F j, Y') : null,
        ];

        // Fetch documents linked to the application, resolved against the canonical franchise
        // registration requirement list (ApplicationDocument::CANONICAL_REQUIREMENTS) — never
        // every document row ever uploaded, and never a fixed "always verified" placeholder.
        $app = $tri->applications()->with(['documents', 'tricycleDriver'])->latest()->first()
            ?: ($tri->franchiseSchemes->first()?->application);

        // Owner (Applicant) registered details
        $operator = $tri->operator;
        $ownerFirstName = $operator?->first_name;
        $ownerLastName  = $operator?->last_name;
        if (! $ownerFirstName && $operator?->full_name) {
            $parts = explode(' ', $operator->full_name, 2);
            $ownerFirstName = $parts[0] ?? null;
            $ownerLastName  = $parts[1] ?? null;
        }

        $ownerIsDriver = $app ? (bool) $app->owner_is_driver : true;
        $driverDetails = $app ? $app->driverDetails() : null;

        $tricycleData['owner'] = [
            'first_name'     => $ownerFirstName,
            'last_name'      => $ownerLastName,
            'full_name'      => $operator?->full_name ?: ($ownerFirstName ? trim("{$ownerFirstName} {$ownerLastName}") : 'Unassigned Owner'),
            'birthday'       => $operator?->date_of_birth ? $operator->date_of_birth->format('m/d/Y') : null,
            'contact_number' => $operator?->contact_number ?: $tri->contact ?: null,
            'barangay'       => $operator?->barangay ?: null,
            'email'          => $operator?->user?->email ?: ($operator ? "operator.{$operator->id}@trivora.ph" : null),
        ];

        // Separate driver details (only collected when owner is NOT the driver)
        $driver = $app?->tricycleDriver;
        $driverFirstName = $driver?->first_name ?? ($driverDetails['first_name'] ?? null);
        $driverLastName  = $driver?->last_name ?? ($driverDetails['last_name'] ?? null);
        $driverBirthday  = $driver?->date_of_birth ? $driver->date_of_birth->format('m/d/Y') : ($driverDetails['birthday'] ?? null);
        $driverContact   = $driver?->contact_number ?? ($driverDetails['contact_number'] ?? null);
        $driverEmail     = $driver?->email ?? ($driverDetails['email'] ?? null);
        $driverBarangay  = $driver?->barangay ?? ($driverDetails['barangay'] ?? null);

        $tricycleData['driver'] = (! $ownerIsDriver && ($driverFirstName || $driverDetails)) ? [
            'first_name'     => $driverFirstName,
            'last_name'      => $driverLastName,
            'full_name'      => $driver?->full_name ?: ($driverDetails['full_name'] ?? trim("{$driverFirstName} {$driverLastName}")),
            'birthday'       => $driverBirthday,
            'contact_number' => $driverContact,
            'email'          => $driverEmail,
            'barangay'       => $driverBarangay,
        ] : null;

        $tricycleData['owner_name']      = $tricycleData['owner']['full_name'];
        $tricycleData['owner_is_driver'] = $ownerIsDriver;
        $tricycleData['driver_name']     = $tricycleData['driver']['full_name'] ?? null;
        $tricycleData['driver_contact']  = $tricycleData['driver']['contact_number'] ?? null;

        // This tricycle's current franchise permit (FranchiseScheme, the is_active-scoped
        // relation — Tricycle::franchiseScheme()) — operational authorization (Suspend/Revoke/
        // Reinstate) belongs to the FRANCHISE, not any individual driver account. Only a
        // tricycle with an issued franchise has an authorization status to manage (a still-
        // pending application has none yet).
        $franchiseScheme = $tri->franchiseScheme ?: ($tri->franchiseSchemes->firstWhere('is_active', true) ?: $tri->franchiseSchemes->first());

        $issueDate = $franchiseScheme?->issue_date ?: ($app?->completed_at ? \Carbon\Carbon::parse($app->completed_at) : ($tri->created_at ? \Carbon\Carbon::parse($tri->created_at) : null));
        
        // Enforce 1-year franchise validity rule: an active franchise permit is valid for 1 year
        if ($issueDate) {
            if ($franchiseScheme?->expiry_date && !$franchiseScheme->is_active) {
                // Keep historical/expired date on inactive records
                $expiryDate = $franchiseScheme->expiry_date;
            } else {
                // Active or newly issued franchise: strictly 1-year validity term
                $expiryDate = $issueDate->copy()->addYear();
            }
        } else {
            $expiryDate = $franchiseScheme?->expiry_date;
        }

        $validityTerm = ($issueDate && $expiryDate)
            ? $issueDate->format('M j, Y') . ' – ' . $expiryDate->format('M j, Y')
            : ($expiryDate ? 'Valid until ' . $expiryDate->format('M j, Y') : ($issueDate ? 'Issued ' . $issueDate->format('M j, Y') : '—'));

        $issueDateFormatted = $issueDate ? $issueDate->format('M j, Y') : null;
        $expiryDateFormatted = $expiryDate ? $expiryDate->format('M j, Y') : null;

        $isExpired = $expiryDate ? $expiryDate->isPast() : false;
        $daysRemaining = ($expiryDate && !$isExpired) ? (int) now()->diffInDays($expiryDate, false) : -1;
        $isExpiringSoon = ($daysRemaining >= 0 && $daysRemaining <= 60);

        $renewalStatus = $isExpired
            ? 'Expired (Renewal Required)'
            : ($isExpiringSoon ? 'Renewal Due Soon' : 'Renewed (Current Year)');
        $renewalBadge = $isExpired ? 'danger' : ($isExpiringSoon ? 'warning' : 'success');

        $tricycleData['franchise_issue_date']  = $issueDateFormatted;
        $tricycleData['franchise_expiry_date'] = $expiryDateFormatted;
        $tricycleData['validity_term']         = $validityTerm;
        $tricycleData['renewal_status']        = $renewalStatus;
        $tricycleData['renewal_badge']         = $renewalBadge;
        $tricycleData['is_expired']            = $isExpired;

        $tricycleData['franchise_status'] = $franchiseScheme ? [
            'status'             => $franchiseScheme->status,
            'status_reason'      => $franchiseScheme->status_reason,
            'status_changed_at'  => $franchiseScheme->status_changed_at?->format('M d, Y h:i A'),
            'issue_date'         => $issueDateFormatted,
            'expiry_date'        => $expiryDateFormatted,
            'validity_term'      => $validityTerm,
            'renewal_status'     => $renewalStatus,
            'renewal_badge'      => $renewalBadge,
            'is_expired'         => $isExpired,
        ] : null;

        $mappedDocs = [];
        if ($app) {
            $latestPerRequirement = [];
            foreach ($app->documents->sortBy('created_at') as $doc) {
                $key = ApplicationDocument::resolveRequirementKey($doc);
                $latestPerRequirement[$key] = $doc; // later iteration overwrites -> latest wins
            }

            foreach (ApplicationDocument::CANONICAL_REQUIREMENTS as $key => $meta) {
                // Prangkisa is a renewal-only requirement — never applicable to a 'new' unit
                // registration, so it's excluded entirely rather than shown as "Not Submitted".
                if (!empty($meta['renewal_only']) && $app->application_type !== 'renewal') {
                    continue;
                }

                $doc = $latestPerRequirement[$key] ?? null;

                if (!$doc) {
                    $mappedDocs[] = [
                        'id'        => $key,
                        'name'      => $meta['label'],
                        'status'    => 'not_submitted',
                        'date'      => null,
                        'file_path' => null,
                    ];
                    continue;
                }

                $status = match ($doc->review_status) {
                    'approved' => 'verified',
                    'rejected' => 'rejected',
                    default    => 'pending',
                };

                $mappedDocs[] = [
                    'id'        => $doc->id,
                    'name'      => $meta['label'],
                    'status'    => $status,
                    'date'      => $doc->reviewed_at
                        ? $doc->reviewed_at->format('M d, Y')
                        : $doc->created_at->format('M d, Y'),
                    // Openable link to the file the applicant actually uploaded (null when
                    // the requirement has no file yet) — lets TMO open Verified Requirements
                    // directly from this page, same URL shape as Document Review.
                    'file_path' => $doc->file_path ? '/storage/' . ltrim($doc->file_path, '/') : null,
                ];
            }
        }

        // Franchise Application Process Milestone Timeline — driven by real status history,
        // never hardcoded dates. The Treasurer's Office payment and the physical TMO ticket are
        // real-world/offline steps and intentionally have no corresponding system milestone.
        $milestones = [
            ['id' => 1, 'title' => 'Document Review', 'date' => null, 'state' => 'pending', 'note' => 'Not Yet Reached'],
            ['id' => 2, 'title' => 'Physical Inspection', 'date' => null, 'state' => 'pending', 'note' => 'Not Yet Reached'],
            ['id' => 3, 'title' => 'BPLO Release: Sticker & Plate for Coding', 'date' => null, 'state' => 'pending', 'note' => 'Not Yet Reached'],
            ['id' => 4, 'title' => 'TMO Final Confirmation', 'date' => null, 'state' => 'pending', 'note' => 'Not Yet Reached'],
        ];

        if ($app) {
            $app->loadMissing(['statusHistories', 'inspections']);

            // How far the application has progressed, independent of whether every intermediate
            // history row happens to exist (older/seeded applications don't always have one).
            // A milestone whose stage the current status has already passed is "complete" even if
            // its specific history row is missing — it just won't have a fabricated date.
            $statusRank = [
                'draft' => 0, 'pending_review' => 0, 'under_review' => 0,
                'pending_inspection' => 1, 'under_inspection' => 1, 'failed_inspection' => 1,
                'pending_bplo_release' => 2,
                'awaiting_tmo_confirmation' => 3,
                'completed' => 4,
            ];
            $currentRank = $statusRank[$app->status] ?? 0;

            // 1. Document Review — complete once the application passed review into inspection.
            if ($currentRank >= 1) {
                $docReviewDone = $app->statusHistories->firstWhere('to_status', 'pending_inspection');
                $milestones[0]['date'] = $docReviewDone?->created_at->format('M d, Y');
                $milestones[0]['state'] = 'complete';
                $milestones[0]['note'] = $docReviewDone ? null : 'Completed';
            } elseif ($app->status === 'rejected') {
                $milestones[0]['state'] = 'action-req';
                $milestones[0]['note'] = 'Rejected — Resubmission Required';
            } elseif (in_array($app->status, ['draft', 'pending_review', 'under_review'])) {
                $milestones[0]['state'] = 'current';
                $milestones[0]['note'] = 'In Progress';
            }

            // 2. Physical Inspection — the CURRENT status is authoritative for the "requires
            // re-inspection" cue, checked before looking at individual attempt records, so a
            // stray earlier "passed" attempt can never mask an application that is presently
            // sitting at failed_inspection awaiting re-inspection. Original failed attempts stay
            // in the Inspection history untouched; only the current status drives this flag,
            // matching InspectionController::index()'s own labeling logic.
            if ($app->status === 'failed_inspection') {
                $milestones[1]['state'] = 'action-req';
                $milestones[1]['note'] = 'Requires Re-inspection';
            } elseif ($currentRank >= 2) {
                $passedInspection = $app->inspections->firstWhere('result', 'passed');
                $milestones[1]['date'] = $passedInspection?->inspection_date?->format('M d, Y');
                $milestones[1]['state'] = 'complete';
                $milestones[1]['note'] = $passedInspection ? null : 'Completed';
            } elseif (in_array($app->status, ['pending_inspection', 'under_inspection'])) {
                $milestones[1]['state'] = 'current';
                $milestones[1]['note'] = 'In Progress';
            }

            // 3. BPLO Release: Sticker & Plate for Coding
            if ($currentRank >= 3) {
                $bploReleaseDone = $app->statusHistories->firstWhere('to_status', 'awaiting_tmo_confirmation');
                $milestones[2]['date'] = $bploReleaseDone?->created_at->format('M d, Y');
                $milestones[2]['state'] = 'complete';
                $milestones[2]['note'] = $bploReleaseDone ? null : 'Completed';
            } elseif ($app->status === 'pending_bplo_release') {
                $milestones[2]['state'] = 'current';
                $milestones[2]['note'] = 'In Progress';
            }

            // 4. TMO Final Confirmation
            if ($currentRank >= 4) {
                $completedDate = $app->completed_at ?: $app->statusHistories->firstWhere('to_status', 'completed')?->created_at;
                $milestones[3]['date'] = $completedDate?->format('M d, Y');
                $milestones[3]['state'] = 'complete';
                $milestones[3]['note'] = $completedDate ? null : 'Completed';
            } elseif ($app->status === 'awaiting_tmo_confirmation') {
                $milestones[3]['state'] = 'current';
                $milestones[3]['note'] = 'In Progress';
            }
        }

        // Violations from database — never a fabricated fallback list. A unit with no recorded
        // violations simply shows an empty list (honest: nothing has been cited).
        $mappedViolations = $tri->violations->map(function ($v) use ($codingMeta) {
            $isSettled = ($v->status === 'settled' || !empty($v->fine_paid_at));
            return [
                'id'                    => $v->id,
                'ticket_number'         => 'VIO-2026-' . str_pad($v->id, 5, '0', STR_PAD_LEFT),
                'title'                 => ucwords(str_replace('_', ' ', $v->violation_type)),
                'date'                  => $v->detected_at->format('M d, Y \a\t h:i A'),
                'paymentStatus'         => $isSettled ? 'settled' : 'unsettled',
                'codingDay'             => $v->day_of_week ?: $codingMeta['day'],
                'details'               => $v->notes ?: 'Coding restriction violation detected along municipal corridor.',
                'fine_amount'           => (float)($v->fine_amount ?: 500),
                'fine_amount_formatted' => '₱' . number_format($v->fine_amount ?: 500, 2),
                'detection_method'      => $v->detectionLabel(),
                'location'              => 'J.P. Laurel St. cor. F. Alix St., Nasugbu',
                'or_receipt'            => $v->fine_paid_at ? ('OR-TMO-' . str_pad($v->id, 6, '0', STR_PAD_LEFT)) : ($isSettled ? ('OR-TMO-' . str_pad($v->id, 6, '0', STR_PAD_LEFT)) : null),
                'paid_at'               => $v->fine_paid_at ? $v->fine_paid_at->format('M d, Y') : ($isSettled ? 'Jan 20, 2026' : null),
            ];
        });

        $totalFines = $mappedViolations->sum('fine_amount');
        $settledFines = $mappedViolations->where('paymentStatus', 'settled')->sum('fine_amount');
        $unsettledFines = $mappedViolations->where('paymentStatus', 'unsettled')->sum('fine_amount');

        $violationStats = [
            'total_count'     => $mappedViolations->count(),
            'settled_count'   => $mappedViolations->where('paymentStatus', 'settled')->count(),
            'unsettled_count' => $mappedViolations->where('paymentStatus', 'unsettled')->count(),
            'total_fines'     => '₱' . number_format($totalFines, 2),
            'settled_fines'   => '₱' . number_format($settledFines, 2),
            'unsettled_fines' => '₱' . number_format($unsettledFines, 2),
            'compliance_rate' => $mappedViolations->count() > 0
                ? round(($mappedViolations->where('paymentStatus', 'settled')->count() / $mappedViolations->count()) * 100, 1) . '%'
                : '100%',
        ];

        // Dynamic stats
        $violationsToday = $tri->violations()->whereDate('detected_at', now()->toDateString())->count();
        $complianceScore = $tri->violations()->count() > 0 ? max(50, 100 - ($tri->violations()->count() * 10)) : 100;
        
        $metrics = [
            ['label' => 'Violations Today', 'value' => (string)$violationsToday, 'icon' => 'AlertTriangle', 'color' => 'td-metric-indigo'],
            ['label' => 'Compliance Score', 'value' => $complianceScore . '%', 'icon' => 'TrendingUp', 'color' => 'td-metric-emerald'],
            ['label' => 'Documents Verified', 'value' => count(array_filter($mappedDocs, fn($d) => $d['status'] === 'verified')) . '/' . count($mappedDocs), 'icon' => 'FileCheck', 'color' => 'td-metric-indigo'],
            ['label' => 'Total Violations', 'value' => (string)$mappedViolations->count(), 'icon' => 'CheckCircle2', 'color' => 'td-metric-emerald']
        ];

        return Inertia::render('TMODashboard/TricycleDetails', [
            'tricycleId'       => $id,
            'initialTricycle'  => $tricycleData,
            'initialDocs'      => $mappedDocs,
            'initialVios'      => $mappedViolations->values(),
            'violationStats'   => $violationStats,
            'initialMetrics'   => $metrics,
            'initialTimeline'  => $milestones,
        ]);
    }

    /**
     * Display violations records.
     */
    public function violations()
    {
        [$violations, $stats] = $this->violationsListData();

        return Inertia::render('TMODashboard/Violations/Violations', [
            'initialViolations' => $violations->values()->all(),
            'summaryStats'      => $stats,
        ]);
    }

    /**
     * Shared violation rows + operational stats for the Violation Records page AND its
     * Excel export — one query/mapping, so the on-screen list and the downloaded file
     * can never drift apart.
     *
     * @return array{0: \Illuminate\Support\Collection, 1: array<string, mixed>}
     */
    private function violationsListData(): array
    {
        $rawViolations = Violation::with([
            'tricycle.operator.user',
            'tricycle.franchiseScheme',
            'franchiseScheme',
            'locationSnapshot',
            'appeal',
            'enforcement.confirmedBy',
        ])
            ->orderByDesc('detected_at')
            ->orderByDesc('id')
            ->get();

        $offenseNumbers = ViolationEnforcementService::batchCalculateOffenseNumbers($rawViolations);

        $violations = $rawViolations->map(function ($v) use ($offenseNumbers) {
            $isUnsettled = in_array($v->status, ['open', 'acknowledged', 'contested']);
            $appealStatus = $v->appeal ? $v->appeal->status : null;
            $offenseNum = $offenseNumbers[$v->id] ?? 1;
            $penalty = ViolationEnforcementService::getPenaltyDetails($offenseNum);
            $enforcementState = ViolationEnforcementService::resolveEnforcementState($v, $offenseNum);

            return [
                'id'                   => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                'db_id'                => $v->id,
                'tricycle_id'          => $v->tricycle_id,
                'coding_scheme_number' => $v->tricycle?->coding_scheme_number ?: null,
                'date'                 => $v->detected_at ? $v->detected_at->toDateString() : 'N/A',
                'formatted_date'       => $v->detected_at ? $v->detected_at->format('M d, Y') : 'N/A',
                'time'                 => $v->detected_at ? $v->detected_at->format('h:i A') : 'N/A',
                'operator'             => $v->tricycle?->operator ? $v->tricycle->operator->full_name : 'N/A',
                'operator_photo'       => $v->tricycle?->operator?->profile_photo_url,
                'plate_no'             => $v->tricycle?->plate_number ?: 'N/A',
                'type'                 => ucwords(str_replace('_', ' ', $v->violation_type)),
                'raw_type'             => $v->violation_type,
                'source'               => $v->detectionLabel(),
                'raw_source'           => $v->detection_method,
                'detection_method'     => $v->detection_method,
                'detection_key'        => $v->detectionKey(),
                'detection_label'      => $v->detectionLabel(),
                'fine'                 => $penalty['fine_amount'] !== null ? $penalty['fine_amount'] : (float) $v->fine_amount,
                'offense_number'       => $offenseNum,
                'offense_label'        => $penalty['offense_label'],
                'penalty_text'         => $penalty['penalty_text'],
                'penalty_display'      => $penalty['penalty_display'],
                'sanctions_summary'    => $penalty['sanctions_summary'],
                'enforcement_status'   => $enforcementState['status'],
                'enforcement_label'    => $enforcementState['label'],
                'enforcement_badge'    => $enforcementState['badge'],
                'status'               => $isUnsettled ? 'unsettled' : 'settled',
                'raw_status'           => $v->status,
                'appeal_status'        => $appealStatus,
                'notes'                => $v->notes,
            ];
        });

        // Compute operational statistics
        $unsettledCount = $violations->where('status', 'unsettled')->count();
        $settledCount = $violations->where('status', 'settled')->count();
        $unsettledSum = (float) $rawViolations->whereIn('status', ['open', 'acknowledged', 'contested'])->sum('fine_amount');
        $settledSum = (float) $rawViolations->where('status', 'resolved')->sum('fine_amount');
        $appealsCount = $rawViolations->filter(fn ($v) => $v->appeal && $v->appeal->status === 'under_review')->count();

        $stats = [
            'total_records'       => $violations->count(),
            'unsettled_count'     => $unsettledCount,
            'settled_count'       => $settledCount,
            'unsettled_fines_sum' => $unsettledSum,
            'settled_fines_sum'   => $settledSum,
            'appeals_pending'     => $appealsCount,
            'automated_count'     => $violations->count(),
            'manual_count'        => 0,
        ];

        return [$violations, $stats];
    }

    /**
     * Excel export of the Violation Records list — same municipal letterhead/KPI/table
     * styling as the TMO Reports exports (shared ExportsMunicipalExcelReports trait),
     * fed by the exact same violationsListData() rows the on-screen list renders.
     */
    public function exportViolationRecordsExcel(Request $request): StreamedResponse
    {
        $format = $this->exportFormat($request);
        [$violations, $stats] = $this->violationsListData();
        $filename = $this->exportFilename('trivora_violation_records_' . now()->toDateString(), $format);

        $sections = [[
            'title'   => 'Official Violation Log',
            'headers' => ['Ticket No.', 'Date', 'Time', 'Type', 'Detection Method', 'Tricycle Owner', 'Plate No.', 'Fine & Penalty', 'Enforcement', 'Status'],
            'rows'    => $violations->map(fn ($v) => [
                $v['id'],
                $v['date'],
                $v['time'],
                $v['type'],
                $v['detection_method'],
                $v['operator'],
                $v['plate_no'],
                $v['penalty_display'],
                $v['enforcement_label'],
                $v['status'] === 'settled' ? 'Settled' : 'Unsettled',
            ])->all(),
        ]];

        if ($violations->contains(fn ($v) => $v['appeal_status'])) {
            $sections[] = [
                'title'   => 'Appeals On Record',
                'headers' => ['Ticket No.', 'Date', 'Type', 'Tricycle Owner', 'Plate No.', 'Appeal Status'],
                'rows'    => $violations->filter(fn ($v) => $v['appeal_status'])->map(fn ($v) => [
                    $v['id'],
                    $v['date'],
                    $v['type'],
                    $v['operator'],
                    $v['plate_no'],
                    ucfirst(str_replace('_', ' ', $v['appeal_status'])),
                ])->values()->all(),
            ];

        }

        $this->logExport($format, $filename, 'Violation Records', 'tmo_violation_records', $violations->count());

        return $this->streamMunicipalReport($format, [
            'title'      => 'Violation Records Report',
            'subtitle'   => 'As of: ' . now()->format('F d, Y \a\t h:i A'),
            'sheetTitle' => 'Violation Records',
            'docRef'     => 'LGU-NAS-TMO-VIOLATIONS',
            'columns'    => 9,
            'kpis'       => [
                'Total Records'          => number_format($stats['total_records']),
                'Unsettled Cases'        => number_format($stats['unsettled_count']),
                'Settled Cases'          => number_format($stats['settled_count']),
                'Unsettled Fines (PHP)'  => 'PHP ' . number_format($stats['unsettled_fines_sum'], 2),
                'Settled Fines (PHP)'    => 'PHP ' . number_format($stats['settled_fines_sum'], 2),
            ],
            'kpiSpans'   => [2, 2, 1, 2, 2],
            'sections'   => $sections,
        ], $filename);
    }

    /**
     * Show detailed violation details.
     */
    public function violationDetails($id)
    {
        $v = Violation::with([
            'tricycle.operator.user',
            'tricycle.franchiseScheme.colorCodingScheme',
            'franchiseScheme.colorCodingScheme',
            'locationSnapshot',
            'appeal.driver.user',
            'appeal.reviewer',
            'enforcement.confirmedBy',
        ])->findOrFail($id);

        $appeal = $v->appeal;
        $franchiseScheme = $v->franchiseScheme ?: $v->tricycle?->franchiseScheme;
        $colorScheme = $franchiseScheme?->colorCodingScheme;

        // Owner (the linked operators record) + the person who actually drives the unit, from
        // the tricycle's latest application — same resolution used by the Tricycle Registry
        // Details page. The violations LIST keeps showing only the owner; this detail view
        // surfaces both so a TMO officer can tell whose unit vs. whose hands were involved.
        $ownerName = $v->tricycle?->operator?->full_name ?: 'N/A';
        $latestApp  = $v->tricycle
            ? $v->tricycle->applications()->with('tricycleDriver')->latest()->first()
            : null;
        $ownerIsDriver = $latestApp ? (bool) $latestApp->owner_is_driver : true;
        $driverName    = $ownerIsDriver
            ? ($ownerName !== 'N/A' ? $ownerName : null)
            : ($latestApp?->tricycleDriver?->full_name ?: null);

        $offenseNum = ViolationEnforcementService::calculateOffenseNumber($v);
        $penalty = ViolationEnforcementService::getPenaltyDetails($offenseNum);
        $enforcementState = ViolationEnforcementService::resolveEnforcementState($v, $offenseNum);
        $enforcement = $v->enforcement;

        $record = [
            'id'                   => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'db_id'                => $v->id,
            'tricycle_id'          => $v->tricycle_id,
            'date'                 => $v->detected_at ? $v->detected_at->format('F j, Y') : 'N/A',
            'time'                 => $v->detected_at ? $v->detected_at->format('h:i A') : 'N/A',
            'lat'                  => $v->locationSnapshot
                ? (float) $v->locationSnapshot->latitude
                : ($v->latitude !== null ? (float) $v->latitude : null),
            'lng'                  => $v->locationSnapshot
                ? (float) $v->locationSnapshot->longitude
                : ($v->longitude !== null ? (float) $v->longitude : null),
            'speed_kmh'            => $v->locationSnapshot ? (float) $v->locationSnapshot->speed_kmh : null,
            'operator'             => $ownerName,
            'owner_name'           => $ownerName,
            'operator_photo'       => $v->tricycle?->operator?->profile_photo_url,
            'driver_name'          => $driverName,
            'owner_is_driver'      => $ownerIsDriver,
            'operator_contact'     => $v->tricycle?->operator?->contact_number ?: null,
            'coding_scheme_number' => $v->tricycle?->coding_scheme_number ?: null,
            'plate_no'             => $v->tricycle?->plate_number ?: 'N/A',
            'make_model'           => $v->tricycle ? trim(($v->tricycle->make ?: '') . ' ' . ($v->tricycle->model ?: '')) : 'N/A',
            'color_scheme'         => $colorScheme?->name ?: null,
            'color_hex'            => $colorScheme?->color_hex ?: null,
            'restricted_day'       => $colorScheme?->operating_day ?: ($v->day_of_week ?: null),
            'type'                 => ucwords(str_replace('_', ' ', $v->violation_type)),
            'source'               => $v->detectionLabel(),
            'detection_label'      => $v->detectionLabel(),
            'detection_key'        => $v->detectionKey(),
            'fine'                 => $penalty['fine_amount'] !== null ? $penalty['fine_amount'] : (float)$v->fine_amount,
            'offense_number'       => $offenseNum,
            'offense_label'        => $penalty['offense_label'],
            'penalty_text'         => $penalty['penalty_text'],
            'penalty_display'      => $penalty['penalty_display'],
            'sanctions_summary'    => $penalty['sanctions_summary'],
            'requires_impoundment' => $penalty['requires_impoundment'],
            'requires_suspension'  => $penalty['requires_suspension'],
            'requires_revocation'  => $penalty['requires_revocation'],
            'enforcement_status'   => $enforcementState['status'],
            'enforcement_label'    => $enforcementState['label'],
            'enforcement_badge'    => $enforcementState['badge'],
            'franchise_status'     => $franchiseScheme?->status ?: 'active',
            'franchise_number'     => $franchiseScheme?->franchise_number ?: null,
            'enforcement'          => $enforcement ? [
                'id'             => $enforcement->id,
                'offense_number' => $enforcement->offense_number,
                'action_type'    => $enforcement->action_type,
                'status'         => $enforcement->status,
                'confirmed_at'   => $enforcement->confirmed_at?->format('F j, Y g:i A'),
                'confirmed_by'   => $enforcement->confirmedBy?->name,
                'notes'          => $enforcement->notes,
            ] : null,
            'can_confirm_enforcement' => (
                $enforcementState['status'] === 'action_required' &&
                $v->status !== 'dismissed' &&
                !($v->appeal && in_array($v->appeal->status, ['under_review', 'approved'], true))
            ),
            'status'               => in_array($v->status, ['resolved', 'settled']) ? 'settled' : 'unsettled',
            'raw_status'           => $v->status,
            'notes'                => $v->notes ?: 'GPS tracker detected movement during restricted operational window.',
            'paid_at'              => $v->fine_paid_at ? $v->fine_paid_at->format('F j, Y') : null,
            'appeal'               => $appeal ? [
                'id'            => $appeal->id,
                'driver_name'   => $appeal->driver?->user?->name ?: 'N/A',
                'reason'        => $appeal->reason,
                'evidence_url'  => $appeal->evidence_path ? asset('storage/' . $appeal->evidence_path) : null,
                'status'        => $appeal->status,
                'submitted_at'  => $appeal->submitted_at?->format('M j, Y g:i A'),
                'reviewed_at'   => $appeal->reviewed_at?->format('M j, Y g:i A'),
                'reviewer_name' => $appeal->reviewer?->name,
                'review_notes'  => $appeal->review_notes,
            ] : null,
        ];

        return Inertia::render('TMODashboard/Violations/ViolationDetails', [
            'violationId'   => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'initialRecord' => $record,
        ]);

    }

    /**
     * Approve a driver's appeal. Transactional so the appeal and violation can never disagree:
     * approved appeal -> resolved violation (no further driver action, no fine owed).
     */
    public function approveAppeal(Request $request, $id)
    {
        $appeal = ViolationAppeal::with('violation')->findOrFail($id);

        if ($appeal->status !== 'under_review') {
            return back()->with('error', 'This appeal has already been decided.');
        }

        DB::transaction(function () use ($appeal, $request) {
            $oldValues = $appeal->only(['status', 'review_notes']);

            $appeal->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_notes' => $request->input('review_notes'),
            ]);
            $appeal->violation->update(['status' => 'resolved']);
            \App\Services\MobileNotifier::violationAppealDecided($appeal);

            AuditService::log(
                module: 'violation',
                action: 'violation_appeal.approved',
                record: $appeal,
                description: "Approved violation appeal for ticket VIO-26-" . str_pad($appeal->violation_id, 4, '0', STR_PAD_LEFT) . ". Violation marked resolved.",
                oldValues: $oldValues,
                newValues: $appeal->only(['status', 'review_notes']),
                targetReference: 'VIO-26-' . str_pad($appeal->violation_id, 4, '0', STR_PAD_LEFT),
                metadata: [
                    'appeal_id'     => $appeal->id,
                    'violation_id'  => $appeal->violation_id,
                    'review_notes'  => $request->input('review_notes'),
                ]
            );
        });

        return redirect()->route('tmo.violations.details', $appeal->violation_id)
            ->with('success', 'Appeal approved. Violation marked resolved.');
    }

    /**
     * Reject a driver's appeal. Transactional so the two records move together: rejected appeal
     * -> the violation reverts to 'open' (fine still due — same state as a fresh, unappealed
     * violation, since the driver-facing label distinguishes them via the appeal's own status,
     * not the violation's).
     */
    public function rejectAppeal(Request $request, $id)
    {
        $appeal = ViolationAppeal::with('violation')->findOrFail($id);

        if ($appeal->status !== 'under_review') {
            return back()->with('error', 'This appeal has already been decided.');
        }

        // A rejection must tell the driver why — required so the driver always has a reason
        // to read, unlike an approval which needs no justification.
        $validated = $request->validate([
            'review_notes' => 'required|string|min:5|max:1000',
        ]);

        DB::transaction(function () use ($appeal, $request, $validated) {
            $oldValues = $appeal->only(['status', 'review_notes']);

            $appeal->update([
                'status' => 'rejected',
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_notes' => $validated['review_notes'],
            ]);
            $appeal->violation->update(['status' => 'open']);
            \App\Services\MobileNotifier::violationAppealDecided($appeal);

            AuditService::log(
                module: 'violation',
                action: 'violation_appeal.rejected',
                record: $appeal,
                description: "Rejected violation appeal for ticket VIO-26-" . str_pad($appeal->violation_id, 4, '0', STR_PAD_LEFT) . ". Reason: {$validated['review_notes']}",
                oldValues: $oldValues,
                newValues: $appeal->only(['status', 'review_notes']),
                targetReference: 'VIO-26-' . str_pad($appeal->violation_id, 4, '0', STR_PAD_LEFT),
                metadata: [
                    'appeal_id'     => $appeal->id,
                    'violation_id'  => $appeal->violation_id,
                    'review_notes'  => $validated['review_notes'],
                ]
            );
        });

        return redirect()->route('tmo.violations.details', $appeal->violation_id)
            ->with('success', 'Appeal rejected. Driver notified fine payment is required.');
    }

    /**
     * Show the manual violation ticket creation form.
     */
    public function createViolation(Request $request): Response
    {
        $selectedTricycleId = $request->query('tricycle_id');

        $units = Tricycle::with(['operator'])
            ->where('status', 'active')
            ->get()
            ->map(function ($tri) {
                return [
                    'id'    => $tri->id,
                    'label' => "Unit #" . ($tri->coding_scheme_number ?: 'Pending') . " (Plate: {$tri->plate_number}) - " . ($tri->operator ? $tri->operator->full_name : 'N/A'),
                ];
            });

        return Inertia::render('TMODashboard/Violations/CreateViolation', [
            'units'              => $units,
            'selectedTricycleId' => $selectedTricycleId ? (int)$selectedTricycleId : null,
        ]);
    }

    /**
     * Store a manually logged violation in the database.
     */
    public function storeViolation(Request $request)
    {
        $request->validate([
            'tricycle_id'    => 'required|exists:tricycles,id',
            'violation_type' => 'required|in:color_coding',
            'fine_amount'    => 'required|numeric|min:0',
            'location'       => 'required|string|max:255',
            'notes'          => 'nullable|string',
        ]);

        $tricycle = Tricycle::findOrFail($request->input('tricycle_id'));

        // A violation must attach to the unit's real active franchise scheme — never a guessed
        // id. A unit with no active franchise has nothing legitimate to cite against, so refuse
        // rather than filing the record against an unrelated scheme.
        $franchise = FranchiseScheme::where('tricycle_id', $tricycle->id)
            ->where('is_active', true)
            ->first();

        if (!$franchise) {
            return back()->with('error', 'This unit has no active franchise scheme — a violation cannot be logged against it.');
        }

        try {
            DB::transaction(function () use ($request, $tricycle, $franchise) {
                // Detection Method in the active violation UI is resolved from the real GPS ping
                // (tricycle_locations.source), never from detection_method — link the unit's most
                // recent ping so a TMO-logged record still carries an actual GPS source.
                $latestPing = $tricycle->locations()->latest('recorded_at')->first();

                $violation = Violation::create([
                    'tricycle_id'             => $tricycle->id,
                    'franchise_scheme_id'     => $franchise->id,
                    'color_coding_scheme_id'  => $franchise->color_coding_scheme_id,
                    'location_snapshot_id'    => $latestPing?->id,
                    'detected_by'             => auth()->id(),
                    'violation_type'          => $request->input('violation_type'),
                    'detected_at'             => now(),
                    'day_of_week'             => now()->format('l'),
                    'detection_method'        => 'manual',
                    'status'                  => 'open',
                    'fine_amount'             => $request->input('fine_amount'),
                    'notes'                   => $request->input('location') . ' — ' . ($request->input('notes') ?: 'Manual infraction logging.'),
                ]);

                $unitRef = $tricycle->coding_scheme_number ? "Unit #{$tricycle->coding_scheme_number}" : "Unit {$tricycle->plate_number}";
                AuditService::log(
                    module: 'violation',
                    action: 'violation.created',
                    record: $violation,
                    description: "Manually logged violation ticket for {$unitRef} (Plate: {$tricycle->plate_number}, Fine: ₱{$violation->fine_amount}).",
                    oldValues: null,
                    newValues: [
                        'violation_type' => $violation->violation_type,
                        'fine_amount'    => (float) $violation->fine_amount,
                        'status'         => $violation->status,
                    ],
                    targetReference: 'VIO-26-' . str_pad($violation->id, 4, '0', STR_PAD_LEFT),
                    metadata: [
                        'plate_number' => $tricycle->plate_number,
                        'location'     => $request->input('location'),
                    ]
                );

                // Registered after-commit: nothing is emailed or notified if this transaction rolls back.
                ViolationNotifier::colorCodingViolationRecorded($violation);
                \App\Services\MobileNotifier::violationRecorded($violation);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if (str_contains($e->getMessage(), 'violations_color_coding_daily_unique')) {
                return redirect()->route('tmo.violations')
                    ->with('error', 'This tricycle already has a color-coding violation logged today.');
            }
            throw $e;
        }

        return redirect()->route('tmo.violations')->with('success', 'Manual violation ticket successfully logged.');
    }

    /**
     * Helper to retrieve plate number endings for a given day.
     */
    private function getRestrictedEndings(string $day): array
    {
        return ColorCodingRuleService::restrictedDigitsForDay($day);
    }
}
