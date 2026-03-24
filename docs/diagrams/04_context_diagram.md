# 04 — Context Diagram
## Smart Desk Assistant (SDA)

### Purpose
The context diagram defines the **system boundary** of the Smart Desk Assistant and shows all external entities that send data to or receive data from the system. It answers the question: *"What is inside the system, what is outside, and how do they communicate?"*

---

### Level 0 Context Diagram (System as a Black Box)

```mermaid
graph TD
    USER["👤 User\n(Student / Office Worker)"]
    INSTALLER["🔧 Device Installer"]
    MQTTBROKER["☁ MQTT Connect\nCloud Broker\n(mqtt.protonestconnect.co)"]
    AISERVICE["🤖 AI Service\n(Google Gemini /\nOpenAI)"]
    EXPOSERVICE["📲 Expo Push\nNotification Service\n(exp.host)"]
    WIFI["📶 Wi-Fi Network\n(Local Router)"]

    SDA["═══════════════════════════════\n        SMART DESK ASSISTANT        \n═══════════════════════════════\n  ESP32-S3 Firmware (C/FreeRTOS)  \n  Node.js / Express Backend       \n  PostgreSQL Database              \n  React Native / Expo Mobile App  \n═══════════════════════════════"]

    INSTALLER -- "WiFi SSID + Password\n(provisioning portal)" --> SDA
    SDA -- "Sensor Readings\n(real-time + history)" --> USER
    SDA -- "Push Notifications\n(threshold alerts)" --> USER
    SDA -- "AI Workspace Tips" --> USER
    USER -- "MQTT Connect Credentials\n(email + secret key)" --> SDA
    USER -- "Threshold Settings\n(custom alert bands)" --> SDA
    USER -- "Profile / Device Config" --> SDA

    SDA -- "MQTT Publish\n(gas/noise/light JSON)\nMQTTS port 8883" --> MQTTBROKER
    MQTTBROKER -- "Stream Data\n(REST + WebSocket)" --> SDA

    SDA -- "AI Prompt\n(sensor readings + context)" --> AISERVICE
    AISERVICE -- "JSON Insight\n(title, description,\nseverity, actions)" --> SDA

    SDA -- "Push Messages\n(Expo token + payload)" --> EXPOSERVICE
    EXPOSERVICE -- "Delivered Notification" --> USER

    WIFI -- "IP Connectivity" --> SDA

    style SDA fill:#1a73e8,color:#fff,stroke:#0d47a1,stroke-width:3px
    style USER fill:#e8f5e9,stroke:#388e3c
    style INSTALLER fill:#fff9c4,stroke:#f9a825
    style MQTTBROKER fill:#fff3e0,stroke:#f57c00
    style AISERVICE fill:#f3e5f5,stroke:#6a1b9a
    style EXPOSERVICE fill:#fce4ec,stroke:#c62828
    style WIFI fill:#e0f7fa,stroke:#00838f
```

---

### Level 1 Context Diagram (System Decomposed into Subsystems)

```mermaid
graph LR
    USER["👤 User"]
    INSTALLER["🔧 Installer"]
    MQTTBROKER["☁ MQTT Connect\nCloud Broker"]
    AISERVICE["🤖 AI Service"]
    EXPOSERVICE["📲 Expo Push\nService"]

    subgraph SDA["Smart Desk Assistant System"]
        FW["ESP32-S3\nFirmware\n(Sensor Node)"]
        BE["Node.js\nBackend\n+ Database"]
        APP["React Native\nMobile App"]
    end

    INSTALLER -- "WiFi Credentials\n(captive portal)" --> FW
    FW -- "MQTTS Publish\n(every 5 s)" --> MQTTBROKER
    MQTTBROKER -- "REST API\n+ WebSocket" --> BE
    BE <-- "REST API\n+ WebSocket /ws" --> APP
    APP -- "View + Config" --> USER
    USER -- "Credentials\n+ Preferences" --> APP
    BE -- "AI Prompt" --> AISERVICE
    AISERVICE -- "Insight JSON" --> BE
    BE -- "Push Payload" --> EXPOSERVICE
    EXPOSERVICE -- "Notification" --> USER

    style FW fill:#e8f5e9,stroke:#388e3c
    style BE fill:#e3f2fd,stroke:#1565c0
    style APP fill:#fce4ec,stroke:#c62828
```

---

### External Entity Descriptions

| External Entity | Direction | Data Exchanged | Protocol / Format |
|---|---|---|---|
| **User (Student / Office Worker)** | Bidirectional | Views readings, receives alerts, configures thresholds and MQTT Connect credentials | HTTPS REST, WebSocket, Push Notification |
| **Device Installer** | Inbound | Provides WiFi SSID and password via provisioning portal | HTTP form (application/x-www-form-urlencoded) |
| **MQTT Connect Cloud Broker** | Bidirectional | Firmware publishes sensor JSON; backend fetches historical stream and receives real-time WebSocket stream | MQTTS (TLS, port 8883), HTTPS REST, WSS |
| **Google Gemini / OpenAI** | Bidirectional | Backend sends sensor context prompt; AI returns structured JSON insight | HTTPS REST, `application/json` |
| **Expo Push Notification Service** | Outbound | Backend sends push message objects with Expo tokens | HTTPS POST to `exp.host/--/api/v2/push/send` |
| **Wi-Fi Network** | Inbound | Provides IP connectivity to ESP32-S3 | IEEE 802.11 b/g/n |

---

### Data Dictionary for Context Boundary Flows

#### Firmware → MQTT Connect (Outbound)
```json
Topic:   protonest/<device_client_id>/stream/gas
Payload: {"value": 125.50, "unit": "ppm"}
Rate:    Every 5 seconds per sensor (gas, noise, light)
```

#### MQTT Connect → Backend REST (Inbound)
```json
GET /get-stream-data/device
Body: { "deviceId": "...", "startTime": "ISO8601", "endTime": "ISO8601" }
Response: { "status": "ok", "data": [{ "topicSuffix": "gas", "payload": "...", "timestamp": "..." }] }
```

#### AI Service → Backend (Inbound)
```json
{
  "title": "Open a window to refresh air quality",
  "description": "Your AQI has risen to 145 over the past 30 minutes. ...",
  "severity": "warning",
  "actions": ["Open a window", "Take a 5-minute break outside", "Check ventilation"]
}
```

#### Backend → Mobile App via WebSocket (Outbound)
```json
{
  "type": "sensor_reading",
  "deviceId": "uuid",
  "data": { "airQuality": 145, "lightLevel": 210, "noiseLevel": 58 },
  "timestamp": "2026-03-24T10:00:00.000Z",
  "sourceTimestamp": "2026-03-24T09:59:55.000Z"
}
```

#### Backend → Expo Push (Outbound)
```json
{
  "to": "ExponentPushToken[xxxxx]",
  "sound": "default",
  "title": "High Noise Level Alert",
  "body": "Noise at 72 dB — above your 70 dB threshold.",
  "data": { "type": "threshold_alert", "deviceId": "uuid" },
  "priority": "high"
}
```
