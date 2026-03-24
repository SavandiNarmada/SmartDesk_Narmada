# Smart Desk Assistant — Windows Deployment Guide
## IoT Engineer's Runbook: What Failed, Why, and How to Deploy Clean

> Generated from live debugging session on 2026-03-22.
> Covers the full stack: ESP32 → Protonest Connect → Backend (Docker) → React Native (Expo).

---

## ACCOUNTS & CREDENTIALS REQUIRED

Every account and secret you need. Copy this section before moving to a new machine.

### Accounts to Be Logged Into

| Account | Login | Where Used |
|---|---|---|
| **Expo / EAS** | Username: `devvicha` | `eas login` — required for EAS dev builds |
| **MQTT Connect (shared)** | Email: `pasindudeemantha2000@gmail.com` + password | Used as the **shared backend account**. Individual users in the app can enter any email — the backend automatically authenticates using this account via `MQTT_CONNECT_OVERRIDE_EMAIL` / `MQTT_CONNECT_OVERRIDE_PASSWORD` |
| **Google (Gemini AI)** | API Key: see `docker-compose.yml` `AI_API_KEY` | AI insights generation |

### Secrets Inside docker-compose.yml (Copy These Exactly)

| Secret | Current Value | What Breaks If Changed |
|---|---|---|
| `JWT_SECRET` | `smart_desk_assistant_docker_secret_change_me` | All users get logged out (tokens invalidate) |
| `PROTONEST_ENCRYPTION_KEY` | `docker_encryption_key_32_chars_!` | **Cannot decrypt stored Protonest password** — must re-enter credentials in app |
| `AI_API_KEY` | see docker-compose.yml | AI insights stop generating |
| `MQTT_CONNECT_OVERRIDE_EMAIL` | `pasindudeemantha2000@gmail.com` | The shared MQTT Connect account used for all API auth. If missing, the email typed by the user in the app is used directly — will fail for non-owner accounts |
| `MQTT_CONNECT_OVERRIDE_PASSWORD` | see docker-compose.yml | The shared account password. If missing, the password typed by the user is sent to the API — will fail for non-owner accounts |
| PostgreSQL password | `postgres123` | Must match `DATABASE_URL` |
| pgAdmin | `admin@smartdesk.com` / `admin123` | Local DB viewer only |

> ⚠️ **PROTONEST_ENCRYPTION_KEY is the most dangerous to change.** If it changes between machines, the encrypted Protonest password stored in PostgreSQL cannot be decrypted, and the sync service will silently fail. Copy the EXACT same 32-character string to every machine.

### Hardcoded IDs That Must Be Known

| Value | Location | Current Value |
|---|---|---|
| Protonest Device ID | DB → `devices.protonest_device_id` | **`test123`** (NOT `device123`) |
| EAS Project ID | `SmartDeskAssistant/app.json` | `213aa1d7-9e8f-4778-98bd-79cc50856652` |
| EAS Owner | `SmartDeskAssistant/app.json` | `devvicha` |
| Production backend domain | `src/services/config.ts:36,41` | `savindi.autohubmarket.com` |

---

## WHAT FAILED IN THIS SESSION (Root Cause Analysis)

### Issue 1 — Expo Go QR Code Not Working
**Time lost: ~30 minutes**

**Root cause:** Three active network interfaces on the Windows machine. Metro bundler picks the first active adapter — it picked the university VPN (`VichaNew`, IP `10.7.74.150`, domain suffix `ac.lk`) instead of the WiFi adapter (`192.168.1.8`). The QR code encoded the wrong IP, so the phone could not reach Metro.

| Adapter | IP | Status |
|---|---|---|
| VichaNew (University VPN) | 10.7.74.150 | Metro picked THIS ❌ |
| Wi-Fi | 192.168.1.8 | Should have been this ✅ |
| vEthernet (WSL Hyper-V) | 172.17.80.1 | Also confuses Metro ❌ |

