import pool from '../config/database';
import { generateId } from '../utils/helpers';
import { generateAutoInsights } from './insightGenerator';
import { checkAndNotify } from './pushNotificationService';

export interface RealtimeReading {
  airQuality?: number | null;
  lightLevel?: number | null;
  noiseLevel?: number | null;
  temperature?: number | null;
  humidity?: number | null;
}

type RealtimeField = keyof RealtimeReading;

interface CacheEntry {
  userId: string;
  deviceId: string;
  deviceName: string;
  reading: RealtimeReading;
  fieldTimestamps: Partial<Record<RealtimeField, number>>;
  lastSourceTimestamp: string;
  lastSeenAtMs: number;
}

interface PersistResult {
  readingId: string;
}

export interface PublishRealtimeUpdateInput {
  userId: string;
  deviceId: string;
  deviceName: string;
  patch: Partial<Record<RealtimeField, number | null>>;
  sourceTimestamp?: string | Date;
}

export interface PublishRealtimeUpdateResult {
  applied: boolean;
  snapshot: RealtimeReading;
  sourceTimestamp: string;
  persistence: Promise<PersistResult | null>;
}

export interface CachedRealtimeSnapshot {
  deviceId: string;
  reading: RealtimeReading;
  sourceTimestamp: string;
}

type Broadcaster = (
  userId: string,
  deviceId: string,
  reading: RealtimeReading,
  sourceTimestamp?: string
) => void;

const SENSOR_FIELDS: RealtimeField[] = [
  'airQuality',
  'lightLevel',
  'noiseLevel',
  'temperature',
  'humidity',
];

const FIELD_TO_COLUMN: Record<RealtimeField, string> = {
  airQuality: 'air_quality',
  lightLevel: 'light_level',
  noiseLevel: 'noise_level',
  temperature: 'temperature',
  humidity: 'humidity',
};

// LDR sensor sends inverted values (high = dark, low = bright).
// Invert here so the rest of the system sees correct lux values.
const LDR_MAX_RAW = parseInt(process.env.LDR_MAX_RAW || '1024', 10);

const PERSIST_WINDOW_MS = 5000;
const RETRY_BACKOFF_MS = [250, 500, 1000];
const CACHE_SNAPSHOT_TTL_MS = 2 * 60 * 1000;

const liveCache = new Map<string, CacheEntry>();
const persistenceQueues = new Map<string, Promise<PersistResult | null>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSourceTimestamp(sourceTimestamp?: string | Date): { date: Date; iso: string; ms: number } {
  const date =
    sourceTimestamp instanceof Date
      ? new Date(sourceTimestamp.getTime())
      : sourceTimestamp
        ? new Date(sourceTimestamp)
        : new Date();

  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { date: now, iso: now.toISOString(), ms: now.getTime() };
  }

  return { date, iso: date.toISOString(), ms: date.getTime() };
}

function cloneReading(reading: RealtimeReading): RealtimeReading {
  return {
    airQuality: reading.airQuality,
    lightLevel: reading.lightLevel,
    noiseLevel: reading.noiseLevel,
    temperature: reading.temperature,
    humidity: reading.humidity,
  };
}

function applyPatchToCache(
  entry: CacheEntry,
  patch: Partial<Record<RealtimeField, number | null>>,
  sourceMs: number,
  sourceIso: string
): { applied: boolean; appliedPatch: Partial<Record<RealtimeField, number | null>>; snapshot: RealtimeReading } {
  let applied = false;
  const appliedPatch: Partial<Record<RealtimeField, number | null>> = {};

  for (const field of SENSOR_FIELDS) {
    if (!(field in patch)) continue;

    const value = patch[field];
    if (value === undefined) continue;

    const lastFieldTs = entry.fieldTimestamps[field];
    if (lastFieldTs != null && sourceMs < lastFieldTs) {
      continue;
    }

    entry.reading[field] = value;
    entry.fieldTimestamps[field] = sourceMs;
    appliedPatch[field] = value;
    applied = true;
  }

  if (applied) {
    entry.lastSeenAtMs = sourceMs;
    entry.lastSourceTimestamp = sourceIso;
  }

  return {
    applied,
    appliedPatch,
    snapshot: cloneReading(entry.reading),
  };
}

