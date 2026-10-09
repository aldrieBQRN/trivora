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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
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
            if ($log->action === 'report.exported_excel' && ($targetReference === null || str_ends_with(strtolower($targetReference), '.xlsx'))) {
                $targetReference = $log->user?->email ?? ($log->metadata['user_email'] ?? $targetReference);
            }

            return [
                'id'               => $log->id,
                'actor_name'       => $log->actor_name ?: 'System / Anonymous',
                'actor_role'       => $log->actor_role ?: 'N/A',
                'actor_email'      => $log->user?->email,
                'module'           => $log->module,
                'action'           => $log->action,
                'target_type'      => $log->action === 'report.exported_excel' ? 'Excel Report' : ($log->target_type ? class_basename($log->target_type) : null),
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

        $exportRouteName = 'tmo.activity-logs.export-excel';

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
     * Export filtered audit logs to Excel (capped at 5,000 records).
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['tmo_personnel', 'admin'], true)) {
            abort(403, 'Unauthorized.');
        }

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
            8,
            $officeName,
            $footerCode
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Audit Trail Records (Filtered)');

        $tableRows = $records->map(fn ($r) => [
            $r->created_at?->format('Y-m-d H:i:s'),
            $r->actor_name ?: 'System',
            ucwords(str_replace('_', ' ', (string) $r->actor_role)),
            ucwords(str_replace('_', ' ', (string) $r->module)),
            $r->action,
            $r->target_reference ?: '—',
            $this->sanitizeDescription($r->description),
            $r->ip_address ?: '—',
        ])->all();

        $this->writeTable(
            $sheet,
            $row,
            ['Timestamp', 'Actor Name', 'Role', 'Module', 'Action', 'Target Reference', 'Description', 'IP Address'],
            $tableRows,
            true
        );

        $filename = 'trivora_system_activity_logs_' . now()->format('Y-m-d_His') . '.xlsx';

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
                'filters'       => [
                    'search' => $search,
                    'module' => $module,
                    'role'   => $role,
                    'action' => $action,
                    'from'   => $from,
                    'to'     => $to,
                ],
            ]
        );

        return $this->streamExcel($spreadsheet, $filename);
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
