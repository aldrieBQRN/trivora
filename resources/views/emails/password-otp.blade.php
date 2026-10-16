@extends('emails.layout')

@section('title', 'Your password reset code')

@section('preheader', "Your Trivora verification code is {$code}. It expires in {$expiresMinutes} minutes.")

@section('content')
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">
        Reset your password
    </p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#64748b;">
        Hi {{ $name ?: 'there' }}, use the verification code below to reset your password.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="background-color:#f6f7f9;border-radius:10px;padding:20px 12px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#182B62;">
                {{ $code }}
            </td>
        </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        This code expires in <strong style="color:#0f172a;">{{ $expiresMinutes }} minutes</strong>.
        Never share it with anyone. Trivora staff will never ask for it.
    </p>

    <hr style="border:none;border-top:1px solid #eef0f3;margin:28px 0 20px;">

    <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
        Didn't request this? You can safely ignore this email. Your password won't change.
    </p>
@endsection