**Fix applied:** Force Metro to use the correct WiFi IP via environment variable:
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8082
```

**Rule for every new machine:** Run `ipconfig` first. If VPN or WSL adapters are active, disconnect them or use `REACT_NATIVE_PACKAGER_HOSTNAME`.

---

### Issue 2 — newArchEnabled: true Broke Expo Go
**Time lost: ~20 minutes**

**Root cause:** `SmartDeskAssistant/app.json` had `"newArchEnabled": true`. This project uses React Native 0.81.5 and React 19.1.0 (New Architecture). Expo Go from the App Store does not support the New Architecture — QR scan failed silently or showed a blank screen.

**Fix applied:** `"newArchEnabled": false` in `app.json` line 9.

**Rule for new machines:** Keep `newArchEnabled: false` for Expo Go. Only set to `true` if building a full EAS Development Build (see Section 9).

---

### Issue 3 — Protonest Device ID Was a Placeholder (The Big One)
**Time lost: ~1.5 hours**

**Root cause:** When the device "Desk" was added to the app, the Protonest Device ID field was left as `device123` — a placeholder. The real device ID registered in the Protonest Connect dashboard is `test123`.

Every 5 seconds, the backend sync service polled:
```
POST https://api.protonestconnect.co/api/v1/user/get-stream-data/device
Body: { "deviceId": "device123" }
Response: {"status":"Error","data":"Invalid device"}
```

Simultaneously, the WebSocket connected to Protonest and subscribed to:
```
/topic/stream/device123   ← does not exist, Protonest never sent a message
```
Backend log showed: `msgs=0, silence=191s` — connected but dead.

**How the real ID was discovered:** Protonest has NO `/list-devices` endpoint. The only way to discover real device IDs is to call `/get-stream-data/user` (no `deviceId` required) which returns all recent data for the account. The response contained `"deviceId": "test123"`.

**Fix applied:**
```sql
UPDATE devices SET protonest_device_id = 'test123' WHERE protonest_device_id = 'device123';
```
Then `docker restart sda-backend` to reload the WebSocket subscription.

**Immediate result after fix:**
```
✅ Protonest WebSocket connected
📡 Subscribed to /topic/stream/test123
🔄 Sync: got 100 records for device ...
🔄 Sync: new data inserted ...
```

**Rule for new machines:** NEVER use a placeholder. Always verify the real device ID using the discovery command in Section 5.

---

### Issue 4 — Port 8081 Already in Use
**Time lost: ~10 minutes**

**Root cause:** A previous Expo process was backgrounded and still held port 8081. Starting Expo again in non-interactive mode failed with `"Port 8081 is being used by another process"` and exited.

**Fix:** Use `--port 8082` flag on every `expo start` command.

---

### Issue 5 — Security Vulnerability (express-rate-limit)

**Root cause:** `backend/package.json` had `express-rate-limit@8.2.1` with a HIGH-severity CVE flagged by Red Hat Dependency Analytics.

**Fix applied:** Updated to `^8.3.1` + ran `npm audit fix` → 0 vulnerabilities remaining.

---

## DATA FLOW ARCHITECTURE (Path B — Protonest)

```
ESP32 Firmware (Protonest MQTT firmware — separate from sketch_mar8a.ino)
    │
    │  Publishes MQTT topics every few seconds:
    │    deviceId/gas    → air quality value (ppm)
    │    deviceId/light  → light level (lux)
    │    deviceId/noise  → noise level (dB)
    │
    ▼
Protonest Connect Cloud
    │
    ├── WebSocket (real-time, live stream)
    │     URL: wss://api.protonestconnect.co/ws?token=<JWT>
    │     Backend subscribes: /topic/stream/test123
    │     Message format:
    │       { deviceId: "test123", topicSuffix: "gas",
    │         payload: '{"value":68.86,"unit":"ppm"}',
    │         timestamp: "2026-03-22T09:38:05Z" }
    │
    └── REST API (polling fallback, every 5 seconds)
          POST /api/v1/user/get-stream-data/device
          Body: { deviceId: "test123", startTime, endTime }
    │
    ▼
