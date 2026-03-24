#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

/*
  Wiring (ESP32 Dev Module):
  - LDR 3-pin module:   DO -> GPIO27, VCC -> 3.3V, GND -> GND
  - MIC 3-pin module:   AO -> GPIO35, VCC -> 3.3V, GND -> GND
  - MQ-135 4-pin module: AO -> GPIO32, VCC -> 5V, GND -> GND
  Notes:
  - LDR is read as digital output (DO): 0 = light detected, 1 = dark.
  - MIC and MQ-135 are read as analog output (AO), range 0-4095 (12-bit ADC).
  - MQ-135 DO (digital output) is not used.

  Setup:
  1. Register a device in the Smart Desk Assistant mobile app.
  2. Open the device's Settings screen — copy the "Arduino Device Key".
  3. Paste the key into DEVICE_KEY below.
  4. Set your WiFi credentials (WIFI_SSID and WIFI_PASSWORD).
  5. Flash this sketch to the ESP32.
*/

// ============================================================
// SECURITY NOTE:
// Do NOT commit real WiFi credentials or device keys to version
// control. Replace the placeholder values below with your own
// and keep them private.
// ============================================================

// WiFi credentials — replace with your network details
const char* WIFI_SSID     = "your_wifi_ssid";
const char* WIFI_PASSWORD = "your_wifi_password";

// Backend ingest endpoint
const char* SERVER_URL = "http://savindi.autohubmarket.com/api/ingest";

// Device key — copy from the mobile app (Device Settings → Arduino Device Key)
// NEVER share or commit your actual device key.
const char* DEVICE_KEY = "your_device_key_here";

// Sensor input pins
#define LDR_PIN    27   // LDR DO (digital)
#define MIC_PIN    35   // MIC AO (analog)
#define MQ135_PIN  32   // MQ-135 AO (analog)

// How often to send data (milliseconds)
const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendAt = 0;

WiFiClientSecure secureClient;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed — will retry next cycle");
  }
}

bool postSensorData(int ldrDo, int micValue, int mq135Value) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = String(SERVER_URL);

  bool beginOk = false;
  if (url.startsWith("https://")) {
    secureClient.setInsecure();  // Skip TLS verification for development
    beginOk = http.begin(secureClient, url);
  } else {
    beginOk = http.begin(url);
  }

  if (!beginOk) {
    Serial.println("HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  // - device_key:  authenticates this device with the backend
  // - ldr_do:      0 = light present, 1 = dark (digital LDR output)
  // - mic:         raw ADC 0-4095 (converted to dB by the backend)
  // - mq135:       raw ADC 0-4095 (converted to AQI by the backend)
  String payload = "{";
  payload += "\"device_key\":\"" + String(DEVICE_KEY) + "\",";
  payload += "\"ldr_do\":"  + String(ldrDo)     + ",";
  payload += "\"mic\":"     + String(micValue)   + ",";
  payload += "\"mq135\":"   + String(mq135Value);
  payload += "}";

  Serial.print("POST ");
  Serial.print(url);
  Serial.print(" -> ");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  Serial.print("HTTP status: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return httpCode >= 200 && httpCode < 300;
}

void readAndSend() {
  int ldr   = digitalRead(LDR_PIN);
  int mic   = analogRead(MIC_PIN);
  int mq135 = analogRead(MQ135_PIN);

  Serial.print("LDR_DO=");
  Serial.print(ldr);
  Serial.print("  MIC=");
  Serial.print(mic);
  Serial.print("  MQ135=");
  Serial.println(mq135);

  bool ok = postSensorData(ldr, mic, mq135);
  Serial.println(ok ? "✓ Data sent successfully" : "✗ Failed to send data");
}

void setup() {
  Serial.begin(115200);
  delay(200);

  // Configure ESP32 ADC to 12-bit (values 0-4095)
  analogReadResolution(12);

  // Configure pin modes
  pinMode(LDR_PIN,   INPUT);
  pinMode(MIC_PIN,   INPUT);
  pinMode(MQ135_PIN, INPUT);

  connectWiFi();

  // Send an initial reading right away
  readAndSend();
}

void loop() {
  unsigned long now = millis();
  if (now - lastSendAt < SEND_INTERVAL_MS) {
    return;
  }
  lastSendAt = now;

  readAndSend();
}
