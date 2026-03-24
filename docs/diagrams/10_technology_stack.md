# 10 — Technology Stack Diagram
## Smart Desk Assistant (SDA)

### Purpose
The technology stack diagram catalogues every technology, framework, library, and protocol used in the system, organised by architectural layer. It provides the reader with a complete picture of the implementation tools and justifies their selection.

---

### Full Technology Stack Diagram

```mermaid
graph TB
    subgraph HW["HARDWARE & FIRMWARE LAYER"]
        direction LR
        subgraph MCU["Microcontroller"]
            ESP32S3["ESP32-S3\n(Xtensa dual-core LX7\n240 MHz, 512 KB SRAM)"]
        end
        subgraph RTOS_LAYER["Real-Time OS"]
            FREERTOS2["FreeRTOS\n(via ESP-IDF v5.x)\nTask scheduling\nEvent groups"]
        end
        subgraph SDK["SDK & Build"]
            ESPIDF["ESP-IDF v5.x\n(Espressif IoT Dev Framework)\nCMake build system"]
            CMAKEBUILD["CMake + Ninja\nBuild system"]
            C_LANG["C Language\n(C99 standard)"]
        end
        subgraph DRIVERS["Peripheral Drivers"]
            ADC_DRV["esp_adc OneShot\n12-bit ADC\nADC_ATTEN_DB_12"]
            GPIO_DRV["GPIO Driver\n(button, active-low)"]
            NVS_DRV["NVS Flash\n(Non-Volatile Storage\nkey-value store)"]
            HTTPD_DRV["ESP HTTP Server\n(captive portal)"]
        end
        subgraph COMMS_FW["Communication"]
            WIFI_DRV["ESP Wi-Fi Driver\nIEEE 802.11 b/g/n\nSTA + AP modes"]
            MQTT_DRV["ESP-MQTT Client\nMQTT v3.1.1\n+ TLS via mbedTLS"]
            MBEDTLS["mbedTLS\n(TLS 1.2/1.3)\nRoot CA certificate\nembedded in binary"]
        end
    end

    subgraph CLOUD["CLOUD MQTT LAYER"]
        direction LR
        MQTT_CLOUD["MQTT Connect\nCloud Broker\nmqtt.protonestconnect.co\nPort 8883 (MQTTS)"]
        REST_CLOUD["MQTT Connect\nREST API\nHTTPS / JSON\nJWT Bearer auth"]
        WS_CLOUD["MQTT Connect\nWebSocket API\nWSS (TLS)\nReal-time stream"]
        MQTT_PROTO["MQTT Protocol\nv3.1.1\nQoS 0 (fire-and-forget)\nTLS encrypted transport"]
    end

    subgraph BACKEND["BACKEND LAYER"]
        direction LR
        subgraph RUNTIME["Runtime"]
            NODEJS["Node.js v18+\n(JavaScript runtime)"]
            TYPESCRIPT2["TypeScript v5\n(compile-time types\n+ strict mode)"]
        end
        subgraph WEBFRAMEWORK["Web Framework"]
            EXPRESS2["Express.js v4\nHTTP server\nRoute handlers\nMiddleware pipeline"]
            HELMET["Helmet.js\nSecurity headers\n(CSP, HSTS, XSS filter)"]
            CORS_LIB["cors\nCross-origin config\nCredentials support"]
            MORGAN["Morgan\nHTTP request logging\n(dev format)"]
            RATELIMIT["express-rate-limit\nBrute-force protection"]
        end
        subgraph AUTHLIB["Authentication"]
            JSONWEBTOKEN["jsonwebtoken\nJWT sign + verify\nRS256 / HS256"]
            BCRYPT["bcryptjs\nPassword hashing\ncost factor 12"]
            CRYPTO_LIB["Node.js crypto\nAES-256-CBC\nEncrypt MQTT Connect\nsecret keys"]
        end
        subgraph DATABASE["Database"]
            POSTGRES["PostgreSQL 14+\nRelational database\nTimestampTZ\nJSONB for actions"]
            MYSQL2_LIB["mysql2 / pg driver\nConnection pooling\nParameterised queries"]
        end
        subgraph WS_BACKEND["Real-time"]
            WS_LIB["ws (WebSocket library)\nServer: /ws endpoint\nClient: MQTT Connect bridge\nPing/pong heartbeat"]
        end
        subgraph AI_BACKEND["AI Integration"]
            GEMINI_API["Google Gemini API\ngemini-3.1-flash-lite-preview\nJSON mode response\nTemp: 0.7"]
            OPENAI_API["OpenAI API\ngpt-4o-mini\nJSON response format\nTemp: 0.7"]
        end
        subgraph INFRA["Infrastructure"]
            DOCKER["Docker\nContainerised deployment"]
            DOCKER_COMPOSE["Docker Compose\nMulti-service orchestration\n(backend + PostgreSQL)"]
            DOTENV["dotenv\nEnvironment variable\nmanagement"]
        end
    end

    subgraph MOBILE["MOBILE APPLICATION LAYER"]
        direction LR
        subgraph MOBILE_RUNTIME["Runtime & Build"]
            REACTNATIVE["React Native v0.73\nCross-platform mobile\n(iOS + Android)"]
            EXPO["Expo SDK 52\nManaged workflow\nEAS Build"]
            TYPESCRIPT3["TypeScript v5\nStrict typing\nacross all screens"]
        end
        subgraph NAVIGATION["Navigation"]
            REACT_NAV["React Navigation v6\nStack Navigator\nBottom Tab Navigator"]
        end
        subgraph UI_LAYER["UI Components"]
            MATERIAL_ICONS["@expo/vector-icons\nMaterialIcons\n(icon library)"]
            RN_CHARTS["Custom Charts\n(StyleSheet + View\nhistorical visualisation)"]
            THEMING["Custom Theme System\nlight / dark mode\nDynamic colors"]
        end
        subgraph STATE["State Management"]
            REACT_CTX["React Context API\nAuthContext\nThemeContext\nDevicesContext\nRealtimeContext"]
            ASYNCSTORAGE["AsyncStorage\nJWT token persistence\ntheme preference"]
        end
        subgraph NETWORKING["Networking"]
            FETCH_API["Fetch API\n(native)\nHTTPS REST calls\nBearer token headers"]
            WS_NATIVE["WebSocket (native)\nReal-time sensor stream\nAuto-reconnect\nexponential backoff"]
        end
        subgraph NOTIF["Notifications"]
            EXPO_NOTIF["expo-notifications\nPush permission request\nForeground handler\nBackground handler"]
            EXPO_PUSH_SDK["expo-notifications\ngetExpoPushTokenAsync\nToken registration"]
        end
    end

    subgraph EXTERNAL["EXTERNAL SERVICES"]
        direction LR
        EXPO_PUSH_SVC["Expo Push Service\nexp.host/--/api/v2/push/send\nHTTPS delivery\nDelivery receipts"]
        GEMINI_EXT["Google Gemini\ngenerativelanguage.googleapis.com\ngemini-3.1-flash-lite-preview"]
        OPENAI_EXT["OpenAI\napi.openai.com\ngpt-4o-mini"]
    end

    %% ─── Layer connections ────────────────────────────────────
    MQTT_DRV --> MQTT_CLOUD
    REST_CLOUD --> BACKEND
    WS_CLOUD --> WS_LIB
    BACKEND --> MOBILE
    AI_BACKEND --> GEMINI_EXT
    AI_BACKEND --> OPENAI_EXT
    WS_LIB --> EXPO_PUSH_SVC

    style HW fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style CLOUD fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style BACKEND fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style MOBILE fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EXTERNAL fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
```

