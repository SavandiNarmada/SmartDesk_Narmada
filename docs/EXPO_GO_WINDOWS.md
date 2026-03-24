# Expo Go on Windows — Android & iOS QR Setup
## Smart Desk Assistant — Cross-Platform Engineer's Guide

> **Situation:** Docker backend is healthy. Browser (web) works fine.
> Expo Go QR scanning fails on Windows because Metro advertises the wrong IP.
> The app code is perfectly cross-platform — **zero code changes needed**.
> Your confirmed WiFi IP: `192.168.1.8`

---

## WHY IT FAILS — THE EXACT MECHANISM

### The Windows Multiple-Adapter Problem

```
Windows has 3 active network adapters:
  ├── VichaNew (University VPN)  → 10.7.74.150   ← Metro picks THIS first ❌
  ├── Wi-Fi                      → 192.168.1.8   ← Should pick this ✅
  └── vEthernet (WSL Hyper-V)   → 172.17.80.1   ← Also confuses Metro ❌

What happens:
  Metro starts → picks VPN adapter (first in list)
  → QR encodes: exp://10.7.74.150:8082
  → Phone scans QR → tries to reach 10.7.74.150
  → Phone is NOT on the university VPN
  → CONNECTION FAILS
```

### Why the Browser Works But the Phone Doesn't

`SmartDeskAssistant/src/services/config.ts` line 10:

```typescript
function getDevServerHost(): string {
  // Web browser path — completely different from mobile
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;   // → always returns "localhost"
  }

  // Mobile (Expo Go): reads IP injected by Metro into the app
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??        // SDK 49+ (current)
    (Constants as any).manifest?.debuggerHost;     // older SDK fallback

  if (debuggerHost) {
    // "192.168.1.8:8082" → "192.168.1.8"
    const host = debuggerHost.split(':')[0];
    if (host) return host;
  }

  return 'localhost'; // last resort fallback
}
```

**Browser:** uses `window.location.hostname` = `"localhost"` → always works locally, no network needed.
**Phone:** reads `debuggerHost` injected by Metro → if Metro picked VPN IP, this is wrong → backend unreachable.

### The Single Fix

```
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.8
```

This one environment variable overrides Metro's network adapter selection. **Everything else auto-corrects downstream:**

```
REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.8"
    ↓
Metro binds to 192.168.1.8:8082
    ↓
QR encodes: exp://192.168.1.8:8082
    ↓
Phone scans → connects to 192.168.1.8:8082 ✅ (phone is on 192.168.1.x WiFi)
    ↓
Metro injects: debuggerHost = "192.168.1.8:8082"
    ↓
config.ts extracts: "192.168.1.8"
    ↓
API_BASE_URL = "http://192.168.1.8:3000/api"   ✅ (Docker maps 0.0.0.0:3000)
WS_URL       = "ws://192.168.1.8:3000/ws"      ✅
    ↓
Full app works: login, devices, live sensor data, WebSocket
```

---

## PRE-FLIGHT CHECKLIST

Run these **every time** before starting Expo:

```powershell
# 1. Verify Docker backend is running
docker ps
# Required: sda-backend (Up), sda-postgres (healthy)

# 2. Confirm your WiFi IP is still 192.168.1.8
ipconfig | findstr /C:"192.168"
# If IP changed (different router/network), update REACT_NATIVE_PACKAGER_HOSTNAME

# 3. Check port 8082 is free
netstat -ano | findstr ":8082"
# Must return nothing. If occupied, use --port 8083

# 4. One-time: open Windows Firewall ports (run PowerShell as Admin)
netsh advfirewall firewall add rule name="Expo Metro 8082" dir=in action=allow protocol=TCP localport=8082
netsh advfirewall firewall add rule name="SDA Backend 3000" dir=in action=allow protocol=TCP localport=3000
```

---

## THE START COMMAND (Windows PowerShell)

```powershell
cd "C:\IIT\SDA-main\SmartDeskAssistant"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8082
```

**After ~10 seconds, the terminal shows:**
```
› Metro waiting on exp://192.168.1.8:8082
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

> ⚠️ If the IP shown is **not** `192.168.1.8` — stop (`Ctrl+C`), disconnect VPN, and rerun the command.

---

## ANDROID — STEP BY STEP

### What You Need
- Android phone connected to the **same WiFi** as your PC (`192.168.1.x` network)
- **Expo Go** app installed from Google Play Store

### Steps
1. Open **Expo Go** on Android
2. Tap the **Scan QR Code** button (home tab, camera icon top-right)
3. Point at the QR code displayed in your PowerShell terminal
4. Wait ~20–30 seconds for the JavaScript bundle to download over WiFi
5. App loads → Register a new account → Login → navigate to Devices

### Verify It Worked

**PowerShell Metro window shows:**
```
 BUNDLE  ./index.ts
 LOG     Running "SmartDeskAssistant" with {"rootTag":...}
