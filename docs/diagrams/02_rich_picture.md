# 02 — Rich Picture Diagram
## Smart Desk Assistant (SDA)

### Purpose
A rich picture is a holistic, informal representation of the **problem situation**. It captures people, processes, data flows, conflicts, concerns, and external forces — things that a formal diagram cannot easily express. It tells the *story* of why the system exists and what world it operates in.

---

### The Problem Situation

A student or office worker spends 8+ hours per day at a desk. During that time, invisible environmental factors silently degrade their health and concentration:

- **Poor air quality** from CO₂ build-up or dust causes headaches and reduces cognitive performance.
- **Inadequate lighting** strains eyes or causes drowsiness.
- **Excessive noise** prevents deep focus and elevates stress hormones.
- **Temperature and humidity** extremes reduce comfort and reaction time.

These conditions go unmonitored because there is no affordable, integrated system that **measures, analyses, and notifies** the occupant in real time.

---

### Rich Picture Narrative Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        PHYSICAL WORKSPACE                                    ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────┐                   ║
║   │              DESK ENVIRONMENT                        │                   ║
║   │                                                      │                   ║
║   │   [💨 Stale Air]   [🔆 Glare/Dim]   [📢 Noise]     │                   ║
║   │         ↓                 ↓               ↓          │                   ║
║   │   ┌──────────────────────────────────┐              │                   ║
║   │   │   ESP32-S3 SENSOR NODE           │              │                   ║
║   │   │  ┌────────┐ ┌───────┐ ┌───────┐ │              │                   ║
║   │   │  │Gas/AQI │ │ Noise │ │ Light │ │              │                   ║
║   │   │  │GPIO 4  │ │GPIO 5 │ │GPIO 6 │ │              │                   ║
║   │   │  └────────┘ └───────┘ └───────┘ │              │                   ║
║   │   │  "Reads sensors every 5 seconds" │              │                   ║
║   │   └──────────────────────────────────┘              │                   ║
║   │                  │                                   │                   ║
║   │           MQTTS (TLS)                                │                   ║
║   │           port 8883                                  │                   ║
║   └──────────────────┼──────────────────────────────────┘                   ║
║                      │                                                        ║
╚══════════════════════╪═══════════════════════════════════════════════════════╝
                       │
              ┌────────▼────────────────────────────────────────────────────┐
              │              MQTT CONNECT CLOUD BROKER                       │
              │         mqtt.protonestconnect.co : 8883                      │
              │                                                               │
              │  Topics received:                                             │
              │    protonest/<id>/stream/gas    → {"value":X,"unit":"ppm"}   │
              │    protonest/<id>/stream/noise  → {"value":X,"unit":"dB"}    │
              │    protonest/<id>/stream/light  → {"value":X,"unit":"lux"}   │
              │                                                               │
              │  "Acts as the universal IoT message bus.                      │
              │   Stores stream records and exposes REST + WebSocket."        │
              └───────────┬─────────────────────┬──────────────────────────┘
                          │                     │
               REST API polling            WebSocket stream
               (every 5 seconds)          (real-time push)
                          │                     │
              ┌───────────▼─────────────────────▼──────────────────────────┐
              │              NODE.JS BACKEND SERVER                          │
              │         (Express + TypeScript + PostgreSQL)                  │
              │                                                               │
              │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
              │  │ MQTT Connect│  │  WebSocket   │  │  REST API        │   │
              │  │ Sync Service│  │  Server /ws  │  │  (7 route groups)│   │
              │  │ (5 s timer) │  │              │  │                  │   │
              │  └──────┬──────┘  └──────┬───────┘  └──────────────────┘   │
              │         │                │                                    │
              │  ┌──────▼────────────────▼──────────────────────────────┐   │
              │  │             POSTGRESQL DATABASE                        │   │
              │  │  users · devices · sensor_readings · insights          │   │
              │  │  mqtt_connect_credentials · sensor_thresholds          │   │
              │  │  sessions · push_tokens · notification_log             │   │
              │  └───────────────────────────────────────────────────────┘   │
              │                                                               │
              │  ┌────────────────────┐   ┌───────────────────────────────┐  │
              │  │  THRESHOLD ENGINE  │   │     AI INSIGHTS ENGINE        │  │
              │  │  (rule-based)      │   │  Gemini / OpenAI GPT-4o-mini  │  │
              │  │  AQI / Light /     │   │  "Analyses 10 latest readings │  │
              │  │  Noise / Temp /    │   │   + trends → 1-2 tips"        │  │
              │  │  Humidity bands    │   │                               │  │
              │  └────────────────────┘   └───────────────────────────────┘  │
              └─────────────────────────────────┬──────────────────────────┘
                                                │
                              WebSocket (/ws) + REST API (HTTPS)
                                                │
              ┌─────────────────────────────────▼──────────────────────────┐
              │              REACT NATIVE / EXPO MOBILE APP                  │
              │                                                               │
              │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
              │  │ Devices  │ │ Reports  │ │Insights  │ │   Profile    │   │
              │  │Dashboard │ │& History │ │(AI+Rules)│ │  & Settings  │   │
              │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
              │                                                               │
              │  Real-time sensor gauges · Historical charts                  │
              │  AI workspace tips · Threshold configuration                  │
              │  MQTT Connect credential setup                                │
              └─────────────────────────────────┬──────────────────────────┘
                                                │
                                    Push Notifications
                                (Expo Push Service)
                                                │
              ┌─────────────────────────────────▼──────────────────────────┐
              │                    END USER                                   │
              │              (Student / Office Worker)                        │
              │                                                               │
              │  Concerns:                                                    │
              │  - "Is the air in my room safe to breathe?"                   │
              │  - "Is the lighting hurting my eyes?"                         │
              │  - "Is the noise level affecting my focus?"                   │
              │  - "When was the environment last checked?"                   │
              │  - "What should I do to improve my workspace?"               │
              └────────────────────────────────────────────────────────────┘
