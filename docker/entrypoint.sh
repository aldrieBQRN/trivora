#!/bin/sh
set -e

echo "🚀 Booting Trivora on Render..."

# Cache configurations and routes
echo "⚡ Optimizing application..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Ensure storage link exists
php artisan storage:link || true

# Run database migrations
echo "🔄 Checking and running database migrations..."
php artisan migrate --force || true

# Start PHP-FPM in background
echo "🔌 Starting PHP-FPM..."
php-fpm -D

# Start Nginx in foreground
echo "🌐 Starting Nginx Web Server on port 80..."
exec nginx -g "daemon off;"