```

**Backend logs show (`docker logs sda-backend -f`):**
```
📱 App connected via WebSocket (user: <userId>)
🔌 Connecting to Protonest WebSocket for user ...
✅ Protonest WebSocket connected
📡 Subscribed to /topic/stream/test123
🔄 Sync: got N records for device ...
```

**App shows:** Live sensor readings on the Device Dashboard (air quality, light, noise levels updating in real time).

---

## iOS — STEP BY STEP

### What You Need
- iPhone connected to the **same WiFi** as your PC (`192.168.1.x` network)
- **Expo Go** app installed from the App Store (search "Expo Go" by Expo Project Inc.)

### Method A — iOS Camera App (Recommended)
1. Open the default iPhone **Camera** app
2. Point at the QR code in your terminal — hold steady 2–3 seconds
3. A notification banner appears at the top: **"Open in Expo Go"**
4. Tap the banner → Expo Go opens and loads the app automatically

### Method B — Expo Go Direct
1. Open **Expo Go** on iPhone
2. Tap the **camera icon** or **"Scan QR Code"** on the Projects tab
3. Point at the QR code
4. App loads

### iOS-Specific Notes

| Situation | What To Do |
|---|---|
| Banner appears but tapping does nothing | Use Method B (Expo Go direct scan) |
| "Something went wrong" immediately | Check iPhone WiFi — must be on `192.168.1.x`, not mobile data |
| Push notification prompt appears | Tap **Allow** — needed for threshold alerts |
| App loads but shows no data | Shake phone → **Reload** to restart the JS bundle |
| Camera doesn't recognize QR | Ensure good lighting, hold phone 20–30 cm from screen |

### iOS vs Android Expo Go Differences

| Feature | Android Expo Go | iOS Expo Go |
|---|---|---|
| QR scanning | Built into Expo Go | Camera app or Expo Go |
| Push notifications (dev) | Works immediately | Requires physical device + EAS project ID configured |
| Hot reload (shake → Reload) | ✅ | ✅ |
| WebSocket live data | ✅ Full | ✅ Full |
| Fast Refresh on save | ✅ | ✅ |
| Background fetch | ✅ | Limited by iOS policies |

---

## FULL END-TO-END FLOW DIAGRAM

```
Windows PowerShell
  ─────────────────────────────────────────────────────
  cd C:\IIT\SDA-main\SmartDeskAssistant
  $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"
  npx expo start --lan --port 8082
  ─────────────────────────────────────────────────────
         │
         ▼
  Metro Bundler (bound to 192.168.1.8:8082)
  QR code: exp://192.168.1.8:8082
         │
         ├─────── Android: Expo Go → Scan QR ──────────┐
         └─────── iOS: Camera app → "Open in Expo Go" ─┤
                                                        │
                                                        ▼
                                         Phone → 192.168.1.8:8082
                                         Downloads JS bundle (~20s)
                                                        │
                                         Expo injects metadata:
                                         debuggerHost = "192.168.1.8:8082"
                                                        │
                                                        ▼
                                    config.ts / getDevServerHost()
                                    host = "192.168.1.8:8082".split(':')[0]
                                         = "192.168.1.8"
                                                        │
                                         ┌──────────────┴──────────────┐
                                         ▼                             ▼
                              API_BASE_URL =                     WS_URL =
                       http://192.168.1.8:3000/api        ws://192.168.1.8:3000/ws
                                         │                             │
                                         └──────────────┬──────────────┘
                                                        ▼
                                            Docker backend (sda-backend)
                                            Listening 0.0.0.0:3000
                                            Accessible at 192.168.1.8:3000 ✅
                                                        │
                                         ┌──────────────┴──────────────┐
                                         ▼                             ▼
                                  REST API calls              WebSocket /ws
                                (login, register,          Live sensor data from
                                 devices, insights)          Protonest (test123)
                                         │                             │
                                         ▼                             ▼
                                    PostgreSQL                  App Dashboard
                                    sda-postgres              Real-time readings
