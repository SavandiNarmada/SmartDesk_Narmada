# Smart Desk Assistant — Complete Setup Guide for a New Windows Machine
## One-Shot Guide: From Zero to Live Sensor Data on Any WiFi Network

> This guide was written after experiencing every possible failure on a real Windows machine.
> Every failure is documented here with EXACTLY why it happens and EXACTLY how to fix it.
> Follow the steps in order. Do not skip steps.

---

## TABLE OF CONTENTS

- [PART 0 — Quick Reference Cheat Sheet](#part-0--quick-reference-cheat-sheet)
- [PART 1 — Install These Programs First (One Time Only)](#part-1--install-these-programs-first-one-time-only)
- [PART 2 — Get the Code Onto the New Machine](#part-2--get-the-code-onto-the-new-machine)
- [PART 3 — Find Your WiFi IP Address (Do This Every Session)](#part-3--find-your-wifi-ip-address-do-this-every-session)
- [PART 4 — Open Windows Firewall Ports (One Time Only, Run as Admin)](#part-4--open-windows-firewall-ports-one-time-only-run-as-admin)
- [PART 5 — Start the Docker Backend](#part-5--start-the-docker-backend)
- [PART 5B — Restore Historical Database (IMPORTANT)](#part-5b--restore-historical-database-important--do-this-before-using-the-app)
- [PART 6 — Login to Expo Account (Do This Before Starting Metro)](#part-6--login-to-expo-account-do-this-before-starting-metro)
- [PART 7 — Start Metro Bundler in Expo Go Mode](#part-7--start-metro-bundler-in-expo-go-mode)
- [PART 8 — Scan the QR Code and Load the App on Your Phone](#part-8--scan-the-qr-code-and-load-the-app-on-your-phone)
- [PART 9 — First Time App Setup (Register and Connect Protonest)](#part-9--first-time-app-setup-register-and-connect-protonest)
- [PART 10 — Protonest Cloud Integration: How It Works](#part-10--protonest-cloud-integration-how-it-works)
- [PART 11 — ESP32 Physical Device Setup (Optional DIY Path)](#part-11--esp32-physical-device-setup-optional-diy-path)
- [PART 12 — All Credentials and Keys Reference](#part-12--all-credentials-and-keys-reference)
- [PART 13 — All Failure Scenarios: Symptom, Why, Fix](#part-13--all-failure-scenarios-symptom-why-fix)
- [PART 14 — Architecture Diagram: How Everything Connects](#part-14--architecture-diagram-how-everything-connects)

---

## PART 0 — Quick Reference Cheat Sheet

> For experienced users who have already done the one-time setup. Copy and paste every session.

```powershell
# ====================================================
# STEP 1: Find your WiFi IP (changes per network)
# ====================================================
ipconfig
# Look for: Wireless LAN adapter Wi-Fi → IPv4 Address
# Example: 192.168.1.8   <-- use YOUR actual IP below

# ====================================================
# STEP 2: Start Docker backend (if not already running)
# ====================================================
cd C:\IIT\SDA-main\backend
docker compose up -d
docker ps
# Wait until sda-postgres shows (healthy)

# ====================================================
# STEP 3: Verify backend is reachable from phone
# ====================================================
# Open this URL in your phone's browser:
# http://<YOUR_IP>:3000/health
# Should show: {"success":true,"message":"Smart Desk Assistant API is running"}

# ====================================================
# STEP 4: Start Expo (replace 192.168.X.X with your IP)
# ====================================================
cd C:\IIT\SDA-main\SmartDeskAssistant
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.X.X"
npx expo start --go --lan --port 8083 --clear

# ====================================================
# STEP 5: On phone — open Expo Go app → Scan QR Code
# ====================================================
# Wait 30-90 seconds for first bundle compile
# SUCCESS: Metro terminal shows:
#   BUNDLE ./index.ts
#   LOG Running "SmartDeskAssistant"
```

---

## PART 1 — Install These Programs First (One Time Only)

Think of this like setting up a kitchen before you cook. You need the right tools before you can do anything.

### 1.1 Node.js (JavaScript Runtime)

**What it is:** Node.js lets your Windows machine run JavaScript programs outside of a browser. The Expo tools are JavaScript programs.

**How to install:**
1. Go to https://nodejs.org/
2. Download the **LTS** (Long-Term Support) version — the green button
3. Run the installer. Accept all defaults. Check "Automatically install necessary tools" if asked.
4. After install, open PowerShell and verify:
   ```powershell
   node --version
   ```
   You should see something like `v20.11.0` or higher.

### 1.2 Docker Desktop for Windows

**What it is:** Docker runs the backend (database + API server) inside isolated "containers". Think of it as running a mini-Linux computer inside your Windows. This means you don't need to install PostgreSQL or Node.js separately for the backend — Docker handles all of that.

**How to install:**
1. Go to https://www.docker.com/products/docker-desktop/
2. Download "Docker Desktop for Windows"
3. Run the installer
4. IMPORTANT: When asked, select **"Use WSL 2 instead of Hyper-V"** — this is the modern option that works better
5. Restart your computer when the installer asks
6. After restart, Docker Desktop will launch automatically. Wait for it to show "Docker Desktop is running" (green dot in taskbar)
7. Verify in PowerShell:
   ```powershell
   docker --version
   docker compose version
   ```

### 1.3 Git for Windows (Optional but Recommended)

**What it is:** Git lets you download and manage source code. Optional if you're just copying a zip file.

**How to install:**
1. Go to https://git-scm.com/download/win
2. Download and run the installer. Accept all defaults.

### 1.4 Expo Go App on Your Phone

**What it is:** Expo Go is a special app that lets your phone run React Native apps from your computer during development. Think of it as a "test browser" for mobile apps.

**Android:** Open Google Play Store → search "Expo Go" by Expo Project → Install

**iOS (iPhone):** Open App Store → search "Expo Go" by Expo Project Inc. → Install

**IMPORTANT:** Make sure you install **Expo Go** — not "Expo" or "Expo Snack". The exact publisher name must be "Expo Project" or "Expo Project Inc."

### 1.5 Arduino IDE 2.x (Only if using the ESP32 sensor board)

**What it is:** A program for writing and uploading code to microcontrollers like the ESP32 chip.

**How to install:**
1. Go to https://www.arduino.cc/en/software
2. Download "Arduino IDE 2.x" for Windows
3. Run the installer. Accept all defaults.

---

## PART 2 — Get the Code Onto the New Machine

**Option A: Copy a ZIP file**
1. Copy the project zip file to the new machine
2. Right-click the zip → "Extract All..."
3. Extract to `C:\IIT\SDA-main\`
4. After extraction you should see these folders inside `C:\IIT\SDA-main\`:
   ```
   C:\IIT\SDA-main\
     backend\              ← the server (Node.js + PostgreSQL, runs in Docker)
     SmartDeskAssistant\   ← the phone app (React Native / Expo)
     DEVICE Code\          ← the ESP32 Arduino firmware
     docs\                 ← documentation (this file)
   ```

**Option B: Clone from Git**
```powershell
cd C:\IIT
git clone <repository-url> SDA-main
```

### Install the Frontend Dependencies

This step downloads all the JavaScript packages the phone app needs.
You only need to do this ONCE after getting the code (or when package.json changes).

```powershell
cd C:\IIT\SDA-main\SmartDeskAssistant
npm install
```

This takes 1-3 minutes. You will see lots of text scrolling — that is normal.

**WHY:** The `node_modules` folder (the downloaded packages) is NOT included in the zip because it is huge (hundreds of MB). `npm install` recreates it from the `package.json` list.

**NOTE:** You do NOT need to run `npm install` for the backend. Docker builds it automatically inside the container when you run `docker compose up`.

---

## PART 3 — Find Your WiFi IP Address (Do This Every Session)

**WHY THIS MATTERS:** Your phone and your computer communicate over WiFi. For them to talk to each other, your computer needs to know its own WiFi address. This address changes every time you connect to a different router (home vs university vs cafe).

**How to find it:**

Open PowerShell and run:
```powershell
ipconfig
```

You will see a long list. Look for this section:
```
Wireless LAN adapter Wi-Fi:
   Connection-specific DNS Suffix  . : home
   Link-local IPv6 Address . . . . . : fe80::...
   IPv4 Address. . . . . . . . . . . : 192.168.1.8   <-- THIS IS YOUR IP
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
```

**Your WiFi IP is the one under "Wireless LAN adapter Wi-Fi" → "IPv4 Address".**

### What to IGNORE in ipconfig output:

| Adapter name | IP range | Ignore because... |
|---|---|---|
| VichaNew / Any VPN | 10.x.x.x | University/company VPN — phone is NOT on this network |
| vEthernet (WSL) | 172.x.x.x | Internal Docker/WSL virtual adapter |
| Bluetooth Network | anything | Not WiFi |
| Ethernet | 192.168.x.x or other | Not WiFi (if you have a cable too) |

**The correct IP always looks like `192.168.X.X` and is under the Wi-Fi adapter.**

Write down your IP. You will use it in Steps 4 and 7.

---

## PART 4 — Open Windows Firewall Ports (One Time Only, Run as Admin)

**WHY THIS MATTERS:** Windows has a firewall that blocks other devices from connecting to your computer. Your phone is a "other device" on the network. By default, Windows will silently drop all connections from your phone — even on the same WiFi. You must explicitly allow the ports the app uses.

You only need to do this ONCE on each new machine.

**Step 1: Open PowerShell as Administrator**
- Press the Windows key → type "PowerShell"
- Right-click "Windows PowerShell" → "Run as administrator"
- Click "Yes" on the UAC prompt

**Step 2: Run these two commands** (each on one line, press Enter after each):

```powershell
netsh advfirewall firewall add rule name="SDA Backend 3000" dir=in action=allow protocol=TCP localport=3000
```

```powershell
netsh advfirewall firewall add rule name="Expo Metro 8083" dir=in action=allow protocol=TCP localport=8083
```

Each command should print `Ok.` when it succeeds.

**CRITICAL WARNING:** Do NOT split these commands across multiple lines in PowerShell. Type each one on a single line and press Enter. If you press Enter in the middle of the command, PowerShell will try to run each part separately and the second part will fail (you will see "The term 'protocol=TCP' is not recognized" — this means the firewall rule was only partially created and will NOT work).

### What these ports are:
| Port | Service | Why it needs to be open |
|---|---|---|
| 3000 | SDA Backend API | Phone calls login, devices, insights APIs on this port |
| 8083 | Metro Bundler | Phone downloads the JavaScript app bundle from this port |

---

## PART 5 — Start the Docker Backend

**WHY DOCKER:** Instead of installing Node.js server software and PostgreSQL database separately on your machine, Docker runs them inside isolated containers. This means the setup is identical on every machine — no "it works on my machine" problems.

### Step 1: Start the containers
```powershell
cd C:\IIT\SDA-main\backend
docker compose up -d
```

The `-d` flag means "run in background (detached)". You get your terminal back immediately.

**First time only:** Docker will download the PostgreSQL and Node.js images. This takes 2-5 minutes depending on your internet speed. You will see lots of download progress bars.

### Step 2: Check that everything started correctly
```powershell
docker ps
```

You should see three containers running:
```
NAMES          STATUS                    PORTS
sda-backend    Up 30 seconds             0.0.0.0:3000->3000/tcp
sda-pgadmin    Up 30 seconds             0.0.0.0:5050->80/tcp
sda-postgres   Up 30 seconds (healthy)   0.0.0.0:5433->5432/tcp
```

**The most important thing:** `sda-postgres` must show `(healthy)`. If it shows `(health: starting)`, wait 30 more seconds and run `docker ps` again. The backend will not start until the database is healthy.

### Step 3: Verify the backend is reachable from your phone

Open your phone's browser (Safari on iPhone, Chrome on Android) and go to:
```
http://192.168.X.X:3000/health
```
(Replace `192.168.X.X` with your actual WiFi IP from Part 3)

You should see:
```json
{"success":true,"message":"Smart Desk Assistant API is running","timestamp":"..."}
```

If this works on your phone — congratulations, the backend is confirmed working. The phone can reach your computer.

### What each container does:
| Container | What it is | Port on your PC |
|---|---|---|
| sda-postgres | PostgreSQL database — stores all user data, devices, sensor readings | 5433 |
| sda-backend | Node.js API server — handles login, devices, WebSocket, Protonest sync | 3000 |
| sda-pgadmin | pgAdmin web UI — lets you view the database in a browser | 5050 |

### View the database (optional):
Open your browser on your PC and go to `http://localhost:5050`
- Email: `admin@smartdesk.com`
- Password: `admin123`
Then add a server connection: host=`db`, port=`5432`, username=`postgres`, password=`postgres123`

---

## PART 5B — Restore Historical Database (IMPORTANT — Do This Before Using the App)

**WHY THIS MATTERS:** The ZIP includes a file `backend/database/seed_data.sql` — a full export of the live database from the source machine. This contains all sensor readings (7-day, 24-hour, 30-day history), user accounts, devices, insights, and Protonest credentials. Without restoring this, the app starts with an empty database and all historical charts show no data.

**Do this immediately after Part 5 — while Docker is still running.**

### Step 1: Run the restore script

Open PowerShell (normal user, no Admin required):

```powershell
cd C:\IIT\SDA-main\backend
powershell -ExecutionPolicy Bypass -File restore_db.ps1
```

The script will:
1. Wait until PostgreSQL is confirmed healthy
2. Copy `seed_data.sql` into the container
3. Insert all data into the empty database
4. Print a row-count summary so you can confirm it worked

### Expected output when successful:

```
Waiting for PostgreSQL to be healthy...
  Attempt 1 — status: healthy
Copying seed data into container...
Restoring data (this may take 30-60 seconds for large datasets)...
SET
SET
...
Data restored successfully!
 table_name     | rows
----------------+------
 users          |    2
 devices        |    2
 sensor_readings| 2654
 insights       |   44

Restart backend to reconnect WebSocket:
  docker restart sda-backend
```

### Step 2: Restart the backend

```powershell
docker restart sda-backend
```

This is required so the backend reconnects its WebSocket and sync service with the freshly populated database.

### Step 3: Verify data is visible

```powershell
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT MIN(timestamp), MAX(timestamp), COUNT(*) FROM sensor_readings;"
```

You should see the oldest and newest reading timestamps — confirming the full history is present. The app's 24h / 7d / 30d charts will now show real data immediately.

---

### Troubleshooting: "duplicate key value" errors during restore

This means the database already has data (e.g., you already registered a user before restoring). Fix by clearing the database first:

```powershell
# Wipe all data and re-run restore
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "TRUNCATE users, devices, sensor_readings, insights, protonest_credentials, sessions, user_settings, push_tokens, notification_log, sensor_thresholds RESTART IDENTITY CASCADE;"
powershell -ExecutionPolicy Bypass -File restore_db.ps1
```

### Troubleshooting: Script says "PostgreSQL did not become healthy"

Docker is still starting. Wait 30 seconds and run the script again:

```powershell
docker ps
# Wait until sda-postgres shows (healthy), then:
powershell -ExecutionPolicy Bypass -File restore_db.ps1
```

### Troubleshooting: "No such file or directory" for seed_data.sql

The ZIP was extracted incorrectly. Verify the file exists:

```powershell
Test-Path "C:\IIT\SDA-main\backend\database\seed_data.sql"
# Must return: True
```

If it returns `False`, re-extract the ZIP — the file is at `backend\database\seed_data.sql` inside the archive.

---

## PART 6 — Login to Expo Account (Do This Before Starting Metro)

**WHY:** Expo Go requires you to be logged into an Expo account before it will load unverified apps. Without this, Expo Go shows a login prompt — but the login prompt INSIDE the running Metro server is buggy on PowerShell and crashes with `AssertionError: (username && password)`. The fix is to always log in separately FIRST.

```powershell
cd C:\IIT\SDA-main\SmartDeskAssistant
npx expo login
```

When prompted:
- Email or username: `testvicha`
- Password: [the testvicha account password]

You should see: `Logged in as testvicha`

You only need to do this once per machine (the session is saved). But if you get logged out (which can happen after a Windows update), run it again before starting Metro.

---

## PART 7 — Start Metro Bundler in Expo Go Mode

**What is Metro?** Metro is the tool that takes all the TypeScript/JavaScript code and "bundles" it into a single file that your phone can run. It also serves as a live reload server — when you save a file, your phone updates automatically.

**What is Expo Go mode?** This project has `expo-dev-client` installed (a package that enables custom dev builds). When this package is present, Metro defaults to "development build mode" which generates URLs that Expo Go cannot read. The `--go` flag forces Metro back into standard Expo Go mode.

### Run these TWO commands in order (in the SmartDeskAssistant folder):

First, set your WiFi IP (replace `192.168.X.X` with your actual IP from Part 3):
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.X.X"
```

Then start Metro:
```powershell
npx expo start --go --lan --port 8083 --clear
```

### What each flag means:

| Flag | What it does | Why it's needed |
|---|---|---|
| `REACT_NATIVE_PACKAGER_HOSTNAME` | Tells Metro which network adapter's IP to use | Windows picks the wrong one (VPN) by default |
| `--go` | Forces Expo Go mode | `expo-dev-client` installed causes Metro to default to dev-client mode |
| `--lan` | Uses LAN network mode | Phone must connect over local WiFi, not localhost or tunnel |
| `--port 8083` | Uses port 8083 | Ports 8081 and 8082 are commonly occupied by previous sessions |
| `--clear` | Clears Metro's cache | Removes stale compiled bundles from the old machine |

### What to see after Metro starts:

After about 10 seconds, you will see a QR code printed in ASCII art in the terminal, and below it:
```
Metro waiting on exp://192.168.X.X:8083
Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

Using Expo Go
```

**CRITICAL CHECK:** The IP shown after `exp://` must be YOUR WiFi IP (e.g., `192.168.1.8`).

If it shows `exp://10.x.x.x:...` — this is your VPN IP. Metro picked the wrong adapter.
Fix: Press Ctrl+C to stop Metro, disconnect your VPN, and run the commands again.

If it shows `exp+smartdeskassistant://expo-development-client/...` — Metro is in dev-client mode.
Fix: Make sure `--go` flag is included. Press `s` key in the Metro terminal to switch modes.

---

## PART 8 — Scan the QR Code and Load the App on Your Phone

### On Android:
1. Open **Expo Go** app
2. Tap the **Scan QR Code** button (camera icon on the home tab)
3. Point the camera at the QR code in your PowerShell terminal
4. Wait 30-90 seconds — this is normal! The first time, Metro must compile all 1,700+ TypeScript files into a bundle. Be patient.
5. The app will appear on your phone screen

### On iOS (iPhone):
1. Open **Expo Go** app (NOT the iPhone Camera app)
2. Tap **Scan QR Code** inside the Expo Go app
3. Point at the QR code
4. Wait 30-90 seconds for the bundle to compile and transfer
5. The app will appear

**WHY NOT the iPhone Camera app?**
The iPhone Camera app can scan QR codes, but it only understands `http://` and `https://` URLs. The Expo QR code contains an `exp://` URL (Expo's own protocol). The Camera app sees this and says "no valid data found" because it doesn't know what `exp://` means. Expo Go's built-in scanner knows about `exp://` and handles it correctly.

### How to know it's working:

In the Metro terminal on your PC, you will see:
```
Android Bundled 36502ms index.ts (1750 modules)
LOG Running "SmartDeskAssistant" with ...
```
or for iOS:
```
iOS Bundled 30986ms index.ts (1746 modules)
LOG Running "SmartDeskAssistant" with ...
```

This means the app bundle was compiled (36 seconds for Android, 31 seconds for iOS in this example) and is running on the phone.

### Expected warnings (these are normal, do NOT indicate problems):

```
WARN expo-notifications: Android Push notifications removed from Expo Go SDK 53+
WARN New Architecture is always enabled in Expo Go
LOG Expo push token: ExponentPushToken[...]
LOG Push token registered with backend
```

All of these are expected and harmless. The app still works fully.

---

## PART 9 — First Time App Setup (Register and Connect Protonest)

### Step 1: Register a User Account
1. On the app's login screen, tap **"Register"** or **"Sign Up"**
2. Enter any email address and password you choose — this is YOUR account for the app
3. Fill in your name
4. Tap Register
5. You will be logged in automatically

### Step 2: Add Your Sensor Device
1. Go to the **Devices** tab (bottom navigation)
2. Tap **"Add Device"** or the **"+"** button
3. Fill in:
   - **Name:** `Desk` (or any name you want)
   - **Type:** `Multi Sensor`
   - **Location:** `Office` (or any location)
   - **Protonest Device ID:** `test123`  ← THIS IS CRITICAL
4. Tap Save

**WHY `test123`?** The physical sensor hardware registered with Protonest Cloud uses the device ID `test123`. This ID tells the backend which Protonest device to subscribe to. If you enter a wrong ID, the WebSocket subscription fails silently and no data arrives.

### Step 3: Connect S3 IoT Connect (MQTT Connect)
1. Go to **Profile** tab (bottom navigation, person icon)
2. Tap **"S3 IoT Connect Setup"** or the cloud icon
3. Enter:
   - **Email:** any email address you want (used as your display identifier — stored in DB, shown under the cloud icon)
   - **Password:** any string (the backend ignores this at runtime and uses the shared account from the server config)
4. Tap **Save & Verify** — the cloud icon turns green and your email appears below it

**WHY:** The backend always authenticates to MQTT Connect using the shared account configured in `docker-compose.yml` (`MQTT_CONNECT_OVERRIDE_EMAIL` / `MQTT_CONNECT_OVERRIDE_PASSWORD`). Individual users do not need the real MQTT Connect password. The email you enter is just a display label — it confirms which email "identity" is associated with the cloud connection in the app UI.

### Step 4: Verify Live Data is Flowing
1. Go to the **Dashboard** or tap your device
2. You should see live readings updating every few seconds:
   - Air Quality (from MQ-135 gas sensor)
   - Light Level (from LDR sensor)
   - Noise Level (from microphone)

**If data is not appearing:** Watch the Docker backend logs:
```powershell
docker logs sda-backend -f
```
You should see:
```
App connected via WebSocket (user: ...)
Connecting to Protonest WebSocket for user ...
Protonest WebSocket connected
Subscribed to /topic/stream/test123
```
If you see "Protonest WebSocket connected" but still no data — the physical device may not be sending data at that moment (check the device is powered on).

---

## PART 10 — Protonest Cloud Integration: How It Works

### What is Protonest Connect?

Protonest Connect is a cloud IoT platform. Think of it like this: the physical sensor hardware (the device in your room) cannot directly talk to your phone — it's just a small chip. Instead, it sends data to Protonest's servers in the cloud. The SDA backend then connects to those cloud servers and relays the data to your phone in real time.

### The Complete Data Flow:

```
[SENSOR HARDWARE]
Physical device (device ID: test123)
  sends data every few seconds
        |
        v
[PROTONEST CLOUD]  https://api.protonestconnect.co
  Stores readings under topics:
  /topic/stream/test123/gas    → air quality readings
  /topic/stream/test123/light  → light level readings
  /topic/stream/test123/noise  → noise level readings
        |
        | (two parallel connections)
        |
  [METHOD 1: REST API Polling]          [METHOD 2: WebSocket Subscription]
  SDA backend calls                     SDA backend opens a persistent
  POST /api/v1/user/get-stream-data     WebSocket connection:
  every 5 seconds                       wss://api.protonestconnect.co/ws
  Gets recent readings                  Subscribes to /topic/stream/test123
  Saves to database                     Gets data instantly as it arrives
        |                                       |
        +-------------------+-------------------+
                            |
                     [SDA BACKEND]
                  Saves to PostgreSQL
                  sensor_readings table
                  Broadcasts to all
                  connected phones via
                  WebSocket /ws
                            |
                     [YOUR PHONE]
                  App shows live readings
                  on the Dashboard
```

### Topic Mapping Explained

The Protonest topics send data with suffix names (`gas`, `light`, `noise`). The SDA backend maps these to database columns:

| Protonest topic suffix | Database column | What the physical sensor is |
|---|---|---|
| `gas` | `air_quality` | MQ-135 gas sensor — measures CO2, VOCs, air quality |
| `light` | `light_level` | LDR (Light Dependent Resistor) — measures brightness |
| `noise` | `noise_level` | Microphone module — measures ambient noise |
| `temperature` | `temperature` | Temperature sensor (if connected) |
| `humidity` | `humidity` | Humidity sensor (if connected) |

This mapping is configured in `docker-compose.yml`:
```
TOPIC_MAPPING: "gas:air_quality,light:light_level,noise:noise_level,temperature:temperature,humidity:humidity"
```

### Protonest API Endpoints (for reference)

The SDA backend uses these Protonest API endpoints internally — you do not call them yourself:

| Endpoint | Method | Purpose |
|---|---|---|
| `https://api.protonestconnect.co/api/v1/user/login` | POST | Get JWT token using your email/password |
| `https://api.protonestconnect.co/api/v1/user/get-stream-data/user` | POST | Get recent sensor readings |
| `wss://api.protonestconnect.co/ws?token=<jwt>` | WebSocket | Real-time data stream |

**Subscribe command sent over WebSocket:**
```json
{"command": "SUBSCRIBE", "destination": "/topic/stream/test123"}
```

### Protonest Account Requirements

- You must have a Protonest Connect account (register at https://protonestconnect.co)
- Your account must have the device `test123` associated with it
- Enter your Protonest email/password in the app under Profile → Protonest Setup
- The SDA backend automatically refreshes the Protonest JWT token before it expires (5-minute buffer)

---

## PART 11 — ESP32 Physical Device Setup (Optional DIY Path)

This section is for using your own ESP32 microcontroller board with sensors directly, instead of (or in addition to) Protonest.

**IMPORTANT DIFFERENCE:**
- **Protonest path:** Physical device → Protonest Cloud → SDA backend → your phone
- **ESP32 direct path:** ESP32 board → SDA backend directly (via `/api/ingest`) → your phone

Both paths write to the same `sensor_readings` database table. You can use both at the same time.

### Hardware You Need

| Component | Purpose |
|---|---|
| ESP32 Dev Module board | The "brain" — runs the firmware, connects to WiFi |
| LDR 3-pin module (light sensor) | Measures ambient light |
| MIC module with AO pin | Measures ambient noise |
| MQ-135 gas sensor module | Measures air quality (CO2, VOCs) |
| Jumper wires | Connections between components |
| USB cable (micro-USB or USB-C, depends on your ESP32) | For programming and power |

### Wiring Diagram

```
ESP32 Board                 LDR Module (3-pin)
GPIO 27  ←─────────────── DO  (digital output)
3.3V     ─────────────── VCC
GND      ─────────────── GND

ESP32 Board                 MIC Module
GPIO 35  ←─────────────── AO  (analog output)
3.3V     ─────────────── VCC
GND      ─────────────── GND

ESP32 Board                 MQ-135 Gas Sensor
GPIO 32  ←─────────────── AO  (analog output)
5V       ─────────────── VCC  (MQ-135 needs 5V, not 3.3V)
GND      ─────────────── GND
```

**Reading types:**
- LDR reads as **digital** (GPIO 27 `digitalRead`): `0` = light present, `1` = dark
- MIC reads as **analog** (GPIO 35 `analogRead`): `0 to 4095` (12-bit ADC, 0=quiet, 4095=loud)
- MQ-135 reads as **analog** (GPIO 32 `analogRead`): `0 to 4095` (12-bit ADC, higher = worse air)

### Firmware Setup in Arduino IDE

**Step 1: Install ESP32 board support**
1. Open Arduino IDE
2. File → Preferences
3. In "Additional boards manager URLs" add this (on a new line):
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click OK
5. Tools → Board → Boards Manager
6. Search for "esp32"
7. Install "esp32 by Espressif Systems" (version 2.x or 3.x)

**Step 2: Open the firmware file**
- File → Open → navigate to `C:\IIT\SDA-main\DEVICE Code\sketch_mar8a.ino`

**Step 3: Edit these lines in the sketch** (lines 31-39):

```cpp
// Line 31-32: Your WiFi network
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Line 35: Backend URL
// For production (Protonest hardware talks to live server):
const char* SERVER_URL = "http://savindi.autohubmarket.com/api/ingest";

// For local development (ESP32 sends to your Docker backend):
// const char* SERVER_URL = "http://192.168.X.X:3000/api/ingest";
// Replace 192.168.X.X with your WiFi IP from Part 3

// Line 39: Your device key (get this from the app)
const char* DEVICE_KEY = "PASTE_YOUR_DEVICE_KEY_HERE";
```

**Step 4: Get your Device Key from the app**
1. In the SDA app, go to Devices
2. Tap your device
3. Tap the Settings or gear icon
4. Find "Arduino Device Key" — copy this long string
5. Paste it as the `DEVICE_KEY` value in the Arduino sketch

**Step 5: Upload the firmware**
1. Connect ESP32 to your PC via USB
2. Tools → Board → ESP32 Arduino → **ESP32 Dev Module**
3. Tools → Port → select the COM port (usually `COM3`, `COM4`, or similar)
   - If no COM port appears: you need to install the CP2102 or CH340 USB driver for your ESP32 board
4. Click the Upload button (right arrow icon, or Ctrl+U)
5. Wait for "Done uploading" message

**Step 6: Monitor the output**
1. Tools → Serial Monitor
2. Set baud rate to `115200` (bottom right of Serial Monitor window)
3. You should see:
   ```
   Connecting to WiFi.....
   WiFi connected, IP: 192.168.X.X
   LDR_DO=0  MIC=234  MQ135=1456
   POST http://... -> {"device_key":"...","ldr_do":0,"mic":234,"mq135":1456}
   HTTP status: 200
   Data sent successfully
   ```
   This repeats every 5 seconds.

### What the ESP32 sends to the backend

Every 5 seconds, the ESP32 sends an HTTP POST to `/api/ingest`:
```json
{
  "device_key": "your-device-key-here",
  "ldr_do": 0,
  "mic": 1234,
  "mq135": 567
}
```
The backend converts `mic` and `mq135` raw ADC values to meaningful units and saves them as `noise_level` and `air_quality` in the database.

---

## PART 12 — All Credentials and Keys Reference

> Store these safely. Do not share them publicly.

### Docker Backend (no separate .env file needed — all in docker-compose.yml)

| Setting | Value |
|---|---|
| PostgreSQL database name | `smart_desk_assistant` |
| PostgreSQL username | `postgres` |
| PostgreSQL password | `postgres123` |
| PostgreSQL port (on your PC) | `5433` (NOT 5432 — avoids conflicts) |
| Backend API port | `3000` |
| JWT secret | `smart_desk_assistant_docker_secret_change_me` |
| Protonest encryption key | `docker_encryption_key_32_chars_!` |
| Gemini AI API key | See `docker-compose.yml` line 51 |
| AI insight generation interval | Every 2 hours |

### pgAdmin Database Viewer

| Setting | Value |
|---|---|
| pgAdmin URL | `http://localhost:5050` |
| pgAdmin login email | `admin@smartdesk.com` |
| pgAdmin login password | `admin123` |
| Server connection host | `db` |
| Server connection port | `5432` |
| Server connection username | `postgres` |
| Server connection password | `postgres123` |

### Expo / Mobile App

| Setting | Value |
|---|---|
| Expo account username | `testvicha` |
| EAS project ID | `213aa1d7-9e8f-4778-98bd-79cc50856652` |
| EAS owner account | `devvicha` |
| Expo SDK version | `54` |
| React Native version | `0.81.5` |

### Protonest IoT Platform

| Setting | Value |
|---|---|
| Protonest device ID | `test123` |
| Protonest API base URL | `https://api.protonestconnect.co/api/v1/user` |
| Protonest WebSocket URL | `wss://api.protonestconnect.co/ws` |
| Your Protonest email | your own account email |
| Your Protonest password | your own account password |

### Quick Verification URLs (test from phone browser on same WiFi)

| URL | Expected Response |
|---|---|
| `http://<YOUR_IP>:3000/health` | `{"success":true,"message":"Smart Desk Assistant API is running"}` |
| `http://localhost:5050` | pgAdmin login page (on your PC browser) |

---

## PART 13 — All Failure Scenarios: Symptom, Why, Fix

### Failure 1: QR code shows wrong IP address

**What you see in Metro terminal:**
```
Metro waiting on exp://10.7.74.150:8083
```
or
```
Metro waiting on exp://172.17.80.1:8083
```

**Why this happens:** Windows has multiple network adapters. Metro asks Windows "what's your IP?" and Windows returns the first adapter alphabetically. If you have a VPN active (`10.x.x.x`) or Docker's WSL adapter (`172.x.x.x`), Metro picks that instead of your WiFi adapter (`192.168.x.x`). Your phone is on WiFi, not on the VPN, so it cannot reach the VPN IP.

**How to fix:**
1. Press Ctrl+C to stop Metro
2. If VPN is active — disconnect it
3. Run:
   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.X.X"
   npx expo start --go --lan --port 8083 --clear
   ```
   (Replace `192.168.X.X` with YOUR WiFi IP from `ipconfig`)
4. Confirm terminal now shows: `exp://192.168.X.X:8083`

---

### Failure 2: QR scans, Expo Go shows "Something went wrong" or times out

**What you see on phone:** A loading spinner, then "Something went wrong" or a timeout error.

**Why this happens:** Your phone reached Metro (it scanned the QR successfully) but Windows Firewall is blocking the connection on port 8083. The phone makes a request, Windows silently drops it, the phone waits and eventually times out.

**How to fix:**
1. Open PowerShell **as Administrator** (right-click → Run as Administrator)
2. Run this SINGLE LINE (do not split it):
   ```powershell
   netsh advfirewall firewall add rule name="Expo Metro 8083" dir=in action=allow protocol=TCP localport=8083
   ```
3. Shake your phone → **Reload** in Expo Go

---

### Failure 3: Metro terminal shows `exp+smartdeskassistant://` instead of `exp://`

**What you see in Metro terminal:**
```
Metro waiting on exp+smartdeskassistant://expo-development-client/?url=...
```

**Why this happens:** The `expo-dev-client` package is installed in this project. When this package is present, Metro automatically defaults to "development build mode" — a mode designed for custom-built Expo apps, not the standard Expo Go app. Expo Go cannot read the `exp+smartdeskassistant://` URL scheme.

**How to fix:**
Add the `--go` flag to force standard Expo Go mode:
```powershell
npx expo start --go --lan --port 8083 --clear
```

Or, while Metro is running, press the `s` key in the Metro terminal to switch modes.

---

### Failure 4: "Network request failed" on the Login screen

**What you see on phone:** The app loads and shows the login screen. You enter credentials and tap Login. A red error message appears: "Network request failed".

**Why this happens:** The app loaded (Metro/port 8083 is reachable) but the backend API on port 3000 is blocked by Windows Firewall. The login button calls `http://192.168.X.X:3000/api/auth/login` — this request is silently dropped by the firewall.

**How to fix:**
1. Open PowerShell as Administrator
2. Run this SINGLE LINE:
   ```powershell
   netsh advfirewall firewall add rule name="SDA Backend 3000" dir=in action=allow protocol=TCP localport=3000
   ```
3. Shake phone → **Reload**

---

### Failure 5: iOS Camera app says "No usable data found" or nothing happens

**What you see:** You point the iPhone Camera at the QR code. The camera appears to scan it (yellow box appears), but no notification banner shows, or the notification says "No usable data found".

**Why this happens:** The Expo QR code contains an `exp://192.168.X.X:8083` URL. The iOS Camera app only handles `http://`, `https://`, and a few Apple-specific schemes. `exp://` is Expo's custom scheme that only Expo Go understands. Camera has no idea what to do with it.

**How to fix:** Do not use the Camera app. Instead:
1. Open the **Expo Go** app
2. Tap the camera icon or **"Scan QR Code"** button INSIDE Expo Go
3. Point at the QR code
4. Expo Go understands `exp://` and will open the app

---

### Failure 6: Login prompt inside Metro crashes with AssertionError

**What you see in Metro terminal:**
```
AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:
  (username && password)
```

**Why this happens:** When you start Expo without being logged in, Metro shows an inline login prompt. This prompt has a bug in PowerShell — it captures keystrokes differently and the username or password ends up empty internally, even though you typed them correctly.

**How to fix:**
1. Press Ctrl+C to stop Metro completely
2. Run the login SEPARATELY first:
   ```powershell
   npx expo login
   ```
3. Enter username: `testvicha` and your password
4. Confirm it says "Logged in as testvicha"
5. Now restart Metro — it will NOT ask for login again:
   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.X.X"
   npx expo start --go --lan --port 8083 --clear
   ```

---

### Failure 7: "Port 8083 already in use"

**What you see:**
```
Error: listen EADDRINUSE: address already in use :::8083
```

**Why this happens:** A previous Metro session is still running in the background (perhaps you closed the terminal window without pressing Ctrl+C first). The port is still held by that process.

**How to fix (Option A — kill the process):**
```powershell
netstat -ano | findstr ":8083"
```
This shows something like:
```
TCP    0.0.0.0:8083    0.0.0.0:0    LISTENING    16112
```
The last number (16112) is the Process ID. Kill it:
```powershell
taskkill /PID 16112 /F
```
Then restart Metro.

**How to fix (Option B — use a different port):**
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.X.X"
npx expo start --go --lan --port 8084 --clear
```
(Also add a firewall rule for 8084 if you use this approach)

---

### Failure 8: App loads and logs in but Dashboard shows no sensor data

**What you see:** You can log in and see your devices, but the dashboard shows zeros or dashes for all readings. No live data appears.

**Why this happens:** The `protonest_device_id` in the database does not match the actual Protonest device ID. The backend tries to subscribe to `/topic/stream/WRONG_ID` and gets no data.

**How to verify and fix:**
```powershell
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT name, protonest_device_id, status FROM devices;"
```

If `protonest_device_id` shows `device123` (or anything other than `test123`):
```powershell
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "UPDATE devices SET protonest_device_id = 'test123' WHERE name = 'Desk';"
docker restart sda-backend
```

Then wait 10 seconds and shake phone → Reload.

---

### Failure 9: WebSocket shows "disconnected" in app

**What you see:** The app shows a "Disconnected" or "Offline" indicator. Live data stopped updating.

**Why this happens:** Either (a) the JWT auth token expired (7-day lifetime), or (b) the backend container restarted while the app was open, and the WebSocket connection was dropped.

**How to fix:**
- Shake phone → **Reload** — this reconnects the WebSocket with a fresh token
- Or log out and log back in

---

### Failure 10: expo-notifications error in Metro terminal

**What you see:**
```
ERROR expo-notifications: Android Push notifications (remote notifications) functionality
provided by expo-notifications was removed from Expo Go with the release of SDK 53.
Use a development build instead of Expo Go.
```

**Why this happens:** In Expo SDK 53, Expo removed push notification support from Expo Go for security reasons. The `expo-notifications` package in this project triggers this error when run in Expo Go.

**Impact:** NONE on functionality. The app still runs completely. Login, devices, sensor data, WebSocket — all work normally. Only push notifications (remote alerts sent from the backend to your phone) will not fire in Expo Go. This limitation is acceptable for development.

**You do not need to fix this.** It is a known, expected warning.

---

### Failure 11: "New Architecture is always enabled in Expo Go" warning

**What you see:**
```
WARN React Native's New Architecture is always enabled in Expo Go, but it is explicitly
disabled in your project's app config. This may lead to unexpected behavior.
```

**Why this happens:** `app.json` has `"newArchEnabled": false` because older versions of Expo Go did not support the New Architecture. But Expo Go SDK 54 (current) runs the New Architecture regardless of this setting. There is a conflict between the config and the runtime.

**Impact:** Usually harmless. The app runs correctly. If you see strange UI glitches (e.g., layouts that look wrong), this configuration conflict might be the cause.

**You do not need to fix this** for normal development use.

---

### Failure 12: sda-postgres container never reaches "healthy"

**What you see from `docker ps`:**
```
sda-postgres   Up 3 minutes (health: starting)
```
It stays on "starting" for a long time.

**Why this happens:** On the first ever `docker compose up`, Docker downloads the PostgreSQL image (about 80MB) before starting the container. On a slow internet connection this can take several minutes.

**How to fix:** Wait. Monitor progress with:
```powershell
docker compose logs db
```
You should eventually see:
```
database system is ready to accept connections
```
Once sda-postgres is `(healthy)`, sda-backend will start automatically.

---

### Failure 13: "The expected package.json path does not exist"

**What you see:**
```
ConfigError: The expected package.json path: C:\Windows\System32\package.json does not exist
```

**Why this happens:** PowerShell opened in `C:\Windows\System32` by default. You ran `npx expo start` without first changing to the project directory.

**How to fix:**
```powershell
cd C:\IIT\SDA-main\SmartDeskAssistant
npx expo start --go --lan --port 8083 --clear
```

---

### Failure 14: `--go` flag not recognized by Expo CLI

**What you see:**
```
Invalid option: --go
```

**Why this happens:** An older cached version of Expo CLI does not support `--go`. Newer versions added this flag.

**How to fix:**
```powershell
npx expo@latest start --go --lan --port 8083 --clear
```

Or update Expo CLI:
```powershell
npm install -g expo-cli
```

---

## PART 14 — Architecture Diagram: How Everything Connects

```
==============================================================================
                     SMART DESK ASSISTANT — FULL ARCHITECTURE
==============================================================================

[PHYSICAL HARDWARE — in your room]
┌─────────────────────────────────────────────────────────┐
│  Option A: Protonest Hardware (device ID: test123)       │
│    └─ sends data to Protonest Cloud every few seconds    │
│                                                          │
│  Option B: ESP32 DIY board (GPIO 27, 32, 35)             │
│    ├─ LDR sensor (light)                                 │
│    ├─ MIC sensor (noise)                                 │
│    └─ MQ-135 sensor (air quality)                       │
│       └─ HTTP POST to /api/ingest every 5 seconds        │
└─────────────────────────────────────────────────────────┘
          │                          │
          │ (via internet)           │ (via WiFi, local network)
          ▼                          │
[PROTONEST CLOUD]                    │
https://api.protonestconnect.co      │
  topics:                            │
  /topic/stream/test123/gas          │
  /topic/stream/test123/light        │
  /topic/stream/test123/noise        │
          │                          │
          │ REST API (every 5s)      │
          │ WebSocket (real-time)    │
          ▼                          ▼
==============================================================================
[YOUR WINDOWS PC — Docker Containers]

┌───────────────────────────────────────────────────────────────────────┐
│                        sda-backend (port 3000)                         │
│                     Node.js + Express + TypeScript                     │
│                                                                        │
│  Routes:                                                               │
│  /api/auth     → login, register                                       │
│  /api/devices  → CRUD for devices                                      │
│  /api/insights → AI-generated insights (Gemini every 2h)              │
│  /api/ingest   → receives data from ESP32 boards                       │
│  /api/protonest→ save/test Protonest credentials                       │
│  /api/thresholds→ alert thresholds per sensor                         │
│  /ws           → WebSocket server (pushes live data to phones)        │
│                                                                        │
│  Services:                                                             │
│  protonestSync → polls Protonest REST every 5 seconds                 │
│  websocketService → subscribes to Protonest WS, broadcasts to phones  │
└───────────────────────────┬──────────────────────────────┬────────────┘
                            │ reads/writes                  │ listens on
                            ▼                              ▼
┌──────────────────────────────────┐    ┌──────────────────────────────┐
│  sda-postgres (port 5433)         │    │  sda-pgadmin (port 5050)     │
│  PostgreSQL 16                    │    │  pgAdmin 4 web UI            │
│  Database: smart_desk_assistant   │    │  View/query the database     │
│  Tables:                          │    │  URL: http://localhost:5050   │
│  - users                          │    └──────────────────────────────┘
│  - devices                        │
│  - sensor_readings                │
│  - insights                       │
│  - thresholds                     │
│  - protonest_credentials          │
└──────────────────────────────────┘

==============================================================================
[METRO BUNDLER — also on your PC]

┌───────────────────────────────────────────────────────────────────────┐
│  Metro (port 8083)                                                     │
│  React Native / TypeScript bundler                                     │
│                                                                        │
│  - Compiles TypeScript → JavaScript bundle                             │
│  - Serves bundle to phones over WiFi                                   │
│  - Injects debuggerHost = "192.168.X.X:8083" into every bundle        │
│  - Handles hot reload (saves on PC → phone updates instantly)          │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ serves JS bundle
                            ▼ over WiFi
==============================================================================
[YOUR PHONE]

┌───────────────────────────────────────────────────────────────────────┐
│  Expo Go app                                                           │
│    ↓ scans QR code (exp://192.168.X.X:8083)                           │
│    ↓ downloads JS bundle from Metro                                    │
│    ↓ Expo injects: Constants.expoGoConfig.debuggerHost                │
│                    = "192.168.X.X:8083"                               │
│                                                                        │
│  config.ts runs:                                                       │
│    getDevServerHost() reads debuggerHost → extracts "192.168.X.X"    │
│    API_BASE_URL = "http://192.168.X.X:3000/api"                       │
│    WS_URL       = "ws://192.168.X.X:3000/ws"                         │
│                                                                        │
│  App makes calls to:                                                   │
│    http://192.168.X.X:3000/api/auth/login   → login/register         │
│    http://192.168.X.X:3000/api/devices      → your devices            │
│    http://192.168.X.X:3000/api/insights     → AI insights             │
│    ws://192.168.X.X:3000/ws                 → live sensor data        │
│                                                                        │
│  Dashboard shows: air quality, light level, noise level               │
│  Updating every few seconds in real time                               │
└───────────────────────────────────────────────────────────────────────┘

==============================================================================
KEY INSIGHT: The app has ZERO hardcoded IPs.
config.ts reads the IP from Metro's debuggerHost at runtime.
This means the SAME code works on ANY WiFi network without any code changes.
The ONLY thing you change between networks: REACT_NATIVE_PACKAGER_HOSTNAME
==============================================================================
```

---

## APPENDIX: Why the App Works on Any WiFi Without Code Changes

This is the most important design decision in the whole project and it's worth understanding.

The backend URL is NOT hardcoded in the app. Look at `SmartDeskAssistant/src/services/config.ts`:

```typescript
function getDevServerHost(): string {
  // On web browser: use the page hostname (always "localhost" in dev)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }

  // On phone in Expo Go: Metro injects the dev server IP into the app's metadata
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??    // SDK 49+ (current)
    (Constants as any).manifest?.debuggerHost; // older SDK fallback

  if (debuggerHost) {
    // debuggerHost = "192.168.X.X:8083"
    // We want just "192.168.X.X"
    const host = debuggerHost.split(':')[0];
    if (host) return host;
  }

  return 'localhost'; // last resort
}

export const API_BASE_URL = __DEV__
  ? `http://${getDevServerHost()}:3000/api`   // dev: auto-detected IP
  : 'http://savindi.autohubmarket.com/api';   // prod: hardcoded production URL
```

**The chain:**
1. You set `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.X.X` before starting Metro
2. Metro binds to that IP and announces: `exp://192.168.X.X:8083`
3. Phone scans QR → connects to `192.168.X.X:8083`
4. Metro injects into the app bundle: `debuggerHost = "192.168.X.X:8083"`
5. `config.ts` extracts `"192.168.X.X"` from that string
6. `API_BASE_URL` becomes `"http://192.168.X.X:3000/api"`
7. All API calls go to your Docker backend on port 3000

Move to a new WiFi network? New IP? Just update `REACT_NATIVE_PACKAGER_HOSTNAME`. Zero code changes.
