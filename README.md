# Trivora

A modern web application built with Laravel 12, React, Inertia.js, and Tailwind CSS.

## Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 18 with Inertia.js
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Database**: MySQL (configured in .env)
- **Maps**: Leaflet & Mapbox GL
- **Charts**: Recharts

## Prerequisites

Before installing, make sure you have the following installed on your machine:

- **PHP 8.2+** - [Download](https://www.php.net/downloads)
- **Composer** - [Download](https://getcomposer.org/download/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **MySQL 8.0+** - [Download](https://www.mysql.com/downloads/)
- **Git** - [Download](https://git-scm.com/)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd trivora
```

### 2. Run Setup Command

The easiest way to install all dependencies and set up the project:

```bash
composer run-script setup
```

This will:
- Install PHP dependencies via Composer
- Copy `.env.example` to `.env`
- Generate the application key
- Run database migrations
- Install npm packages
- Build frontend assets

### 3. Configure Environment

Edit the `.env` file with your database and application settings:

```env
APP_NAME=Trivora
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=trivora
DB_USERNAME=root
DB_PASSWORD=
```

### 4. Create Database

Make sure your MySQL database exists:

```bash
mysql -u root -p
CREATE DATABASE trivora;
EXIT;
```

## Running the Application

### Development Mode

Start the full development environment with all services:

```bash
composer run dev
```

This will automatically start:
- Laravel development server (port 8000)
- Queue listener
- Log pail
- Vite dev server (port 5173)

The application will be available at `http://localhost:8000`

### Individual Commands

If you prefer to run services separately:

```bash
# Terminal 1: Start Laravel server
php artisan serve

# Terminal 2: Start Vite dev server
npm run dev

# Terminal 3: Listen to queue jobs (if needed)
php artisan queue:listen
```

## Building for Production

```bash
npm run build
php artisan optimize
```

## Project Structure

```
app/              # PHP application code
  Http/           # Controllers, middleware, requests
  Models/         # Database models
  Providers/      # Service providers
resources/
  js/             # React components and pages
  views/          # Blade templates
  css/            # Stylesheets
routes/           # Route definitions
database/
  migrations/     # Database schema migrations
  seeders/        # Database seeders
  factories/      # Model factories
config/           # Configuration files
storage/          # File storage and logs
tests/            # Automated tests
public/           # Public-accessible files
```

## Common Commands

```bash
# Create a new controller
php artisan make:controller ControllerName

# Create a new model with migration
php artisan make:model ModelName -m

# Run migrations
php artisan migrate

# Create a new React component (helpers)
# Components are in resources/js/Components/

# Run tests
php artisan test

# Code formatting with Pint
composer pint
```

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, specify a different port:
```bash
php artisan serve --port=8001
```

### Database Migration Errors
Reset and re-run migrations:
```bash
php artisan migrate:refresh --seed
```

### npm Dependencies Issues
Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Windows File Permissions
If using Windows, ensure your project permissions are correct and clear the cache:
```bash
php artisan cache:clear
php artisan view:clear
```

## Support

For issues or questions, reach out to the development team or check the [Laravel Documentation](https://laravel.com/docs).

## License

MIT License