```

---

## TROUBLESHOOTING — SPECIFIC ERRORS

### ❌ "Network request failed" on login screen
**Cause:** Phone reached Metro (bundle loaded) but can't reach backend port 3000.
**Fix:** Add firewall rule (run PowerShell as Admin):
```powershell
netsh advfirewall firewall add rule name="SDA Backend 3000" dir=in action=allow protocol=TCP localport=3000
```
Then shake phone → **Reload**.

### ❌ Terminal shows wrong IP (not 192.168.1.8)
**Cause:** VPN adapter was picked by Metro instead of WiFi.
**Fix:**
```powershell
# Stop Metro (Ctrl+C), then:
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8082
```

### ❌ "Port 8082 already in use"
**Cause:** Previous Expo session is still holding the port.
**Fix:**
```powershell
netstat -ano | findstr ":8082"
# Note the PID, then in cmd.exe:
cmd /c "taskkill /PID <PID_HERE> /F"
# OR just use a different port:
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8083
```

### ❌ Expo Go shows "Something went wrong" immediately after QR scan
Check in order:
1. **Phone WiFi**: Settings → WiFi → must show IP `192.168.1.x` (not mobile data)
2. **app.json**: `"newArchEnabled"` must be `false` (line 9)
3. **Metro terminal**: look for red error output
4. **npm install**: run `npm install` in SmartDeskAssistant/ if dependencies changed

### ❌ iOS "Open in Expo Go" banner appears but tapping does nothing
**Fix:** Switch to Method B — open Expo Go app directly → Scan QR Code button.

### ❌ App loads and logs in but Dashboard shows no sensor data
**Cause:** Protonest device ID mismatch in database.
**Fix:**
```powershell
# Check the device ID
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT name, protonest_device_id, status FROM devices;"

# If protonest_device_id is 'device123', fix it:
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "UPDATE devices SET protonest_device_id = 'test123' WHERE name = 'Desk';"
docker restart sda-backend
```

### ❌ "SDK version mismatch" in Expo Go
**Cause:** Expo Go app on phone is outdated and doesn't support SDK 54.
**Fix:** Update Expo Go to latest version from Play Store / App Store.
If still fails → use EAS Dev Build (see section below).

### ❌ WebSocket shows "disconnected" in app
**Cause:** App's auth token expired, or backend restarted while app was open.
**Fix:** Shake phone → **Reload** to reconnect. Or log out and back in.

---

## IF EXPO GO KEEPS FAILING — EAS DEV BUILD

A Development Build is your own custom version of Expo Go locked to SDK 54. No SDK compatibility issues.

```powershell
cd "C:\IIT\SDA-main\SmartDeskAssistant"

# Step 1: Login to devvicha Expo account
eas login
# Enter: devvicha credentials

# Step 2: Build Android APK in Expo cloud (~15 minutes)
eas build --profile development --platform android
# When done: terminal shows a download URL for the APK

# Step 3: Install APK on Android phone
# (download from the link, transfer via USB or share link to phone)

# Step 4: Start Metro for dev client
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --dev-client --lan --port 8082

# Step 5: Open the installed dev client app on phone → scan QR
```

> For iOS dev build: `eas build --profile development --platform ios`
> Requires Apple Developer account membership ($99/year).

---

## SESSION STARTUP — QUICK REFERENCE

Copy and paste every time you start a new dev session:

```powershell
# ════════════════════════════════════════════
# STEP 1: Start/verify backend
# ════════════════════════════════════════════
cd "C:\IIT\SDA-main\backend"
docker compose up -d
docker ps
# Wait for sda-postgres to show (healthy)

# ════════════════════════════════════════════
# STEP 2: Start Expo (use YOUR WiFi IP)
# ════════════════════════════════════════════
cd "C:\IIT\SDA-main\SmartDeskAssistant"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8082

# ════════════════════════════════════════════
# MONITORING (run in a separate terminal)
# ════════════════════════════════════════════
docker logs sda-backend -f

# ════════════════════════════════════════════
# IF IP CHANGED (different network/router)
# ════════════════════════════════════════════
ipconfig | findstr /C:"192.168"
# Update 192.168.1.8 → new IP in the expo start command

# ════════════════════════════════════════════
# VERIFY SENSOR DATA IS FLOWING
# ════════════════════════════════════════════
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT timestamp, air_quality, light_level, noise_level FROM sensor_readings ORDER BY timestamp DESC LIMIT 5;"
```

---

## KEY FILES FOR THIS Feature

| File | Role | Critical Lines |
|---|---|---|
| `SmartDeskAssistant/src/services/config.ts` | IP auto-detection, API/WS URL construction | 8-41 |
| `SmartDeskAssistant/src/context/RealtimeContext.tsx` | WebSocket connection + reconnect logic | 68-155 |
| `SmartDeskAssistant/src/services/apiClient.ts` | HTTP client using auto-detected base URL | 1-156 |
| `SmartDeskAssistant/app.json` | `newArchEnabled: false` must stay false for Expo Go | line 9 |
| `SmartDeskAssistant/eas.json` | EAS build profiles for dev build fallback | — |
