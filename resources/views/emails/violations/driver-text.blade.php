COLOR-CODING VIOLATION RECORDED

Hello {{ $details['driver_name'] ?? 'Driver' }}, a color-coding violation has been recorded for your tricycle.

Citation number: {{ $details['driver_reference'] }}
Driver: {{ $details['driver_name'] ?? 'Not on record' }}
Plate number: {{ $details['plate_number'] ?? 'Not on record' }}
Violation: {{ $details['type_label'] }}
Description: {{ $details['description'] }}
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

HOW TO REVIEW THIS VIOLATION
1. Open the Trivora Driver app and go to Violations.
2. Select citation {{ $details['driver_reference'] }} to see its details.
3. If you believe this violation was recorded in error, you can submit an appeal from the same screen.

If you registered your franchise online, you can also sign in at {{ $details['driver_portal_url'] }}

For questions, please contact or visit the Traffic Management Office (TMO) of the Municipality of Nasugbu and mention citation {{ $details['driver_reference'] }}.

This is an automated message from Trivora. Please do not reply to this email.
