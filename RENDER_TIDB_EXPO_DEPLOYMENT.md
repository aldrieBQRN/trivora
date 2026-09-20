# 🚀 Trivora 100% Free Cloud Architecture & Mobile CI/CD Guide

Comprehensive guide for deploying the complete Trivora ecosystem (Web Portal + 2 Mobile Apps) using **Render.com**, **TiDB Serverless**, and **Expo with Over-The-Air (OTA) CI/CD Updates**.

---

## 🏛 Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │     TiDB Cloud (Serverless)     │
                      │    5 GB Free Serverless MySQL   │
                      └────────────────▲────────────────┘
                                       │ SSL Port 4000
                      ┌────────────────┴────────────────┐
                      │           Render.com            │
                      │    Laravel Web Service & API    │
                      │ (https://trivora-api.onrender.com)
                      └────────▲────────────────▲───────┘
                               │                │
                  HTTPS (Web)  │                │ REST API
         ┌─────────────────────┴──┐        ┌────┴──────────────────────────┐
         │     Web Application    │        │       2 Expo Mobile APKs      │
         │  (TMO & BPLO Portals)  │        │ (Passenger App & Driver App)  │
         └────────────────────────┘        └───────────────────────────────┘
                                                           │
                                             ┌─────────────▼───────────────┐
                                             │   Expo EAS Over-The-Air     │
                                             │       (OTA) Updates         │
                                             │  Push code changes without  │
                                             │    reinstalling the APK!    │
                                             └─────────────────────────────┘
```

---

## 📱 Can Changes in the Code Reflect in the Installed APK Without Reinstalling?

👉 **YES! In Expo, this is called Over-The-Air (OTA) Updates via EAS Update.**

### How It Works:
1. You install the APK onto physical Android phones **once**.
2. When you make code changes (fixing bugs, updating UI, changing map pins, updating API endpoints), you **do NOT need to send a new APK file**.
3. You simply run:
   ```bash
   eas update --branch preview --message "fix: update booking flow"
   ```
   *(or let GitHub Actions run it automatically every time you `git push`)*
4. The next time the driver or passenger opens the app on their phone, **the app silently downloads the new JavaScript/React code in the background and applies the update instantly!**

### What can be updated Over-The-Air?
* ✅ All React components, screens, and UI designs
* ✅ All TypeScript/JavaScript business logic
* ✅ All API calls, state management, and helper functions
* ✅ New images and asset files
* ⚠️ *Only adding brand new native Android OS modules (like changing native Gradle permissions) requires building a new APK.*

---

## 🗄 Part 1: Set Up TiDB Cloud Serverless (Free MySQL)

1. Go to **[tidbcloud.com](https://tidbcloud.com)** and sign up (100% Free, no credit card).
2. Click **Create Cluster** ➔ Choose **Serverless** (Free 5 GB storage).
3. Select Cloud Provider **AWS** and Region **Singapore (`ap-southeast-1`)** (lowest latency to the Philippines).
4. In your cluster dashboard, click **Connect**:
   * Click **Generate Password** and save it.
   * Note down your connection details:
     * **Host**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
     * **Port**: `4000`
     * **User**: `[cluster_id].root`
     * **Password**: `[your_password]`
     * **Database**: `test` (or create `trivora`)

---

## ☁️ Part 2: Deploy Laravel Backend on Render.com

Render runs Laravel in a dedicated Docker container with zero bot blockers, allowing both Web and Mobile apps to communicate freely.

### 1. Dockerfile for Laravel on Render
Inside `trivora/`, a `Dockerfile` and `nginx.conf` package PHP 8.3, Nginx, and Vite production builds.

### 2. Create the Web Service on Render
1. Go to **[render.com](https://render.com)** and log in with your GitHub account.
2. Click **New +** ➔ **Web Service**.
3. Select your repository: **`aldrieBQRN/trivora`**.
4. Settings:
   * **Name**: `trivora-backend`
   * **Region**: Singapore
   * **Runtime**: Docker
   * **Instance Type**: **Free**
5. Add Environment Variables:
   * `APP_NAME`: `Trivora`
   * `APP_ENV`: `production`
   * `APP_KEY`: `base64:/oHknj2e98oD5V+P0+pFlueofsIVolERL/SxYaIuIUs=`
   * `APP_DEBUG`: `false`
   * `APP_URL`: `https://trivora-backend.onrender.com`
   * `DB_CONNECTION`: `mysql`
   * `DB_HOST`: *(Your TiDB host)*
   * `DB_PORT`: `4000`
   * `DB_DATABASE`: `test` (or `trivora`)
   * `DB_USERNAME`: *(Your TiDB username)*
   * `DB_PASSWORD`: *(Your TiDB password)*
   * `MYSQL_ATTR_SSL_CA`: `/etc/ssl/certs/ca-certificates.crt`
6. Click **Create Web Service**.
   * Render will build and deploy your app, giving you a live URL:
   * e.g., `https://trivora-backend.onrender.com`

---

## 📲 Part 3: Configure Expo EAS Build & OTA Updates

For both **`trivora-driver-app`** and **`trivora-passenger-app`**:

### 1. Install Expo Updates & EAS CLI
In your terminal (inside the mobile app folder):
```bash
npm install -g eas-cli
npx expo install expo-updates
```

### 2. Configure `eas.json`
Inside the mobile app root folder, create `eas.json`:
```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://trivora-backend.onrender.com/api/v1"
      }
    }
  },
  "update": {
    "preview": {
      "channel": "preview"
    }
  }
}
```

### 3. Log In to Expo and Configure Project
```bash
eas login
eas project:init
```

### 4. Build the Initial Installable APK
Run this once to generate the downloadable `.apk` file:
```bash
eas build -p android --profile preview
```
* Expo Cloud will build the APK (100% free on the Expo free tier).
* Once finished, it gives you a QR code and download URL.
* Install this APK on your physical Android devices.

---

## ⚡ Part 4: How to Push Code Updates to the Installed APKs (CI/CD)

Whenever you edit React Native code, fix a map bug, or update UI:

### Method A: Instant Manual Update (One Command)
Run this from your terminal:
```bash
eas update --channel preview --message "Fixed driver location updates"
```
* That's it! In ~10 seconds, the update is uploaded to Expo's CDN.
* The next time a driver or passenger opens their app on their phone, the new code will run automatically!

### Method B: Automated GitHub Actions CI/CD (On Git Push)
You can automate this so whenever you `git push` changes to GitHub, GitHub Actions publishes the update to all phones automatically:

```yaml
name: Deploy Mobile OTA Update

on:
  push:
    paths:
      - 'trivora-driver-app/**'
      - 'trivora-passenger-app/**'
    branches:
      - main

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish Driver App Update
        run: |
          cd trivora-driver-app
          npm ci
          eas update --channel preview --auto

      - name: Publish Passenger App Update
        run: |
          cd trivora-passenger-app
          npm ci
          eas update --channel preview --auto
```

---

## 📋 Summary of Benefits

| Feature | Old InfinityFree Plan | New Render + TiDB + Expo Plan |
| :--- | :--- | :--- |
| **Total Cost** | 100% Free | **100% Free ($0.00)** |
| **Mobile App API Support** | Blocked by TestCookie | **100% Supported & Fast** |
| **Live GPS Pings** | Suspends Account | **Smooth Real-time Ingestion** |
| **Database** | Shared hosting MySQL | **Dedicated 5 GB Cloud TiDB MySQL** |
| **Mobile App Updates** | Must rebuild & reinstall APK every time | **EAS OTA: Updates on phone automatically!** |
