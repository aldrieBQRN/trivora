<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @production
            <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
        @endproduction

        <title inertia>{{ config('app.name', 'Trivora') }} | Track. Protect. Connect.</title>

        <meta name="theme-color" content="#182B62">
        <meta name="application-name" content="TRIVORA">

        <!-- SEO Core Metadata -->
        <meta name="description" content="TRIVORA is the official Smart Tricycle Management System of the Municipality of Nasugbu, Batangas. Track active franchises, verify tricycle plates, view color-coding schedules, inspect digital fare matrices, and apply for MTOP permits online.">
        <meta name="keywords" content="Trivora, Nasugbu Batangas tricycle, MTOP franchise Nasugbu, Batangas tricycle fare matrix, Nasugbu BPLO, Nasugbu TMO, tricycle QR ride, TODA Batangas, plate verification Nasugbu, smart tricycle management">
        <meta name="author" content="Traffic Management Office &amp; BPLO - Municipality of Nasugbu, Batangas">
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

        <!-- Geographic & Local SEO (GEO) -->
        <meta name="geo.region" content="PH-BTG">
        <meta name="geo.placename" content="Nasugbu, Batangas, Philippines">
        <meta name="geo.position" content="14.0772;120.6331">
        <meta name="ICBM" content="14.0772, 120.6331">

        <!-- Open Graph / Social Sharing (OG) -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="TRIVORA">
        <meta property="og:title" content="TRIVORA | Track. Protect. Connect. — Nasugbu, Batangas">
        <meta property="og:description" content="Official Smart Tricycle Management System of Nasugbu, Batangas. Track active franchises, verify tricycle plates, inspect digital fares, and register MTOP permits online.">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ asset('images/og-preview.png') }}">
        <meta property="og:image:secure_url" content="{{ asset('images/og-preview.png') }}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="TRIVORA - Smart Tricycle Management System, Nasugbu Batangas">
        <meta property="og:locale" content="en_PH">

        <!-- Twitter / X Card -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="TRIVORA | Track. Protect. Connect. — Nasugbu, Batangas">
        <meta name="twitter:description" content="Official Smart Tricycle Management System of Nasugbu, Batangas. Plate verification, MTOP franchise filing, and real-time transit safety.">
        <meta name="twitter:image" content="{{ asset('images/og-preview.png') }}">
        <meta name="twitter:image:alt" content="TRIVORA - Smart Tricycle Management System, Nasugbu Batangas">

        <!-- Favicon / Tab Logo -->
        <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}?v=3">
        <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32x32.png') }}?v=3">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16x16.png') }}?v=3">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}?v=3">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700,800&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:wght@500;600;700;800&family=Geist:wght@300..800&family=Geist+Mono:wght@400..600&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
