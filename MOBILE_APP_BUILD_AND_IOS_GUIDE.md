# 📱 Trivora Mobile App Guide: Android APK & iOS Deployment

Complete guide for building, installing, and testing both the **Trivora Driver App** and **Trivora Passenger App** on **Android** and **iOS (iPhone)**.

---

## 🏛 Ecosystem Overview

* **Live Cloud Backend:** `https://trivora-mh55.onrender.com`
* **Mobile REST API:** `https://trivora-mh55.onrender.com/api/v1`
* **Database:** TiDB Cloud Serverless (Singapore `ap-southeast-1`)
* **Driver App Folder:** `c:\laragon\www\trivora-capstone\trivora-driver-app`
* **Passenger App Folder:** `c:\laragon\www\trivora-capstone\trivora-passenger-app`

---

## 🤖 Part 1: Android APK Build (Standalone `.apk`)

The APK file can be downloaded and installed on **any Android phone** without Google Play Store or Expo dev tools.

### 1. Build Commands

#### Build the Driver App APK:
```bash
cd c:\laragon\www\trivora-capstone\trivora-driver-app
eas build -p android --profile preview
```
* **Live Build Status:** [https://expo.dev/accounts/aldrie_bqrn/projects/trivora-driver-app/builds](https://expo.dev/accounts/aldrie_bqrn/projects/trivora-driver-app/builds)

#### Build the Passenger App APK:
```bash
cd c:\laragon\www\trivora-capstone\trivora-passenger-app
eas build -p android --profile preview
```
* **Live Build Status:** [https://expo.dev/accounts/aldrie_bqrn/projects/trivora-passenger-app/builds](https://expo.dev/accounts/aldrie_bqrn/projects/trivora-passenger-app/builds)

### 2. Latest Standalone APK Downloads (Ready to Install)

| App | Version | Direct Download Link |
| :--- | :---: | :--- |
| 🚕 **Trivora Driver App** | 1.0.0 | [Download Driver APK](https://expo.dev/artifacts/eas/lHOljW5R4O4efljQD_hs1FPiPHzFCnMK5dzSMJJs6jc.apk) |
| 👤 **Trivora Passenger App** | 1.0.0 | [Download Passenger APK](https://expo.dev/artifacts/eas/i5OY4TdR8DYZbMOizLVogoHmRznrcVSoY0SXZTUrKDM.apk) |

> 💡 **Can I rename the APK file after downloading?**  
> **Yes!** The downloaded filename is a random hash from EAS (e.g. `lHOljW5R...apk`). You can safely rename it to:
> - `Trivora-Driver.apk`
> - `Trivora-Passenger.apk`  
> Renaming the `.apk` file does not affect the app's internal package name, icons, or functionality in any way.

### 3. Installing the APK on an Android Phone
1. Once downloaded, tap the file in your notification bar or your phone's **Files / Downloads** app.
2. Tap **Install**. If Android says *"Blocked by Play Protect / Unknown Source"*, tap **"More details"** -> **"Install anyway"**.
3. The Trivora app will install directly on your home screen with its official icon and branding!

---

## 🍏 Part 2: iPhone (iOS) Deployment Options (100% Free)

Apple does not allow raw APK downloads and restricts `.ipa` installation without code signing. Here are the two 100% free ways to run on iPhones:

### Method A: Expo Go (Recommended — Fastest & Zero Setup)
This runs the app natively on any physical iPhone with real GPS, maps, camera, and cloud connectivity.

1. On the iPhone, install **Expo Go** from the official [Apple App Store](https://apps.apple.com/app/expo-go/id982107779) (free).
2. On your computer in a terminal, start the tunnel server:
   * **For Passenger App:**
     ```bash
     cd c:\laragon\www\trivora-capstone\trivora-passenger-app
     npx expo start --tunnel
     ```
   * **For Driver App:**
     ```bash
     cd c:\laragon\www\trivora-capstone\trivora-driver-app
     npx expo start --tunnel
     ```
3. A large QR code will appear in your terminal.
4. Open the iPhone's default **Camera** app and point it at the QR code.
5. Tap the yellow **"Open in Expo Go"** banner.
6. The app opens and runs natively on the iPhone, communicating live with `https://trivora-mh55.onrender.com`!

---

### Method B: Sideloading Standalone `.ipa` (Standalone Icon Without $99 Account)
If your panel requires a true standalone app icon on the iPhone's home screen without Expo Go:

1. Apple allows anyone with a free personal Apple ID to sign up to 3 apps onto their own iPhone using a PC.
2. Download and install **[Sideloadly](https://sideloadly.io/)** (free) on your Windows PC.
3. Connect the iPhone to your computer using a USB cable.
4. Drag your compiled iOS build (`.ipa`) into Sideloadly.
5. Enter your free personal Apple ID and click **Start**.
6. The app installs directly onto the iPhone's home screen!
   > *Note:* Free Apple ID certificates are valid for 7 days—ideal for defense week or demonstration days.

---

## ⚡ Part 3: Over-The-Air (OTA) Updates (No Reinstalling Needed!)

Once the APK is installed on Android phones, **you never need to send a new APK file when you edit code.**

Whenever you fix bugs, polish UI, or change React components:
```bash
# Inside trivora-driver-app or trivora-passenger-app:
eas update --channel preview --message "Bug fix: updated booking status styles"
```

The next time the app is opened on the phone, **it automatically downloads the updated code in the background and applies it immediately!**

---

## 🔐 Part 4: Security & Environment Rules

* Never commit `.env` or `.env.local` to Git repositories.
* Both mobile apps' `.gitignore` files contain:
  ```gitignore
  .env
  .env.*
  .env.local
  node_modules/
  dist/
  .expo/
  ```
* The only environment variable needed by the mobile apps is:
  ```env
  EXPO_PUBLIC_API_URL=https://trivora-mh55.onrender.com/api/v1
  ```
  *(This is public and tells the phones where your Render backend is located).*

---

## 🔄 Part 5: Step-by-Step Guide for Pushing Updates & Changes

### A. How to Update the Mobile Apps (Driver & Passenger)

#### Scenario 1: UI, Logic, Screen, or Bug Fix Changes (Over-The-Air Update)
Whenever you change React Native code, fix a map pin, edit button colors, or update text:
1. Save your code changes in VS Code.
2. In your terminal, run:
   ```bash
   # For Driver App:
   cd c:\laragon\www\trivora-capstone\trivora-driver-app
   eas update --channel preview --message "Fix: updated trip dispatch view"

   # For Passenger App:
   cd c:\laragon\www\trivora-capstone\trivora-passenger-app
   eas update --channel preview --message "Fix: improved pickup marker selection"
   ```
3. **Phones update automatically!** The next time someone opens the app on their phone, it downloads the update silently. **No need to reinstall the APK!**

#### Scenario 2: Save Changes to Your GitHub Repositories
```bash
# Push Driver App updates to https://github.com/aldrieBQRN/trivora-driver-app:
cd c:\laragon\www\trivora-capstone\trivora-driver-app
git add .
git commit -m "feat: your update description"
git push origin main

# Push Passenger App updates to https://github.com/aldrieBQRN/trivora-passenger-app:
cd c:\laragon\www\trivora-capstone\trivora-passenger-app
git add .
git commit -m "feat: your update description"
git push origin main
```

#### Scenario 3: When Do You Need to Build a New APK?
You only need to run `eas build -p android --profile preview` if:
* You installed a new library that requires new Android OS native permissions (e.g. bluetooth, new background services).
* You changed the app icon or splash screen in `app.json`.
* You changed the Android package name.
* *For 95% of normal coding, UI, and logic changes, Scenario 1 (EAS Update) is all you need!*

---

### B. How to Update the Web Application & Backend (Render.com)

Whenever you edit Laravel controllers, Blade/Inertia React pages, API routes, or CSS in `trivora`:

1. Save your files.
2. Commit and push to GitHub:
   ```bash
   cd c:\laragon\www\trivora-capstone\trivora
   git add .
   git commit -m "feat: update dashboard analytics and export"
   git push origin main
   ```
3. **Render auto-deploys!** Within 2 minutes, Render detects your commit, compiles Vite, restarts the container, and updates **`https://trivora-mh55.onrender.com`** with zero downtime.

---

### C. How to Update Database Schema (TiDB Cloud)

If you add a new table or add new columns to the database (`php artisan make:migration ...`):

1. Commit and push your migration to `main`:
   ```bash
   cd c:\laragon\www\trivora-capstone\trivora
   git add database/migrations/
   git commit -m "feat: add new migration"
   git push origin main
   ```
2. Render automatically runs `php artisan migrate --force` inside the container entrypoint whenever a new build is deployed!
3. *(Optional)* You can also visit your live URL anytime to run migrations manually in your browser:
   👉 **`https://trivora-mh55.onrender.com/seed-database`**

---

## 📶 Part 6: Internet Connection Checking & Offline Mode Handling

Both mobile apps feature automatic internet connectivity monitoring and offline handling:

### 1. When Does the App Check for Internet?
* **App Startup:** Checks immediately upon launch when opening the app.
* **Background to Foreground:** When you switch away to another app and come back, it instantly re-tests connection.
* **Live Heartbeat:** Runs periodic background ping checks every 25 seconds.
* **On Login / Register Action:** Verifies if the cloud server is reachable before attempting authentication.

### 2. Visual Indicators:
* **Offline Alert Banner:** If internet drops or the server cannot be reached, a top banner slides into view:  
  `🔴 No Internet Connection (Offline Mode)`
* **Reconnection Toast:** When internet is restored, the banner changes:  
  `🟢 Back Online`  
  and smoothly animates out after 2.5 seconds.
* **Login Screen Offline Fallback:** If you attempt to sign in while offline, the app prompts you:
  > *"Unable to reach the Trivora cloud server. Please check your internet connection."*
  - **[Check Connection / Retry]**: Re-tests network connection.
  - **[Continue in Demo Mode]**: Allows you to enter the app using local demo data for presentations or testing without active internet!