Backend Node.js (Docker container, port 3000)
    │
    ├── Saves to PostgreSQL → sensor_readings table
    │     Columns: air_quality, light_level, noise_level, temperature, humidity
    │
    ├── Broadcasts live updates → App via WebSocket (ws://HOST:3000/ws)
    │
    ├── Generates threshold insights (auto)
    └── Generates AI insights via Gemini (every 2 hours)
    │
    ▼
React Native App (Expo SDK 54)
    │
    └── WebSocket client connects to ws://{AUTO_DETECTED_IP}:3000/ws
        IP auto-detected from Expo's debuggerHost — no manual config needed
```

**Topic mapping (NO leading slash — this is critical):**
```
gas   → air_quality   column in sensor_readings
light → light_level   column in sensor_readings
noise → noise_level   column in sensor_readings
```

Controlled by `TOPIC_MAPPING` env var in `docker-compose.yml`.

---

## NEW WINDOWS MACHINE — STEP-BY-STEP DEPLOYMENT

### Prerequisites (Install These First)
- [ ] **Docker Desktop** — entire backend runs in Docker
- [ ] **Node.js v20+** — for Expo CLI and npm
- [ ] **Git** — to clone the repo
- [ ] **Expo Go** app on your phone — or build a dev APK via EAS (Section 9)
- [ ] **PowerShell** (built into Windows) — all commands below use PowerShell

---

### Step 1 — Clone the Repository
```powershell
git clone <repo-url> C:\IIT\SDA-main
cd C:\IIT\SDA-main
```

---

### Step 2 — Identify Your WiFi IP (Do This Before Anything Else)
```powershell
ipconfig
```

Find the **Wireless LAN adapter Wi-Fi** section. Note the `IPv4 Address` (e.g., `192.168.1.8`).

**Write this down** — you will need it in Step 7.

⚠️ **If you see a VPN adapter or university network adapter** (e.g., `VichaNew`, or any adapter with a `.ac.lk` or corporate domain suffix), disconnect it before running Expo. Metro will pick the VPN IP instead of WiFi.

⚠️ **WSL (vEthernet)** also interferes — it is safe to leave running but you MUST force the WiFi IP via `REACT_NATIVE_PACKAGER_HOSTNAME`.

---

### Step 3 — Open Windows Firewall Ports
Run **PowerShell as Administrator**:
```powershell
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="Expo Metro 8082" dir=in action=allow protocol=TCP localport=8082
netsh advfirewall firewall add rule name="SDA Backend 3000" dir=in action=allow protocol=TCP localport=3000
```

---

### Step 4 — Configure the Backend

```powershell
cd C:\IIT\SDA-main\backend
copy .env.example .env
```

Open `docker-compose.yml` and verify these values are set correctly before starting:

| Setting | Required Value | Notes |
|---|---|---|
| `JWT_SECRET` | Any secure string | Copy from current working machine to avoid invalidating user sessions |
| `PROTONEST_ENCRYPTION_KEY` | Exactly 32 characters | **Must be identical across all machines** |
| `AI_API_KEY` | Your Gemini API key | Leave empty to disable AI insights |
| `TOPIC_MAPPING` | `gas:air_quality,light:light_level,noise:noise_level,temperature:temperature,humidity:humidity` | Do not change unless firmware topics change |
| `PROTONEST_API_URL` | `https://api.protonestconnect.co/api/v1/user` | Do not change |
| `PROTONEST_WS_URL` | `wss://api.protonestconnect.co/ws` | Do not change |
| `TZ` | `Asia/Colombo` | Change if deploying in a different timezone |

---

### Step 5 — Start the Backend
```powershell
cd C:\IIT\SDA-main\backend
docker compose up -d --build
```

Wait ~30 seconds, then verify everything is healthy:
```powershell
docker ps
```

Expected output:
```
CONTAINER    IMAGE              STATUS          PORTS
sda-backend  backend-backend    Up X seconds    0.0.0.0:3000->3000/tcp
sda-postgres postgres:16-alpine Up X seconds (healthy)  0.0.0.0:5433->5432/tcp
sda-pgadmin  dpage/pgadmin4     Up X seconds    0.0.0.0:5050->80/tcp
```

Verify backend started cleanly:
```powershell
docker logs sda-backend --tail 20
```

Expected log lines:
```
✅ Database connection successful
⚡ WebSocket server started on /ws
🚀 Server is running on port 3000
🔄 Protonest sync service started (interval: 5s)
```

If you see `❌ Database connection failed`, PostgreSQL is not ready yet — wait 10 more seconds and retry.

---

### Step 6 — Install Frontend Dependencies
```powershell
cd C:\IIT\SDA-main\SmartDeskAssistant
npm install
```

---

### Step 7 — Start the Expo App

Replace `192.168.1.8` with **your WiFi IP from Step 2**:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8082
```

Wait for the QR code to appear in the terminal. Scan it with **Expo Go** on your phone. Your phone must be connected to the **same WiFi network** as your PC.

If port 8082 is also in use:
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.8"; npx expo start --lan --port 8083
```

---

### Step 8 — Register & Configure MQTT Connect in the App

1. Open the app → **Register** a new user account
2. Go to **Profile → S3 IoT Connect Setup**
3. Enter any display email and any password in the form:
   - Email: any email (e.g., your own email — stored for display only)
   - Password: any string (ignored at runtime — the backend uses the override credentials)
   - The backend authenticates using `MQTT_CONNECT_OVERRIDE_EMAIL` / `MQTT_CONNECT_OVERRIDE_PASSWORD` from `docker-compose.yml` automatically
4. Tap **Save / Connect** — the app will verify credentials with MQTT Connect
5. Go to **Devices → Add Device**
6. Fill in the form:
   - Device Name: anything (e.g., `Desk`)
   - Location: anything (e.g., `Home Office`)
   - **Protonest Device ID: `test123`** ← critical, must be exact
7. Save the device

---

### Step 9 — Verify the Real Protonest Device ID

After saving credentials (Step 8), confirm `test123` is correct by running this discovery command:

```powershell
# Get JWT from database
$JWT = docker exec sda-postgres psql -U postgres -d smart_desk_assistant -t -c "SELECT jwt_token FROM protonest_credentials LIMIT 1;"

# Call Protonest user stream endpoint (returns all data for this account)
docker exec sda-backend node -e "
const jwt = '$JWT'.trim();
fetch('https://api.protonestconnect.co/api/v1/user/get-stream-data/user', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt},
  body: JSON.stringify({startTime: new Date(Date.now()-3600000).toISOString(), endTime: new Date().toISOString(), pagination:'0', pageSize:'5'})
}).then(r=>r.json()).then(d=>d.data.forEach(r=>console.log('deviceId:', r.deviceId, 'topic:', r.topicSuffix)));
"
```

The `deviceId` printed is the real ID. If it differs from what you entered in Step 8, update it:
```powershell
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "UPDATE devices SET protonest_device_id = 'REAL_ID_HERE' WHERE name = 'Desk';"
docker restart sda-backend
```

---

### Step 10 — Verify Data Is Flowing

```powershell
docker logs sda-backend -f
```

Within ~10 seconds of the ESP32 device being active, you should see:
```
✅ Protonest WebSocket connected
📡 Subscribed to /topic/stream/test123
🔄 Sync: got N records for device ...
🔄 Sync: new data inserted ...
📡 REST sync broadcast for device ... (user: ...)
```

The app dashboard should now show live sensor readings.

---

## COMPLETE ENVIRONMENT VARIABLE REFERENCE

All `process.env` variables used in the backend codebase:

| Variable | Default Value | Required | Purpose |
|---|---|---|---|
| `PORT` | `3000` | No | HTTP + WebSocket server port |
| `NODE_ENV` | `production` | No | `development` shows full stack traces in errors |
| `DATABASE_URL` | `postgresql://postgres:postgres123@db:5432/smart_desk_assistant` | Yes (Docker) | Full DB connection string. Overrides all DB_* vars |
| `DB_HOST` | `localhost` | Yes (non-Docker) | PostgreSQL hostname |
| `DB_PORT` | `5432` | No | PostgreSQL port |
| `DB_USER` | `postgres` | No | PostgreSQL username |
| `DB_PASSWORD` | `` (empty) | Yes | PostgreSQL password |
| `DB_NAME` | `smart_desk_assistant` | No | PostgreSQL database name |
| `DB_SSL` | (unset) | No | Set to `true` for SSL connections (cloud deployments) |
| `JWT_SECRET` | `your_jwt_secret_key_change_this` | **Yes** | Signs all user JWT tokens. Must be consistent across restarts |
| `JWT_EXPIRES_IN` | `7d` | No | JWT token lifetime |
| `CORS_ORIGIN` | `*` | No | Comma-separated allowed origins. `*` allows all |
| `PROTONEST_API_URL` | `https://api.protonestconnect.co/api/v1/user` | No | Protonest REST API base URL |
| `PROTONEST_WS_URL` | `wss://api.protonestconnect.co/ws` | No | Protonest WebSocket URL |
| `PROTONEST_ENCRYPTION_KEY` | `default_32_char_encryption_key!!` | **Yes** | AES-256-CBC key for encrypting Protonest passwords. Must be 32 chars. Must be IDENTICAL across machines |
| `TOPIC_MAPPING` | `gas:air_quality,light:light_level,noise:noise_level,temperature:temperature,humidity:humidity` | No | Maps Protonest topic suffixes to DB columns. No leading slash |
| `AI_PROVIDER` | `gemini` | No | AI backend: `gemini` or `openai` |
| `MQTT_CONNECT_OVERRIDE_EMAIL` | `pasindudeemantha2000@gmail.com` | **Yes** | Shared MQTT Connect account email used for ALL API authentication. Individual user-typed emails are stored in DB for display only |
| `MQTT_CONNECT_OVERRIDE_PASSWORD` | (see docker-compose.yml) | **Yes** | Shared MQTT Connect account password. All authentication calls use this regardless of what users type in the app |
| `AI_API_KEY` | (your key) | No | Gemini or OpenAI API key. Leave empty to disable AI insights |
| `AI_INSIGHT_INTERVAL_HOURS` | `2` | No | Hours between AI insight generation runs |
| `NOTIFICATION_COOLDOWN_MINUTES` | `15` | No | Minutes between push notifications for the same sensor |
| `LDR_MAX_RAW` | `1024` | No | Max raw ADC value from light sensor for inversion calculation |

---

## FILES CHANGED IN THE 2026-03-22 SESSION

| File | Change Made | Reason |
|---|---|---|
| `SmartDeskAssistant/app.json:9` | `newArchEnabled: true → false` | Expo Go does not support React Native New Architecture |
| `SmartDeskAssistant/eas.json` | Created new file | EAS build profiles for development / preview / production |
| `SmartDeskAssistant/package.json` | Added `expo-dev-client` dependency | Required for EAS dev builds |
| `backend/package.json:24` | `express-rate-limit: ^8.2.1 → ^8.3.1` | HIGH severity CVE fix |
| `backend/package-lock.json` | Updated | Result of `npm audit fix` (0 vulnerabilities now) |
| **PostgreSQL DB** | `devices.protonest_device_id: 'device123' → 'test123'` | Wrong placeholder was blocking all Protonest data |

---

## FRONTEND: AUTOMATIC vs MANUAL CONFIG

| Config Item | Auto or Manual | Details |
|---|---|---|
| Backend IP address | **Automatic** | Extracted from `Constants.expoGoConfig?.debuggerHost` at runtime. No code change needed between machines. Source: `src/services/config.ts:14-26` |
| Backend port | **Hardcoded** | Port `3000`. Source: `src/services/config.ts:28` |
| WebSocket URL | **Automatic** | Same IP + port as API. Source: `src/services/config.ts:40` |
| Production API URL | **Hardcoded** | `http://savindi.autohubmarket.com/api`. Source: `config.ts:36` |
| Production WS URL | **Hardcoded** | `ws://savindi.autohubmarket.com/ws`. Source: `config.ts:41` |
| EAS Project ID | **Hardcoded** | `213aa1d7-9e8f-4778-98bd-79cc50856652`. Source: `app.json:43` |
| EAS Owner | **Hardcoded** | `devvicha`. Source: `app.json:46` |
| Push notification project | **Automatic** | Read from `Constants.expoConfig.extra.eas.projectId` at runtime |
| WebSocket reconnect | **Automatic** | App reconnects every 1.5 seconds if disconnected |

**The app requires ZERO code changes between machines.** Only the `REACT_NATIVE_PACKAGER_HOSTNAME` env var needs to match your local WiFi IP.

---

## BACKEND API ENDPOINTS REFERENCE

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/logout` | Yes | Logout |
| POST | `/api/auth/refresh` | No | Refresh JWT token |
| GET | `/api/devices` | Yes | List all devices with latest readings |
| POST | `/api/devices` | Yes | Add new device |
| PUT | `/api/devices/:id` | Yes | Update device (including protonestDeviceId) |
| DELETE | `/api/devices/:id` | Yes | Delete device |
| GET | `/api/devices/:id/readings` | Yes | Get sensor readings (time-filtered) |
| POST | `/api/ingest` | No (device_key) | ESP32 direct data submission |
| GET | `/api/ingest/key/:id` | Yes | Get device_key for Arduino firmware |
| POST | `/api/protonest/credentials` | Yes | Save Protonest email + password |
| GET | `/api/protonest/credentials` | Yes | Get Protonest connection status |
| DELETE | `/api/protonest/credentials` | Yes | Remove Protonest credentials |
| POST | `/api/protonest/test` | Yes | Test Protonest connection |
| POST | `/api/protonest/sync` | Yes | Force immediate sync |
| GET | `/api/insights` | Yes | List all insights |
| GET | `/api/insights/latest` | Yes | Most recent insight |
| POST | `/api/insights/ai-tips/:id` | Yes | Generate AI tip for device |
| GET | `/api/insights/reports` | Yes | Chart data (time-range + metric) |
| GET | `/api/thresholds` | Yes | Get sensor alert thresholds |
| PUT | `/api/thresholds` | Yes | Update thresholds |
| POST | `/api/thresholds/reset` | Yes | Reset to defaults |
| GET | `/api/user/profile` | Yes | Get user profile |
| PUT | `/api/user/profile` | Yes | Update profile |
| GET/PUT | `/api/user/settings` | Yes | Theme, units, notification preferences |
| POST | `/api/user/push-token` | Yes | Register Expo push token |

---

## PROTONEST API ENDPOINTS USED BY THE BACKEND

All calls go to base URL: `https://api.protonestconnect.co/api/v1/user`

| Method | Endpoint | Auth Header | Purpose |
|---|---|---|---|
| POST | `/get-token` | None | Get JWT with email + password |
| GET | `/get-new-token` | `X-Refresh-Token: <token>` | Refresh expired JWT |
| POST | `/get-stream-data/device` | Bearer JWT | Pull historical data for one device |
| POST | `/get-stream-data/user` | Bearer JWT | Pull all data for the account (**use this to discover device IDs**) |
| POST | `/get-stream-data/device/topic` | Bearer JWT | Pull historical data for one topic |
| POST | `/get-state-details/device` | Bearer JWT | Get current device state |

**There is NO `/list-devices` endpoint.** Use `/get-stream-data/user` to discover device IDs.

---

## QUICK DIAGNOSTIC COMMANDS

```powershell
# Check all Docker containers are running and healthy
docker ps

# Stream live backend logs
docker logs sda-backend -f

# Check recent sensor readings (last 5)
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT device_id, timestamp, air_quality, light_level, noise_level FROM sensor_readings ORDER BY timestamp DESC LIMIT 5;"

# Check device Protonest IDs
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT id, name, protonest_device_id, status FROM devices;"

# Check Protonest credentials and token expiry
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT protonest_email, jwt_expires_at, refresh_token IS NOT NULL as has_refresh FROM protonest_credentials;"

# Check all users registered
docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT id, full_name, email, created_at FROM users;"

# Test backend is reachable
curl http://localhost:3000/health

# Find your WiFi IP (look for Wi-Fi adapter section)
ipconfig

# Kill a process on a specific port (run as Admin)
netstat -ano | findstr ":8081"
# Then: taskkill /PID <pid> /F  (in cmd.exe, not PowerShell)

# Restart backend after DB changes
docker restart sda-backend

# Rebuild and restart everything from scratch
docker compose -f C:\IIT\SDA-main\backend\docker-compose.yml down
docker compose -f C:\IIT\SDA-main\backend\docker-compose.yml up -d --build
```

---

## KNOWN GOTCHAS (Ranked by Time Wasted)

### 1. Wrong Protonest Device ID ← Most Dangerous
The `protonest_device_id` field in the `devices` table must exactly match the device name registered in Protonest Connect. There is no validation — a wrong ID fails silently every 5 seconds. Use the `/get-stream-data/user` discovery call to verify before entering an ID in the app.

### 2. VPN / Multiple Network Adapters Break Metro
Metro picks the first active network adapter. University VPNs, corporate adapters, and WSL virtual adapters all have lower indices than WiFi on most Windows machines. Always set `REACT_NATIVE_PACKAGER_HOSTNAME` explicitly.

### 3. PROTONEST_ENCRYPTION_KEY Must Match Across Machines
The key is used to AES-256 encrypt the Protonest password before storing in PostgreSQL. If the key changes, existing credentials in the DB cannot be decrypted. The sync service re-auth will fail silently. Copy the exact same key string from machine to machine.

### 4. newArchEnabled Must Be false for Expo Go
`app.json` had this as `true`. Expo Go does not support React Native New Architecture. The app would fail to load with no useful error message. Only set `true` if building a dev build via EAS.

### 5. Topic Suffixes Have NO Leading Slash
The Protonest WebSocket messages use `topicSuffix: "gas"` not `topicSuffix: "/gas"`. The `TOPIC_MAPPING` env var and the code `getTopicMapping()` function both split on `,` then `:` — a leading slash would cause lookup failure and all sensor readings would be silently ignored.

### 6. docker restart Required After Device ID Change
The WebSocket service caches the `deviceId → protonestDeviceId` map at startup. Changing the DB record has no effect until the backend restarts and reconnects the Protonest WebSocket subscription.

### 7. Port 8081 Conflict
If a previous Expo session is backgrounded, port 8081 is held. Expo in non-interactive mode cannot prompt to switch ports — it just exits. Use `--port 8082` (or 8083) as default.

### 8. EAS Login Tied to devvicha Account
EAS build commands require being logged in to the `devvicha` Expo account. On a new machine run `eas login` before any `eas build` command.

### 9. AI Insights Silently Disabled Without API Key
If `AI_API_KEY` is empty or wrong, the AI insight service fails quietly — no error in logs, just no AI tips generated. Threshold-based insights still work.

### 10. Rate Limits on Auth Endpoints
The backend has a strict rate limiter: 5 requests per 15 minutes on auth endpoints per IP. If you're testing register/login rapidly, you will hit this and get 429 errors. Wait 15 minutes or restart the backend container to reset.

---

## DATABASE SCHEMA OVERVIEW

Tables created automatically by `database/schema.sql` on first Docker startup:

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | App user accounts | id, full_name, email, password_hash |
| `devices` | Registered sensor devices | id, user_id, name, type, location, status, **protonest_device_id**, device_key |
| `sensor_readings` | All sensor data | id, device_id, timestamp, air_quality, light_level, noise_level, temperature, humidity |
| `insights` | AI + threshold alerts | id, device_id, type, title, description, severity, source |
| `sessions` | JWT refresh tokens | id, user_id, refresh_token, expires_at |
| `user_settings` | Theme, units, notifications | id, user_id, theme, units, notifications_enabled |
| `protonest_credentials` | Protonest auth per user | id, user_id, protonest_email, protonest_secret_key, jwt_token, refresh_token, jwt_expires_at |
| `sensor_thresholds` | Alert threshold customization | id, user_id, aqi/light/noise/temp/humidity ranges + offsets |
| `push_tokens` | Expo push notification tokens | id, user_id, expo_push_token |
| `notification_log` | Cooldown tracking for alerts | id, user_id, device_id, sensor_type, sent_at |

The schema auto-runs on first container startup. Re-running `docker compose up` on an existing volume does NOT re-run the schema (data is preserved).

---

## ROOM CONDITION SCORING (How the Dashboard Score Works)

The overall room condition score (0–100) shown in the app is a weighted average:

| Sensor | Weight | Good Range |
|---|---|---|
| Air Quality (AQI) | 30% | ≤ 50 (Excellent), ≤ 100 (Good) |
| Noise Level | 25% | ≤ 35 dB (Quiet), ≤ 50 dB (Moderate) |
| Light Level | 20% | 300–500 lux (Good), > 2000 lux (Bright) |
| Temperature | 15% | 20–26°C (Comfortable) |
| Humidity | 10% | 40–60% (Comfortable) |

Score thresholds: 80+ Excellent, 60–79 Good, 40–59 Moderate, 20–39 Poor, <20 Bad.

Custom offsets per sensor can be set in the app (Profile → Threshold Settings) to calibrate for sensor placement.

---

## EAS DEV BUILD (When Expo Go Stops Working)

If a future Expo SDK update drops Expo Go support:

```powershell
cd C:\IIT\SDA-main\SmartDeskAssistant

# Log in to the devvicha Expo account
eas login

# Build Android APK (~15 minutes, runs in Expo cloud)
eas build --profile development --platform android

# After build completes, download and install the APK on your phone
# Then start Metro with:
$env:REACT_NATIVE_PACKAGER_HOSTNAME="<YOUR_WIFI_IP>"; npx expo start --dev-client --lan --port 8082
```

The `eas.json` file is already configured with `development`, `preview`, and `production` profiles. The `development` profile builds with `developmentClient: true` and outputs an APK (not AAB) for direct installation.

---

## SENSOR CONVERSION CONSTANTS (ESP32 Direct Ingest)

If using Path A (ESP32 → backend HTTP directly via `device_key`) instead of Protonest:

| Sensor | Input | Output | Conversion |
|---|---|---|---|
| LDR (light) | Digital 0 or 1 | Lux | 0 = bright (800 lux), 1 = dark (20 lux) |
| MIC (noise) | Analog 0–4095 | dB | 0 → 30 dB, 4095 → 100 dB (linear) |
| MQ-135 (gas) | Analog 0–4095 | AQI | 0 → 0 AQI, 4095 → 300 AQI (linear) |

The Arduino device key is generated automatically when a device is created. Get it from: **App → Device → Settings → Arduino Device Key**.
