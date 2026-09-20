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

### 2. Installing the APK on an Android Phone
1. Once the cloud build finishes, Expo will provide a direct download link and a QR code.
2. Scan the QR code or open the download link on your Android phone's browser (Chrome).
3. Tap **Download Anyway** and then tap **Install**.
4. If prompted, toggle **"Allow from this source"** in your phone's Settings.
5. The Trivora app will install directly on your home screen!

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
