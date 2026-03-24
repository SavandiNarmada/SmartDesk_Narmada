import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import pool from '../config/database';
import { generateId } from '../utils/helpers';
import * as protonestClient from './protonestClient';
import { generateAutoInsights } from './insightGenerator';
import { publishRealtimeUpdate, RealtimeReading } from './realtimeSensorService';

type Broadcaster = (
  userId: string,
  deviceId: string,
  reading: RealtimeReading,
  sourceTimestamp?: string
) => void;

const ENCRYPTION_KEY = process.env.PROTONEST_ENCRYPTION_KEY || 'default_32_char_encryption_key!!';
const ALGORITHM = 'aes-256-cbc';

// Topic suffix -> sensor_readings column mapping from env
function getTopicMapping(): Record<string, string> {
  const raw = process.env.TOPIC_MAPPING || 'gas:air_quality,light:light_level,noise:noise_level,temperature:temperature,humidity:humidity';
  const map: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [topic, column] = pair.split(':');
    if (topic && column) map[topic.trim()] = column.trim();
  }
  return map;
}

export function encryptSecret(plaintext: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptSecret(ciphertext: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function ensureValidToken(cred: any): Promise<string> {
  // Check if JWT is still valid (with 5 min buffer)
  if (cred.jwt_token && cred.jwt_expires_at) {
    const expiresAt = new Date(cred.jwt_expires_at);
    if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
      return cred.jwt_token;
    }
  }

  // Try refresh token first
  if (cred.refresh_token) {
    try {
      const result = await protonestClient.renewToken(cred.refresh_token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await pool.query(
        `UPDATE protonest_credentials SET jwt_token = ?, refresh_token = ?, jwt_expires_at = ? WHERE id = ?`,
        [result.jwtToken, result.refreshToken, expiresAt, cred.id]
      );
      return result.jwtToken;
    } catch (e) {
      console.error('Protonest token refresh failed, re-authenticating:', e);
    }
  }

  // Full re-auth — use override credentials if configured (shared MQTT Connect account)
  const secretKey = decryptSecret(cred.protonest_secret_key);
  const authEmail = process.env.MQTT_CONNECT_OVERRIDE_EMAIL || cred.protonest_email;
  const authPassword = process.env.MQTT_CONNECT_OVERRIDE_PASSWORD || secretKey;
  const result = await protonestClient.getToken(authEmail, authPassword);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE protonest_credentials SET jwt_token = ?, refresh_token = ?, jwt_expires_at = ? WHERE id = ?`,
    [result.jwtToken, result.refreshToken, expiresAt, cred.id]
  );
  return result.jwtToken;
}

async function syncDeviceData(jwt: string, deviceId: string, protonestDeviceId: string, userId?: string, deviceName?: string, broadcaster?: Broadcaster): Promise<void> {
  const topicMapping = getTopicMapping();

  // Get last sync timestamp for this device
  const [lastReadings]: any = await pool.query(
    `SELECT MAX(timestamp) as last_ts FROM sensor_readings WHERE device_id = ?`,
    [deviceId]
  );
  const lastTs = lastReadings[0]?.last_ts;
  const startTime = lastTs ? new Date(lastTs).toISOString() : new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Fetch stream data from Protonest
  let streamData;
  try {
    streamData = await protonestClient.getStreamDataByDevice(jwt, protonestDeviceId, startTime);
  } catch (e) {
    console.error(`Failed to fetch stream data for device ${protonestDeviceId}:`, e);
    return;
  }

  if (!streamData.data || streamData.data.length === 0) {
    console.log(`🔄 Sync: no stream data for device ${deviceId} since ${startTime}`);
    return;
  }

  console.log(`🔄 Sync: got ${streamData.data.length} records for device ${deviceId} since ${startTime}`);

  // Group records by ~5-second timestamp windows
  const windows = new Map<string, Record<string, number>>();
  for (const record of streamData.data) {
    const ts = new Date(record.timestamp);
    // Round to nearest 5 seconds
    const rounded = new Date(Math.round(ts.getTime() / 5000) * 5000);
    const key = rounded.toISOString();

    if (!windows.has(key)) windows.set(key, {});
    const window = windows.get(key)!;

    // Parse payload
    let payload: any;
    try {
      payload = typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;
    } catch {
      continue;
    }

    // API may return topic as "topicSuffix" or "topic" — handle both
    const topicKey = record.topicSuffix || (record as any).topic || '';
    const column = topicMapping[topicKey];
    if (column) {
      // Payload format: {"value": 125} OR {"gas": 125} OR just a number
      let val: number | undefined;
      if (payload.value !== undefined) {
        val = parseFloat(payload.value);
      } else {
        // Try first numeric value in the payload object
        const numVal = Object.values(payload).find((v: any) => typeof v === 'number' || !isNaN(Number(v)));
        if (numVal !== undefined) val = Number(numVal);
      }
      if (val !== undefined && !isNaN(val)) {
        window[column] = val;
      }
    }
  }

  // Insert grouped readings — track if any NEW data was inserted
  let newDataInserted = false;
  for (const [timestamp, values] of windows) {
    if (Object.keys(values).length === 0) continue;

    // Check for duplicate
    const [existing]: any = await pool.query(
      `SELECT id FROM sensor_readings WHERE device_id = ? AND timestamp = ?`,
      [deviceId, timestamp]
    );
    if (existing.length > 0) continue;

    newDataInserted = true;
    const readingId = generateId();
    await pool.query(
      `INSERT INTO sensor_readings (id, device_id, timestamp, air_quality, light_level, noise_level, temperature, humidity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        readingId,
        deviceId,
        timestamp,
        values.air_quality ?? null,
        values.light_level ?? null,
        values.noise_level ?? null,
        values.temperature ?? null,
        values.humidity ?? null,
      ]
    );
  }

  // Check if the latest reading is RECENT (within 2 minutes of now)
  // - If recent: sensor is actively sending → mark online + broadcast
  // - If stale: sensor is off, Protonest returning old cached data → skip
  const [latestCheck]: any = await pool.query(
    `SELECT timestamp FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [deviceId]
  );
  const latestTs = latestCheck.length > 0 ? new Date(latestCheck[0].timestamp).getTime() : 0;
  const isRecent = Date.now() - latestTs < 2 * 60 * 1000; // within 2 minutes

  if (!newDataInserted && !isRecent) {
    console.log(`🔄 Sync: stale data for device ${deviceId} (last reading ${Math.round((Date.now() - latestTs) / 1000)}s ago)`);
    return;
  }

  if (newDataInserted) {
    console.log(`🔄 Sync: new data inserted for device ${deviceId}`);
  } else {
    console.log(`🔄 Sync: data is recent for device ${deviceId}, broadcasting`);
  }

  // Update device status to online
  await pool.query(
    `UPDATE devices SET status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [deviceId]
  );

  // Broadcast latest window to app clients via realtimeSensorService (dedup prevents double-broadcast)
  if (broadcaster && userId) {
    const [latestForBroadcast]: any = await pool.query(
      `SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
      [deviceId]
    );
    if (latestForBroadcast.length > 0) {
      const r = latestForBroadcast[0];
      const patch: Partial<Record<'airQuality' | 'lightLevel' | 'noiseLevel' | 'temperature' | 'humidity', number | null>> = {};
      if (r.air_quality != null) patch.airQuality = parseFloat(r.air_quality);
      if (r.light_level != null) patch.lightLevel = parseFloat(r.light_level);
      if (r.noise_level != null) patch.noiseLevel = parseFloat(r.noise_level);
      if (r.temperature != null) patch.temperature = parseFloat(r.temperature);
      if (r.humidity != null) patch.humidity = parseFloat(r.humidity);

      publishRealtimeUpdate(
        {
          userId,
          deviceId,
          deviceName: deviceName || 'Device',
          patch,
          sourceTimestamp: r.timestamp,
        },
        broadcaster
      );
      console.log(`📡 REST sync broadcast for device ${deviceId} (user: ${userId})`);
    }
  }

  // Generate threshold-based insights from latest reading
  const [latestReadings]: any = await pool.query(
    `SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [deviceId]
  );
  if (latestReadings.length > 0) {
    const r = latestReadings[0];
    try {
      await generateAutoInsights(deviceId, r.air_quality, r.light_level, r.noise_level);
    } catch (e) {
      console.error('Auto-insight generation error:', e);
    }
  }
}

export async function runSyncForUser(userId: string, broadcaster?: Broadcaster): Promise<void> {
  const [creds]: any = await pool.query(
    `SELECT * FROM protonest_credentials WHERE user_id = ?`,
    [userId]
  );
  if (creds.length === 0) return;

  const cred = creds[0];
  let jwt: string;
  try {
    jwt = await ensureValidToken(cred);
  } catch (e) {
    console.error(`Failed to get Protonest token for user ${userId}:`, e);
    return;
  }

  const [devices]: any = await pool.query(
    `SELECT id, name, protonest_device_id FROM devices WHERE user_id = ? AND protonest_device_id IS NOT NULL`,
    [userId]
  );

  for (const device of devices) {
    try {
      await syncDeviceData(jwt, device.id, device.protonest_device_id, userId, device.name, broadcaster);
    } catch (e) {
      console.error(`Sync failed for device ${device.id}:`, e);
    }
  }
}

let activeBroadcaster: Broadcaster | undefined;

async function runSync(): Promise<void> {
  const [creds]: any = await pool.query(`SELECT DISTINCT user_id FROM protonest_credentials`);
  for (const { user_id } of creds) {
    try {
      await runSyncForUser(user_id, activeBroadcaster);
    } catch (e) {
      console.error(`Sync failed for user ${user_id}:`, e);
    }
  }
}

let syncInterval: NodeJS.Timeout | null = null;

export function startSyncService(intervalMs: number = 30000, broadcaster?: Broadcaster): void {
  if (syncInterval) return;
  activeBroadcaster = broadcaster;
  console.log(`🔄 Protonest sync service started (interval: ${intervalMs / 1000}s)`);
  syncInterval = setInterval(async () => {
    try {
      await runSync();
    } catch (e) {
      console.error('Protonest sync error:', e);
    }
  }, intervalMs);
}

export function stopSyncService(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('🛑 Protonest sync service stopped');
  }
}
