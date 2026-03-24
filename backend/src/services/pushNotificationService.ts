import pool from '../config/database';
import { generateId } from '../utils/helpers';

const AI_API_KEY = process.env.AI_API_KEY || '';
const NOTIFICATION_COOLDOWN_MINUTES = parseInt(process.env.NOTIFICATION_COOLDOWN_MINUTES || '15', 10);

// In-memory cooldown to prevent rapid-fire duplicate notifications
// (DB check can race when multiple calls arrive within seconds)
const memoryCooldown = new Map<string, number>();

// Thresholds that trigger notifications
const ALERT_THRESHOLDS = {
  air_quality: { max: 150, label: 'Air Quality', unit: 'AQI' },
  noise_level: { max: 70, label: 'Noise Level', unit: 'dB' },
  light_level: { min: 50, max: 950, label: 'Light Level', unit: 'lux' },
  temperature: { min: 16, max: 32, label: 'Temperature', unit: '°C' },
  humidity: { min: 25, max: 75, label: 'Humidity', unit: '%' },
};

interface SensorReading {
  airQuality?: number | null;
  lightLevel?: number | null;
  noiseLevel?: number | null;
  temperature?: number | null;
  humidity?: number | null;
}

// ─── Gemini Smart Message Generator ─────────────────────

async function generateSmartMessage(
  sensorType: string,
  value: number,
  unit: string,
  deviceName: string
): Promise<{ title: string; body: string }> {
  if (!AI_API_KEY) {
    return getDefaultMessage(sensorType, value, unit);
  }

  try {
    const prompt = `You are a smart workspace assistant. Generate a SHORT push notification (max 15 words for title, max 40 words for body) for this alert:

Sensor: ${sensorType}
Value: ${value} ${unit}
Device: ${deviceName}

The notification should:
- Be actionable and helpful (suggest what to do)
- Sound friendly, not alarming
- Include a practical tip

Examples:
- Noise 130dB: title="Loud Environment Detected", body="Consider using noise-cancelling headphones or moving to a quieter spot."
- AQI 180: title="Air Quality Declining", body="Open a window or turn on your air purifier. Consider taking a short break outside."
- Light 30 lux: title="Low Light Warning", body="Turn on your desk lamp to reduce eye strain and boost focus."

Respond with JSON only: {"title": "...", "body": "..."}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response');

    const parsed = JSON.parse(text);
    return {
      title: parsed.title || getDefaultMessage(sensorType, value, unit).title,
      body: parsed.body || getDefaultMessage(sensorType, value, unit).body,
    };
  } catch (err) {
    console.error('Gemini notification error, using default:', err);
    return getDefaultMessage(sensorType, value, unit);
  }
}

function getDefaultMessage(sensorType: string, value: number, unit: string): { title: string; body: string } {
  const messages: Record<string, { title: string; body: string }> = {
    noise_level: {
      title: 'High Noise Level Detected',
      body: `Noise at ${value}${unit}. Consider using wireless headphones or moving to a quieter area.`,
    },
    air_quality: {
      title: 'Poor Air Quality Alert',
      body: `AQI at ${value}. Open a window or turn on the air purifier for better air circulation.`,
    },
    light_level_low: {
      title: 'Low Light Warning',
      body: `Light at ${value}${unit}. Turn on your desk lamp to reduce eye strain.`,
    },
    light_level_high: {
      title: 'Bright Light Alert',
      body: `Light at ${value}${unit}. Adjust blinds or screen brightness to reduce glare.`,
    },
    temperature_high: {
      title: 'High Temperature Alert',
      body: `Temperature at ${value}${unit}. Turn on the fan or AC for a comfortable workspace.`,
    },
    temperature_low: {
      title: 'Low Temperature Alert',
      body: `Temperature at ${value}${unit}. Consider turning on the heater or wearing a warm layer.`,
    },
    humidity_high: {
      title: 'High Humidity Alert',
      body: `Humidity at ${value}${unit}. Turn on a dehumidifier for comfort.`,
    },
    humidity_low: {
      title: 'Low Humidity Alert',
      body: `Humidity at ${value}${unit}. Consider using a humidifier to avoid dry air.`,
    },
  };

  return messages[sensorType] || {
    title: 'Workspace Alert',
    body: `${sensorType} at ${value}${unit}. Check your workspace conditions.`,
  };
}

// ─── Send Expo Push Notification ────────────────────────

async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high' as const,
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Expo push error:', text);
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}

// ─── Check Cooldown ─────────────────────────────────────

async function isOnCooldown(userId: string, deviceId: string, sensorType: string): Promise<boolean> {
  const cooldownTime = new Date(Date.now() - NOTIFICATION_COOLDOWN_MINUTES * 60 * 1000);
  const [rows]: any = await pool.query(
    `SELECT id FROM notification_log
     WHERE user_id = ? AND device_id = ? AND sensor_type = ? AND sent_at >= ?
     LIMIT 1`,
    [userId, deviceId, sensorType, cooldownTime]
  );
  return rows.length > 0;
}

async function logNotification(
  userId: string,
  deviceId: string,
  sensorType: string,
  title: string,
  body: string
): Promise<void> {
  await pool.query(
    `INSERT INTO notification_log (id, user_id, device_id, sensor_type, title, body) VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId(), userId, deviceId, sensorType, title, body]
  );
}

