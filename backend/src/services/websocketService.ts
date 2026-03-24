import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { checkAndNotify, broadcastNotification } from './pushNotificationService';
import * as protonestClient from './protonestClient';
import { decryptSecret } from './protonestSync';
import {
  getCachedRealtimeSnapshotsForUser,
  publishRealtimeUpdate,
  RealtimeReading,
} from './realtimeSensorService';

type OutboundSensorPayload =
  | RealtimeReading
  | {
      _statusChange: true;
      status: 'online' | 'offline';
      deviceName?: string;
    };

const PROTONEST_WS_URL = process.env.PROTONEST_WS_URL || 'wss://api.protonestconnect.co/ws';

// ─── Types ───────────────────────────────────────────────

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  deviceIds?: string[];
  isAlive?: boolean;
}

interface ProtonestStreamMessage {
  deviceId: string;
  topicSuffix?: string;
  topic?: string;
  payload: string;
  timestamp: string;
}

// ─── Topic Mapping ───────────────────────────────────────

function getTopicMapping(): Record<string, string> {
  const raw = process.env.TOPIC_MAPPING || 'gas:air_quality,light:light_level,noise:noise_level,temperature:temperature,humidity:humidity';
  const map: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [topic, column] = pair.split(':');
    if (topic && column) map[topic.trim()] = column.trim();
  }
  return map;
}

// ─── State ───────────────────────────────────────────────

interface ProtonestConnectionHealth {
  ws: WebSocket;
  messageCount: number;
  lastMessageAt: number;
  connectedAt: number;
  reconnectAttempts: number;
  pingInterval?: NodeJS.Timeout;
  watchdogInterval?: NodeJS.Timeout;
}

let wss: WebSocketServer | null = null;
const clientsByUser = new Map<string, Set<AuthenticatedSocket>>();
const protonestHealth = new Map<string, ProtonestConnectionHealth>();

// ─── Backend WebSocket Server (for Expo app) ─────────────

