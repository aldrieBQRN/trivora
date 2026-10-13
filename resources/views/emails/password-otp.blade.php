<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Your password reset code</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f7f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
    {{-- Inbox preview text --}}
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Your Trivora verification code is {{ $code }}. It expires in {{ $expiresMinutes }} minutes.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7f9;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
                    {{-- Wordmark --}}
                    <tr>
                        <td style="padding:0 4px 20px;font-size:18px;font-weight:800;letter-spacing:2px;color:#182B62;">
                            TRIVORA
                        </td>
                    </tr>

                    {{-- Card --}}
                    <tr>
                        <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:36px 32px;">
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
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:20px 4px 0;font-size:11px;line-height:1.6;color:#94a3b8;">
                            Trivora · Municipality of Nasugbu, Batangas<br>
                            This is an automated message. Please do not reply.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
