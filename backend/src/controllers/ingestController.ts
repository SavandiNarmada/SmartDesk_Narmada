import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { publishRealtimeUpdate } from '../services/realtimeSensorService';
import { broadcastSensorReading } from '../services/websocketService';

// Sensor conversion constants
const ADC_MAX = 4095;          // ESP32 12-bit ADC maximum value

const LDR_BRIGHT_LUX = 800;   // Lux value when LDR reads "light present" (DO = 0)
const LDR_DARK_LUX   = 20;    // Lux value when LDR reads "dark"           (DO = 1)

const MIN_DB  = 30;            // Minimum noise level mapped from ADC 0    (dB)
const DB_RANGE = 70;           // Noise range: ADC 0-4095 → 30–100 dB

const MAX_AQI = 300;           // Maximum AQI mapped from ADC 4095

// Generate a cryptographically random 32-character hex device key
function generateDeviceKey(): string {
  return randomBytes(16).toString('hex');
}

// Sensor value conversion helpers
// LDR DO: 0 = light detected (bright), 1 = dark
function ldrToLux(ldrDo: number): number {
  return ldrDo === 0 ? LDR_BRIGHT_LUX : LDR_DARK_LUX;
}

// MIC analog 0–4095 → noise level in dB (30–100 dB)
function micToDb(micValue: number): number {
  const clamped = Math.max(0, Math.min(ADC_MAX, micValue));
  return parseFloat((MIN_DB + (clamped / ADC_MAX) * DB_RANGE).toFixed(2));
}

// MQ-135 analog 0–4095 → AQI (0–300)
function mq135ToAqi(mq135Value: number): number {
  const clamped = Math.max(0, Math.min(ADC_MAX, mq135Value));
  return parseFloat(((clamped / ADC_MAX) * MAX_AQI).toFixed(2));
}

// POST /api/ingest — receives sensor data from the ESP32 device
export async function ingestSensorData(req: Request, res: Response, next: NextFunction) {
  try {
    const { device_id, device_key, ldr_do, mic, mq135 } = req.body;

    // Support lookup by device_key or device_id
    if (!device_id && !device_key) {
      throw new AppError('device_id or device_key is required', 400);
    }

    // Find the device
    let device: any;
    if (device_key) {
      const [rows]: any = await pool.query(
        'SELECT id, user_id, name FROM devices WHERE device_key = ?',
        [device_key]
      );
      if (rows.length === 0) {
        throw new AppError('Device not found. Check device_key.', 404);
      }
      device = rows[0];
    } else {
      const [rows]: any = await pool.query(
        'SELECT id, user_id, name FROM devices WHERE id = ?',
        [device_id]
      );
      if (rows.length === 0) {
        throw new AppError('Device not found. Check device_id.', 404);
      }
      device = rows[0];
    }

    // Convert raw sensor values to meaningful units
    const lightLevel = ldr_do !== undefined ? ldrToLux(Number(ldr_do)) : null;
    const noiseLevel = mic !== undefined ? micToDb(Number(mic)) : null;
    const airQuality = mq135 !== undefined ? mq135ToAqi(Number(mq135)) : null;

    const realtimeUpdate = publishRealtimeUpdate(
      {
        userId: device.user_id,
        deviceId: device.id,
        deviceName: device.name || 'Device',
        patch: {
          airQuality,
          lightLevel,
          noiseLevel,
        },
      },
      broadcastSensorReading
    );

    const persisted = await realtimeUpdate.persistence;

    res.status(201).json({
      success: true,
      message: 'Sensor data recorded successfully',
      data: {
        reading_id: persisted?.readingId,
        device_id: device.id,
        air_quality: airQuality,
        light_level: lightLevel,
        noise_level: noiseLevel,
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/ingest/key/:id — get or regenerate device_key for a device (requires auth)
export async function getDeviceKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;

    // Check ownership
    const [devices]: any = await pool.query(
      'SELECT id, device_key FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    let { device_key } = devices[0];

    // Generate a key if one doesn't exist yet
    if (!device_key) {
      device_key = generateDeviceKey();
      await pool.query(
        'UPDATE devices SET device_key = ? WHERE id = ?',
        [device_key, deviceId]
      );
    }

    res.json({
      success: true,
      data: { device_id: deviceId, device_key }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/ingest/key/:id/regenerate — regenerate device_key (requires auth)
export async function regenerateDeviceKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;

    // Check ownership
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    const newKey = generateDeviceKey();
    await pool.query(
      'UPDATE devices SET device_key = ? WHERE id = ?',
      [newKey, deviceId]
    );

    res.json({
      success: true,
      data: { device_id: deviceId, device_key: newKey }
    });
  } catch (error) {
    next(error);
  }
}
