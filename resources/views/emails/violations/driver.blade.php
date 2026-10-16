@extends('emails.layout')

@section('title', 'Color-coding violation recorded')

@section('content')
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">Color-coding violation recorded</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">
        Hello {{ $details['driver_name'] ?? 'Driver' }}, a color-coding violation has been recorded for your tricycle.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        @include('emails.violations._row', ['label' => 'Citation number', 'value' => $details['driver_reference']])
        @include('emails.violations._row', ['label' => 'Driver', 'value' => $details['driver_name'] ?? 'Not on record'])
        @include('emails.violations._row', ['label' => 'Plate number', 'value' => $details['plate_number'] ?? 'Not on record'])
        @include('emails.violations._row', ['label' => 'Violation', 'value' => $details['type_label']])
        @include('emails.violations._row', ['label' => 'Description', 'value' => $details['description']])
        @include('emails.violations._row', ['label' => 'Date', 'value' => $details['date'] ?? 'Not on record'])
        @include('emails.violations._row', ['label' => 'Time', 'value' => $details['time'] ?? 'Not on record'])
        @if ($details['location'])
            <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:40%;vertical-align:top;">Recorded location</td>
                <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;vertical-align:top;">
                    {{ $details['location']['latitude'] }}, {{ $details['location']['longitude'] }}<br>
                    <a href="{{ $details['location']['map_url'] }}" style="color:#182B62;font-weight:400;font-size:13px;">View on map</a>
                </td>
            </tr>
        @else
            @include('emails.violations._row', ['label' => 'Recorded location', 'value' => 'No GPS location was recorded for this violation.'])
        @endif
        @if (!empty($details['fine_amount']))
            @include('emails.violations._row', ['label' => 'Fine amount', 'value' => $details['fine_amount']])
        @endif
        @include('emails.violations._row', ['label' => 'Status', 'value' => $details['status_label']])
    </table>

    <p style="margin:28px 0 8px;font-size:15px;font-weight:700;color:#0f172a;">How to review this violation</p>
    <ol style="margin:0 0 12px;padding-left:20px;color:#334155;">
        <li>Open the <strong>Trivora Driver</strong> app and go to <strong>Violations</strong>.</li>
        <li>Select citation <strong>{{ $details['driver_reference'] }}</strong> to see its details.</li>
        <li>If you believe this violation was recorded in error, you can submit an appeal from the same screen.</li>
    </ol>
    <p style="margin:0 0 12px;color:#334155;">
        If you registered your franchise online, you can also sign in at
        <a href="{{ $details['driver_portal_url'] }}" style="color:#182B62;">{{ $details['driver_portal_url'] }}</a>.
    </p>
    <p style="margin:0;color:#334155;">
        For questions, please contact or visit the Traffic Management Office (TMO) of the Municipality of Nasugbu and mention citation {{ $details['driver_reference'] }}.
    </p>
@endsection
