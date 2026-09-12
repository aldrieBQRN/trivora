import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // TMO Panel brand tokens — additive only, doesn't touch stock Tailwind
                // colors used by BPLO/Operator/Treasurer dashboards.
                tmo: {
                    primary: '#1D2542',
                    primaryHover: '#2A3454',
                    primarySoft: '#EEF0F5',
                    ink: '#111827',
                    muted: '#6B7280',
                    subtle: '#9CA3AF',
                    border: '#E5E7EB',
                    borderStrong: '#D1D5DB',
                    bg: '#F8FAFC',
                    surface: '#FFFFFF',
                },
            },
        },
    },

    plugins: [forms],
};
