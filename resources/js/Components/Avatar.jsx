import React, { useEffect, useState } from 'react';

export function getInitials(name, fallback = 'OP') {
    if (!name || name === 'N/A') return fallback;
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A person's avatar: their uploaded profile photo when they have one, otherwise their initials.
 * `className` is the circle/square itself (size, shape, colours, font) — the same classes the
 * initials-only avatars used before — so swapping one in keeps every page's look.
 * A photo that fails to load falls back to the initials.
 */
export default function Avatar({ name, src, className = '', fallback = 'OP', alt }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [src]);

    const showPhoto = src && !failed;

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {showPhoto ? (
                <img
                    src={src}
                    alt={alt ?? (name ? `${name}'s profile photo` : 'Profile photo')}
                    onError={() => setFailed(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                />
            ) : (
                getInitials(name, fallback)
            )}
        </div>
    );
}
