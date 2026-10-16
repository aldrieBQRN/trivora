@extends('emails.layout')

@section('title', 'New color-coding violation')

@section('content')
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">New color-coding violation recorded</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">A new violation has been recorded in Trivora and is awaiting TMO action.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        @include('emails.violations._row', ['label' => 'Reference', 'value' => $details['tmo_reference']])
        @include('emails.violations._row', ['label' => 'Driver', 'value' => $details['driver_name'] ?? 'No driver account linked'])
        @if (!empty($details['owner_name']) && $details['owner_name'] !== ($details['driver_name'] ?? null))
            @include('emails.violations._row', ['label' => 'Tricycle owner', 'value' => $details['owner_name']])
        @endif
        @include('emails.violations._row', ['label' => 'Plate number', 'value' => $details['plate_number'] ?? 'Not on record'])
        @if (!empty($details['sticker_number']))
            @include('emails.violations._row', ['label' => 'Sticker number', 'value' => $details['sticker_number']])
        @endif
        @if (!empty($details['franchise_number']))
            @include('emails.violations._row', ['label' => 'Franchise number', 'value' => $details['franchise_number']])
        @endif
        @if (!empty($details['make_model']))
            @include('emails.violations._row', ['label' => 'Make / model', 'value' => $details['make_model']])
        @endif
        @include('emails.violations._row', ['label' => 'Violation', 'value' => $details['type_label']])
        @include('emails.violations._row', ['label' => 'Description', 'value' => $details['description']])
        @include('emails.violations._row', ['label' => 'Recorded via', 'value' => $details['recorded_via']])
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

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
        <tr>
            <td style="border-radius:8px;background-color:#182B62;">
                <a href="{{ $details['tmo_url'] }}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">View violation details</a>
            </td>
        </tr>
    </table>
    <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Sign-in to the TMO panel is required to open this record.</p>
@endsection