async function persistPatchAttempt(
  deviceId: string,
  patch: Partial<Record<RealtimeField, number | null>>,
  sourceDate: Date
): Promise<PersistResult | null> {
  const patchEntries = Object.entries(patch).filter(([, value]) => value !== undefined) as Array<
    [RealtimeField, number | null]
  >;

  if (patchEntries.length === 0) {
    return null;
  }

  const windowStart = new Date(sourceDate.getTime() - PERSIST_WINDOW_MS);
  const [recent]: any = await pool.query(
    `SELECT id
     FROM sensor_readings
     WHERE device_id = ? AND timestamp >= ?
     ORDER BY timestamp DESC
     LIMIT 1`,
    [deviceId, windowStart]
  );

  let readingId: string;

  if (recent.length > 0) {
    readingId = recent[0].id;
    const setClause = patchEntries
      .map(([field]) => `${FIELD_TO_COLUMN[field]} = ?`)
      .join(', ');

    await pool.query(
      `UPDATE sensor_readings SET ${setClause} WHERE id = ?`,
      [...patchEntries.map(([, value]) => value), readingId]
    );
  } else {
    readingId = generateId();
    const values: Record<string, number | null> = {
      air_quality: null,
      light_level: null,
      noise_level: null,
      temperature: null,
      humidity: null,
    };

    for (const [field, value] of patchEntries) {
      values[FIELD_TO_COLUMN[field]] = value;
    }

    await pool.query(
      `INSERT INTO sensor_readings (id, device_id, timestamp, air_quality, light_level, noise_level, temperature, humidity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        readingId,
        deviceId,
        sourceDate.toISOString(),
        values.air_quality,
        values.light_level,
        values.noise_level,
        values.temperature,
        values.humidity,
      ]
    );
  }

  await pool.query(
    `UPDATE devices SET status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [deviceId]
  );

  return { readingId };
}

async function persistWithRetry(
  deviceId: string,
  patch: Partial<Record<RealtimeField, number | null>>,
  sourceDate: Date
): Promise<PersistResult | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_BACKOFF_MS.length; attempt += 1) {
    try {
      return await persistPatchAttempt(deviceId, patch, sourceDate);
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_BACKOFF_MS.length - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt]);
      }
    }
  }

  console.error(`Failed to persist realtime reading for device ${deviceId} after ${RETRY_BACKOFF_MS.length} attempts`, lastError);
  throw lastError;
}

function enqueuePersistence(
  deviceId: string,
  taskFactory: () => Promise<PersistResult | null>
): Promise<PersistResult | null> {
  const previous = persistenceQueues.get(deviceId) || Promise.resolve<PersistResult | null>(null);
  const next = previous.catch(() => null).then(taskFactory);
  const tracked = next.finally(() => {
    if (persistenceQueues.get(deviceId) === tracked) {
      persistenceQueues.delete(deviceId);
    }
  });

  persistenceQueues.set(deviceId, tracked);
  return tracked;
}

function triggerAsyncSideEffects(
  userId: string,
  deviceId: string,
  deviceName: string,
  snapshot: RealtimeReading
): void {
  generateAutoInsights(
    deviceId,
    snapshot.airQuality ?? null,
    snapshot.lightLevel ?? null,
    snapshot.noiseLevel ?? null
  ).catch((error) => {
    console.error(`Realtime insight generation failed for device ${deviceId}:`, error);
  });

  checkAndNotify(userId, deviceId, deviceName, snapshot).catch((error) => {
    console.error(`Realtime push notification check failed for device ${deviceId}:`, error);
  });
}

export function publishRealtimeUpdate(
  input: PublishRealtimeUpdateInput,
  broadcast: Broadcaster
): PublishRealtimeUpdateResult {
  const normalizedSource = normalizeSourceTimestamp(input.sourceTimestamp);
  const existing =
    liveCache.get(input.deviceId) ||
    {
      userId: input.userId,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      reading: {},
      fieldTimestamps: {},
      lastSourceTimestamp: normalizedSource.iso,
      lastSeenAtMs: normalizedSource.ms,
    };

  existing.userId = input.userId;
  existing.deviceName = input.deviceName;

  // Invert light level: firmware sends high=dark, low=bright
  if (input.patch.lightLevel != null) {
    input.patch.lightLevel = Math.max(0, LDR_MAX_RAW - input.patch.lightLevel);
  }

  const { applied, appliedPatch, snapshot } = applyPatchToCache(
    existing,
    input.patch,
    normalizedSource.ms,
    normalizedSource.iso
  );

  liveCache.set(input.deviceId, existing);

  if (!applied) {
    return {
      applied: false,
      snapshot,
      sourceTimestamp: existing.lastSourceTimestamp,
      persistence: Promise.resolve(null),
    };
  }

  broadcast(input.userId, input.deviceId, snapshot, normalizedSource.iso);
  triggerAsyncSideEffects(input.userId, input.deviceId, input.deviceName, snapshot);

  return {
    applied: true,
    snapshot,
    sourceTimestamp: normalizedSource.iso,
    persistence: enqueuePersistence(input.deviceId, () =>
      persistWithRetry(input.deviceId, appliedPatch, normalizedSource.date)
    ),
  };
}

export function getCachedRealtimeSnapshotsForUser(
  userId: string,
  deviceIds?: string[]
): CachedRealtimeSnapshot[] {
  const allowedDeviceIds = deviceIds ? new Set(deviceIds) : null;
  const cutoff = Date.now() - CACHE_SNAPSHOT_TTL_MS;
  const snapshots: CachedRealtimeSnapshot[] = [];

  for (const entry of liveCache.values()) {
    if (entry.userId !== userId) continue;
    if (allowedDeviceIds && !allowedDeviceIds.has(entry.deviceId)) continue;
    if (entry.lastSeenAtMs < cutoff) continue;

    snapshots.push({
      deviceId: entry.deviceId,
      reading: cloneReading(entry.reading),
      sourceTimestamp: entry.lastSourceTimestamp,
    });
  }

  return snapshots;
}
