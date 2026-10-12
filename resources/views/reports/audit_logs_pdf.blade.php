<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>System Activity &amp; Audit Trail Report</title>
    <style>
        @page {
            size: a4 landscape;
            margin: 14mm 16mm 16mm 16mm;
        }

        /* No margin reset on `*`/html: dompdf applies @page margins through the <html>
           element, so resetting it would push the content to the paper edge. */
        div, p, table {
            margin: 0;
            padding: 0;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 7.5pt;
            line-height: 1.35;
            background: #ffffff;
        }

        /* Municipal Header Block */
        .header-wrap {
            text-align: center;
            border-bottom: 2px solid #182B62;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }

        .lgu-banner {
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: #475569;
            text-transform: uppercase;
        }

        .office-title {
            font-size: 13pt;
            font-weight: 800;
            color: #182B62;
            letter-spacing: 0.5px;
            margin-top: 2px;
            text-transform: uppercase;
        }

        .report-subtitle {
            font-size: 9pt;
            font-weight: 700;
            color: #0284c7;
            margin-top: 2px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }

        .meta-line {
            font-size: 7pt;
            color: #64748b;
            margin-top: 4px;
        }

        /* Summary KPIs */
        .summary-bar {
            width: 100%;
            margin-bottom: 12px;
            border-collapse: separate;
            border-spacing: 6px 0;
        }

        .summary-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            border-radius: 4px;
        }

        .summary-label {
            font-size: 6.5pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-val {
            font-size: 8.5pt;
            font-weight: 700;
            color: #182B62;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Audit Table */
        .report-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .report-table thead {
            display: table-header-group;
        }

        .report-table tr {
            page-break-inside: avoid;
        }

        .report-table th {
            background-color: #182B62;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 7px 8px;
            border: 1px solid #182B62;
            text-align: left;
        }

        .report-table td {
            font-size: 7.2pt;
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            border-left: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            vertical-align: top;
            line-height: 1.35;
        }

        .report-table tr:nth-child(even) td {
            background-color: #f8fafc;
        }

        /* 7 Columns Proportions (100% total) */
        .col-time   { width: 11%; }
        .col-actor  { width: 16%; }
        .col-role   { width: 11%; }
        .col-module { width: 11%; }
        .col-action { width: 15%; }
        .col-ref    { width: 14%; }
        .col-desc   { width: 22%; }

        .time-date {
            font-weight: 700;
            color: #0f172a;
            font-size: 7.2pt;
        }

        .time-hour {
            color: #64748b;
            font-size: 6.8pt;
            margin-top: 1px;
        }

        .actor-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 7.3pt;
        }

        .actor-sub {
            font-size: 6.6pt;
            color: #64748b;
            margin-top: 1px;
            word-break: break-all;
        }

        /* Clean plain text instead of badge pills */
        .role-text {
            font-size: 7pt;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        .module-text {
            font-size: 7.2pt;
            font-weight: 600;
            color: #0284c7;
        }

        .action-label {
            font-weight: 700;
            color: #0f172a;
            font-size: 7.3pt;
        }

        .ref-code {
            font-size: 7.2pt;
            font-weight: 600;
            color: #1e293b;
            word-break: break-all;
            line-height: 1.3;
        }

        .desc-text {
            font-size: 7.2pt;
            color: #334155;
            line-height: 1.35;
            word-break: break-word;
        }
    </style>
</head>
<body>

    <!-- Municipal Header -->
    <div class="header-wrap">
        <div class="lgu-banner">Republic of the Philippines &bull; Province of Batangas &bull; Municipality of Nasugbu</div>
        <div class="office-title">{{ $officeName }}</div>
        <div class="report-subtitle">Official System Activity &amp; Audit Trail Report</div>
        <div class="meta-line">
            Document Ref: <strong>LGU-NAS-{{ $footerCode }}-AUDIT</strong> &bull; Coverage: <strong>{{ $periodLabel }}</strong> &bull; Printed: {{ now()->format('F d, Y \a\t h:i A') }}
        </div>
    </div>

    <!-- Summary KPIs -->
    <table class="summary-bar" cellpadding="0" cellspacing="0">
        <tr>
            <td width="25%">
                <div class="summary-box">
                    <div class="summary-label">Total Records</div>
                    <div class="summary-val">{{ number_format(count($records)) }} Activities</div>
                </div>
            </td>
            <td width="25%">
                <div class="summary-box">
                    <div class="summary-label">Coverage Period</div>
                    <div class="summary-val" style="color: #334155;">{{ $periodLabel }}</div>
                </div>
            </td>
            <td width="25%">
                <div class="summary-box">
                    <div class="summary-label">Generated By</div>
                    <div class="summary-val" style="color: #334155;">{{ $user->name ?? 'System User' }} ({{ strtoupper(str_replace('_', ' ', $user->role ?? 'Staff')) }})</div>
                </div>
            </td>
            <td width="25%">
                <div class="summary-box">
                    <div class="summary-label">Classification</div>
                    <div class="summary-val" style="color: #0284c7;">Official Municipal Record</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Audit Records Table (7 Clean Columns, No Badges, No IP Column) -->
    <table class="report-table">
        <thead>
            <tr>
                <th class="col-time">Date &amp; Time</th>
                <th class="col-actor">Actor / User</th>
                <th class="col-role">Role</th>
                <th class="col-module">Section / Module</th>
                <th class="col-action">Action Performed</th>
                <th class="col-ref">Record Reference</th>
                <th class="col-desc">Summary &amp; Remarks</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($records as $log)
                <tr>
                    <td class="col-time">
                        <div class="time-date">{{ $log->created_at?->format('Y-m-d') ?? '—' }}</div>
                        <div class="time-hour">{{ $log->created_at?->format('h:i:s A') ?? '' }}</div>
                    </td>
                    <td class="col-actor">
                        <div class="actor-name">{{ $log->actor_name ?: 'System' }}</div>
                        @if($log->user?->email)
                            <div class="actor-sub">{{ $log->user->email }}</div>
                        @endif
                    </td>
                    <td class="col-role">
                        <div class="role-text">{{ ucwords(str_replace('_', ' ', (string)$log->actor_role)) }}</div>
                    </td>
                    <td class="col-module">
                        <div class="module-text">{{ ucwords(str_replace('_', ' ', (string)$log->module)) }}</div>
                    </td>
                    <td class="col-action">
                        <div class="action-label">{{ $log->action_label ?? ucwords(str_replace(['.', '_'], ' ', (string)$log->action)) }}</div>
                    </td>
                    <td class="col-ref">
                        <div class="ref-code">{{ $log->target_reference ?: '—' }}</div>
                    </td>
                    <td class="col-desc">
                        <div class="desc-text">{{ $log->sanitized_description ?: '—' }}</div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
                        No activity records found matching the specified filters.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- DomPDF Native Page Footer via PHP Script -->
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
