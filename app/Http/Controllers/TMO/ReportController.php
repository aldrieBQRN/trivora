<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\FranchiseScheme;
use App\Models\Payment;
use App\Models\Tricycle;
use App\Models\TodaZone;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * TMO Reports & Analytics — historical/trend analytics, distinct from every other
 * TMO page (dashboard + 4 pipeline queues), which only ever show today's snapshot
 * counts. Every metric here is computed straight from the real Violation/Application/
 * Tricycle/Payment tables — no fabricated values, no hardcoded "Automated GPS"-style
 * shortcuts like the older DashboardController::violations() takes.
 */
class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'violations');
        [$from, $to] = $this->resolveDateRange($request);

        $reportData = match ($tab) {
            'applications' => $this->applicationsReport($from, $to, $request),
            'fleet'        => $this->fleetReport($request),
            'collections'  => $this->collectionsReport($from, $to),
            default        => $this->violationsReport($from, $to, $request),
        };

        return Inertia::render('TMODashboard/Reports/Index', [
            'tab'       => $tab,
            'from'      => $from->toDateString(),
            'to'        => $to->toDateString(),
            'filters'   => [
                'toda_zone_id'     => $request->query('toda_zone_id'),
                'violation_type'   => $request->query('violation_type'),
                'detection_method' => $request->query('detection_method'),
                'application_type' => $request->query('application_type'),
                'tricycle_status'  => $request->query('tricycle_status'),
            ],
            'todaZones' => TodaZone::orderBy('name')->get(['id', 'name']),
            'reportData'=> $reportData,
        ]);
    }

    public function exportViolationsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->violationsReport($from, $to, $request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Violations Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Violations & Compliance Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            11
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Violations' => number_format($data['kpis']['total_violations']),
            'Fines Assessed'   => 'PHP ' . number_format($data['kpis']['fines_assessed'], 2),
            'Fines Collected'  => 'PHP ' . number_format($data['kpis']['fines_collected'], 2),
            'Collection Rate'  => number_format($data['kpis']['collection_rate'], 1) . '%',
            'Appeals Filed'    => number_format($data['kpis']['appeals_filed']),
        ], [2, 2, 2, 2, 3]);

        $row = $this->writeSectionTitle($sheet, $row, 'Official Violation Log');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Ticket No.', 'Date', 'Time', 'Type', 'Detection Method', 'Operator', 'Plate No.', 'TODA Zone', 'Fine Amount (PHP)', 'Paid', 'Appeal Status'],
            $data['records']->map(fn ($r) => [
                $r['id'],
                $r['date'],
                $r['time'],
                $r['type'],
                $r['detection_method'],
                $r['operator'],
                $r['plate'],
                $r['toda'],
                (float) $r['fine'],
                $r['is_paid'] ? 'Paid' : 'Unpaid',
                $r['appeal_status'] ? ucfirst(str_replace('_', ' ', $r['appeal_status'])) : 'None',
            ])->all(),
            true
        );

        $filename = 'trivora_violations_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportApplicationsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->applicationsReport($from, $to, $request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Applications Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Franchise & Applications Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            4
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Applications Submitted' => number_format($data['kpis']['submitted']),
            'Completed Franchises'   => number_format($data['kpis']['completed']),
            'Rejection Rate'         => number_format($data['kpis']['rejection_rate'], 1) . '%',
            'Avg. Processing Time'   => $data['kpis']['avg_processing_days'] !== null ? number_format($data['kpis']['avg_processing_days'], 1) . ' days' : 'N/A',
        ], [1, 1, 1, 1]);

        $totalSubmitted = max($data['kpis']['submitted'], 1);
        $stagePhases = [
            'Document Review'             => 'Initial Evaluation',
            'Re-submission'               => 'Applicant Revision',
            'Physical Inspection'         => 'Field Inspection',
            'Re-inspection'               => 'Follow-up Inspection',
            'Municipal Treasurer Payment' => 'Treasury Assessment',
            'BPLO Releasing'              => 'BPLO Processing',
            'Final Confirmation'          => 'Final Endorsement',
            'Completed'                   => 'Franchise Issued',
        ];

        $row = $this->writeSectionTitle($sheet, $row, 'Current Stage Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Application Stage', 'Workflow Phase', 'Applications Count', 'Share of Total'],
            $data['by_stage']->map(fn ($s) => [
                $s['stage'],
                $stagePhases[$s['stage']] ?? 'Processing',
                (int) $s['count'],
                number_format(($s['count'] / $totalSubmitted) * 100, 1) . '%',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Application Type Distribution');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Application Type', 'Applicant Category', 'Applications Count', 'Share of Total'],
            [
                ['New Franchise', 'First-time Applicant', (int) $data['type_split']['new'], number_format(($data['type_split']['new'] / $totalSubmitted) * 100, 1) . '%'],
                ['Renewal', 'Existing Franchise Renewal', (int) $data['type_split']['renewal'], number_format(($data['type_split']['renewal'] / $totalSubmitted) * 100, 1) . '%'],
            ]
        );

        if (count($data['avg_time_in_stage'])) {
            $row = $this->writeSectionTitle($sheet, $row, 'Average Processing Time by Stage');
            $row = $this->writeTable(
                $sheet,
                $row,
                ['Workflow Status', 'Category', 'Avg. Hours in Stage', 'Equivalent Days'],
                $data['avg_time_in_stage']->map(fn ($s) => [
                    $s['status'],
                    'Stage SLA Metric',
                    (float) $s['avg_hours'],
                    number_format($s['avg_hours'] / 24, 1) . ' days',
                ])->all()
            );
        }

        $filename = 'trivora_applications_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportFleetExcel(Request $request): StreamedResponse
    {
        $data = $this->fleetReport($request);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Fleet Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);

        $row = $this->writeReportHeader(
            $sheet,
            'Fleet & Franchise Registry Report',
            'As of: ' . now()->format('F d, Y \a\t h:i A'),
            5
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'Total Registered' => number_format($data['kpis']['total']),
            'Active Units'     => number_format($data['kpis']['active']),
            'Suspended Units'  => number_format($data['kpis']['suspended']),
            'Revoked Units'    => number_format($data['kpis']['revoked']),
        ], [2, 1, 1, 1]);

        $totalFleet = max($data['kpis']['total'], 1);

        $row = $this->writeSectionTitle($sheet, $row, 'Fleet Distribution by TODA Zone');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['TODA Zone', 'Zone Category', 'Units Registered', 'Fleet Share', 'Operational Status'],
            $data['by_toda']->map(fn ($z) => [
                $z['zone'],
                'Recognized TODA',
                (int) $z['count'],
                number_format(($z['count'] / $totalFleet) * 100, 1) . '%',
                $z['count'] > 0 ? 'Active Route' : 'No Active Units',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Fleet by Color Coding Scheme');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Color Coding Scheme', 'Color Hex Code', 'Units Assigned', 'Fleet Share', 'Scheme Status'],
            $data['by_color_scheme']->map(fn ($s) => [
                $s['scheme'],
                $s['color'] ?: 'Standard',
                (int) $s['count'],
                number_format(($s['count'] / $totalFleet) * 100, 1) . '%',
                'Designated Route',
            ])->all()
        );

        $row = $this->writeSectionTitle($sheet, $row, 'Tracking Method Adoption');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Tracking Method', 'Technology Type', 'Units Count', 'Adoption Share', 'Compliance Mode'],
            [
                ['IoT GPS Device', 'Dedicated Hardware Telemetry', (int) $data['tracking_split']['iot'], number_format($data['kpis']['iot_pct'], 1) . '%', 'Compliant'],
                ['Mobile Driver App', 'Smartphone GPS Telemetry', (int) $data['tracking_split']['mobile'], number_format($data['kpis']['mobile_pct'], 1) . '%', 'Compliant'],
            ]
        );

        if (count($data['expiring'])) {
            $row = $this->writeSectionTitle($sheet, $row, 'Franchises Expiring Within 90 Days');
            $row = $this->writeTable(
                $sheet,
                $row,
                ['Franchise No.', 'Operator Name', 'Plate No.', 'Expiry Date', 'Days Left'],
                $data['expiring']->map(fn ($e) => [
                    $e['franchise_number'],
                    $e['operator'],
                    $e['plate'],
                    $e['expiry_date'],
                    (int) $e['days_left'],
                ])->all()
            );
        }

        $filename = 'trivora_fleet_report_' . now()->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    public function exportCollectionsExcel(Request $request): StreamedResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        $data = $this->collectionsReport($from, $to);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('Segoe UI');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Collections Report');
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);

        $row = $this->writeReportHeader(
            $sheet,
            'Revenue & Collections Summary Report',
            'Period: ' . $from->format('F d, Y') . ' to ' . $to->format('F d, Y'),
            4
        );

        $row = $this->writeKpiRow($sheet, $row, [
            'MTOP Franchise Fees' => 'PHP ' . number_format($data['kpis']['fees_collected'], 2),
            'Violation Fines'     => 'PHP ' . number_format($data['kpis']['fines_collected'], 2),
            'Combined Total'      => 'PHP ' . number_format($data['kpis']['combined_total'], 2),
        ], [1, 1, 2]);

        $row = $this->writeSectionTitle($sheet, $row, 'Daily Collections Breakdown');
        $row = $this->writeTable(
            $sheet,
            $row,
            ['Collection Date', 'Franchise Fees (PHP)', 'Violation Fines (PHP)', 'Daily Total (PHP)'],
            $data['trend']->map(fn ($t) => [
                $t['date'],
                (float) $t['fees'],
                (float) $t['fines'],
                (float) ($t['fees'] + $t['fines']),
            ])->all(),
            true
        );

        $filename = 'trivora_collections_report_' . $from->toDateString() . '_to_' . $to->toDateString() . '.xlsx';

        return $this->streamExcel($spreadsheet, $filename);
    }

    // -------------------------------------------------------------------------
    // Excel export helpers — shared official municipal report header & tables
    // -------------------------------------------------------------------------

    private function streamExcel(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        return new StreamedResponse(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    private function writeReportHeader(Worksheet $sheet, string $title, string $periodLabel, int $lastColumn): int
    {
        $lastColLetter = Coordinate::stringFromColumnIndex($lastColumn);

        // Configure worksheet print & view defaults
        $sheet->setShowGridlines(true);
        $sheet->setPrintGridlines(true);
        $sheet->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_A4);
        $sheet->getPageSetup()->setFitToPage(true);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);
        $sheet->getHeaderFooter()->setOddFooter('&L&8TRIVORA TMO System — Municipal Government of Nasugbu&R&8Page &P of &N');

        // Initialize all columns in the header span to a sensible minimum width
        for ($c = 1; $c <= $lastColumn; $c++) {
            $currentWidth = $sheet->getColumnDimensionByColumn($c)->getWidth();
            if ($currentWidth < 18) {
                $sheet->getColumnDimensionByColumn($c)->setWidth(18);
            }
        }

        // Row 1: Republic of the Philippines
        $sheet->mergeCells("A1:{$lastColLetter}1");
        $sheet->setCellValue('A1', 'REPUBLIC OF THE PHILIPPINES');
        $sheet->getStyle('A1')->getFont()->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('64748B'));
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(16);

        // Row 2: Province of Batangas
        $sheet->mergeCells("A2:{$lastColLetter}2");
        $sheet->setCellValue('A2', 'PROVINCE OF BATANGAS');
        $sheet->getStyle('A2')->getFont()->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('64748B'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(2)->setRowHeight(16);

        // Row 3: Municipal Government of Nasugbu
        $sheet->mergeCells("A3:{$lastColLetter}3");
        $sheet->setCellValue('A3', 'MUNICIPAL GOVERNMENT OF NASUGBU');
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('1D2542'));
        $sheet->getStyle('A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(3)->setRowHeight(20);

        // Row 4: Office of the Municipal Mayor
        $sheet->mergeCells("A4:{$lastColLetter}4");
        $sheet->setCellValue('A4', 'OFFICE OF THE MUNICIPAL MAYOR');
        $sheet->getStyle('A4')->getFont()->setBold(true)->setSize(9.5)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('475569'));
        $sheet->getStyle('A4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(4)->setRowHeight(16);

        // Row 5: Tricycle Management Office (TMO)
        $sheet->mergeCells("A5:{$lastColLetter}5");
        $sheet->setCellValue('A5', 'TRICYCLE MANAGEMENT OFFICE (TMO)');
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(11)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('1D2542'));
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(5)->setRowHeight(18);

        // Row 6: Spacer
        $sheet->getRowDimension(6)->setRowHeight(8);

        // Row 7: Report Title
        $sheet->mergeCells("A7:{$lastColLetter}7");
        $sheet->setCellValue('A7', strtoupper($title));
        $sheet->getStyle('A7')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('0F172A'));
        $sheet->getStyle('A7')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(7)->setRowHeight(24);

        // Row 8: Period / Date Range
        $sheet->mergeCells("A8:{$lastColLetter}8");
        $sheet->setCellValue('A8', $periodLabel);
        $sheet->getStyle('A8')->getFont()->setSize(9.5)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('334155'));
        $sheet->getStyle('A8')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(8)->setRowHeight(16);

        // Row 9: Date Generated & Metadata
        $sheet->mergeCells("A9:{$lastColLetter}9");
        $sheet->setCellValue('A9', 'Document Ref: LGU-NAS-TMO  |  Date Generated: ' . now()->format('F d, Y \a\t h:i A') . '  |  Official Municipal Record');
        $sheet->getStyle('A9')->getFont()->setSize(8.5)->setItalic(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('64748B'));
        $sheet->getStyle('A9')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(9)->setRowHeight(16);

        // Row 10: Subtle double border divider line
        $sheet->mergeCells("A10:{$lastColLetter}10");
        $sheet->getRowDimension(10)->setRowHeight(6);
        $sheet->getStyle("A10:{$lastColLetter}10")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
        $sheet->getStyle("A10:{$lastColLetter}10")->getBorders()->getBottom()->getColor()->setRGB('1D2542');

        // Row 11: Spacer
        $sheet->getRowDimension(11)->setRowHeight(12);

        return 12;
    }

    private function writeSectionTitle(Worksheet $sheet, int $row, string $title): int
    {
        $sheet->setCellValue("A{$row}", strtoupper($title));
        $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(10.5)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('1D2542'));
        $sheet->getStyle("A{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension($row)->setRowHeight(22);

        return $row + 1;
    }

    private function writeKpiRow(Worksheet $sheet, int $row, array $kpis, ?array $spans = null): int
    {
        $sheet->getRowDimension($row)->setRowHeight(20);
        $sheet->getRowDimension($row + 1)->setRowHeight(26);

        $col = 1;
        $kpiKeys = array_keys($kpis);
        $kpiValues = array_values($kpis);

        for ($i = 0; $i < count($kpiKeys); $i++) {
            $label = $kpiKeys[$i];
            $value = $kpiValues[$i];
            $span = $spans[$i] ?? 1;

            $startColLetter = Coordinate::stringFromColumnIndex($col);
            $endColLetter = Coordinate::stringFromColumnIndex($col + $span - 1);
            $kpiLabel = strtoupper($label);

            if ($span > 1) {
                $sheet->mergeCells("{$startColLetter}{$row}:{$endColLetter}{$row}");
                $sheet->mergeCells("{$startColLetter}" . ($row + 1) . ":{$endColLetter}" . ($row + 1));
            }

            // Set Header Cell
            $sheet->setCellValue("{$startColLetter}{$row}", $kpiLabel);
            $sheet->getStyle("{$startColLetter}{$row}")->getFont()->setBold(true)->setSize(8.5);
            $sheet->getStyle("{$startColLetter}{$row}")->getFont()->getColor()->setRGB('475569');
            $sheet->getStyle("{$startColLetter}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(false);

            // Apply fill and borders across all merged cells in header
            $headerRange = "{$startColLetter}{$row}:{$endColLetter}{$row}";
            $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('F8FAFC');
            $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->getColor()->setRGB('CBD5E1');

            // Set Value Cell
            $sheet->setCellValue("{$startColLetter}" . ($row + 1), $value);
            $sheet->getStyle("{$startColLetter}" . ($row + 1))->getFont()->setBold(true)->setSize(12.5);
            $sheet->getStyle("{$startColLetter}" . ($row + 1))->getFont()->getColor()->setRGB('1D2542');
            $sheet->getStyle("{$startColLetter}" . ($row + 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(false);

            // Apply fill and borders across all merged cells in value
            $valueRange = "{$startColLetter}" . ($row + 1) . ":{$endColLetter}" . ($row + 1);
            $sheet->getStyle($valueRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFFFFF');
            $sheet->getStyle($valueRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle($valueRange)->getBorders()->getAllBorders()->getColor()->setRGB('CBD5E1');

            $col += $span;
        }

        $sheet->getRowDimension($row + 2)->setRowHeight(12);

        return $row + 3;
    }

    private function writeTable(Worksheet $sheet, int $row, array $headers, array $rows, bool $freezeHeader = false): int
    {
        $colCount = count($headers);

        // Freeze table header if requested and not already frozen
        if ($freezeHeader && !$sheet->getFreezePane()) {
            $sheet->freezePane('A' . ($row + 1));
        }

        // Column format/alignment definitions
        $colDefs = [];
        for ($c = 1; $c <= $colCount; $c++) {
            $headerText = $headers[$c - 1] ?? '';
            $colDefs[$c] = $this->getColumnFormatAndAlignment($headerText);
            $colLetter = Coordinate::stringFromColumnIndex($c);

            // Set Header Cell
            $sheet->setCellValue("{$colLetter}{$row}", $headerText);
            $sheet->getStyle("{$colLetter}{$row}")->getFont()->setBold(true)->setSize(10);
            $sheet->getStyle("{$colLetter}{$row}")->getFont()->getColor()->setRGB('FFFFFF');
            $sheet->getStyle("{$colLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('1D2542');
            $sheet->getStyle("{$colLetter}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
            $sheet->getStyle("{$colLetter}{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("{$colLetter}{$row}")->getBorders()->getAllBorders()->getColor()->setRGB('334155');
        }
        $sheet->getRowDimension($row)->setRowHeight(26);

        // Data Rows
        $r = $row + 1;
        $rowIdx = 0;
        foreach ($rows as $rowData) {
            $rowIdx++;
            $isOdd = ($rowIdx % 2 !== 0);
            $bgHex = $isOdd ? 'FFFFFF' : 'F8FAFC';
            $sheet->getRowDimension($r)->setRowHeight(21);

            $c = 1;
            foreach ($rowData as $value) {
                $colLetter = Coordinate::stringFromColumnIndex($c);
                $cellCoord = "{$colLetter}{$r}";
                $def = $colDefs[$c] ?? ['align' => Alignment::HORIZONTAL_LEFT, 'format' => null, 'type' => 'text'];

                // Handle cell value and format
                if (is_numeric($value) && ($def['type'] === 'currency' || $def['type'] === 'float' || $def['type'] === 'integer')) {
                    $sheet->setCellValueExplicit($cellCoord, (float) $value, DataType::TYPE_NUMERIC);
                } else {
                    $sheet->setCellValue($cellCoord, $value);
                }

                $style = $sheet->getStyle($cellCoord);
                $style->getAlignment()->setHorizontal($def['align'])->setVertical(Alignment::VERTICAL_CENTER);
                if ($def['align'] === Alignment::HORIZONTAL_LEFT) {
                    $style->getAlignment()->setIndent(1);
                }

                if ($def['format']) {
                    $style->getNumberFormat()->setFormatCode($def['format']);
                }

                // Row tint & borders
                $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($bgHex);
                $style->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $style->getBorders()->getAllBorders()->getColor()->setRGB('E2E8F0');

                $c++;
            }
            $r++;
        }

        // Sensible Column Widths
        for ($c = 1; $c <= $colCount; $c++) {
            $headerLen = mb_strlen($headers[$c - 1] ?? '');
            $maxLen = $headerLen;
            foreach ($rows as $rData) {
                $valStr = (string) ($rData[$c - 1] ?? '');
                $maxLen = max($maxLen, mb_strlen($valStr));
            }
            $sensibleWidth = max(min($maxLen + 5, 38), 18);
            $currentWidth = $sheet->getColumnDimensionByColumn($c)->getWidth();
            $sheet->getColumnDimensionByColumn($c)->setWidth(max($currentWidth, $sensibleWidth));
        }

        $sheet->getRowDimension($r)->setRowHeight(12);

        return $r + 1;
    }

    private function getColumnFormatAndAlignment(string $header): array
    {
        $h = strtolower(trim($header));

        // Currency / Financial
        if (str_contains($h, '(php)') || str_contains($h, 'fee') || str_contains($h, 'fine') || str_contains($h, 'amount') || str_contains($h, 'total')) {
            return [
                'align'  => Alignment::HORIZONTAL_RIGHT,
                'format' => '#,##0.00',
                'type'   => 'currency',
            ];
        }

        // Percentage
        if (str_contains($h, '%') || str_contains($h, 'share') || str_contains($h, 'rate')) {
            return [
                'align'  => Alignment::HORIZONTAL_RIGHT,
                'format' => '0.0%',
                'type'   => 'percent',
            ];
        }

        // Decimal / Hours
        if (str_contains($h, 'hours') || str_contains($h, 'avg.')) {
            return [
                'align'  => Alignment::HORIZONTAL_RIGHT,
                'format' => '#,##0.0',
                'type'   => 'float',
            ];
        }

        // Integer counts / Days
        if (in_array($h, ['units', 'count', 'applications', 'days left', 'tickets', 'units registered', 'units assigned', 'units count', 'applications count'])) {
            return [
                'align'  => Alignment::HORIZONTAL_RIGHT,
                'format' => '#,##0',
                'type'   => 'integer',
            ];
        }

        // Dates and Times
        if (in_array($h, ['date', 'time', 'expiry date', 'collection date', 'detected at', 'submitted at', 'completed at', 'payment date'])) {
            return [
                'align'  => Alignment::HORIZONTAL_CENTER,
                'format' => null,
                'type'   => 'date',
            ];
        }

        // Codes, IDs, Status, Short Badges
        if (in_array($h, ['ticket no.', 'plate no.', 'franchise no.', 'paid', 'appeal status', 'detection method', 'status', 'method', 'type'])) {
            return [
                'align'  => Alignment::HORIZONTAL_CENTER,
                'format' => null,
                'type'   => 'code',
            ];
        }

        // Default: Text / Names
        return [
            'align'  => Alignment::HORIZONTAL_LEFT,
            'format' => null,
            'type'   => 'text',
        ];
    }

    // -------------------------------------------------------------------------
    // Per-tab report builders
    // -------------------------------------------------------------------------

    private function resolveDateRange(Request $request): array
    {
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->subDays(29)->startOfDay();
        return [$from, $to];
    }

    private function violationsReport(Carbon $from, Carbon $to, Request $request): array
    {
        $todaId = $request->query('toda_zone_id');
        $type = $request->query('violation_type');
        $method = $request->query('detection_method');

        $base = Violation::whereBetween('detected_at', [$from, $to])
            ->when($type, fn ($q) => $q->where('violation_type', $type))
            ->when($method, fn ($q) => $q->where('detection_method', $method))
            ->when($todaId, function ($q) use ($todaId) {
                $q->whereHas('tricycle', fn ($t) => $t->where('toda_zone_id', $todaId));
            });

        $totalViolations = (clone $base)->count();
        $finesAssessed = (float) (clone $base)->sum('fine_amount');
        $finesCollected = (float) (clone $base)->whereNotNull('fine_paid_at')->sum('amount_paid');
        $collectionRate = $finesAssessed > 0 ? round(($finesCollected / $finesAssessed) * 100, 1) : 0.0;

        $appealsFiled = (clone $base)->whereHas('appeal')->count();
        $appealsApproved = (clone $base)->whereHas('appeal', fn ($q) => $q->where('status', 'approved'))->count();
        $appealsRejected = (clone $base)->whereHas('appeal', fn ($q) => $q->where('status', 'rejected'))->count();
        $decidedAppeals = $appealsApproved + $appealsRejected;
        $appealApprovalRate = $decidedAppeals > 0 ? round(($appealsApproved / $decidedAppeals) * 100, 1) : null;

        $trend = (clone $base)
            ->selectRaw('DATE(detected_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        $byType = (clone $base)
            ->selectRaw('violation_type, COUNT(*) as c')
            ->groupBy('violation_type')
            ->get()
            ->map(fn ($r) => ['type' => ucwords(str_replace('_', ' ', $r->violation_type)), 'count' => (int) $r->c])
            ->values();

        $byDayRows = (clone $base)
            ->selectRaw('day_of_week, COUNT(*) as c')
            ->groupBy('day_of_week')
            ->get()
            ->keyBy('day_of_week');
        $dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $byDayOfWeek = collect($dayOrder)->map(fn ($d) => [
            'day'   => $d,
            'count' => (int) ($byDayRows[$d]->c ?? 0),
        ])->values();

        $byToda = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->leftJoin('violations', function ($j) use ($from, $to) {
                $j->on('violations.tricycle_id', '=', 'tricycles.id')
                    ->whereBetween('violations.detected_at', [$from, $to]);
            })
            ->select('toda_zones.name', DB::raw('COUNT(violations.id) as c'))
            ->groupBy('toda_zones.id', 'toda_zones.name')
            ->get()
            ->map(fn ($r) => ['zone' => $r->name, 'count' => (int) $r->c])
            ->values();

        $automatedCount = (clone $base)->where('detection_method', 'automated')->count();
        $manualCount = (clone $base)->where('detection_method', 'manual')->count();

        $records = (clone $base)
            ->with(['tricycle.operator', 'tricycle.todaZone', 'appeal'])
            ->orderByDesc('detected_at')
            ->get()
            ->map(fn ($v) => [
                'id'               => 'VIO-26-' . str_pad((string) $v->id, 4, '0', STR_PAD_LEFT),
                'db_id'            => $v->id,
                'date'             => $v->detected_at->format('M d, Y'),
                'time'             => $v->detected_at->format('h:i A'),
                'type'             => ucwords(str_replace('_', ' ', $v->violation_type)),
                'detection_method' => ucfirst($v->detection_method),
                'operator'         => $v->tricycle?->operator?->full_name ?: 'N/A',
                'plate'            => $v->tricycle?->plate_number ?: 'N/A',
                'toda'             => $v->tricycle?->todaZone?->name ?: 'Unassigned',
                'fine'             => (float) $v->fine_amount,
                'is_paid'          => $v->fine_paid_at !== null,
                'appeal_status'    => $v->appeal?->status,
            ])
            ->values();

        return [
            'kpis' => [
                'total_violations'     => $totalViolations,
                'fines_assessed'       => $finesAssessed,
                'fines_collected'      => $finesCollected,
                'collection_rate'      => $collectionRate,
                'appeals_filed'        => $appealsFiled,
                'appeal_approval_rate' => $appealApprovalRate,
            ],
            'trend'           => $trend,
            'by_type'         => $byType,
            'by_day_of_week'  => $byDayOfWeek,
            'by_toda'         => $byToda,
            'detection_split' => ['automated' => $automatedCount, 'manual' => $manualCount],
            'records'         => $records,
            // Filter dropdowns only ever offer values that actually occur somewhere in the
            // violations table — no dead options that always resolve to zero results.
            'available_types'   => Violation::select('violation_type')->distinct()->pluck('violation_type')
                ->map(fn ($t) => ['value' => $t, 'label' => ucwords(str_replace('_', ' ', $t))])
                ->values(),
            'available_methods' => Violation::select('detection_method')->distinct()->pluck('detection_method')
                ->map(fn ($m) => ['value' => $m, 'label' => ucfirst($m)])
                ->values(),
        ];
    }

    private function fleetReport(Request $request): array
    {
        $todaId = $request->query('toda_zone_id');
        $status = $request->query('tricycle_status');

        $base = Tricycle::query()
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($todaId, fn ($q) => $q->where('toda_zone_id', $todaId));

        $total = (clone $base)->count();
        $active = (clone $base)->where('status', 'active')->count();
        $suspended = (clone $base)->where('status', 'suspended')->count();
        $revoked = (clone $base)->where('status', 'revoked')->count();

        $iotCount = (clone $base)->where('active_tracking_mode', 'iot_device')->count();
        $mobileCount = (clone $base)->where('active_tracking_mode', 'mobile_app')->count();

        $byToda = DB::table('toda_zones')
            ->leftJoin('tricycles', 'toda_zones.id', '=', 'tricycles.toda_zone_id')
            ->select('toda_zones.name', DB::raw('count(tricycles.id) as c'))
            ->groupBy('toda_zones.id', 'toda_zones.name')
            ->get()
            ->map(fn ($r) => ['zone' => $r->name, 'count' => (int) $r->c])
            ->values();

        $byColorScheme = DB::table('color_coding_schemes')
            ->leftJoin('franchise_schemes', function ($j) {
                $j->on('franchise_schemes.color_coding_scheme_id', '=', 'color_coding_schemes.id')
                    ->where('franchise_schemes.is_active', true);
            })
            ->select('color_coding_schemes.name', 'color_coding_schemes.color_hex', DB::raw('count(franchise_schemes.id) as c'))
            ->groupBy('color_coding_schemes.id', 'color_coding_schemes.name', 'color_coding_schemes.color_hex')
            ->get()
            ->map(fn ($r) => ['scheme' => $r->name, 'color' => $r->color_hex, 'count' => (int) $r->c])
            ->values();

        $expiring = FranchiseScheme::where('is_active', true)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()])
            ->with('tricycle.operator')
            ->orderBy('expiry_date')
            ->get()
            ->map(fn ($fs) => [
                'franchise_number' => $fs->franchise_number,
                'operator'         => $fs->tricycle?->operator?->full_name ?: 'N/A',
                'plate'            => $fs->tricycle?->plate_number ?: 'N/A',
                'expiry_date'      => $fs->expiry_date->format('M d, Y'),
                'days_left'        => (int) now()->startOfDay()->diffInDays($fs->expiry_date, false),
            ])
            ->values();

        return [
            'kpis' => [
                'total'      => $total,
                'active'     => $active,
                'suspended'  => $suspended,
                'revoked'    => $revoked,
                'iot_pct'    => $total > 0 ? round(($iotCount / $total) * 100, 1) : 0.0,
                'mobile_pct' => $total > 0 ? round(($mobileCount / $total) * 100, 1) : 0.0,
            ],
            'by_toda'         => $byToda,
            'by_color_scheme' => $byColorScheme,
            'tracking_split'  => ['iot' => $iotCount, 'mobile' => $mobileCount],
            'expiring'        => $expiring,
        ];
    }

    private function applicationsReport(Carbon $from, Carbon $to, Request $request): array
    {
        $type = $request->query('application_type');

        $base = Application::whereBetween('submitted_at', [$from, $to])
            ->when($type, fn ($q) => $q->where('application_type', $type));

        $submitted = (clone $base)->count();
        $completed = (clone $base)->where('status', 'completed')->count();
        $rejected = (clone $base)->where('status', 'rejected')->count();

        $rejectionRate = $submitted > 0 ? round(($rejected / $submitted) * 100, 1) : 0.0;

        $avgProcessingDays = (clone $base)
            ->whereNotNull('completed_at')
            ->get(['submitted_at', 'completed_at'])
            ->avg(fn ($a) => $a->submitted_at->diffInDays($a->completed_at));

        $newCount = (clone $base)->where('application_type', 'new')->count();
        $renewalCount = (clone $base)->where('application_type', 'renewal')->count();

        $trend = (clone $base)
            ->selectRaw('DATE(submitted_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->map(fn ($r) => ['date' => $r->d, 'count' => (int) $r->c])
            ->values();

        $stageGroups = [
            'Document Review'              => ['draft', 'pending_review', 'under_review'],
            'Re-submission'                => ['rejected'],
            'Physical Inspection'          => ['pending_inspection', 'under_inspection'],
            'Re-inspection'                => ['failed_inspection'],
            'Municipal Treasurer Payment'  => ['pending_payment', 'payment_issue'],
            'BPLO Releasing'               => ['payment_verified', 'paid'],
            'Final Confirmation'           => ['awaiting_tmo_confirmation'],
            'Completed'                    => ['completed', 'scheme_issued'],
        ];
        $byStage = collect($stageGroups)
            ->map(fn ($statuses, $label) => ['stage' => $label, 'count' => (clone $base)->whereIn('status', $statuses)->count()])
            ->values();

        // Average time spent in each stage, derived from ApplicationStatusHistory by pairing
        // consecutive transitions per application — bounded to applications submitted in this
        // date range, not the whole table.
        $appIds = (clone $base)->pluck('id');
        $histories = ApplicationStatusHistory::whereIn('application_id', $appIds)
            ->orderBy('application_id')
            ->orderBy('created_at')
            ->get(['application_id', 'to_status', 'created_at']);

        $stageDurations = [];
        foreach ($histories->groupBy('application_id') as $rows) {
            $rows = $rows->values();
            for ($i = 0; $i < $rows->count() - 1; $i++) {
                $status = $rows[$i]->to_status;
                $hours = $rows[$i]->created_at->diffInHours($rows[$i + 1]->created_at);
                $stageDurations[$status][] = $hours;
            }
        }
        $avgTimeInStage = collect($stageDurations)
            ->map(fn ($hours, $status) => [
                'status'    => ucwords(str_replace('_', ' ', $status)),
                'avg_hours' => round(array_sum($hours) / count($hours), 1),
            ])
            ->values();

        return [
            'kpis' => [
                'submitted'           => $submitted,
                'completed'           => $completed,
                'rejection_rate'      => $rejectionRate,
                'avg_processing_days' => $avgProcessingDays !== null ? round($avgProcessingDays, 1) : null,
            ],
            'trend'             => $trend,
            'by_stage'          => $byStage,
            'type_split'        => ['new' => $newCount, 'renewal' => $renewalCount],
            'avg_time_in_stage' => $avgTimeInStage,
        ];
    }

    private function collectionsReport(Carbon $from, Carbon $to): array
    {
        $fees = (float) Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->where('is_verified', true)
            ->sum('amount');

        $fines = (float) Violation::whereBetween('fine_paid_at', [$from, $to])->sum('amount_paid');

        $feesTrend = Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->where('is_verified', true)
            ->selectRaw('payment_date as d, SUM(amount) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->keyBy(fn ($r) => (string) $r->d);

        $finesTrend = Violation::whereBetween('fine_paid_at', [$from, $to])
            ->selectRaw('DATE(fine_paid_at) as d, SUM(amount_paid) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get()
            ->keyBy(fn ($r) => (string) $r->d);

        $allDates = $feesTrend->keys()->merge($finesTrend->keys())->unique()->sort()->values();
        $trend = $allDates->map(fn ($date) => [
            'date'  => $date,
            'fees'  => (float) ($feesTrend[$date]->c ?? 0),
            'fines' => (float) ($finesTrend[$date]->c ?? 0),
        ])->values();

        return [
            'kpis' => [
                'fees_collected'  => $fees,
                'fines_collected' => $fines,
                'combined_total'  => $fees + $fines,
            ],
            'trend' => $trend,
        ];
    }
}