// ─── Send a One-Off Notification to a User ──────────────

export async function sendUserNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const [tokens]: any = await pool.query(
    `SELECT expo_push_token FROM push_tokens WHERE user_id = ?`,
    [userId]
  );
  if (tokens.length === 0) return;

  const pushTokens: string[] = tokens.map((t: any) => t.expo_push_token);
  await sendExpoPushNotifications(pushTokens, title, body, data);
}

// ─── Broadcast Notification to ALL Registered Devices ───

export async function broadcastNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const [tokens]: any = await pool.query(`SELECT expo_push_token FROM push_tokens`);
  if (tokens.length === 0) return;

  const pushTokens: string[] = tokens.map((t: any) => t.expo_push_token);
  await sendExpoPushNotifications(pushTokens, title, body, data);
}

// ─── Main: Check Readings & Send Alerts ─────────────────

export async function checkAndNotify(
  userId: string,
  deviceId: string,
  deviceName: string,
  reading: SensorReading
): Promise<void> {
  // Get all registered push tokens (broadcast to every connected device)
  const [tokens]: any = await pool.query(`SELECT expo_push_token FROM push_tokens`);
  if (tokens.length === 0) return;

  const pushTokens: string[] = tokens.map((t: any) => t.expo_push_token);

  // Check each sensor against thresholds
  const alerts: { sensorType: string; value: number; unit: string }[] = [];

  if (reading.airQuality != null && reading.airQuality > ALERT_THRESHOLDS.air_quality.max) {
    alerts.push({ sensorType: 'air_quality', value: reading.airQuality, unit: ALERT_THRESHOLDS.air_quality.unit });
  }

  if (reading.noiseLevel != null && reading.noiseLevel > ALERT_THRESHOLDS.noise_level.max) {
    alerts.push({ sensorType: 'noise_level', value: reading.noiseLevel, unit: ALERT_THRESHOLDS.noise_level.unit });
  }

  if (reading.lightLevel != null) {
    if (reading.lightLevel < ALERT_THRESHOLDS.light_level.min) {
      alerts.push({ sensorType: 'light_level_low', value: reading.lightLevel, unit: ALERT_THRESHOLDS.light_level.unit });
    } else if (reading.lightLevel > ALERT_THRESHOLDS.light_level.max) {
      alerts.push({ sensorType: 'light_level_high', value: reading.lightLevel, unit: ALERT_THRESHOLDS.light_level.unit });
    }
  }

  if (reading.temperature != null) {
    if (reading.temperature > ALERT_THRESHOLDS.temperature.max) {
      alerts.push({ sensorType: 'temperature_high', value: reading.temperature, unit: ALERT_THRESHOLDS.temperature.unit });
    } else if (reading.temperature < ALERT_THRESHOLDS.temperature.min) {
      alerts.push({ sensorType: 'temperature_low', value: reading.temperature, unit: ALERT_THRESHOLDS.temperature.unit });
    }
  }

  if (reading.humidity != null) {
    if (reading.humidity > ALERT_THRESHOLDS.humidity.max) {
      alerts.push({ sensorType: 'humidity_high', value: reading.humidity, unit: ALERT_THRESHOLDS.humidity.unit });
    } else if (reading.humidity < ALERT_THRESHOLDS.humidity.min) {
      alerts.push({ sensorType: 'humidity_low', value: reading.humidity, unit: ALERT_THRESHOLDS.humidity.unit });
    }
  }

  // Send notifications for each alert (respecting cooldown)
  const cooldownMs = NOTIFICATION_COOLDOWN_MINUTES * 60 * 1000;
  for (const alert of alerts) {
    const cooldownKey = `${userId}:${deviceId}:${alert.sensorType}`;

    // Fast in-memory check first (prevents race conditions with rapid 5s polling)
    const lastSentAt = memoryCooldown.get(cooldownKey);
    if (lastSentAt && Date.now() - lastSentAt < cooldownMs) continue;

    const onCooldown = await isOnCooldown(userId, deviceId, alert.sensorType);
    if (onCooldown) {
      memoryCooldown.set(cooldownKey, Date.now()); // sync memory with DB
      continue;
    }

    // Mark in-memory immediately to block concurrent calls
    memoryCooldown.set(cooldownKey, Date.now());

    // Generate smart message using Gemini
    const { title, body } = await generateSmartMessage(
      alert.sensorType,
      alert.value,
      alert.unit,
      deviceName
    );

    // Send push notification
    await sendExpoPushNotifications(pushTokens, title, body, {
      deviceId,
      sensorType: alert.sensorType,
      value: alert.value,
    });

    // Log it to prevent spamming
    await logNotification(userId, deviceId, alert.sensorType, title, body);

    console.log(`📲 Push notification sent: ${title} (user: ${userId}, device: ${deviceId})`);
  }
}
