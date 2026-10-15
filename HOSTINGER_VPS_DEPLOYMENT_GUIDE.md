# 🚀 Trivora: Complete Hostinger KVM VPS Production Deployment & CI/CD Guide

This document is the comprehensive, step-by-step master guide for deploying the **Trivora Ecosystem** (Web Dashboard, REST APIs, Laravel Reverb WebSockets, Background Queues, and the **SinoTrack ST-901L Hardware GPS Tracker**) to a **Hostinger KVM 2 VPS (Ubuntu 24.04 LTS)** with a custom `.com` domain and automated **GitHub Actions CI/CD**.

---

## 📑 Table of Contents
1. [Which Plan to Choose & Checkout Guide (Start Here)](#1-which-plan-to-choose--checkout-guide-start-here)
2. [Cost Breakdown & Budgeting](#2-cost-breakdown--budgeting)
3. [Server & Network Architecture](#3-server--network-architecture)
4. [Initial Setup: Claim Domain & DNS Configuration](#4-initial-setup-claim-domain--dns-configuration)
5. [Server Provisioning: Step-by-Step Ubuntu Terminal Commands](#5-server-provisioning-step-by-step-ubuntu-terminal-commands)
6. [Deploying the Trivora Application](#6-deploying-the-trivora-application)
7. [Configuring 24/7 Daemons (Supervisor & Cron)](#7-configuring-247-daemons-supervisor--cron)
8. [Configuring the Physical SinoTrack GPS Tracker](#8-configuring-the-physical-sinotrack-gps-tracker)
9. [Automated CI/CD via GitHub Actions](#9-automated-cicd-via-github-actions)
10. [Connecting the Mobile Apps (Driver & Passenger)](#10-connecting-the-mobile-apps-driver--passenger)
11. [Maintenance, Logs & Troubleshooting](#11-maintenance-logs--troubleshooting)

---

## 1. 🛒 Which Plan to Choose & Checkout Guide (Start Here)

Before running any terminal commands, you must choose the right server plan on Hostinger. Choosing the wrong type of hosting (like shared hosting) will cause the entire project to fail.

### ⚠️ Critical Rule: Choose VPS, Never Shared Hosting
| Hosting Type | Can it run Trivora? | Why / Why Not? |
| :--- | :---: | :--- |
| ❌ **Shared Web Hosting** *(Premium / Business / cPanel)* | **NO** | Cannot open Port `9001` for SinoTrack GPS. Cannot run persistent background daemons (`php artisan reverb:start`, `php artisan gps:listen`, `queue:work`). RAM limits will crash PDF generation (`dompdf`). |
| ❌ **Cloud Web Hosting** | **NO** | Managed PHP environment without raw TCP socket binding or dedicated daemon control. |
| ✅ **KVM VPS Hosting (Virtual Private Server)** | **YES** | Gives you a **Dedicated Static Public IPv4**, full `root` terminal access, all 65,535 network ports unlocked, and dedicated RAM/CPU. |

---

### 📋 Exact Plan to Select: **Hostinger KVM 2 VPS**

* **Link**: [https://www.hostinger.ph/vps-hosting](https://www.hostinger.ph/vps-hosting)
* **Select Plan**: **KVM 2**
  * **2 vCPU Cores**
  * **8 GB RAM** *(Essential: comfortably runs MySQL + Nginx + Reverb WebSockets + SinoTrack TCP Listener + DOMPDF without freezing)*
  * **100 GB NVMe Disk Space** *(Stores thousands of uploaded applicant documents: OR/CR, licenses, inspection photos)*
  * **1 Dedicated Static Public IPv4 Address** *(Included for free)*

---

### 🛒 Step-by-Step Checkout Settings (What to Click)

When you are on the Hostinger order configuration page:

1. **Choose a Period**:
   * Select **1 Month** (₱889.00/mo) for capstone testing/defense, or **12 Months / 24 Months** if you want the highest discount.
2. **Free Domain Promotion**:
   * Verify that the banner says: `✔ Great news! You get a free domain for 1 year with this order.`
3. **Daily Auto-Backup**:
   * **Leave UNCHECKED** (saves ₱359/mo). Hostinger already provides free manual snapshot backups inside the VPS dashboard.
4. **Choose Server Location**:
   * Select **Malaysia (Best latency ~78 ms)**. This is the closest data center to the Philippines, ensuring fast real-time GPS tracking and instant web page loads.
5. **Choose What to Install**:
   * Click the **Plain OS** tab.
   * Select **Ubuntu** (Ubuntu 24.04 64-bit).
   * **Do NOT select a Control Panel** (cPanel/CyberPanel). Control panels consume 1–2 GB of RAM and their firewall rules frequently block SinoTrack's raw TCP port `9001`. Plain Ubuntu is clean and fast.
6. **Apply Coupon Code**:
   * Click **"Have a coupon code?"** below the total and enter `HA10`, `TUTORIALS`, or `SARAH` to get an extra 7%–10% off.
7. **Verify Order Summary**:
   * `KVM 2 plan (1-month period)`: ~₱889.00
   * `Domain`: **₱0**
   * `Domain privacy protection`: **₱0**
   * `Taxes`: ~₱106.68
   * `Total`: **~₱995.68** (all-in, zero hidden fees)
8. **Click "Continue"** and complete payment.

---

## 2. 💰 Cost Breakdown & Budgeting


| Component | Provider / Service | Billing Frequency | Cost (PHP) | Cost (USD) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KVM 2 VPS Server** | Hostinger (Malaysia 78ms) | Monthly (1 mo promo) | **₱889.00** | ~$15.60 | 2 vCPU, 8 GB RAM, 100 GB NVMe SSD |
| **Dedicated Static IPv4** | Hostinger | Permanent with VPS | **₱0.00** (Included) | $0.00 | Mandatory for SinoTrack GPS tracking |
| **`.com` Domain Name** | Hostinger | 1 Year Free Promo | **₱0.00** (Included) | $0.00 | Renews at ~₱650/yr after 1 year |
| **Domain Privacy Protection** | Hostinger | 1 Year Free | **₱0.00** (Included) | $0.00 | Masks personal contact info from WHOIS |
| **Value Added Tax (VAT)** | Government / Tax | Monthly | **₱106.68** | ~$1.87 | Tax applied at checkout |
| **SSL Encryption Certificate** | Let's Encrypt | Indefinite (Auto-renew) | **₱0.00** (Free) | $0.00 | Industry-standard HTTPS lock |
| **GPS IoT SIM Card Data** | Smart / Globe Prepaid | Monthly / Per Load | **~₱50.00 – ₱100.00** | ~$1.00 – $1.80 | IoT pings use ~20MB–50MB/mo; Magic Data lasts months |
| **GitHub Actions CI/CD** | GitHub | 2,000 mins/mo Free | **₱0.00** (Free) | $0.00 | Unlimited for standard deployments |
| **Expo EAS Mobile Builds** | Expo.dev | Free Tier | **₱0.00** (Free) | $0.00 | Generates standalone Android APKs |
| **TOTAL INITIAL LAUNCH COST**| | **First Month** | **₱995.68** | **~$17.50** | **All-in, zero surprise fees** |

---

## 2. 🏛 Server & Network Architecture

```
                                 ┌──────────────────────────────────────────────────┐
                                 │              YOUR .COM DOMAIN                    │
                                 │            (https://trivora.com)                 │
                                 └────────────────────────┬─────────────────────────┘
                                                          │ DNS A Record
                                 ┌────────────────────────▼─────────────────────────┐
                                 │           HOSTINGER KVM 2 VPS (MALAYSIA)         │
                                 │              Static IP: 156.67.xxx.xxx           │
                                 └────┬───────────────────┬───────────────────┬─────┘
                                      │                   │                   │
                     ┌────────────────┴─────┐   ┌─────────┴────────────┐   ┌──┴───────────────────┐
                     │     PORT 80 & 443    │   │      PORT 9001       │   │      PORT 8080       │
                     │    Nginx Web & SSL   │   │  SinoTrack TCP IoT   │   │ Laravel Reverb (WS)  │
                     └──────────┬───────────┘   └─────────┬────────────┘   └──────────┬───────────┘
                                │                         │                           │
          ┌─────────────────────┴───────┐                 │                           │
          │                             │                 │                           │
┌─────────▼───────────┐       ┌─────────▼───────────┐     │                           │
│   TMO & BPLO Admin  │       │  Mobile REST APIs   │     │                           │
│   Web Dashboards    │       │ (Sanctum Tokens for │     │                           │
│  (Desktop Browser)  │       │  Driver/Passenger)  │     │                           │
└─────────────────────┘       └─────────────────────┘     │                           │
                                                          │                           │
┌─────────────────────────────────────────────────────────▼──┐      ┌─────────────────▼────────┐
│  `php artisan gps:listen` (Supervisor Daemon)              │      │ `php artisan reverb:start`│
│  • Decodes SinoTrack ST-901L raw TCP stream                │      │ • Live map telematics    │
│  • Updates `tricycle_locations` table                      │      │ • Real-time dispatching  │
│  • Triggers color-coding violations                        │      └──────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

---

## 3. 🌐 Initial Setup: Claim Domain & DNS Configuration

### Step 3.1: Claim your Free `.com` Domain
1. Log in to your **[Hostinger Control Panel (hPanel)](https://hpanel.hostinger.com)**.
2. At the top of your dashboard, click **"Claim domain"** (from the free promotion).
3. Search for your preferred domain (e.g., `trivora-transport.com` or `trivora.com`).
4. Select **`.com`** and finish the registration details (Name, Address, Email).

### Step 3.2: Point the Domain to your VPS Static IP
1. In hPanel, go to **Domains** ➔ Select your newly claimed domain ➔ **DNS / Nameservers**.
2. Locate the **A Records** (or click **Add Record**):
   * **Record 1**:
     * **Type**: `A`
     * **Name**: `@`
     * **Points to**: `<YOUR_VPS_STATIC_IP>` (found on your VPS dashboard, e.g., `156.67.xxx.xxx`)
     * **TTL**: `300` (5 minutes)
   * **Record 2**:
     * **Type**: `A`
     * **Name**: `www`
     * **Points to**: `<YOUR_VPS_STATIC_IP>`
     * **TTL**: `300`
3. Save changes. DNS will propagate within 5 to 15 minutes.

---

## 4. 💻 Server Provisioning: Step-by-Step Ubuntu Terminal Commands

Connect to your VPS using **PowerShell**, **Terminal**, or **PuTTY**:
```bash
ssh root@<YOUR_VPS_STATIC_IP>
```
*(Enter your VPS root password when prompted).*

### Step 4.1: Update System Packages
```bash
apt update && apt upgrade -y
apt install -y curl wget git unzip zip software-properties-common ufw supervisor
```

### Step 4.2: Configure the Firewall (`ufw`)
Open the specific ports required by Trivora:
```bash
ufw allow 22/tcp      # SSH Management
ufw allow 80/tcp      # HTTP (Let's Encrypt validation)
ufw allow 443/tcp     # HTTPS (Secure Web, REST APIs, & WSS WebSockets)
ufw allow 9001/tcp    # SinoTrack ST-901L GPS IoT Receiver (or 'ufw limit 9001/tcp' to throttle floods)
# Note: Port 8080 (Reverb) is bound internally to 127.0.0.1 and proxied via Nginx over HTTPS/WSS (Port 443).
# Do NOT expose port 8080 in UFW. If previously opened, remove with: ufw delete allow 8080/tcp
ufw --force enable
ufw status
```

### Step 4.3: Install PHP 8.3 and Required Extensions
Trivora runs on Laravel 12, which requires PHP 8.2 or 8.3 with specific extensions:
```bash
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml \
               php8.3-bcmath php8.3-curl php8.3-gd php8.3-zip php8.3-intl \
               php8.3-opcache php8.3-readline
```

Verify PHP:
```bash
php -v  # Should display PHP 8.3.x
```

### Step 4.4: Install Composer (PHP Package Manager)
```bash
curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
composer -V
```

### Step 4.5: Install Node.js 22 LTS (For Building Frontend Assets)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # Should display v22.x
npm -v
```

### Step 4.6: Install & Secure MySQL 8.0
```bash
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql
```

Create the Trivora Database and User:
```bash
mysql -u root
```
*(Inside the MySQL prompt, run the following SQL commands—replace `YourStrongPasswordHere` with a secure password):*
```sql
CREATE DATABASE trivora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'trivora_user'@'localhost' IDENTIFIED BY 'YourStrongPasswordHere';
GRANT ALL PRIVILEGES ON trivora.* TO 'trivora_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. 📂 Deploying the Trivora Application

### Step 5.1: Clone the GitHub Repository
```bash
mkdir -p /var/www/trivora
cd /var/www/trivora
git clone https://github.com/aldrieBQRN/trivora.git .
```
*(If your repository is private, use a GitHub Personal Access Token or add the VPS SSH public key to your GitHub account under Settings ➔ SSH Keys).*

### Step 5.2: Configure the Production `.env`
```bash
cp .env.example .env
nano .env
```
Edit the following keys in `.env` (Press `Ctrl + O` to save, `Enter`, then `Ctrl + X` to exit):
```env
APP_NAME=Trivora
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=trivora
DB_USERNAME=trivora_user
DB_PASSWORD=YourStrongPasswordHere

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
TRUSTED_PROXIES=127.0.0.1,::1
CACHE_STORE=database
QUEUE_CONNECTION=database

BROADCAST_CONNECTION=reverb

REVERB_APP_ID=100101
REVERB_APP_KEY=trivora-live-key
REVERB_APP_SECRET=trivora-live-secret-random-32char
REVERB_SERVER_HOST="127.0.0.1"
REVERB_SERVER_PORT=8080
REVERB_HOST="yourdomain.com"
REVERB_PORT=443
REVERB_SCHEME=https

VITE_APP_NAME="${APP_NAME}"
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# SinoTrack IoT Configuration
GPS_LISTEN_PORT=9001
GPS_MAX_CONNECTIONS=100
GPS_IDLE_TIMEOUT_SECONDS=180
GPS_CLIENT_BUFFER_LIMIT_BYTES=4096
GPS_MAX_MALFORMED_PACKETS=5
```

### Step 5.3: Install Dependencies, Migrate Database, and Build Frontend
```bash
# 1. Install PHP dependencies
composer install --no-dev --optimize-autoloader

# 2. Generate application encryption key
php artisan key:generate --force

# 3. Create storage symlink for document uploads (licenses, OR/CR)
php artisan storage:link

# 4. Run database migrations
php artisan migrate --force

# 5. Seed initial roles/users (TMO, BPLO, Admin)
php artisan db:seed --force

# 6. Install NPM packages and compile Vite React production build
npm ci
npm run build

# 7. Optimize route and config caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 5.4: Set Directory Permissions
```bash
chown -R www-data:www-data /var/www/trivora
find /var/www/trivora -type f -exec chmod 644 {} \;
find /var/www/trivora -type d -exec chmod 755 {} \;
chmod -R 775 /var/www/trivora/storage /var/www/trivora/bootstrap/cache
```

### Step 5.5: Configure Nginx Web Server
Create the Nginx site configuration:
```bash
nano /etc/nginx/sites-available/trivora
```
Paste this configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/trivora/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    index index.php;
    charset utf-8;

    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Proxy WebSockets for Laravel Reverb through standard HTTPS port 443
    location /app/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable the site and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/trivora /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Step 5.6: Install Free SSL Certificate (HTTPS)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com --non-interactive --agree-tos -m your-email@gmail.com
```
*Certbot will automatically modify the Nginx configuration to enable SSL and set up automatic renewal.*

---

## 6. ⚙️ Configuring 24/7 Daemons (Supervisor & Cron)

Trivora requires three independent processes running non-stop. Supervisor ensures they stay alive and restart automatically if the server reboots.

### Step 6.1: Create Supervisor Configuration
```bash
nano /etc/supervisor/conf.d/trivora.conf
```
Paste the following:
```ini
# 1. SinoTrack Hardware GPS Tracker Receiver (Port 9001)
[program:trivora-gps]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/trivora/artisan gps:listen --port=9001
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/trivora/storage/logs/supervisor-gps.log

# 2. Laravel Reverb Real-Time WebSocket Server (Port 8080)
[program:trivora-reverb]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/trivora/artisan reverb:start --host=127.0.0.1 --port=8080
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/trivora/storage/logs/supervisor-reverb.log

# 3. Laravel Queue Worker (Dispatch Offers & Notifications)
[program:trivora-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/trivora/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/trivora/storage/logs/supervisor-worker.log
```

Load and start the programs:
```bash
supervisorctl reread
supervisorctl update
supervisorctl status
```
*All three services (`trivora-gps`, `trivora-reverb`, and `trivora-worker`) should report state **`RUNNING`**.*

### Step 6.2: Add Laravel Cron Scheduler
The Laravel scheduler runs color-coding checks and auto-offline cleanup every minute.
```bash
(crontab -l 2>/dev/null; echo "* * * * * cd /var/www/trivora && php artisan schedule:run >> /dev/null 2>&1") | crontab -
```

---

## 7. 🛰️ Configuring the Physical SinoTrack GPS Tracker

You have the **SinoTrack ST-901L** tracker installed on a physical tricycle. It communicates directly to your VPS Static IP over cellular GPRS (2G/4G).

### Step 7.1: SIM Card Requirements
* Insert a standard Micro/Nano SIM card (Smart, TNT, Globe, or TM) with active mobile data.
* Make sure PIN protection is disabled on the SIM card (test it in a phone first).
* A promo with non-expiring data (like Smart Magic Data or Globe GOMO) works best. The tracker sends ~15 MB to 30 MB of data per month.

### Step 7.2: Send Configuration SMS Commands
From your mobile phone, send the following SMS messages to the **phone number of the SIM card inside the SinoTrack tracker** *(assuming default password `0000`)*:

| Step | SMS Command to Send | Meaning | Tracker Response Expected |
| :---: | :--- | :--- | :--- |
| **1** | `RCONF` | Check current tracker configuration | SMS listing IP, Port, APN, ID |
| **2** | `8030000 internet` | Set Cellular APN (use `internet.globe.com.ph` for Globe, `internet` for Smart) | `SET APN OK` |
| **3** | `8040000 <YOUR_VPS_STATIC_IP> 9001` | **Points the tracker to your VPS IP and Port 9001** | `SET IP AND PORT OK` |
| **4** | `8050000 10` | Set transmission interval to 10 seconds while moving | `SET TIME OK` |
| **5** | `7100000` | Enable GPRS data mode | `SET GPRS OK` |

*(Example for Step 3: `8040000 156.67.214.50 9001`)*

### Step 7.3: Verify Connection on the Server
On your VPS, inspect the GPS log file in real time:
```bash
tail -f /var/www/trivora/storage/logs/supervisor-gps.log
```
When the tracker acquires a satellite fix and cellular signal, you will see raw packet streams like:
```text
[SinoTrack] Received packet from [112.198.xxx.xxx]: *HQ,9170123456,V1,085520,A,14.5995,N,120.9842,E,025.4,180,141026,FFFFFBFF#
[Ingest] Updated location for Tricycle #104 (Lat: 14.5995, Lng: 120.9842, Speed: 25.4 km/h)
```
Log in to the TMO Dashboard at `https://yourdomain.com/tmo`—the tricycle icon will show green and move across the map in real time!

---

## 8. 🔄 Automated CI/CD via GitHub Actions

Every time you push code changes to GitHub, GitHub Actions will automatically connect to your Hostinger VPS, pull the latest code, run database migrations, compile Vite assets, and restart Supervisor services with **zero downtime**.

### Step 8.1: Generate a Deployment SSH Key Pair on the VPS
On your VPS terminal, generate an SSH key:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/github_deploy -N ""
cat /root/.ssh/github_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Display the private key:
```bash
cat /root/.ssh/github_deploy
```
*(Copy the entire output starting with `-----BEGIN OPENSSH PRIVATE KEY-----` to `-----END OPENSSH PRIVATE KEY-----`).*

### Step 8.2: Add GitHub Repository Secrets
1. Go to your GitHub repository: `https://github.com/aldrieBQRN/trivora`.
2. Navigate to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Click **"New repository secret"** and add these three secrets:

| Secret Name | Value |
| :--- | :--- |
| `VPS_HOST` | Your Hostinger VPS Static IP (e.g. `156.67.xxx.xxx`) |
| `VPS_USERNAME` | `root` |
| `VPS_SSH_KEY` | The private key content copied from Step 8.1 |

### Step 8.3: Configure the GitHub Actions Workflow File
In your local project, update `.github/workflows/deploy.yml`:

```yaml
name: Deploy Trivora to Hostinger VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Build & Deploy to Hostinger VPS
    runs-on: ubuntu-latest

    steps:
      - name: 1. Checkout Repository
        uses: actions/checkout@v4

      - name: 2. Execute Remote SSH Deployment
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: 22
          script_stop: true
          script: |
            cd /var/www/trivora
            
            # Put app into maintenance mode briefly
            php artisan down --render="errors::503" --secret="trivora-deploy-bypass" || true

            # Pull latest code
            git pull origin main

            # Install dependencies
            composer install --no-dev --optimize-autoloader --no-interaction
            npm ci
            npm run build

            # Migrate database
            php artisan migrate --force

            # Optimize cache
            php artisan optimize:clear
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache

            # Restart daemons
            supervisorctl restart trivora-reverb:*
            supervisorctl restart trivora-worker:*
            supervisorctl restart trivora-gps:*

            # Bring app back up
            php artisan up

            echo "🚀 Deployment completed successfully!"
```

Push this commit to GitHub:
```bash
git add .github/workflows/deploy.yml
git commit -m "ci: configure automated SSH deployment to Hostinger VPS"
git push origin main
```
From now on, every `git push origin main` automatically updates your production server!

---

## 9. 📱 Connecting the Mobile Apps (Driver & Passenger)

Now that your production backend is live at `https://yourdomain.com`, update the API endpoints in both Expo mobile app repositories:

### In `trivora-passenger-app/`:
Update `src/services/api.ts` (or `app.json` / `.env`):
```typescript
export const API_BASE_URL = 'https://yourdomain.com/api/v1';
export const WS_HOST = 'yourdomain.com';
export const WS_PORT = 443;
export const WS_SCHEME = 'https';
```

### In `trivora-driver-app/`:
Update `src/services/api.ts`:
```typescript
export const API_BASE_URL = 'https://yourdomain.com/api/v1';
export const WS_HOST = 'yourdomain.com';
export const WS_PORT = 443;
export const WS_SCHEME = 'https';
```

Build the updated APKs using EAS:
```bash
eas build -p android --profile preview
```
Place the resulting download links on your landing page at `https://yourdomain.com`.

---

## 10. 🛠 Maintenance, Logs & Troubleshooting

### Useful Terminal Commands on the VPS:

| Action | Command |
| :--- | :--- |
| **Check Supervisor Daemons** | `supervisorctl status` |
| **Restart all Daemons** | `supervisorctl restart all` |
| **View Real-Time GPS Logs** | `tail -f /var/www/trivora/storage/logs/supervisor-gps.log` |
| **View Laravel Error Logs** | `tail -f /var/www/trivora/storage/logs/laravel.log` |
| **View Nginx Error Logs** | `tail -f /var/log/nginx/error.log` |
| **Clear Laravel Caches** | `cd /var/www/trivora && php artisan optimize:clear` |
| **Test SinoTrack Port 9001** | `netstat -tlpn \| grep 9001` *(Shows if listener is active)* |

---

### 🎉 System Ready for Capstone & Municipality Operations!
Your complete Trivora ecosystem is now running on high-speed hardware:
* **TMO & BPLO Dashboards** live at `https://yourdomain.com`
* **Real-time WebSockets** active on Port 443/8080
* **SinoTrack Hardware GPS Tracking** active on Port 9001
* **Automated CI/CD** deploying code directly on every `git push`