---

### Technology Selection Rationale

#### Hardware / Firmware

| Technology | Version / Spec | Justification |
|---|---|---|
| **ESP32-S3** | Dual-core LX7, 240 MHz | Sufficient compute for ADC + MQTT + TLS; integrated Wi-Fi; widely used in IoT academia |
| **ESP-IDF** | v5.x | Official Espressif framework; provides FreeRTOS, TLS via mbedTLS, MQTT client, NVS |
| **FreeRTOS** | Built into ESP-IDF | Deterministic real-time scheduling; allows concurrent button + publish tasks |
| **MQTT v3.1.1** | QoS 0 | Lightweight pub/sub protocol ideal for constrained IoT devices; minimal overhead |
| **mbedTLS** | Built into ESP-IDF | Provides TLS 1.2/1.3 for secure MQTTS; root CA embedded as binary constant |
| **NVS Flash** | ESP-IDF NVS | Key-value persistent storage; survives reboot; used for WiFi credential persistence |
| **CMake + Ninja** | CMake 3.x | Standard ESP-IDF build toolchain; cross-compilation to Xtensa architecture |

---

#### Cloud MQTT Layer

| Technology | Justification |
|---|---|
| **MQTT Connect Broker** | Dedicated IoT MQTT cloud broker with REST API and WebSocket; eliminates need for self-hosted broker infrastructure |
| **MQTTS (TLS, port 8883)** | Industry-standard secure MQTT transport; prevents eavesdropping of sensor data in transit |
| **JWT Bearer Authentication** | Stateless, expiry-aware token model; supports refresh to maintain long-lived backend connections |
| **WebSocket stream API** | Enables sub-second real-time data delivery from cloud to backend without polling latency |

