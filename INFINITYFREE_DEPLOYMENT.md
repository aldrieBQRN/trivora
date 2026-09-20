# 🚀 Trivora Web - InfinityFree CI/CD Deployment Guide

This guide walks you through deploying the **Trivora Web App** (Landing page, MTOP Registration Wizard, Operator Portal, and TMO Management Panel) to **InfinityFree** using continuous deployment via **GitHub Actions**.

---

## 🏗 System Architecture (Split Layout)

InfinityFree public web root is `/htdocs/`. We use a secure split layout:

```
InfinityFree Account
 └── htdocs/                             <-- Public Web Root (Directly accessible)
      ├── build/ (Vite assets: JS & CSS)
      ├── images/ (Tricycle icons, logos)
      ├── index.php                      <-- Front controller (loads trivora-core)
      ├── setup.php                      <-- Initial setup runner (delete after use)
      ├── .htaccess                      <-- Rewrites all routes to index.php
      └── trivora-core/                  <-- Protected Private Laravel Core
           ├── app/
           ├── bootstrap/
           ├── config/
           ├── database/
           ├── resources/
           ├── routes/
           ├── storage/
           ├── vendor/                   <-- Uploaded once via FileZilla
           └── env.php                   <-- Your database credentials
```

---

## 📋 Step 1: Set Up MySQL on InfinityFree

1. Log in to your [InfinityFree Client Area](https://dash.infinityfree.com/).
2. Open your Control Panel (**vPanel**).
3. Under **Databases**, click **MySQL Databases**.
4. Create a new database named (e.g. `trivora`).
5. Note down your credentials:
   * **MySQL Host**: (e.g. `sql101.infinityfree.com`)
   * **Database Name**: (e.g. `if0_12345678_trivora`)
   * **Username**: (e.g. `if0_12345678`)
   * **Password**: (Your vPanel password)

---

## 🔑 Step 2: Configure GitHub Repository Secrets

In your GitHub repository (`aldrieBQRN/trivora`):

1. Go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add these 3 secrets:

| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `FTP_SERVER` | `ftpupload.net` | InfinityFree FTP Host |
| `FTP_USERNAME` | `if0_12345678` | Your FTP Username |
| `FTP_PASSWORD` | `YourPasswordHere` | Your InfinityFree Account Password |

---

## 📁 Step 3: One-Time `vendor/` Upload (FileZilla)

Because Composer's `vendor/` folder has thousands of small files, GitHub Actions excludes it so every commit deploys in under 1 minute.

You only need to upload `vendor/` **once**:
1. Open **FileZilla** and connect to your InfinityFree FTP.
2. Inside `htdocs/`, create a folder named `trivora-core` (if it does not exist yet).
3. Inside `htdocs/trivora-core/`, upload your local `vendor/` folder from `c:\laragon\www\trivora-capstone\trivora\vendor`.
   *(Tip: If your FileZilla has an option to upload a zip and extract via file manager, that is even faster!)*

---

## ⚙️ Step 4: Create `env.php` on InfinityFree

Inside `htdocs/trivora-core/`, create a file named `env.php` (copy from `env.php.example`):

```php
<?php

return [
    'APP_NAME' => 'Trivora',
    'APP_ENV' => 'production',
    'APP_KEY' => 'base64:YOUR_APP_KEY_FROM_LOCAL_DOT_ENV',
    'APP_DEBUG' => false,
    'APP_URL' => 'https://your-domain.infinityfreeapp.com',

    'MIGRATION_TOKEN' => 'trivora_secure_migration_2026',

    'DB_CONNECTION' => 'mysql',
    'DB_HOST' => 'sqlXXX.infinityfree.com',
    'DB_PORT' => '3306',
    'DB_DATABASE' => 'if0_XXXXX_trivora',
    'DB_USERNAME' => 'if0_XXXXX',
    'DB_PASSWORD' => 'YOUR_INFINITYFREE_PASSWORD',

    'SESSION_DRIVER' => 'file',
    'CACHE_STORE' => 'file',
    'QUEUE_CONNECTION' => 'sync',
    'FILESYSTEM_DISK' => 'public',
];
```

---

## 🚀 Step 5: Trigger Deployment via GitHub

Whenever you commit and push to `main` or `tmo-panel-redesign`:
```bash
git add .
git commit -m "Deploy Trivora web to InfinityFree"
git push origin tmo-panel-redesign
```

GitHub Actions will automatically:
1. Compile production React / Vite assets (`npm run build`).
2. Deploy backend core code to `htdocs/trivora-core/`.
3. Deploy frontend assets, `index.php`, and `.htaccess` to `/htdocs/`.

---

## ⚡ Step 6: Run Database Migrations & Initial Setup

Once the GitHub Actions workflow finishes:

### Option A: Using `setup.php` (First-time setup)
1. Open your browser and navigate to:
   ```
   https://your-domain.infinityfreeapp.com/setup.php
   ```
2. To seed demo accounts (like TMO staff and sample TODA zones), append `?seed=1`:
   ```
   https://your-domain.infinityfreeapp.com/setup.php?seed=TestAccountsSeeder
   ```
3. Once you see the green **"✅ Setup Completed Successfully!"** message:
   * **Delete `setup.php` from `htdocs/` via FileZilla immediately** for security!

### Option B: Using `/artisan-migrate` (Permanent maintenance endpoint)
For future updates when you add new migrations, you don't need `setup.php`. Just visit:
```
https://your-domain.infinityfreeapp.com/artisan-migrate?token=trivora_secure_migration_2026
```

---

## 🔒 Security Best Practices
- Never commit `.env` or `env.php` with real passwords to GitHub.
- Keep `APP_DEBUG=false` in production.
- Keep `MIGRATION_TOKEN` strong and private.