export function initWebSocketServer(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  console.log('⚡ WebSocket server started on /ws');

  wss.on('connection', (ws: AuthenticatedSocket, req: IncomingMessage) => {
    // Authenticate via query param: ws://host:3000/ws?token=<jwt>
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '');
      ws.userId = decoded.userId;
      ws.isAlive = true;
    } catch {
      ws.close(4002, 'Invalid token');
      return;
    }

    // Track this client
    if (!clientsByUser.has(ws.userId!)) {
      clientsByUser.set(ws.userId!, new Set());
    }
    clientsByUser.get(ws.userId!)!.add(ws);

    console.log(`📱 App connected via WebSocket (user: ${ws.userId})`);

    // Send initial confirmation
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
    sendCachedSnapshotsToClient(ws);

    // Start Protonest WebSocket for this user (if not already connected)
    connectProtonestForUser(ws.userId!);

    // Handle pings
    ws.on('pong', () => { ws.isAlive = true; });

    // Send welcome push notification
    sendWelcomeNotification(ws.userId!).catch(() => {});

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        // Client can request to subscribe to specific devices
        if (msg.type === 'subscribe' && msg.deviceIds) {
          ws.deviceIds = msg.deviceIds;
          ws.send(JSON.stringify({ type: 'subscribed', deviceIds: msg.deviceIds }));
          sendCachedSnapshotsToClient(ws, msg.deviceIds);

          // Check existing readings for alerts on subscribed devices
          checkExistingReadingsForAlerts(ws.userId!, msg.deviceIds).catch(() => {});
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      const userClients = clientsByUser.get(ws.userId!);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          clientsByUser.delete(ws.userId!);
          // Disconnect Protonest WS if no more clients for this user
          disconnectProtonestForUser(ws.userId!);
        }
      }
      console.log(`📱 App disconnected (user: ${ws.userId})`);
    });
  });

  // Heartbeat — detect dead connections every 30s
  setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const client = ws as AuthenticatedSocket;
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  // Device staleness checker — mark devices offline if fewer than 5 readings in the last 2 minutes
  setInterval(async () => {
    try {
      // Find devices that are online but have fewer than 5 sensor readings in the last 2 minutes
      // Looking at multiple readings prevents rapid online/offline flipping from brief WS gaps
      const [staleDevices]: any = await pool.query(
        `UPDATE devices d
         SET status = 'offline'
         WHERE d.status = 'online'
         AND (
           SELECT COUNT(*) FROM sensor_readings sr
           WHERE sr.device_id = d.id
           AND sr.timestamp > NOW() - INTERVAL '120 seconds'
         ) < 5
         RETURNING d.id, d.name, d.user_id`
      );

      for (const device of staleDevices) {
        console.log(`📴 Device "${device.name}" marked offline (no data for 2 minutes)`);

        // Notify connected app clients about the status change
        broadcastToUser(device.user_id, device.id, {
          _statusChange: true,
          status: 'offline',
          deviceName: device.name,
        });

        // Send push notification for device going offline
        const [tokens]: any = await pool.query(
          `SELECT expo_push_token FROM push_tokens WHERE user_id = ?`,
          [device.user_id]
        );
        if (tokens.length > 0) {
          const pushTokens = tokens.map((t: any) => t.expo_push_token);
          const messages = pushTokens.map((token: string) => ({
            to: token,
            sound: 'default' as const,
            title: `${device.name} Went Offline`,
            body: 'Your sensor device stopped sending data. Check if it is powered on and connected to WiFi.',
            data: { type: 'device_offline', deviceId: device.id },
            priority: 'high' as const,
          }));

          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(messages),
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Silently ignore — this is a background check
    }
  }, 30000); // Check every 30 seconds
}

// ─── Broadcast to Expo App Clients ───────────────────────

function buildSensorReadingMessage(deviceId: string, reading: OutboundSensorPayload, sourceTimestamp?: string): string {
  return JSON.stringify({
    type: 'sensor_reading',
    deviceId,
    data: reading,
    timestamp: new Date().toISOString(),
    sourceTimestamp,
  });
}

function sendSnapshotToClient(
  client: AuthenticatedSocket,
  deviceId: string,
  reading: OutboundSensorPayload,
  sourceTimestamp?: string
): void {
  if (client.readyState !== WebSocket.OPEN) return;
  if (client.deviceIds && !client.deviceIds.includes(deviceId)) return;

  client.send(buildSensorReadingMessage(deviceId, reading, sourceTimestamp));
}

function sendCachedSnapshotsToClient(ws: AuthenticatedSocket, deviceIds?: string[]): void {
  if (!ws.userId) return;

  const snapshots = getCachedRealtimeSnapshotsForUser(ws.userId, deviceIds);
  for (const snapshot of snapshots) {
    sendSnapshotToClient(ws, snapshot.deviceId, snapshot.reading, snapshot.sourceTimestamp);
  }
}

function broadcastToUser(
  userId: string,
  deviceId: string,
  reading: OutboundSensorPayload,
  sourceTimestamp?: string
): void {
  const clients = clientsByUser.get(userId);
  if (!clients) return;

  clients.forEach((client) => {
    sendSnapshotToClient(client, deviceId, reading, sourceTimestamp);
  });
}

export function broadcastSensorReading(
  userId: string,
  deviceId: string,
  reading: RealtimeReading,
  sourceTimestamp?: string
): void {
  broadcastToUser(userId, deviceId, reading, sourceTimestamp);
}

// ─── Welcome & Alert Notifications on Connect ──────────

async function sendWelcomeNotification(userId: string): Promise<void> {
  await broadcastNotification(
    'SmartDesk Assistant is Active',
    'Your environment is now being monitored through Smart Desk Assistant. You will be alerted if any conditions need attention.',
    { type: 'welcome' }
  );
  console.log(`📲 Welcome notification sent (user: ${userId})`);
}

async function checkExistingReadingsForAlerts(userId: string, deviceIds: string[]): Promise<void> {
  for (const deviceId of deviceIds) {
    // Get the latest reading for this device
    const [readings]: any = await pool.query(
      `SELECT sr.air_quality, sr.light_level, sr.noise_level, sr.temperature, sr.humidity, d.name
       FROM sensor_readings sr
       INNER JOIN devices d ON sr.device_id = d.id
       WHERE sr.device_id = ?
       ORDER BY sr.timestamp DESC LIMIT 1`,
      [deviceId]
    );
    if (readings.length === 0) continue;

    const r = readings[0];
    const reading = {
      airQuality: r.air_quality ? parseFloat(r.air_quality) : null,
      lightLevel: r.light_level ? parseFloat(r.light_level) : null,
      noiseLevel: r.noise_level ? parseFloat(r.noise_level) : null,
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      humidity: r.humidity ? parseFloat(r.humidity) : null,
    };

    // Check and notify using existing push notification service
    await checkAndNotify(userId, deviceId, r.name || 'Device', reading);
  }
}

// ─── Protonest WebSocket Client (per user) ───────────────

function getReconnectDelay(attempts: number): number {
  // Exponential backoff: 500ms → 1s → 2s → 4s → 5s max
  const delays = [500, 1000, 2000, 4000, 5000];
  return delays[Math.min(attempts, delays.length - 1)];
}

function cleanupProtonestHealth(userId: string): void {
  const health = protonestHealth.get(userId);
  if (health) {
    if (health.pingInterval) clearInterval(health.pingInterval);
    if (health.watchdogInterval) clearInterval(health.watchdogInterval);
    protonestHealth.delete(userId);
  }
}

async function connectProtonestForUser(userId: string): Promise<void> {
  // Already connected
  if (protonestHealth.has(userId)) return;

  // Get credentials
  const [creds]: any = await pool.query(
    `SELECT * FROM protonest_credentials WHERE user_id = ?`,
    [userId]
  );
  if (creds.length === 0) return;

  const cred = creds[0];
  let jwtToken = cred.jwt_token;

  // Refresh token if expired
  if (!jwtToken || (cred.jwt_expires_at && new Date(cred.jwt_expires_at) <= new Date())) {
    try {
      const password = decryptSecret(cred.protonest_secret_key);
      const authEmail = process.env.MQTT_CONNECT_OVERRIDE_EMAIL || cred.protonest_email;
      const authPassword = process.env.MQTT_CONNECT_OVERRIDE_PASSWORD || password;
      const result = await protonestClient.getToken(authEmail, authPassword);
      jwtToken = result.jwtToken;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query(
        `UPDATE protonest_credentials SET jwt_token = ?, refresh_token = ?, jwt_expires_at = ? WHERE id = ?`,
        [result.jwtToken, result.refreshToken, expiresAt, cred.id]
      );
    } catch (e) {
      console.error(`Failed to get Protonest token for WS (user: ${userId}):`, e);
      return;
    }
  }

  // Get user's devices with Protonest IDs
  const [devices]: any = await pool.query(
    `SELECT id, name, protonest_device_id FROM devices WHERE user_id = ? AND protonest_device_id IS NOT NULL`,
    [userId]
  );
  if (devices.length === 0) return;

  const deviceMap = new Map<string, string>(); // protonestDeviceId → our deviceId
  const deviceNameMap = new Map<string, string>(); // our deviceId → device name
  for (const d of devices) {
    deviceMap.set(d.protonest_device_id, d.id);
    deviceNameMap.set(d.id, d.name);
  }

  // Connect to Protonest WebSocket
  const encodedToken = encodeURIComponent(jwtToken);
  const wsUrl = `${PROTONEST_WS_URL}?token=${encodedToken}`;

  // Track reconnect attempts across reconnections
  const previousHealth = protonestHealth.get(userId);
  const reconnectAttempts = previousHealth ? previousHealth.reconnectAttempts + 1 : 0;

  console.log(`🔌 Connecting to Protonest WebSocket for user ${userId} (attempt ${reconnectAttempts + 1})...`);

  const ws = new WebSocket(wsUrl);

  // Create health entry immediately to prevent duplicate connections
  const health: ProtonestConnectionHealth = {
    ws,
    messageCount: 0,
    lastMessageAt: 0,
    connectedAt: 0,
    reconnectAttempts,
  };
  protonestHealth.set(userId, health);

  ws.on('open', () => {
    console.log(`✅ Protonest WebSocket connected (user: ${userId})`);
    health.connectedAt = Date.now();
    health.reconnectAttempts = 0; // Reset on successful connection

    // Subscribe to stream updates for each device
    for (const protonestDeviceId of deviceMap.keys()) {
      const subscribeMsg = JSON.stringify({
        type: 'subscribe',
        channel: `/topic/stream/${protonestDeviceId}`,
      });
      ws.send(subscribeMsg);
      console.log(`  📡 Subscribed to /topic/stream/${protonestDeviceId}`);
    }

    // Keepalive ping every 20s to prevent idle timeout (fixes code 1006)
    health.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 20000);

    // Watchdog: if no messages for 30s while connected, force reconnect
    health.watchdogInterval = setInterval(() => {
      if (health.messageCount > 0 && Date.now() - health.lastMessageAt > 30000) {
        console.warn(`⚠️ Protonest WS watchdog: no messages for 30s (user: ${userId}), forcing reconnect`);
        ws.terminate();
      }
    }, 10000);
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg: ProtonestStreamMessage = JSON.parse(data.toString());

      // Update health tracking
      health.messageCount++;
      health.lastMessageAt = Date.now();

      // Extract device ID and topic from the message
      const protonestDeviceId = msg.deviceId || '';
      const topicKey = msg.topicSuffix || msg.topic || '';
      const ourDeviceId = deviceMap.get(protonestDeviceId);

      if (!ourDeviceId) {
        console.warn(`📨 Protonest WS: unknown device ${protonestDeviceId} (user: ${userId})`);
        return;
      }

      // Parse payload
      let payload: any;
      try {
        payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
      } catch (parseErr) {
        console.error(`📨 Protonest WS: bad payload for device ${ourDeviceId}:`, parseErr);
        return;
      }

      // Map topic to column
      const topicMapping = getTopicMapping();
      const column = topicMapping[topicKey];
      if (!column) {
        console.warn(`📨 Protonest WS: unmapped topic "${topicKey}" for device ${ourDeviceId}`);
        return;
      }

      let val: number | undefined;
      if (payload.value !== undefined) {
        val = parseFloat(payload.value);
      } else {
        const numVal = Object.values(payload).find((v: any) => typeof v === 'number' || !isNaN(Number(v)));
        if (numVal !== undefined) val = Number(numVal);
      }
      if (val === undefined || isNaN(val)) {
        console.warn(`📨 Protonest WS: no numeric value in payload for ${topicKey}, device ${ourDeviceId}`);
        return;
      }

      const field = (
        {
          air_quality: 'airQuality',
          light_level: 'lightLevel',
          noise_level: 'noiseLevel',
          temperature: 'temperature',
          humidity: 'humidity',
        } as const
      )[column as 'air_quality' | 'light_level' | 'noise_level' | 'temperature' | 'humidity'];

      if (!field) return;

      console.log(`📨 Protonest WS: ${topicKey}=${val} for device ${ourDeviceId}`);

      const realtimeUpdate = publishRealtimeUpdate(
        {
          userId,
          deviceId: ourDeviceId,
          deviceName: deviceNameMap.get(ourDeviceId) || 'Device',
          patch: { [field]: val },
          sourceTimestamp: msg.timestamp,
        },
        broadcastSensorReading
      );

      realtimeUpdate.persistence.catch((error) => {
        console.error(`Deferred Protonest persistence failed for device ${ourDeviceId}:`, error);
      });
    } catch (err) {
      console.error(`Protonest WS message parse error (user: ${userId}):`, err);
    }
  });

  ws.on('error', (err) => {
    console.error(`Protonest WS error (user: ${userId}):`, err.message);
  });

  ws.on('close', (code, reason) => {
    const uptime = health.connectedAt ? Math.round((Date.now() - health.connectedAt) / 1000) : 0;
    console.log(`🔌 Protonest WS closed (user: ${userId}, code: ${code}, uptime: ${uptime}s, msgs: ${health.messageCount})`);

    const attempts = health.reconnectAttempts;
    cleanupProtonestHealth(userId);

    // Reconnect with exponential backoff if user still has active app clients
    if (clientsByUser.has(userId) && clientsByUser.get(userId)!.size > 0) {
      const delay = getReconnectDelay(attempts);
      console.log(`🔄 Reconnecting Protonest WS in ${delay}ms (user: ${userId}, attempt ${attempts + 1})`);
      setTimeout(() => connectProtonestForUser(userId), delay);
    }
  });
}

function disconnectProtonestForUser(userId: string): void {
  const health = protonestHealth.get(userId);
  if (health) {
    health.ws.close();
    cleanupProtonestHealth(userId);
    console.log(`🔌 Protonest WS disconnected (user: ${userId})`);
  }
}

// Periodic health log — every 60s log uptime, message count, silence duration
setInterval(() => {
  for (const [userId, health] of protonestHealth) {
    if (!health.connectedAt) continue;
    const uptime = Math.round((Date.now() - health.connectedAt) / 1000);
    const silenceSec = health.lastMessageAt ? Math.round((Date.now() - health.lastMessageAt) / 1000) : uptime;
    console.log(`📊 Protonest WS health (user: ${userId}): uptime=${uptime}s, msgs=${health.messageCount}, silence=${silenceSec}s`);
  }
}, 60000);
