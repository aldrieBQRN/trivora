@php
    // Inline (CID) logo so it shows even when APP_URL isn't publicly reachable; plain URL when
    // the view is rendered outside a mail send (e.g. a browser preview).
    $logoPath = public_path('images/email-logo.png');
    $logoSrc = (isset($message) && $message instanceof \Illuminate\Mail\Message)
        ? $message->embed($logoPath)
        : asset('images/email-logo.png');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>@yield('title', 'Trivora')</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f7f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
    @hasSection('preheader')
        {{-- Inbox preview text --}}
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">@yield('preheader')</div>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7f9;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
                    {{-- Card (logo sits inside: its PNG has a white background) --}}
                    <tr>
                        <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding:28px 32px 22px;border-bottom:1px solid #eef0f3;">
                                        <img src="{{ $logoSrc }}" width="140" alt="Trivora" style="display:block;width:140px;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:32px 32px 36px;font-size:14px;line-height:1.6;color:#334155;">
                                        @yield('content')
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td align="center" style="padding:24px 8px 0;font-size:11px;line-height:1.7;color:#94a3b8;">
                            Trivora · Traffic Management Office<br>
                            Municipality of Nasugbu, Batangas<br>
                            @hasSection('footer_note')
                                @yield('footer_note')
                            @else
                                This is an automated message. Please do not reply.
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
