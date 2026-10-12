<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ExportsMunicipalExcelReports;
use App\Models\AuditLog;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    use ExportsMunicipalExcelReports;

    /**
     * Display a paginated listing of administrative web activity logs.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['tmo_personnel', 'admin'], true)) {
            abort(403, 'Unauthorized. Administrative activity logs are restricted to TMO Personnel.');
        }

        $search = trim((string) $request->input('search', ''));
        $module = $request->input('module');
        $role   = $request->input('role');
        $action = $request->input('action');
        $from   = $request->input('from');
        $to     = $request->input('to');

        $query = AuditLog::forAdminWeb()->with('user');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('actor_name', 'like', "%{$search}%")
                  ->orWhere('target_reference', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        if ($module) {
            $query->where('module', $module);
        }

        if ($role) {
            $query->where('actor_role', $role);
        }

        if ($action) {
            $query->where('action', $action);
        }

        if ($from) {
            $query->where('created_at', '>=', Carbon::parse($from)->startOfDay());
        }

        if ($to) {
            $query->where('created_at', '<=', Carbon::parse($to)->endOfDay());
        }

        $logs = $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        $logs->through(function ($log) {
            $targetReference = $log->target_reference;
            if (str_starts_with((string) $log->action, 'report.exported') && ($targetReference === null || preg_match('/\.(xlsx|pdf|csv|json)$/i', (string) $targetReference))) {
                $targetReference = $log->user?->email ?? ($log->metadata['user_email'] ?? $targetReference);
            }

            $targetType = match ($log->action) {
                'report.exported_excel' => 'Excel Report',
                'report.exported_pdf'   => 'PDF Report',
                'report.exported_csv'   => 'CSV Report',
                'report.exported_json'  => 'JSON Report',
                default                 => $log->target_type ? class_basename($log->target_type) : null,
            };

            return [
                'id'               => $log->id,
                'actor_name'       => $log->actor_name ?: 'System / Anonymous',
                'actor_role'       => $log->actor_role ?: 'N/A',
                'actor_email'      => $log->user?->email,
                'module'           => $log->module,
                'action'           => $log->action,
                'target_type'      => $targetType,
                'target_reference' => $targetReference,
                'description'      => $this->sanitizeDescription($log->description),
                'old_values'       => $this->sanitizePayload($log->old_values),
                'new_values'       => $this->sanitizePayload($log->new_values),
                'metadata'         => $this->sanitizePayload($log->metadata),
                'ip_address'       => $log->ip_address,
                'created_at'       => $log->created_at?->format('M d, Y h:i A'),
                'created_at_human' => $log->created_at?->diffForHumans(),
            ];
        });

        $availableModules = [
            ['value' => 'auth',            'label' => 'Authentication & Access'],
            ['value' => 'document_review', 'label' => 'Document Review'],
            ['value' => 'inspection',      'label' => 'Physical Inspection'],
            ['value' => 'franchise',       'label' => 'Franchise & Releasing'],
            ['value' => 'violation',       'label' => 'Violations & Appeals'],
            ['value' => 'fare',            'label' => 'Fare Management'],
            ['value' => 'user_management', 'label' => 'Staff / User Management'],
            ['value' => 'application',     'label' => 'Driver Applications'],
            ['value' => 'profile',         'label' => 'Account Settings'],
            ['value' => 'reports',         'label' => 'Reports & Analytics'],
        ];

        $availableRoles = [
            ['value' => 'tmo_personnel',   'label' => 'TMO Personnel'],
            ['value' => 'bplo_staff',      'label' => 'BPLO Staff'],
            ['value' => 'tricycle_driver', 'label' => 'Tricycle Driver / Operator'],
            ['value' => 'admin',           'label' => 'Administrator'],
        ];

        $exportRouteName = 'tmo.activity-logs.export';

        $stats = [
            'total'  => AuditLog::forAdminWeb()->count(),
            'today'  => AuditLog::forAdminWeb()->whereDate('created_at', today())->count(),
            'staff'  => AuditLog::forAdminWeb()->whereIn('actor_role', ['tmo_personnel', 'bplo_staff', 'admin'])->count(),
            'driver' => AuditLog::forAdminWeb()->where('actor_role', 'tricycle_driver')->count(),
        ];

        return Inertia::render('AuditLogs/Index', [
            'logs'             => $logs,
            'stats'            => $stats,
            'filters'          => [
                'search' => $search,
                'module' => $module ?: '',
                'role'   => $role ?: '',
                'action' => $action ?: '',
                'from'   => $from ?: '',
                'to'     => $to ?: '',
            ],
            'availableModules' => $availableModules,
            'availableRoles'   => $availableRoles,
            'exportUrl'        => route($exportRouteName),
        ]);
    }

    /**
     * Unified export for filtered audit logs to Excel, PDF, CSV, or JSON (capped at 5,000 records).
     */
    public function export(Request $request): SymfonyResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['tmo_personnel', 'admin'], true)) {
            abort(403, 'Unauthorized.');
        }

        $format = strtolower(trim((string) $request->input('format', 'excel')));
        $search = trim((string) $request->input('search', ''));
        $module = $request->input('module');
        $role   = $request->input('role');
        $action = $request->input('action');
        $from   = $request->input('from');
        $to     = $request->input('to');

        $query = AuditLog::forAdminWeb();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('actor_name', 'like', "%{$search}%")
                  ->orWhere('target_reference', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        if ($module) {
            $query->where('module', $module);
        }

        if ($role) {
            $query->where('actor_role', $role);
        }

        if ($action) {
            $query->where('action', $action);
        }

        if ($from) {
            $query->where('created_at', '>=', Carbon::parse($from)->startOfDay());
        }

        if ($to) {
            $query->where('created_at', '<=', Carbon::parse($to)->endOfDay());
        }

        $records = $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(5000)
            ->get();

        $timestampStr = now()->format('Y-m-d_His');
        $filters = compact('search', 'module', 'role', 'action', 'from', 'to');

        if ($format === 'pdf') {
            return $this->exportPdf($records, $timestampStr, $user, $filters, $from, $to);
        }

        if ($format === 'csv') {
            return $this->exportCsv($records, $timestampStr, $user, $filters);
        }

        if ($format === 'json') {
            return $this->exportJson($records, $timestampStr, $user, $filters);
        }

        return $this->exportXlsx($records, $timestampStr, $user, $filters, $from, $to);
    }

    /**
     * Backward-compatible alias for Excel export.
     */
    public function exportExcel(Request $request): SymfonyResponse
    {
        return $this->export($request);
    }

    /**
     * Export to styled municipal PDF report in landscape orientation.
     */
    protected function exportPdf($records, string $timestampStr, $user, array $filters, $from, $to): SymfonyResponse
    {
        $officeName = ($user->role === 'bplo_staff')
            ? 'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)'
            : 'TRICYCLE MANAGEMENT OFFICE (TMO)';
        $footerCode = ($user->role === 'bplo_staff') ? 'BPLO' : 'TMO';

        $periodLabel = ($from && $to)
            ? Carbon::parse($from)->format('M d, Y') . ' to ' . Carbon::parse($to)->format('M d, Y')
            : ($from ? 'From ' . Carbon::parse($from)->format('M d, Y') : ($to ? 'Until ' . Carbon::parse($to)->format('M d, Y') : 'All Recorded Dates (Full History)'));

        $records->each(function ($r) {
            $r->sanitized_description = $this->sanitizeDescription($r->description);
            $r->action_label = $this->formatActionLabel($r->action);
        });

        $pdf = Pdf::loadView('reports.audit_logs_pdf', [
            'records'     => $records,
            'user'        => $user,
            'officeName'  => $officeName,
            'footerCode'  => $footerCode,
            'periodLabel' => $periodLabel,
            'filters'     => $filters,
        ])->setPaper('a4', 'landscape');

        $filename = 'trivora_system_activity_logs_' . $timestampStr . '.pdf';

        AuditService::log(
            module: 'reports',
            action: 'report.exported_pdf',
            record: null,
            description: "Exported System Activity Audit Log PDF Report (" . $records->count() . " records)",
            oldValues: null,
            newValues: null,
            targetReference: $user?->email ?? 'System User',
            metadata: [
                'report'     => 'audit_logs',
                'filename'   => $filename,
                'user_email' => $user?->email,
                'format'     => 'pdf',
                'filters'    => array_filter($filters),
                'row_count'  => $records->count(),
            ]
        );

        return response()->streamDownload(
            function () use ($pdf) {
                echo $pdf->output();
            },
            $filename,
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]
        );
    }

    /**
     * Export to styled Excel (.xlsx) with non-sticky header and clean formatted action labels (no IP column).
     */
    protected function exportXlsx($records, string $timestampStr, $user, array $filters, $from, $to): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('System Activity Logs');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $officeName = ($user->role === 'bplo_staff')
            ? 'BUSINESS PERMITS AND LICENSING OFFICE (BPLO)'
            : 'TRICYCLE MANAGEMENT OFFICE (TMO)';
        $footerCode = ($user->role === 'bplo_staff') ? 'BPLO' : 'TMO';

        $periodLabel = ($from && $to)
            ? 'Period: ' . Carbon::parse($from)->format('M d, Y') . ' to ' . Carbon::parse($to)->format('M d, Y')
            : 'Generated on ' . now()->format('F d, Y \a\t h:i A');

        $row = $this->writeReportHeader(
            $sheet,
            'System Activity & Audit Log Report',
            $periodLabel,
            7,
            $officeName,
            $footerCode
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Audit Trail Records (Filtered)');

        $tableRows = $records->map(fn ($r) => [
            $r->created_at?->format('Y-m-d H:i:s'),
            $r->actor_name ?: 'System',
            ucwords(str_replace('_', ' ', (string) $r->actor_role)),
            ucwords(str_replace('_', ' ', (string) $r->module)),
            $this->formatActionLabel($r->action),
            $r->target_reference ?: '—',
            $this->sanitizeDescription($r->description),
        ])->all();

        // Pass freezeHeader = false so the table header in Excel is NOT sticky / frozen (IP column removed)
        $this->writeTable(
            $sheet,
            $row,
            ['Timestamp', 'Actor Name', 'Role', 'Module', 'Action', 'Target Reference', 'Description'],
            $tableRows,
            false
        );

        $filename = 'trivora_system_activity_logs_' . $timestampStr . '.xlsx';

        AuditService::log(
            module: 'reports',
            action: 'report.exported_excel',
            record: null,
            description: "Exported System Activity Audit Log Excel Report (" . count($tableRows) . " records)",
            oldValues: null,
            newValues: null,
            targetReference: $user?->email ?? 'System User',
            metadata: [
                'report'        => 'audit_logs',
                'filename'      => $filename,
                'user_email'    => $user?->email,
                'records_count' => count($tableRows),
                'filters'       => $filters,
            ]
        );

        return $this->streamExcel($spreadsheet, $filename);
    }

    /**
     * Stream CSV export with UTF-8 BOM and clean action labels (no IP column).
     */
    protected function exportCsv($records, string $timestampStr, $user, array $filters): StreamedResponse
    {
        $filename = 'trivora_system_activity_logs_' . $timestampStr . '.csv';

        AuditService::log(
            module: 'reports',
            action: 'report.exported_csv',
            record: null,
            description: "Exported System Activity Audit Log CSV Report (" . count($records) . " records)",
            oldValues: null,
            newValues: null,
            targetReference: $user?->email ?? 'System User',
            metadata: [
                'report'        => 'audit_logs',
                'filename'      => $filename,
                'user_email'    => $user?->email,
                'records_count' => count($records),
                'filters'       => $filters,
            ]
        );

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'max-age=0',
        ];

        return response()->stream(function () use ($records) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens CSV with proper encoding
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Timestamp',
                'Actor Name',
                'Role',
                'Module',
                'Action',
                'Target Reference',
                'Description',
            ]);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->created_at?->format('Y-m-d H:i:s') ?? '',
                    $r->actor_name ?: 'System',
                    ucwords(str_replace('_', ' ', (string) $r->actor_role)),
                    ucwords(str_replace('_', ' ', (string) $r->module)),
                    $this->formatActionLabel($r->action),
                    $r->target_reference ?: '—',
                    $this->sanitizeDescription($r->description),
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Stream JSON data export without IP column.
     */
    protected function exportJson($records, string $timestampStr, $user, array $filters): StreamedResponse
    {
        $filename = 'trivora_system_activity_logs_' . $timestampStr . '.json';

        AuditService::log(
            module: 'reports',
            action: 'report.exported_json',
            record: null,
            description: "Exported System Activity Audit Log JSON (" . count($records) . " records)",
            oldValues: null,
            newValues: null,
            targetReference: $user?->email ?? 'System User',
            metadata: [
                'report'        => 'audit_logs',
                'filename'      => $filename,
                'user_email'    => $user?->email,
                'records_count' => count($records),
                'filters'       => $filters,
            ]
        );

        $headers = [
            'Content-Type'        => 'application/json; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'max-age=0',
        ];

        return response()->stream(function () use ($records, $user, $filters, $timestampStr) {
            $exportData = [
                'title'       => 'TRIVORA Municipal System Activity Logs',
                'generated_at'=> now()->toIso8601String(),
                'exported_by' => $user?->name,
                'total_rows'  => count($records),
                'filters'     => array_filter($filters),
                'records'     => $records->map(fn ($r) => [
                    'id'               => $r->id,
                    'timestamp'        => $r->created_at?->toIso8601String(),
                    'actor_name'       => $r->actor_name ?: 'System',
                    'actor_role'       => $r->actor_role,
                    'module'           => $r->module,
                    'action'           => $r->action,
                    'action_label'     => $this->formatActionLabel($r->action),
                    'target_reference' => $r->target_reference,
                    'description'      => $this->sanitizeDescription($r->description),
                ]),
            ];

            echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }, 200, $headers);
    }

    /**
     * Map audit action system keys into official, human-readable labels.
     */
    protected function formatActionLabel(?string $action): string
    {
        if (!$action) {
            return '—';
        }

        $labels = [
            'auth.login'                       => 'User Login',
            'auth.logout'                      => 'User Logout',
            'auth.failed'                      => 'Failed Login Attempt',
            'auth.password_reset_link_sent'    => 'Password Reset Link Sent',
            'auth.password_reset'              => 'Password Reset Successful',
            'document.approved'                => 'Document Approved',
            'document.resubmission_requested'  => 'Document Resubmission Requested',
            'fare.updated'                     => 'Fare Rates Updated',
            'franchise.released'               => 'Franchise Permit Released',
            'franchise.renewed'                => 'Franchise Renewed',
            'franchise.revoked'                => 'Franchise Revoked',
            'franchise.issued'                 => 'Franchise Issued',
            'violation.issued'                 => 'Violation Ticket Issued',
            'violation.payment_recorded'       => 'Violation Penalty Settled',
            'appeal.resolved'                  => 'Appeal Resolved',
            'staff.created'                    => 'Staff Account Created',
            'staff.updated'                    => 'Staff Account Updated',
            'staff.status_toggled'             => 'Staff Account Status Changed',
            'staff.deleted'                    => 'Staff Account Deleted',
            'application.submitted'            => 'Application Submitted',
            'application.verified'             => 'Application Verified',
            'application.approved'             => 'Application Approved',
            'profile.updated'                  => 'Profile Updated',
            'profile.password_updated'         => 'Password Changed',
            'profile.photo_updated'            => 'Profile Photo Updated',
            'profile.photo_removed'            => 'Profile Photo Removed',
            'report.exported_excel'            => 'Excel Report Exported',
            'report.exported_pdf'              => 'PDF Report Exported',
            'report.exported_csv'              => 'CSV Report Exported',
            'report.exported_json'             => 'JSON Report Exported',
        ];

        if (isset($labels[$action])) {
            return $labels[$action];
        }

        return ucwords(str_replace(['.', '_'], ' ', $action));
    }

    /**
     * Remove or replace any TODA references so they are not displayed in the audit trail.
     */
    protected function sanitizeDescription(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        $replacements = [
            '/\bCentral TODA Sector\b/i'     => 'Central Enforcement Sector',
            '/\bTODA Sector\b/i'             => 'Enforcement Sector',
            '/\bTODA endorsement\b/i'        => 'franchise endorsement',
            '/\bTODA Unit\b/i'               => 'franchise unit',
            '/\bTODA Clearance\b/i'          => 'Clearance',
            '/\bTODA\b/i'                    => '',
        ];

        $cleaned = preg_replace(array_keys($replacements), array_values($replacements), $text);
        return trim(preg_replace('/\s+/', ' ', (string) $cleaned));
    }

    /**
     * Recursively strip TODA keys and clean string values from audit payload arrays.
     */
    protected function sanitizePayload(mixed $data): mixed
    {
        if ($data === null) {
            return null;
        }

        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                // Completely exclude any key related to TODA, IP address, user agent, or internal foreign keys
                if (is_string($key)) {
                    $lowerKey = strtolower($key);
                    if (
                        preg_match('/toda/i', $key) ||
                        in_array($lowerKey, ['ip_address', 'ip', 'user_agent', 'device', 'browser', 'current_step', 'step', 'reviewed_at', 'reviewed_by', 'franchise_active', 'tricycle_status'], true) ||
                        str_ends_with($lowerKey, '_by') ||
                        in_array($lowerKey, ['user_id', 'operator_id', 'driver_id', 'tricycle_id', 'application_id', 'violation_id', 'appeal_id'], true)
                    ) {
                        continue;
                    }
                }
                $cleaned[$key] = $this->sanitizePayload($value);
            }
            return $cleaned;
        }

        if (is_string($data)) {
            return $this->sanitizeDescription($data);
        }

        return $data;
    }
}
