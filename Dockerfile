# Multi-stage build for Lean, Fast Production Deployment
# --------------------------------------------------------
# Stage 1: Build Frontend Assets (Vite + React)
# --------------------------------------------------------
FROM node:22-alpine AS node_builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --------------------------------------------------------
# Stage 2: PHP 8.3 & Nginx Production Environment
# --------------------------------------------------------
FROM php:8.3-fpm-alpine

# Install system dependencies & Nginx
RUN apk add --no-cache \
    nginx \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    ca-certificates \
    icu-dev \
    oniguruma-dev \
    linux-headers

# Install PHP extensions required by Laravel 12
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy project files
COPY . .

# Copy compiled frontend assets from Stage 1
COPY --from=node_builder /app/public/build ./public/build

# Install PHP production dependencies
RUN composer install --no-dev --optimize-autoloader --no-progress --prefer-dist --ignore-platform-reqs

# Copy Nginx and entrypoint configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set correct storage permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
