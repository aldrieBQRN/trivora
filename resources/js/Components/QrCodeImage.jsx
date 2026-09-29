import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders `value` as a crisp, scalable QR code (SVG). Error correction "M" survives the wear a
 * sticker on a tricycle gets. Renders nothing until the SVG is ready.
 */
export default function QrCodeImage({ value, size = 160, className = '', title = 'QR code' }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        let cancelled = false;
        if (!value) {
            setSvg('');
            return undefined;
        }
        QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } })
            .then((markup) => { if (!cancelled) setSvg(markup); })
            .catch(() => { if (!cancelled) setSvg(''); });
        return () => { cancelled = true; };
    }, [value]);

    return (
        <div
            role="img"
            aria-label={title}
            className={`[&>svg]:h-full [&>svg]:w-full ${className}`}
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

/** Downloads `value` as a high-resolution PNG (for printing at a print shop). */
export async function downloadQrPng(value, filename) {
    const dataUrl = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 1200 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
