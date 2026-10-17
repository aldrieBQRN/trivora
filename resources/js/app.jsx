import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
// resources/js/app.jsx
import 'leaflet/dist/leaflet.css';

const appName = import.meta.env.VITE_APP_NAME || 'Trivora';

createInertiaApp({
    title: (title) => {
        if (!title) return `${appName} | Track. Protect. Connect.`;
        if (title.toUpperCase().includes('TRIVORA')) return title;
        return `${title} | ${appName}`;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
