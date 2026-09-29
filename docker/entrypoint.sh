#!/bin/sh
set -e

echo "🚀 Booting Trivora on Render..."

# ─── 1. Storage & permissions (fast, no DB) ───────────────────────────
mkdir -p /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/framework/cache \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

touch /var/www/html/storage/logs/laravel.log

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

# ─── 2. Fast artisan prep (no DB needed) ──────────────────────────────
php artisan config:clear || true
php artisan cache:clear || true
php artisan package:discover --ansi || true
php artisan storage:link || true

# ─── 3. START WEB SERVER FIRST ────────────────────────────────────────
# Render requires port 80 within ~60 s. Start PHP-FPM + Nginx NOW so the
# health-check passes, then do slower DB work in the background.
echo "🔌 Starting PHP-FPM..."
php-fpm -D

for i in 1 2 3 4 5 6 7 8 9 10; do
    if nc -z 127.0.0.1 9000 2>/dev/null; then
        echo "✅ PHP-FPM is ready on port 9000."
        break
    fi
    sleep 0.5
done

mkdir -p /var/lib/nginx/tmp/client_body /var/lib/nginx/tmp/fastcgi
chown -R www-data:www-data /var/lib/nginx

# ─── 4. DATABASE INIT (background — runs WHILE nginx is starting) ─────
(
    echo "🔄 Running database initialisation in background..."

    # 4a. DB_FRESH: wipe all tables
    if [ "$DB_FRESH" = "true" ] || [ "$DB_FRESH" = "1" ]; then
        echo "⚠️ DB_FRESH enabled: dropping all tables for a clean slate..."
        php -r "
        require 'vendor/autoload.php';
        \$app = require_once 'bootstrap/app.php';
        \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
        \$kernel->bootstrap();
        try {
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            \$tables = \Illuminate\Support\Facades\DB::select('SHOW FULL TABLES WHERE Table_Type = \"BASE TABLE\"');
            foreach (\$tables as \$table) {
                \$tableName = array_values((array)\$table)[0];
                \Illuminate\Support\Facades\DB::statement(\"DROP TABLE IF EXISTS \\\`\$tableName\\\`;\");
            }
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            echo 'Cleaned all tables.\n';
        } catch (\Throwable \$e) {
            echo 'Table wipe notice: ' . \$e->getMessage() . '\n';
        }
        " || true
    fi

    # 4b. Load base schema if migrations table is missing
    echo "🔄 Checking database schema on TiDB Cloud..."
    php -r "
    require 'vendor/autoload.php';
    \$app = require_once 'bootstrap/app.php';
    \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
    \$kernel->bootstrap();
    try {
        if (!\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
            echo 'Loading mysql-schema.sql into TiDB Cloud... ';
            if (file_exists('database/schema/mysql-schema.sql')) {
                \$schema = file_get_contents('database/schema/mysql-schema.sql');
                \Illuminate\Support\Facades\DB::unprepared(\$schema);
                echo 'Done.\n';
            } else {
                echo 'mysql-schema.sql not found.\n';
            }
        } else {
            echo 'Migrations table already exists.\n';
        }
    } catch (\Throwable \$e) {
        echo 'Schema check notice: ' . \$e->getMessage() . '\n';
    }
    " || true

    # 4c. Run pending migrations
    echo "🔄 Running database migrations..."
    php artisan migrate --force || true

    # 4d. Seed if explicitly requested or if database is empty
    if [ "$DB_SEED" = "true" ] || [ "$DB_SEED" = "1" ]; then
        echo "🌱 DB_SEED requested: seeding database..."
        php artisan db:seed --force || true
    else
        echo "🌱 Checking if initial seed is needed..."
        php -r "
        require 'vendor/autoload.php';
        \$app = require_once 'bootstrap/app.php';
        \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
        \$kernel->bootstrap();
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('users') && \App\Models\User::count() === 0) {
                echo 'Empty database detected. Seeding...\n';
                \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
                echo 'Initial seeding complete.\n';
            } else {
                echo 'Database already seeded. Skipping.\n';
            }
        } catch (\Throwable \$e) {
            echo 'Seed check note: ' . \$e->getMessage() . '\n';
        }
        " || true
    fi

    # 4e. Clean state (avoid route:cache or config:cache locks if DB is still syncing)
    echo "⚡ Clearing temporary caches..."
    php artisan optimize:clear || true

    # Final permission fix
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
    chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

    echo "✅ Background database initialisation complete."
) &

# ─── 5. Start Nginx in FOREGROUND (PID 1 — keeps container alive) ─────
echo "🌐 Starting Nginx Web Server on port 80..."
exec nginx -g "daemon off;"

