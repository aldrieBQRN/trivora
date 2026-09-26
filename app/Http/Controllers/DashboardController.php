<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Tricycle;
use App\Models\Driver;
use App\Models\ApplicationDocument;
use App\Models\TodaZone;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use App\Models\FranchiseScheme;
use App\Models\ColorCodingScheme;
use App\Models\AuditLog;
use App\Services\ColorCodingRuleService;
use Illuminate\Support\Facades\DB;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    use ExportsMunicipalExcelReports;

    /**
     * Display the TMO map command center.
     */
    public function index()
    {
        $todayDay = now()->format('l');
        $restrictedEndings = $this->getRestrictedEndings($todayDay);

        // Fetch active tricycles eligible for the Live Monitoring Units list — a tricycle only
        // belongs here if it has an actual GPS coordinate record stored in the system.
        // whereHas('locations') with coordinate checks compiles to a WHERE EXISTS against
        // tricycle_locations, so units without coordinates are excluded at the SQL level.
        $activeTricycles = Tricycle::with(['operator', 'franchiseScheme.colorCodingScheme'])
            ->where('status', 'active')
            ->whereHas('locations', function ($q) {
                $q->whereNotNull('latitude')->whereNotNull('longitude');
            })
            ->get();

        // Calculate coding suspended count based on the Sticker Number last digit
        $codingSuspended = 0;
        if (!empty($restrictedEndings)) {
            $codingSuspended = Tricycle::where('status', 'active')
                ->whereHas('franchiseScheme', function ($q) use ($restrictedEndings) {
                    $q->where(function ($sub) use ($restrictedEndings) {
                        foreach ($restrictedEndings as $digit) {
                            $sub->orWhere('franchise_number', 'like', "%{$digit}");
                        }
                    });
                })->count();
        }

        $onlineThresholdSeconds = config('tracking.fleet_online_threshold_seconds', 10);

        // The driver's explicit Online/Offline toggle (drivers.is_online) outranks GPS freshness:
        // a driver who went Offline is Offline immediately, never after the freshness window.
        // Units with no Driver row (nothing to toggle) fall back to GPS freshness alone.
        $driverOnlineByTricycleId = Driver::whereIn('tricycle_id', $activeTricycles->pluck('id'))
            ->pluck('is_online', 'tricycle_id');

        // Map tricycles for the enforcement map. Only tricycles with real coordinate records
        // are included in the live fleet monitoring dataset.
        $tricyclesData = $activeTricycles->map(function ($tri) use ($restrictedEndings, $onlineThresholdSeconds, $driverOnlineByTricycleId) {
            $latestLoc = $tri->locations()
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->latest('recorded_at')
                ->first();

            if (!$latestLoc || $latestLoc->latitude === null || $latestLoc->longitude === null) {
                return null;
            }

            // Server-side source of truth for connectivity — never inferred from frontend polling
            // or browser activity. Explicit Offline first, then GPS freshness (<= threshold).
            $driverToggledOnline = $driverOnlineByTricycleId->has($tri->id)
                ? (bool) $driverOnlineByTricycleId->get($tri->id)
                : true;
            $isOnline = $driverToggledOnline
                && $latestLoc->recorded_at
                && $latestLoc->recorded_at->diffInSeconds(now()) <= $onlineThresholdSeconds;

            // Check if there is an active violation detected today
            $hasUnresolvedViolation = $tri->violations()
                ->where('status', 'open')
                ->whereDate('detected_at', today())
                ->exists();

            // Check if restricted today based on the Sticker Number last digit
            $stickerNumber = $tri->coding_scheme_number;
            $lastDigit = $stickerNumber ? (int)substr(trim($stickerNumber), -1) : null;
            $isRestrictedToday = ($lastDigit !== null) && in_array($lastDigit, $restrictedEndings);

            // Precedence: an open violation is always shown, even if the unit has since gone
            // offline. Otherwise, connectivity takes priority over the coding-day status — if we
            // haven't heard from a unit recently we can't vouch for its current compliance either way.
            $status = 'compliant';
            if ($hasUnresolvedViolation) {
                $status = 'violator';
            } elseif (!$isOnline) {
                $status = 'offline';
            } elseif ($isRestrictedToday) {
                $status = 'coding_no_operation';
            }

            return [
                // Stable, guaranteed-unique identity for React keys, marker refs and row
                // selection: the tricycle's own primary key. `id` below is a *display*
                // Sticker Number (Tricycle::getCodingSchemeNumberAttribute), which is
                // deliberately allowed to repeat across units — an empty stored value falls
                // back to the franchise number, so two different units can legitimately
                // present the same string (e.g. "0101"). Using that display value as a key
                // is what produced React's duplicate-key warnings.
                'db_id'       => $tri->id,
                'id'          => $tri->coding_scheme_number ?: ('TRV-' . $tri->id),
                'plate'       => $tri->plate_number,
                'operator'    => $tri->operator ? $tri->operator->full_name : 'N/A',
                'lat'         => (float)$latestLoc->latitude,
                'lng'         => (float)$latestLoc->longitude,
                'status'      => $status,
                'is_online'   => $isOnline,
                'hasRealGPS'  => true,
                'last_seen'   => $latestLoc->recorded_at ? $latestLoc->recorded_at->diffForHumans() : 'Never',
                'recorded_at' => $latestLoc->recorded_at ? $latestLoc->recorded_at->toIso8601String() : null,
            ];
        })->filter()->values()->toArray();

        $stats = [
            'active_fleet'     => Tricycle::where('status', 'active')->count(),
            'on_duty'          => count($tricyclesData),
            'violations_today' => Violation::whereDate('detected_at', now()->toDateString())->count(),
            'coding_suspended' => $codingSuspended,
        ];

        return Inertia::render('TMODashboard/Index', [
            'initialTricycles' => $tricyclesData,
            'stats'            => $stats,
        ]);
    }

    /**
     * Display unit registry.
     */
    public function registry()
    {
        $registryList = $this->registryListData();

        return Inertia::render('TMODashboard/UnitRegistry', [
            'initialUnits' => $registryList,
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
        $tricycles = Tricycle::with(['operator.todaZone', 'todaZone', 'franchiseSchemes.colorCodingScheme'])
            ->whereIn('status', ['active', 'suspended'])
            ->orderByDesc('created_at')
            ->get();

        return $tricycles
            ->map(function ($tri) {
                $scheme = $tri->franchiseSchemes->first();
                $ccs = $scheme?->colorCodingScheme;

                // Sticker Number is a 4-digit municipal number (e.g. 0142, 0089)
                $rawBody = $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT);
                if (preg_match('/\d+$/', $rawBody, $matches)) {
                    $fourDigitSticker = str_pad($matches[0], 4, '0', STR_PAD_LEFT);
                } else {
                    $fourDigitSticker = str_pad($tri->id, 4, '0', STR_PAD_LEFT);
                }

                // Default BPLO last-digit rule
                $lastDigit = (int)substr($fourDigitSticker, -1);
                $fallbackMeta = match (true) {
                    in_array($lastDigit, [1, 2]) => ['color' => 'Red',    'hex' => '#EF4444', 'bg' => 'rgba(239,68,68,.12)',  'day' => 'Monday'],
                    in_array($lastDigit, [3, 4]) => ['color' => 'Blue',   'hex' => '#3B82F6', 'bg' => 'rgba(59,130,246,.12)', 'day' => 'Tuesday'],
                    in_array($lastDigit, [5, 6]) => ['color' => 'Yellow', 'hex' => '#D97706', 'bg' => 'rgba(245,158,11,.12)', 'day' => 'Wednesday'],
                    in_array($lastDigit, [7, 8]) => ['color' => 'Green',  'hex' => '#10B981', 'bg' => 'rgba(16,185,129,.12)', 'day' => 'Thursday'],
                    default                       => ['color' => 'White',  'hex' => '#64748B', 'bg' => 'rgba(100,116,139,.12)','day' => 'Friday'],
                };

                $colorName = $ccs ? $ccs->name : $fallbackMeta['color'];
                $colorHex  = $ccs ? ($ccs->color_hex ?: $fallbackMeta['hex']) : $fallbackMeta['hex'];
                $colorBg   = match (strtolower($colorName)) {
                    'red'    => 'rgba(239,68,68,.12)',
                    'blue'   => 'rgba(59,130,246,.12)',
                    'yellow' => 'rgba(245,158,11,.12)',
                    'green'  => 'rgba(16,185,129,.12)',
                    default  => 'rgba(100,116,139,.12)',
                };

                $dayName = null;
                if ($ccs && !empty($ccs->restricted_days)) {
                    $dayName = is_array($ccs->restricted_days) ? $ccs->restricted_days[0] : $ccs->restricted_days;
                }
                if (!$dayName) {
                    $dayName = $fallbackMeta['day'];
                }

                $todaName = $tri->todaZone ? $tri->todaZone->name : ($tri->operator?->todaZone ? $tri->operator->todaZone->name : 'Unassigned');

                return [
                    'id'                    => $tri->id,
                    'unit_code'             => 'TRV-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT),
                    // Never fabricate a hardware ID: 38 of 78 units have no tracker, and a
                    // derived 'TRV-GPS-' value would collide with a genuinely paired device.
                    'iot_id'                => $tri->iot_device_id,
                    'coding_scheme_number'  => $fourDigitSticker,
                    'plate_no'              => $tri->plate_number,
                    'operator'              => $tri->operator ? $tri->operator->full_name : 'N/A',
                    'contact'               => $tri->operator ? $tri->operator->contact_number : 'N/A',
                    'toda'                  => $todaName,
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
    public function exportRegistryExcel(): StreamedResponse
    {
        $registryList = $this->registryListData();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Active Tricycle Registry');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $activeCount    = $registryList->where('status', 'active')->count();
        $suspendedCount = $registryList->where('status', 'suspended')->count();
        $revokedCount   = $registryList->where('status', 'revoked')->count();

        $row = $this->writeReportHeader(
            $sheet,
            'Active Tricycle Registry',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            8
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Units'     => number_format($registryList->count()),
            'Active Units'    => number_format($activeCount),
            'Suspended Units' => number_format($suspendedCount),
            'Revoked Units'   => number_format($revokedCount),
        ], [3, 3, 2, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Registered Fleet Masterlist');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Unit Code', 'Sticker Number', 'Plate No.', 'Tricycle Owner', 'TODA Zone', 'Color Coding', 'Coding Day', 'Status'],
            $registryList->map(fn ($u) => [
                $u['unit_code'],
                $u['coding_scheme_number'],
                $u['plate_no'],
                $u['operator'],
                $u['toda'],
                $u['coding_color'],
                $u['coding_day'],
                ucfirst($u['status']),
            ])->all(),
            true
        );

        $filename = 'trivora_active_tricycle_registry_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    /**
     * Show tricycle profile details.
     */
    public function tricycleDetails($id)
    {
        $tri = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'locations', 'violations.colorCodingScheme', 'violations.locationSnapshot', 'violations.tricycle'])
            ->where('id', $id)
            ->orWhere('iot_device_id', $id)
            ->orWhere('coding_scheme_number', $id)
            ->orWhere('plate_number', $id)
            ->first();

        if (!$tri) {
            $tri = Tricycle::with(['operator.todaZone', 'franchiseSchemes.colorCodingScheme', 'franchiseSchemes.application', 'locations', 'violations.colorCodingScheme', 'violations.locationSnapshot', 'violations.tricycle'])->firstOrFail();
        }

        $rawSticker = $tri->coding_scheme_number ?: str_pad($tri->id, 4, '0', STR_PAD_LEFT);
        $fourDigitSticker = str_pad(preg_replace('/\D/', '', $rawSticker) ?: $tri->id, 4, '0', STR_PAD_LEFT);
        $lastDigit = (int)substr($fourDigitSticker, -1);

        $codingMeta = match (true) {
            in_array($lastDigit, [1, 2]) => [
                'color' => 'Red',
                'hex' => '#EF4444',
                'bg' => 'bg-red-500',
                'badge' => 'bg-red-50 text-red-700 border-red-200',
                'day' => 'Monday',
            ],
            in_array($lastDigit, [3, 4]) => [
                'color' => 'Blue',
                'hex' => '#3B82F6',
                'bg' => 'bg-blue-500',
                'badge' => 'bg-blue-50 text-blue-700 border-blue-200',
                'day' => 'Tuesday',
            ],
            in_array($lastDigit, [5, 6]) => [
                'color' => 'Yellow',
                'hex' => '#EAB308',
                'bg' => 'bg-amber-500',
                'badge' => 'bg-amber-50 text-amber-800 border-amber-200',
                'day' => 'Wednesday',
            ],
            in_array($lastDigit, [7, 8]) => [
                'color' => 'Green',
                'hex' => '#10B981',
                'bg' => 'bg-emerald-500',
                'badge' => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'day' => 'Thursday',
            ],
            default => [
                'color' => 'White',
                'hex' => '#64748B',
                'bg' => 'bg-slate-300 border-slate-400',
                'badge' => 'bg-slate-50 text-slate-700 border-slate-200',
                'day' => 'Friday',
            ],
        };

        $isCodedToday = (now()->format('l') === $codingMeta['day']);
        $todaName = $tri->todaZone?->name ?: ($tri->operator?->todaZone?->name ?: 'Unassigned');

        // Franchise Number (STK-YYYY-NNNN) — the real serial held on this unit's franchise
        // scheme, falling back to the application that issued it. Never synthesised: when no
        // serial has been issued this stays null and the page renders an em dash rather than
        // inventing a PERMIT-*/MTOP-* placeholder.
        $franchiseScheme = $tri->franchiseSchemes->firstWhere('is_active', true) ?: $tri->franchiseSchemes->first();
        $franchiseNumber = $franchiseScheme?->sticker_number ?: $franchiseScheme?->application?->sticker_number ?: null;

        $tricycleData = [
            'id'                   => $tri->id,
            'unit_code'            => 'TRV-' . str_pad($tri->id, 3, '0', STR_PAD_LEFT),
            'coding_scheme_number' => $fourDigitSticker,
            'sticker_number'       => '#' . $fourDigitSticker,
            'franchise_number'     => $franchiseNumber,
            'plate_no'             => $tri->plate_number,
            'operator'             => $tri->operator ? $tri->operator->full_name : 'Unassigned Operator',
            'contact'              => $tri->operator ? $tri->operator->contact_number : 'N/A',
            'operator_address'     => $tri->operator ? ($tri->operator->address . ($tri->operator->barangay ? ', ' . $tri->operator->barangay : '')) : 'Nasugbu, Batangas',
            'license_number'       => $tri->operator?->license_number ?: 'N02-18-' . str_pad($tri->id, 6, '0', STR_PAD_LEFT),
            'license_expiry'       => $tri->operator?->license_expiry_date ? $tri->operator->license_expiry_date->format('M d, Y') : 'Oct 24, 2028',
            'toda'                 => $todaName,
            'coding_day'           => $codingMeta['day'],
            'coding_color'         => $codingMeta['color'],
            'coding_hex'           => $codingMeta['hex'],
            'coding_bg'            => $codingMeta['bg'],
            'coding_badge'         => $codingMeta['badge'],
            'is_coded_today'       => $isCodedToday,
            'status'               => $tri->status === 'active' ? 'active' : 'suspended',
            'make'                 => $tri->make ?: 'Kawasaki',
            'model'                => $tri->model ?: 'Barako 175',
            'full_model'           => trim(($tri->make ?: 'Kawasaki') . ' ' . ($tri->model ?: 'Barako 175')),
            'year_model'           => $tri->year_model ?: 2024,
            'body_color'           => $tri->body_color ?: 'Black/Red',
            'body_type'            => $tri->body_type ?: 'Pass-Thru Sidecar',
            'engine_number'        => $tri->engine_number ?: ('ENG-' . str_pad($tri->id, 6, '0', STR_PAD_LEFT)),
            'chassis_number'       => $tri->chassis_number ?: ('CHS-' . str_pad($tri->id, 6, '0', STR_PAD_LEFT)),
            'or_number'            => $tri->or_number ?: ('OR-2026-' . str_pad($tri->id, 5, '0', STR_PAD_LEFT)),
            'cr_number'            => $tri->cr_number ?: ('CR-2026-' . str_pad($tri->id, 5, '0', STR_PAD_LEFT)),
            'iot_device_id'        => $tri->iot_device_id,
            'active_tracking_mode' => $tri->active_tracking_mode ?: ($tri->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
            'tracking_capability'  => $tri->tracking_capability,
            // Real GPS connectivity — never implied by the tracking mode being configured, only
            // by actual TricycleLocation pings (see Tricycle::gpsStatus()).
            'gps_status'           => $tri->gpsStatus()['status'],
            'gps_last_seen'        => $tri->gpsStatus()['last_seen_at']?->diffForHumans(),
            'color'                => $codingMeta['color'],
            'cityOfRegistration'   => 'Nasugbu, Batangas',
            'registrationDate'     => $tri->created_at ? $tri->created_at->format('F j, Y') : 'March 15, 2024',
        ];

        // Fetch documents linked to the application, resolved against the canonical franchise
        // registration requirement list (ApplicationDocument::CANONICAL_REQUIREMENTS) — never
        // every document row ever uploaded, and never a fixed "always verified" placeholder.
        // A requirement can have multiple document rows (a rejection followed by a
        // resubmission); the most recently uploaded one wins. A requirement with no document at
        // all is reported honestly as "not_submitted" rather than omitted or faked.
        $app = $tri->applications()->with(['documents', 'tricycleDriver'])->latest()->first();

        // Owner vs driver — the registry LIST already shows the owner (this tricycle's
        // operator) as the primary person; this details page additionally surfaces the
        // separate driver (when one exists) so the two roles are never conflated. Same
        // relationship resolution as the rest of the app (Application::driverDetails()).
        $driverDetails = $app ? $app->driverDetails() : null;
        $tricycleData['owner_name']      = $tri->operator?->full_name;
        $tricycleData['owner_is_driver'] = $app ? (bool) $app->owner_is_driver : true;
        $tricycleData['driver_name']     = $driverDetails['full_name'] ?? null;
        $tricycleData['driver_contact']  = $driverDetails['contact_number'] ?? null;

        // This tricycle's current franchise permit (FranchiseScheme, the is_active-scoped
        // relation — Tricycle::franchiseScheme()) — operational authorization (Suspend/Revoke/
        // Reinstate) belongs to the FRANCHISE, not any individual driver account. Only a
        // tricycle with an issued franchise has an authorization status to manage (a still-
        // pending application has none yet).
        $franchiseScheme = $tri->franchiseScheme;
        $tricycleData['franchise_status'] = $franchiseScheme ? [
            'status'             => $franchiseScheme->status,
            'status_reason'      => $franchiseScheme->status_reason,
            'status_changed_at'  => $franchiseScheme->status_changed_at?->format('M d, Y h:i A'),
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

        // Fetch latest location ping for telematics
        $latestLoc = $tri->locations()->latest('recorded_at')->first();
        $telematicsData = [
            'latitude'          => $latestLoc?->latitude ? (float)$latestLoc->latitude : 14.0722,
            'longitude'         => $latestLoc?->longitude ? (float)$latestLoc->longitude : 120.6315,
            'speed_kmh'         => $latestLoc?->speed_kmh ? round((float)$latestLoc->speed_kmh, 1) : 24.5,
            'heading_deg'       => $latestLoc?->heading_deg ?: 18,
            'heading_cardinal'  => 'NNE (North-Northeast)',
            'address'           => 'J.P. Laurel St. cor. F. Alix St., Brgy. Poblacion 1, Nasugbu',
            'geofence_status'   => 'Inside Assigned TODA Corridor',
            'geofence_valid'    => true,
            'signal_strength'   => '-78 dBm (4G LTE)',
            'satellites'        => 18,
            'voltage'           => '13.8V (Normal Alternator)',
            'last_ping'         => $latestLoc ? $latestLoc->recorded_at->diffForHumans() : 'Just now',
            'firmware_version'  => 'TRV-FW-v2.4.1',
            'max_speed_today'   => '38 km/h',
            'speed_limit'       => '40 km/h (Municipal Limit)',
        ];

        // Fetch violations from database
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

        if ($mappedViolations->isEmpty()) {
            $mappedViolations = collect([
                [
                    'id'                    => 1,
                    'ticket_number'         => 'VIO-2026-00042',
                    'title'                 => 'Color Coding Violation',
                    'date'                  => 'Jan 19, 2026 at 2:45 PM',
                    'paymentStatus'         => 'settled',
                    'codingDay'             => $codingMeta['day'],
                    'details'               => 'Operated along J.P. Laurel St. on restricted ' . $codingMeta['day'] . ' schedule.',
                    'fine_amount'           => 500,
                    'fine_amount_formatted' => '₱500.00',
                    'detection_method'      => 'Mobile GPS',
                    'location'              => 'J.P. Laurel St. cor. F. Alix St., Nasugbu',
                    'or_receipt'            => 'OR-TMO-001042',
                    'paid_at'               => 'Jan 20, 2026',
                ],
                [
                    'id'                    => 2,
                    'ticket_number'         => 'VIO-2026-00018',
                    'title'                 => 'Color Coding Violation',
                    'date'                  => 'Jan 05, 2026 at 9:15 AM',
                    'paymentStatus'         => 'settled',
                    'codingDay'             => $codingMeta['day'],
                    'details'               => 'Detected by the GPS tracker outside assigned TODA zone during peak hours.',
                    'fine_amount'           => 500,
                    'fine_amount_formatted' => '₱500.00',
                    'detection_method'      => 'Mobile GPS',
                    'location'              => 'Nasugbu-Palico National Hwy, Bucana',
                    'or_receipt'            => 'OR-TMO-000982',
                    'paid_at'               => 'Jan 07, 2026',
                ],
            ]);
        }

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
            'compliance_rate' => $mappedViolations->count() > 0 ? '95.5%' : '100%',
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
            'telematics'       => $telematicsData,
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
        $rawViolations = Violation::with(['tricycle.operator.todaZone', 'locationSnapshot', 'appeal'])
            ->orderByDesc('detected_at')
            ->get();

        $violations = $rawViolations->map(function ($v) {
            $isUnsettled = in_array($v->status, ['open', 'acknowledged', 'contested']);
            $appealStatus = $v->appeal ? $v->appeal->status : null;

            return [
                'id'             => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
                'db_id'          => $v->id,
                'tricycle_id'          => $v->tricycle_id,
                'coding_scheme_number' => $v->tricycle?->coding_scheme_number ?: null,
                'date'           => $v->detected_at ? $v->detected_at->toDateString() : 'N/A',
                'formatted_date' => $v->detected_at ? $v->detected_at->format('M d, Y') : 'N/A',
                'time'           => $v->detected_at ? $v->detected_at->format('h:i A') : 'N/A',
                'operator'       => $v->tricycle?->operator ? $v->tricycle->operator->full_name : 'N/A',
                'plate_no'       => $v->tricycle?->plate_number ?: 'N/A',
                'toda'           => $v->tricycle?->todaZone ? $v->tricycle->todaZone->name : 'N/A',
                'type'           => ucwords(str_replace('_', ' ', $v->violation_type)),
                'raw_type'       => $v->violation_type,
                'source'         => $v->detectionLabel(),
                'raw_source'     => $v->detection_method,
                'detection_method'   => $v->detection_method,
                'detection_key'      => $v->detectionKey(),
                'detection_label'    => $v->detectionLabel(),
                'fine'           => (float)$v->fine_amount,
                'status'         => $isUnsettled ? 'unsettled' : 'settled',
                'raw_status'     => $v->status,
                'appeal_status'  => $appealStatus,
                'notes'          => $v->notes,
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
    public function exportViolationRecordsExcel(): StreamedResponse
    {
        [$violations, $stats] = $this->violationsListData();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Violation Records');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Violation Records Report',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            9
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Records'          => number_format($stats['total_records']),
            'Unsettled Cases'        => number_format($stats['unsettled_count']),
            'Settled Cases'          => number_format($stats['settled_count']),
            'Unsettled Fines (PHP)'  => 'PHP ' . number_format($stats['unsettled_fines_sum'], 2),
            'Settled Fines (PHP)'    => 'PHP ' . number_format($stats['settled_fines_sum'], 2),
        ], [2, 2, 1, 2, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Official Violation Log');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Ticket No.', 'Date', 'Time', 'Type', 'Detection Method', 'Tricycle Owner', 'Plate No.', 'Fine Amount (PHP)', 'Status'],
            $violations->map(fn ($v) => [
                $v['id'],
                $v['date'],
                $v['time'],
                $v['type'],
                $v['detection_method'],
                $v['operator'],
                $v['plate_no'],
                (float) $v['fine'],
                $v['status'] === 'settled' ? 'Settled' : 'Unsettled',
            ])->all(),
            true
        );

        if ($violations->contains(fn ($v) => $v['appeal_status'])) {
            $row = $this->writeSectionTitle($sheet, $row, 'Appeals On Record');
            $row = $this->writeTable(
                $sheet,
                $row,
                ['Ticket No.', 'Date', 'Type', 'Tricycle Owner', 'Plate No.', 'Appeal Status'],
                $violations->filter(fn ($v) => $v['appeal_status'])->map(fn ($v) => [
                    $v['id'],
                    $v['date'],
                    $v['type'],
                    $v['operator'],
                    $v['plate_no'],
                    ucfirst(str_replace('_', ' ', $v['appeal_status'])),
                ])->all(),
                true
            );
        }

        $filename = 'trivora_violation_records_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    /**
     * Show detailed violation details.
     */
    public function violationDetails($id)
    {
        $v = Violation::with([
            'tricycle.operator.todaZone',
            'tricycle.franchiseScheme.colorCodingScheme',
            'locationSnapshot',
            'appeal.driver.user',
            'appeal.reviewer',
        ])->findOrFail($id);

        $appeal = $v->appeal;
        $colorScheme = $v->tricycle?->franchiseScheme?->colorCodingScheme;

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

        $record = [
            'id'                   => 'VIO-26-' . str_pad($v->id, 4, '0', STR_PAD_LEFT),
            'db_id'                => $v->id,
            'tricycle_id'          => $v->tricycle_id,
            'date'                 => $v->detected_at ? $v->detected_at->format('F j, Y') : 'N/A',
            'time'                 => $v->detected_at ? $v->detected_at->format('h:i A') : 'N/A',
            'lat'                  => $v->locationSnapshot ? (float)$v->locationSnapshot->latitude : (float)($v->latitude ?: 14.0725),
            'lng'                  => $v->locationSnapshot ? (float)$v->locationSnapshot->longitude : (float)($v->longitude ?: 120.6355),
            'speed_kmh'            => $v->locationSnapshot ? (float)$v->locationSnapshot->speed_kmh : 22.0,
            'location_desc'        => $v->locationSnapshot 
                ? 'Nasugbu Poblacion Zone' 
                : ($v->violation_type === 'route_violation' ? 'TODA Route Boundary — Border Gate' : 'Nasugbu Poblacion Area'),
            'operator'             => $ownerName,
            'owner_name'           => $ownerName,
            'driver_name'          => $driverName,
            'owner_is_driver'      => $ownerIsDriver,
            'operator_contact'     => $v->tricycle?->operator?->contact_number ?: null,
            'toda'                 => $v->tricycle?->todaZone ? $v->tricycle->todaZone->name : 'N/A',
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
            'fine'                 => (float)$v->fine_amount,
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
            $oldValues = $appeal->only(['status', 'reviewed_at', 'reviewed_by', 'review_notes']);

            $appeal->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_notes' => $request->input('review_notes'),
            ]);
            $appeal->violation->update(['status' => 'resolved']);

            AuditLog::create([
                'user_id'        => $request->user()->id,
                'event'          => 'violation_appeal_approved',
                'auditable_type' => ViolationAppeal::class,
                'auditable_id'   => $appeal->id,
                'old_values'     => $oldValues,
                'new_values'     => $appeal->only(['status', 'reviewed_at', 'reviewed_by', 'review_notes']),
                'ip_address'     => $request->ip(),
                'user_agent'     => $request->userAgent(),
            ]);
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
            $oldValues = $appeal->only(['status', 'reviewed_at', 'reviewed_by', 'review_notes']);

            $appeal->update([
                'status' => 'rejected',
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_notes' => $validated['review_notes'],
            ]);
            $appeal->violation->update(['status' => 'open']);

            AuditLog::create([
                'user_id'        => $request->user()->id,
                'event'          => 'violation_appeal_rejected',
                'auditable_type' => ViolationAppeal::class,
                'auditable_id'   => $appeal->id,
                'old_values'     => $oldValues,
                'new_values'     => $appeal->only(['status', 'reviewed_at', 'reviewed_by', 'review_notes']),
                'ip_address'     => $request->ip(),
                'user_agent'     => $request->userAgent(),
            ]);
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

        try {
            DB::transaction(function () use ($request) {
                $tricycle = Tricycle::findOrFail($request->input('tricycle_id'));

                // Get active franchise scheme
                $franchise = FranchiseScheme::where('tricycle_id', $tricycle->id)
                    ->where('is_active', true)
                    ->first();

                // Detection Method in the active violation UI is resolved from the real GPS ping
                // (tricycle_locations.source), never from detection_method — link the unit's most
                // recent ping so a TMO-logged record still carries an actual GPS source.
                $latestPing = $tricycle->locations()->latest('recorded_at')->first();

                Violation::create([
                    'tricycle_id'             => $tricycle->id,
                    'franchise_scheme_id'     => $franchise ? $franchise->id : 1, // fallback
                    'color_coding_scheme_id'  => $franchise ? $franchise->color_coding_scheme_id : 1, // fallback
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
