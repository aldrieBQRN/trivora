<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportTitle }}</title>
    {{--
        Generic municipal PDF report (landscape A4) — same letterhead, KPI bar and table styling as
        reports/audit_logs_pdf.blade.php, but driven by data so any office export can reuse it:
          $officeName, $footerCode, $docRef, $reportTitle, $periodLabel,
          $kpis     => ['Label' => 'Value', ...]
          $sections => [['title' => ..., 'headers' => [...], 'rows' => [[...], ...]], ...]
    --}}
    <style>
        /*
         * Page margins: dompdf implements @page margins as the <html> element's margins, so any
         * rule that sets margin on `html` (including a universal `* { margin: 0 }` reset) wipes
         * them out and the content runs to the paper edge. Never reset margins on html or `*`.
         */
        @page { size: a4 landscape; margin: 16mm 18mm 20mm 18mm; }
        body { margin: 0; padding: 0; }
        body { font-family: DejaVu Sans, Helvetica, Arial, sans-serif; color: #0f172a; font-size: 8pt; line-height: 1.4; background: #ffffff; }
        div, p, table { margin: 0; padding: 0; }

        .header-wrap { text-align: center; border-bottom: 2px solid #182B62; padding-bottom: 10px; margin-bottom: 16px; }
        .lgu-banner { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.8px; color: #475569; text-transform: uppercase; }
        .office-title { font-size: 14pt; font-weight: 800; color: #182B62; letter-spacing: 0.5px; margin-top: 4px; text-transform: uppercase; }
        .report-subtitle { font-size: 9.5pt; font-weight: 700; color: #0284c7; margin-top: 3px; letter-spacing: 0.3px; text-transform: uppercase; }
        .meta-line { font-size: 7.5pt; color: #64748b; margin-top: 6px; }

        /* KPI boxes: border-spacing gives gaps between boxes; the negative side margin keeps the
           outer boxes flush with the table edges below. */
        .summary-bar { width: 100%; margin-bottom: 18px; border-collapse: separate; border-spacing: 8px 0; margin-left: -8px; margin-right: -8px; }
        .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; }
        .summary-label { font-size: 6.8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-val { font-size: 10pt; font-weight: 700; color: #182B62; margin-top: 3px; white-space: nowrap; }

        .section-title { font-size: 8.5pt; font-weight: 800; color: #182B62; text-transform: uppercase; letter-spacing: 0.4px; margin: 18px 0 7px; }
        .section-title.first { margin-top: 0; }

        .report-table { width: 100%; border-collapse: collapse; }
        .report-table thead { display: table-header-group; }
        .report-table tr { page-break-inside: avoid; }
        .report-table th { background-color: #182B62; color: #ffffff; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; padding: 8px 10px; border: 1px solid #182B62; text-align: left; }
        .report-table td { font-size: 7.8pt; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; vertical-align: top; word-break: break-word; }
        .report-table tr:nth-child(even) td { background-color: #f8fafc; }
        .empty-row { text-align: center; padding: 16px; color: #64748b; font-style: italic; }
    </style>
</head>
<body>

    <div class="header-wrap">
        <div class="lgu-banner">Republic of the Philippines &bull; Province of Batangas &bull; Municipality of Nasugbu</div>
        <div class="office-title">{{ $officeName }}</div>
        <div class="report-subtitle">{{ $reportTitle }}</div>
        <div class="meta-line">
            Document Ref: <strong>{{ $docRef }}</strong> &bull; Coverage: <strong>{{ $periodLabel }}</strong> &bull; Printed: {{ now()->format('F d, Y \a\t h:i A') }}
        </div>
    </div>

    @if (!empty($kpis))
        <table class="summary-bar" cellpadding="0" cellspacing="0">
            <tr>
                @foreach ($kpis as $label => $value)
                    <td width="{{ round(100 / count($kpis), 2) }}%">
                        <div class="summary-box">
                            <div class="summary-label">{{ $label }}</div>
                            <div class="summary-val">{{ $value }}</div>
                        </div>
                    </td>
                @endforeach
            </tr>
        </table>
    @endif

    @foreach ($sections as $section)
        @if (!empty($section['title']))
            <div class="section-title {{ $loop->first ? 'first' : '' }}">{{ $section['title'] }}</div>
        @endif
        <table class="report-table">
            <thead>
                <tr>
                    @foreach ($section['headers'] as $header)
                        <th>{{ $header }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse ($section['rows'] as $row)
                    <tr>
                        @foreach ($row as $cell)
                            <td>{{ ($cell === null || $cell === '') ? '—' : $cell }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($section['headers']) }}" class="empty-row">No records found for this section.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endforeach

    <script type="text/php">
        if (isset($pdf)) {
            $text = "TRIVORA Municipal Transport System  |  Confidential Official Record  |  Page " . $PAGE_NUM . " of " . $PAGE_COUNT;
            $font = $fontMetrics->get_font("DejaVu Sans, Helvetica", "normal");
            $size = 7;
            $color = array(0.45, 0.5, 0.55);
            $y = $pdf->get_height() - 22;
            $x = $pdf->get_width() / 2 - ($fontMetrics->get_text_width($text, $font, $size) / 2);
            $pdf->text($x, $y, $text, $font, $size, $color);
        }
    </script>

</body>
</html>