```

---

### Key Tensions and Concerns Captured in the Rich Picture

| Concern | Who It Affects | How SDA Addresses It |
|---|---|---|
| Invisible environmental hazards | End User | Continuous sensor monitoring with real-time display |
| Delayed response to poor conditions | End User | Immediate push notifications on threshold breach |
| Lack of actionable guidance | End User | AI-generated workspace tips with specific actions |
| Device connectivity uncertainty | Developer / User | Online/offline detection with push alerts; 5 s sync fallback |
| Data loss during connectivity gaps | Developer | REST polling catches data missed by WebSocket |
| Personalised thresholds vs. global defaults | End User | Per-user customisable threshold bands in database |
| Security of cloud credentials | Developer | AES-256-CBC encrypted MQTT Connect secret key storage |
| Battery / power management | Installer | Mains-powered ESP32-S3 node; NVS persists WiFi across reboots |
| First-time setup complexity | Installer | Captive portal provisioning (no app, just browser on phone) |
| AI cost / rate limiting | Developer | Per-device cooldown (2 hours); configurable AI provider |

---

### External Forces

```
[ University Requirements ]          [ IoT Industry Standards ]
        │                                      │
        │  Drives: thesis scope,               │  Drives: MQTT protocol,
        │  academic rigour,                    │  TLS security, JSON
        │  documentation depth                 │  payload format
        │                                      │
        └──────────────┬───────────────────────┘
                       │
               [ Smart Desk Assistant ]
                       │
        ┌──────────────┴───────────────────────┐
        │                                       │
[ Expo / React Native Ecosystem ]    [ Cloud API Rate Limits ]
  Drives: cross-platform mobile,       Drives: polling intervals,
  push notification integration,       sync frequency,
  development speed                    retry/backoff logic
```
