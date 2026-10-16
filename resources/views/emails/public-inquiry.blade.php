@extends('emails.layout')

@section('title', 'New public inquiry')

@section('preheader', "{$inquiry['subject']} from {$inquiry['name']}")

@section('content')
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">
        New public inquiry
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">
        A message was sent from the Trivora website contact form.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        @include('emails.violations._row', ['label' => 'Name', 'value' => $inquiry['name']])
        <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:40%;vertical-align:top;">Email</td>
            <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;vertical-align:top;word-break:break-all;">
                <a href="mailto:{{ $inquiry['email'] }}" style="color:#182B62;text-decoration:none;">{{ $inquiry['email'] }}</a>
            </td>
        </tr>
        @include('emails.violations._row', ['label' => 'Subject', 'value' => $inquiry['subject']])
    </table>

    <p style="margin:24px 0 8px;font-size:12px;color:#64748b;">Message</p>
    <div style="background-color:#f6f7f9;border-radius:10px;padding:16px 20px;font-size:14px;line-height:1.7;color:#0f172a;word-break:break-word;">{!! nl2br(e($inquiry['message'])) !!}</div>
@endsection

@section('footer_note')
    Reply to this email to respond directly to the sender.
@endsection
