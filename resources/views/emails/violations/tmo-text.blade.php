NEW COLOR-CODING VIOLATION RECORDED

A new violation has been recorded in Trivora and is awaiting TMO action.

Reference: {{ $details['tmo_reference'] }}
Driver: {{ $details['driver_name'] ?? 'No driver account linked' }}
@if (!empty($details['owner_name']) && $details['owner_name'] !== ($details['driver_name'] ?? null))
Tricycle owner: {{ $details['owner_name'] }}
@endif
Plate number: {{ $details['plate_number'] ?? 'Not on record' }}
@if (!empty($details['sticker_number']))
Sticker number: {{ $details['sticker_number'] }}
@endif
@if (!empty($details['franchise_number']))
Franchise number: {{ $details['franchise_number'] }}
@endif
@if (!empty($details['make_model']))
Make / model: {{ $details['make_model'] }}
@endif
Violation: {{ $details['type_label'] }}
Description: {{ $details['description'] }}
Recorded via: {{ $details['recorded_via'] }}
Date: {{ $details['date'] ?? 'Not on record' }}
Time: {{ $details['time'] ?? 'Not on record' }}
@if ($details['location'])
Recorded location: {{ $details['location']['latitude'] }}, {{ $details['location']['longitude'] }} ({{ $details['location']['map_url'] }})
@else
Recorded location: No GPS location was recorded for this violation.
@endif
@if (!empty($details['fine_amount']))
Fine amount: {{ $details['fine_amount'] }}
@endif
Status: {{ $details['status_label'] }}

View violation details (TMO sign-in required):
{{ $details['tmo_url'] }}

This is an automated message from Trivora. Please do not reply to this email.
