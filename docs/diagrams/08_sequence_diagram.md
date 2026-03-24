# 08 — Sequence Diagram
## Smart Desk Assistant (SDA)

### Purpose
Sequence diagrams show **how objects interact over time** in a specific scenario. They make explicit the order of messages, the components involved, and the data exchanged. Four key scenarios are documented below.

---

## Sequence 1: Device First-Time WiFi Provisioning

**Scenario:** An installer sets up a new ESP32-S3 sensor node for the first time.

```mermaid
sequenceDiagram
    actor Installer
    participant FW as ESP32-S3 Firmware
    participant NVS as NVS Flash
    participant AP as Provisioning AP<br/>(192.168.4.1)
    participant Router as Wi-Fi Router

    Note over FW: Device powered on (first boot)

    FW->>NVS: wifi_load_credentials()
    NVS-->>FW: false (no credentials found)

    FW->>AP: start_provisioning()<br/>Open AP "ESP32S3-Setup"
    Note over AP: HTTP server starts on port 80

    Installer->>AP: Connect phone to "ESP32S3-Setup"
    Installer->>AP: GET http://192.168.4.1
    AP-->>Installer: HTML WiFi setup form

    Installer->>AP: POST /save<br/>ssid=MyNetwork&password=mypass
    AP->>NVS: wifi_save_credentials("MyNetwork","mypass")
    AP-->>Installer: "Saved! Device restarting..."

    Note over FW: esp_restart() after 800 ms

    FW->>NVS: wifi_load_credentials()
    NVS-->>FW: ssid="MyNetwork", pass="mypass"

    FW->>Router: wifi_init_sta("MyNetwork","mypass")<br/>WIFI_MODE_STA
    Router-->>FW: IP assigned (e.g. 192.168.1.42)

    Note over FW: MQTT publisher starts
```

---

## Sequence 2: Sensor Data — Full End-to-End Flow (REST Sync Path)

**Scenario:** ESP32-S3 publishes sensor data; backend syncs via REST polling and distributes to mobile app.

```mermaid
sequenceDiagram
    participant FW as ESP32-S3 Firmware
    participant BROKER as MQTT Connect<br/>Broker
    participant SYNC as Backend<br/>Sync Service
    participant DB as PostgreSQL
    participant WS as Backend<br/>WebSocket Server
    participant APP as Mobile App<br/>(React Native)
    participant PUSH as Expo Push<br/>Service
    actor User

    Note over FW: publish_task() fires every 5 s

    FW->>BROKER: MQTT PUBLISH<br/>protonest/<id>/stream/gas<br/>{"value":145.20,"unit":"ppm"}
    FW->>BROKER: MQTT PUBLISH<br/>protonest/<id>/stream/noise<br/>{"value":58.30,"unit":"dB"}
    FW->>BROKER: MQTT PUBLISH<br/>protonest/<id>/stream/light<br/>{"value":310.50,"unit":"lux"}

    Note over SYNC: Sync timer fires (5 s interval)

    SYNC->>DB: SELECT protonest_credentials WHERE user_id=...
    DB-->>SYNC: credentials (encrypted secret)

    SYNC->>SYNC: ensureValidToken()<br/>decrypt secret, call /get-token if expired
    SYNC->>BROKER: POST /get-stream-data/device<br/>{"deviceId":"...", "startTime":"...", ...}
    BROKER-->>SYNC: { data: [ {topicSuffix:"gas", payload:..., timestamp:...}, ... ] }

    Note over SYNC: Group into 5 s windows, deduplicate

    SYNC->>DB: INSERT sensor_readings<br/>(air_quality, light_level, noise_level, timestamp)
    SYNC->>DB: UPDATE devices SET status='online'

    SYNC->>WS: publishRealtimeUpdate(userId, deviceId, patch)
    WS->>APP: WebSocket message<br/>{"type":"sensor_reading","data":{...}}
    APP->>User: Dashboard gauges update in real time

    Note over SYNC: generateAutoInsights()
    SYNC->>DB: SELECT sensor_thresholds WHERE user_id=...
    DB-->>SYNC: user threshold bands

    alt AQI 145 exceeds user moderate_max (150)
        SYNC->>DB: INSERT insights (type=air_quality, severity=warning)
        SYNC->>DB: SELECT push_tokens WHERE user_id=...
        DB-->>SYNC: [ExponentPushToken[xxx]]
        SYNC->>PUSH: POST /push/send<br/>{"to":"...","title":"Air Quality Warning",...}
        PUSH->>User: Push notification delivered
    end
```

---

## Sequence 3: Real-Time WebSocket Path (Live Sensor Updates)

**Scenario:** Mobile app connects via WebSocket; sensor data arrives in real time via MQTT Connect WebSocket bridge.

