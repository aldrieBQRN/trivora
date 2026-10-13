<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Your Trivora staff account</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f7f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
    {{-- Inbox preview text (never includes the password) --}}
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Your {{ $roleLabel }} account is ready. Sign in and set your own password within 24 hours.
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
                                Your staff account is ready
                            </p>
                            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#64748b;">
                                Hi {{ $name ?: 'there' }}, a {{ $roleLabel }} account has been created for you on the Trivora portal. Use the credentials below to sign in for the first time.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7f9;border-radius:10px;">
                                <tr>
                                    <td style="padding:16px 20px 8px;font-size:12px;color:#64748b;">Email</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 14px;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;">{{ $email }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 8px;font-size:12px;color:#64748b;border-top:1px solid #eceef1;padding-top:14px;">Temporary password</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 16px;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;letter-spacing:1px;color:#182B62;word-break:break-all;">{{ $temporaryPassword }}</td>
                                </tr>
                            </table>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
                                <tr>
                                    <td style="background-color:#182B62;border-radius:8px;">
                                        <a href="{{ $loginUrl }}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to Trivora</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                                You'll be asked to <strong style="color:#0f172a;">change this password immediately</strong> after signing in. The temporary password expires on <strong style="color:#0f172a;">{{ $expiresAt }}</strong>.
                            </p>

                            <hr style="border:none;border-top:1px solid #eef0f3;margin:28px 0 20px;">

                            <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                Never share this password. If it expires before you sign in, ask your administrator to resend your credentials, or use "Forgot password?" on the sign-in page.
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