---

#### Backend

| Technology | Version | Justification |
|---|---|---|
| **Node.js** | v18 LTS | Event-driven I/O model ideal for WebSocket handling and concurrent API requests |
| **TypeScript** | v5 | Compile-time type safety; reduces runtime errors; improves maintainability |
| **Express.js** | v4 | Lightweight, well-documented HTTP framework; large ecosystem; easy middleware composition |
| **PostgreSQL** | v14+ | ACID-compliant; strong JSON/JSONB support for actions arrays; TimestampTZ for sensor data |
| **jsonwebtoken** | v9 | Standard JWT library; supports HS256 with configurable expiry |
| **bcryptjs** | v2 | Adaptive password hashing; cost factor 12 provides brute-force resistance |
| **Node.js crypto** | Built-in | AES-256-CBC encryption for MQTT Connect secret keys; no additional dependencies |
| **ws** | v8 | Lightweight WebSocket library; used for both server (app clients) and client (MQTT Connect bridge) |
| **Helmet.js** | v7 | Security header middleware; prevents common web vulnerabilities (XSS, clickjacking) |
| **Docker + Compose** | Latest | Reproducible deployment; service isolation; simplifies production setup |
| **Google Gemini** | gemini-3.1-flash-lite-preview | Low-latency, cost-efficient LLM with JSON mode; suitable for real-time insight generation |
| **OpenAI GPT-4o-mini** | gpt-4o-mini | High-quality reasoning; configurable alternative to Gemini |

---

#### Mobile Application

| Technology | Version | Justification |
|---|---|---|
| **React Native** | v0.73 | Write-once cross-platform mobile; JavaScript/TypeScript ecosystem |
| **Expo SDK** | v52 | Managed workflow; simplifies native module access; over-the-air updates |
| **React Navigation** | v6 | De-facto navigation library for React Native; Stack + Tab navigators |
| **TypeScript** | v5 | Shared type definitions between backend and mobile reduce integration errors |
| **React Context API** | Built-in | Lightweight state management; avoids Redux overhead for this project's scale |
| **AsyncStorage** | Expo | Persistent local key-value store for JWT tokens and preferences |
| **expo-notifications** | SDK 52 | Push notification registration, permission handling, and foreground interception |
| **Fetch API** | Native | Built-in HTTP client; sufficient for REST API calls with Bearer auth headers |
| **WebSocket (native)** | Built-in | Native WebSocket with exponential backoff reconnect for real-time sensor updates |

---

### Communication Protocol Summary

| Layer | Protocol | Transport | Security | Port |
|---|---|---|---|---|
| Firmware → MQTT Connect | MQTT v3.1.1 | TCP | TLS (mbedTLS, root CA) | 8883 |
| Backend → MQTT Connect REST | HTTPS | TCP | TLS, JWT Bearer | 443 |
| Backend ↔ MQTT Connect WebSocket | WebSocket over WSS | TCP | TLS | 443 |
| Mobile App → Backend REST | HTTPS | TCP | TLS, JWT Bearer | 3000 |
| Mobile App ↔ Backend WebSocket | WebSocket (WS) | TCP | JWT query param | 3000 |
| Backend → Expo Push Service | HTTPS | TCP | TLS | 443 |
| Backend → Gemini / OpenAI | HTTPS | TCP | TLS, API Key | 443 |

---

### Development & Build Toolchain

| Tool | Purpose |
|---|---|
| **VS Code** | Primary IDE with ESP-IDF extension and React Native tooling |
| **ESP-IDF CMake** | Firmware cross-compilation and flashing |
| **esptool.py** | Flash binary to ESP32-S3 over USB-UART |
| **npm / package-lock.json** | Node.js dependency management (backend + mobile) |
| **Expo Go / EAS Build** | Mobile app development testing and production builds |
| **Git / GitHub** | Version control; branch `Offline_issue` for active development |
| **Docker Desktop** | Local containerised backend development and testing |