```mermaid
sequenceDiagram
    participant APP as Mobile App
    participant WS_SERVER as Backend WebSocket<br/>Server (/ws)
    participant RT as Realtime Sensor<br/>Service
    participant MQTTWS as MQTT Connect<br/>WebSocket
    participant BROKER as MQTT Connect<br/>Broker
    participant FW as ESP32-S3 Firmware
    actor User

    APP->>WS_SERVER: WS CONNECT ws://backend/ws?token=<JWT>
    WS_SERVER->>WS_SERVER: jwt.verify(token)<br/>extract userId
    WS_SERVER-->>APP: {"type":"connected","message":"Real-time updates active"}

    WS_SERVER->>RT: getCachedRealtimeSnapshotsForUser(userId)
    RT-->>WS_SERVER: [cached snapshots]
    WS_SERVER-->>APP: Cached sensor readings (immediate display)

    WS_SERVER->>MQTTWS: connectMQTTConnectForUser(userId)<br/>WSS connect wss://api.protonestconnect.co/ws?token=<jwt>
    MQTTWS-->>WS_SERVER: WS OPEN

    WS_SERVER->>MQTTWS: {"type":"subscribe","channel":"/topic/stream/<deviceId>"}
    Note over MQTTWS: Subscribed to live stream

    APP->>WS_SERVER: {"type":"subscribe","deviceIds":["uuid-1"]}
    WS_SERVER-->>APP: {"type":"subscribed","deviceIds":["uuid-1"]}

    Note over FW: Sensor publish fires (5 s)
    FW->>BROKER: MQTTS PUBLISH stream/gas {"value":145}
    BROKER->>MQTTWS: WebSocket message<br/>{"deviceId":"...","topicSuffix":"gas","payload":"{\"value\":145}"}

    MQTTWS->>WS_SERVER: message event
    WS_SERVER->>WS_SERVER: Parse payload → field="airQuality", val=145
    WS_SERVER->>RT: publishRealtimeUpdate({userId, deviceId, patch:{airQuality:145}})
    RT->>RT: mergeSnapshot(existing, {airQuality:145})<br/>Persist to DB (deferred)
    RT-->>WS_SERVER: broadcast callback

    WS_SERVER-->>APP: {"type":"sensor_reading","deviceId":"...","data":{...},"timestamp":"..."}
    APP->>User: AQI gauge animates to 145

    Note over WS_SERVER: Keepalive ping every 20 s
    WS_SERVER->>MQTTWS: WebSocket PING
    MQTTWS-->>WS_SERVER: WebSocket PONG
```

---

## Sequence 4: AI Workspace Insight Generation

**Scenario:** User taps "Get AI Insight" in the Insights screen.

```mermaid
sequenceDiagram
    actor User
    participant APP as Mobile App
    participant API as Backend REST API<br/>/api/insights
    participant DB as PostgreSQL
    participant AI as AI Insights Service
    participant GEMINI as Google Gemini API

    User->>APP: Tap "Get AI Insight"
    APP->>API: GET /api/insights/<deviceId>/ai
    API->>API: JWT auth middleware → userId

    API->>DB: SELECT insights WHERE device_id=? AND source='ai'<br/>AND timestamp >= (now - 2h) LIMIT 1
    alt Cooldown active (recent AI insight exists)
        DB-->>API: existing insight row
        API-->>APP: 200 OK { data: existing_insight }
        APP->>User: Display cached AI insight
    else No recent AI insight (or forceRefresh=true)
        DB-->>API: empty result

        API->>DB: SELECT name, location FROM devices WHERE id=?
        DB-->>API: device info

        API->>DB: SELECT * FROM sensor_readings WHERE device_id=?<br/>ORDER BY timestamp DESC LIMIT 10
        DB-->>API: last 10 readings

        API->>AI: generateAIInsight(deviceId)
        AI->>AI: Build prompt:<br/>"AQI: 145, Noise: 58 dB, Light: 310 lux,<br/>afternoon session, AQI rising +12 trend..."

        AI->>GEMINI: POST /generateContent<br/>{ contents:[{parts:[{text:prompt}]}],<br/>responseMimeType:"application/json" }
        GEMINI-->>AI: { candidates:[{content:{parts:[{text:json_string}]}}] }

        AI->>AI: Parse JSON:<br/>{ title, description, severity, actions }
        AI->>DB: INSERT insights (type='ai_recommendation', source='ai', ...)
        DB-->>AI: inserted row

        AI-->>API: insight object
        API-->>APP: 200 OK { data: insight }
        APP->>User: Display AI insight card with<br/>title, description, action buttons
    end
```

---

## Sequence 5: User Registration and First Login

```mermaid
sequenceDiagram
    actor User
    participant APP as Mobile App
    participant API as Backend /api/auth

    User->>APP: Enter name, email, password → Tap Register

    APP->>API: POST /api/auth/register<br/>{ full_name, email, password }

    API->>API: Validate input (email format, password length)
    API->>API: bcrypt.hash(password, 12)
    API->>API: Generate UUID for user
    API->>API: INSERT users (id, email, password_hash, full_name)
    API->>API: INSERT user_settings (defaults: theme=light, units=metric)
    API->>API: INSERT sensor_thresholds (all default values)
    API->>API: jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' })
    API->>API: jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '30d' })
    API->>API: INSERT sessions (user_id, refresh_token, expires_at)

    API-->>APP: 201 Created<br/>{ success:true, data:{ user, token, refreshToken } }

    APP->>APP: Store token in AsyncStorage
    APP->>APP: AuthContext.login(user, token)
    APP->>APP: Navigate to Main (Devices tab)

    User->>APP: View empty devices list
    User->>APP: Navigate to Profile → MQTT Connect
    User->>APP: Enter MQTT Connect email + password → Save & Verify
    APP->>API: POST /api/mqtt-connect/credentials<br/>{ email, password }
    API->>API: Call MQTT Connect /get-token
    API->>API: Encrypt password (AES-256-CBC)
    API->>API: Store mqtt_connect_credentials row
    API-->>APP: 200 OK { connected: true }
    APP->>User: Green "Connected" cloud icon displayed
```
