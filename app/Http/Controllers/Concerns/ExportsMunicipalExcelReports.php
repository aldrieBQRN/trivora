<?php

namespace App\Http\Controllers\Concerns;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Shared "official municipal report" Excel styling — originally built for TMO\ReportController,
 * extracted so other office report controllers (e.g. BPLO\BPLOReportController) can produce the
 * same letterhead/KPI-row/table look without re-implementing the PhpSpreadsheet styling.
 */
trait ExportsMunicipalExcelReports
{
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

    private function writeReportHeader(
        Worksheet $sheet,
        string $title,
        string $periodLabel,
        int $lastColumn,
        string $officeName = 'TRICYCLE MANAGEMENT OFFICE (TMO)',
        string $footerCode = 'TMO'
    ): int {
        $lastColLetter = Coordinate::stringFromColumnIndex($lastColumn);

        // Configure worksheet print & view defaults
        $sheet->setShowGridlines(true);
        $sheet->setPrintGridlines(true);
        $sheet->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_A4);
        $sheet->getPageSetup()->setFitToPage(true);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);
        $sheet->getHeaderFooter()->setOddFooter('&L&8TRIVORA ' . $footerCode . ' System — Municipal Government of Nasugbu&R&8Page &P of &N');

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
        $sheet->getStyle('A1')->getFont()->setSize(9)->setColor(new Color('64748B'));
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(16);

        // Row 2: Province of Batangas
        $sheet->mergeCells("A2:{$lastColLetter}2");
        $sheet->setCellValue('A2', 'PROVINCE OF BATANGAS');
        $sheet->getStyle('A2')->getFont()->setSize(9)->setColor(new Color('64748B'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(2)->setRowHeight(16);

        // Row 3: Municipal Government of Nasugbu
        $sheet->mergeCells("A3:{$lastColLetter}3");
        $sheet->setCellValue('A3', 'MUNICIPAL GOVERNMENT OF NASUGBU');
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setColor(new Color('1D2542'));
        $sheet->getStyle('A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(3)->setRowHeight(20);

        // Row 4: Office of the Municipal Mayor
        $sheet->mergeCells("A4:{$lastColLetter}4");
        $sheet->setCellValue('A4', 'OFFICE OF THE MUNICIPAL MAYOR');
        $sheet->getStyle('A4')->getFont()->setBold(true)->setSize(9.5)->setColor(new Color('475569'));
        $sheet->getStyle('A4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(4)->setRowHeight(16);

        // Row 5: Issuing office (e.g. Tricycle Management Office, Business Permits and Licensing Office)
        $sheet->mergeCells("A5:{$lastColLetter}5");
        $sheet->setCellValue('A5', $officeName);
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(11)->setColor(new Color('1D2542'));
        $sheet->getStyle('A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(5)->setRowHeight(18);

        // Row 6: Spacer
        $sheet->getRowDimension(6)->setRowHeight(8);

        // Row 7: Report Title
        $sheet->mergeCells("A7:{$lastColLetter}7");
        $sheet->setCellValue('A7', strtoupper($title));
        $sheet->getStyle('A7')->getFont()->setBold(true)->setSize(14)->setColor(new Color('0F172A'));
        $sheet->getStyle('A7')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(7)->setRowHeight(24);

        // Row 8: Period / Date Range
        $sheet->mergeCells("A8:{$lastColLetter}8");
        $sheet->setCellValue('A8', $periodLabel);
        $sheet->getStyle('A8')->getFont()->setSize(9.5)->setColor(new Color('334155'));
        $sheet->getStyle('A8')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(8)->setRowHeight(16);

        // Row 9: Date Generated & Metadata
        $sheet->mergeCells("A9:{$lastColLetter}9");
        $sheet->setCellValue('A9', 'Document Ref: LGU-NAS-' . $footerCode . '  |  Date Generated: ' . now()->format('F d, Y \a\t h:i A') . '  |  Official Municipal Record');
        $sheet->getStyle('A9')->getFont()->setSize(8.5)->setItalic(true)->setColor(new Color('64748B'));
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
        $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(10.5)->setColor(new Color('1D2542'));
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
        if (in_array($h, ['units', 'count', 'applications', 'days left', 'tickets', 'units registered', 'units assigned', 'units count', 'applications count', 'active franchises', 'releases'])) {
            return [
                'align'  => Alignment::HORIZONTAL_RIGHT,
                'format' => '#,##0',
                'type'   => 'integer',
            ];
        }

        // Dates and Times
        if (in_array($h, ['date', 'time', 'expiry date', 'collection date', 'detected at', 'submitted at', 'completed at', 'payment date', 'submitted', 'released'])) {
            return [
                'align'  => Alignment::HORIZONTAL_CENTER,
                'format' => null,
                'type'   => 'date',
            ];
        }

        // Codes, IDs, Status, Short Badges
        if (in_array($h, ['ticket no.', 'plate no.', 'franchise no.', 'paid', 'appeal status', 'detection method', 'status', 'method', 'type', 'reference', 'plate'])) {
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
}
