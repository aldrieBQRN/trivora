<?php

/**
 * Trivora - InfinityFree Post-Upload Setup Script
 *
 * This file runs automated setup after uploading files via FTP.
 * IMPORTANT: Delete this file after successful setup (security risk!)
 *
 * Steps:
 * 1. Upload files via GitHub Actions CI/CD (or FTP)
 * 2. Visit: https://your-domain.infinityfreeapp.com/setup.php
 * 3. Review the green "Setup Complete!" message
 * 4. Delete this file via FTP or File Manager immediately
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

define('LARAVEL_START', microtime(true));

$coreCandidates = [
    __DIR__ . '/trivora-core',
    __DIR__ . '/core',
    __DIR__,
    __DIR__ . '/..',
    __DIR__ . '/../trivora-core',
    __DIR__ . '/../../trivora-core',
];

$corePath = null;
foreach ($coreCandidates as $candidate) {
    if (file_exists($candidate . '/vendor/autoload.php') && file_exists($candidate . '/bootstrap/app.php')) {
        $corePath = realpath($candidate) ?: $candidate;
        break;
    }
}

if (!$corePath) {
    die("<h2 style='color:#e11d48;'>Trivora Setup Error: Core Engine Not Found</h2><p>Could not locate vendor/autoload.php or bootstrap/app.php.</p>");
}

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Trivora Setup</title>";
echo "<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:30px;background:#f8fafc;color:#1e293b;} .card{background:#fff;padding:25px;border-radius:12px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);max-width:850px;margin:auto;} pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:13px;overflow:auto;} .success{color:#16a34a;font-weight:600;} .warn{color:#d97706;font-weight:600;} .err{color:#dc2626;font-weight:600;}</style>";
echo "</head><body><div class='card'>";
echo "<h2 style='color:#0d9488;'>🚀 Trivora - InfinityFree Setup Runner</h2>";
echo "<p>Running environment checks and initial database setup...</p><hr style='border:0;border-top:1px solid #e2e8f0;margin:20px 0;'>";

try {
    // 1. Verify environment config exists
    echo "<strong>Step 1: Checking environment configuration...</strong><br>";
    $hasEnv = file_exists($corePath . '/.env') || file_exists($corePath . '/env.php') || file_exists($corePath . '/env.txt');
    if (!$hasEnv) {
        throw new Exception("No .env, env.php, or env.txt found in {$corePath}. Please create your database credentials first.");
    }
    echo "<span class='success'>✓ Environment file found.</span><br><br>";

    // 2. Load Composer & Laravel
    echo "<strong>Step 2: Loading Laravel application...</strong><br>";
    require $corePath . '/vendor/autoload.php';
    /** @var \Illuminate\Foundation\Application $app */
    $app = require_once $corePath . '/bootstrap/app.php';
    $app->usePublicPath(realpath(__DIR__) ?: __DIR__);
    if (is_dir($corePath . '/storage')) {
        $app->useStoragePath($corePath . '/storage');
    }
    echo "<span class='success'>✓ Laravel 12 bootstrapped successfully.</span><br><br>";

    // 3. Get Artisan Kernel
    echo "<strong>Step 3: Initializing Artisan...</strong><br>";
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    echo "<span class='success'>✓ Artisan kernel ready.</span><br><br>";

    // 4. Test DB Connection
    echo "<strong>Step 4: Testing MySQL Database connection...</strong><br>";
    \Illuminate\Support\Facades\DB::connection()->getPdo();
    $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
    echo "<span class='success'>✓ Database connected successfully to '{$dbName}'.</span><br><br>";

    // 5. Clear application caches
    echo "<strong>Step 5: Clearing application caches...</strong><br>";
    $kernel->call('optimize:clear');
    echo "<pre>" . htmlspecialchars(\Illuminate\Support\Facades\Artisan::output() ?: 'Caches cleared.') . "</pre><br>";

    // 6. Run Migrations (load base schema via PDO first if needed to bypass proc_open)
    echo "<strong>Step 6: Running database migrations...</strong><br>";
    if (!\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
        $schemaFile = $corePath . '/database/schema/mysql-schema.sql';
        if (file_exists($schemaFile)) {
            echo "<em>Loading base schema from mysql-schema.sql via PDO (bypassing proc_open)...</em><br>";
            $sql = file_get_contents($schemaFile);
            \Illuminate\Support\Facades\DB::unprepared($sql);
            echo "<span class='success'>✓ Base schema loaded successfully.</span><br>";
        }
    }

    $kernel->call('migrate', ['--force' => true]);
    $migrateOutput = \Illuminate\Support\Facades\Artisan::output();
    echo "<pre>" . htmlspecialchars($migrateOutput ?: 'Database already up to date.') . "</pre><br>";

    // 7. Optional Database Seeder (?seed=1 or ?seed=DatabaseSeeder)
    if (isset($_GET['seed'])) {
        $seederClass = is_string($_GET['seed']) && strlen($_GET['seed']) > 1 ? trim($_GET['seed']) : 'DatabaseSeeder';
        echo "<strong>Step 7: Running database seeder ({$seederClass})...</strong><br>";
        try {
            $kernel->call('db:seed', ['--class' => $seederClass, '--force' => true]);
            echo "<pre>" . htmlspecialchars(\Illuminate\Support\Facades\Artisan::output()) . "</pre><br>";
        } catch (\Throwable $se) {
            echo "<p class='warn'>⚠️ Seeder notice: " . htmlspecialchars($se->getMessage()) . "</p><br>";
        }
    } else {
        echo "<em>Tip: To run seeders, re-visit this page with <code>?seed=DatabaseSeeder</code> or <code>?seed=TestAccountsSeeder</code></em><br><br>";
    }

    // 8. Safe Storage Directory Check
    echo "<strong>Step 8: Verifying storage permissions and directories...</strong><br>";
    $storagePublic = $corePath . '/storage/app/public';
    $publicLink = __DIR__ . '/storage';
    if (!file_exists($publicLink)) {
        if (function_exists('symlink') && is_dir($storagePublic)) {
            @symlink($storagePublic, $publicLink);
        } else {
            @mkdir($publicLink, 0775, true);
        }
    }
    echo "<span class='success'>✓ Storage path verified.</span><br><br>";

    // Done
    echo "<hr style='border:0;border-top:1px solid #e2e8f0;margin:20px 0;'>";
    echo "<h3 class='success'>✅ Setup Completed Successfully!</h3>";
    echo "<p><strong>Next Steps:</strong></p>";
    echo "<ol>";
    echo "<li>Open your web app homepage to verify login and pages work.</li>";
    echo "<li class='err'><strong>SECURITY WARNING: Delete this <code>setup.php</code> file immediately via FTP / File Manager!</strong> Leaving it exposed allows anyone to trigger migrations.</li>";
    echo "</ol>";

} catch (\Throwable $e) {
    echo "<hr style='border:0;border-top:1px solid #e2e8f0;margin:20px 0;'>";
    echo "<h3 class='err'>❌ Setup Failed</h3>";
    echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>File:</strong> <code>" . htmlspecialchars($e->getFile()) . "</code> (Line: {$e->getLine()})</p>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}

echo "</div></body></html>";
