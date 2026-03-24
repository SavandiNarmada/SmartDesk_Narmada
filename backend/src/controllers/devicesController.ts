import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import pool from '../config/database';
import { generateId, parseTimeRange } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
import { Device, SensorReading } from '../types';
import { calculateRoomCondition } from '../utils/roomCondition';
import { generateAutoInsights } from '../services/insightGenerator';

function generateDeviceKey(): string {
  return randomBytes(16).toString('hex');
}

export async function getDevices(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [devices]: any = await pool.query(
      `SELECT
        d.*,
        sr.id as "lastReading_id",
        sr.timestamp as "lastReading_timestamp",
        sr.air_quality as "lastReading_air_quality",
        sr.light_level as "lastReading_light_level",
        sr.noise_level as "lastReading_noise_level",
        sr.temperature as "lastReading_temperature",
        sr.humidity as "lastReading_humidity",
        COALESCE(rc.cnt, 0) as "recentReadingCount"
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT id, timestamp, air_quality, light_level, noise_level, temperature, humidity
        FROM sensor_readings
        WHERE device_id = d.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) sr ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt
        FROM sensor_readings
        WHERE device_id = d.id
        AND timestamp > NOW() - INTERVAL '120 seconds'
      ) rc ON true
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC`,
      [userId]
    );

    // Format devices with lastReading
    const formattedDevices = devices.map((device: any) => {
      const lastReading = device.lastReading_id ? {
        id: device.lastReading_id,
        deviceId: device.id,
        timestamp: device.lastReading_timestamp,
        airQuality: device.lastReading_air_quality,
        lightLevel: device.lastReading_light_level,
        noiseLevel: device.lastReading_noise_level,
        temperature: device.lastReading_temperature,
        humidity: device.lastReading_humidity,
      } : undefined;

      // Derive actual status from recent reading count (need 5+ readings in last 2 minutes)
      let derivedStatus = device.status;
      if (device.recentReadingCount >= 5) {
        derivedStatus = 'online';
      } else {
        derivedStatus = 'offline';
      }

      // Remove the joined fields and format the device
      const formattedDevice: any = {
        id: device.id,
        name: device.name,
        type: device.type,
        location: device.location,
        status: derivedStatus,
        batteryLevel: device.battery_level,
        deviceKey: device.device_key,
        protonestDeviceId: device.protonest_device_id,
        wifiSettings: device.wifi_ssid ? {
          ssid: device.wifi_ssid,
          autoConnect: device.wifi_auto_connect,
        } : undefined,
        notificationPreferences: {
          threshold_alerts: device.notification_threshold_alerts,
          daily_summary: device.notification_daily_summary,
          weekly_report: device.notification_weekly_report,
          device_offline: device.notification_device_offline,
        },
        createdAt: device.created_at,
        updatedAt: device.updated_at,
        lastReading,
      };

      // Calculate room condition from last reading
      if (lastReading) {
        formattedDevice.roomCondition = calculateRoomCondition({
          airQuality: lastReading.airQuality,
          lightLevel: lastReading.lightLevel,
          noiseLevel: lastReading.noiseLevel,
          temperature: lastReading.temperature,
          humidity: lastReading.humidity,
        });
      }

      return formattedDevice;
    });

    res.json({
      success: true,
      data: formattedDevices
    });
  } catch (error) {
    next(error);
  }
}

export async function createDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, type, location, protonestDeviceId, wifiSettings, notificationPreferences } = req.body;

    const deviceId = generateId();
    // Auto-generate a cryptographically random device_key for ESP32 authentication
    const deviceKey = generateDeviceKey();

    await pool.query(
      `INSERT INTO devices (
        id, user_id, name, type, location, device_key, protonest_device_id, wifi_ssid, wifi_auto_connect,
        notification_threshold_alerts, notification_daily_summary,
        notification_weekly_report, notification_device_offline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        userId,
        name,
        type,
        location,
        deviceKey,
        protonestDeviceId || null,
        wifiSettings?.ssid || null,
        wifiSettings?.autoConnect !== undefined ? wifiSettings.autoConnect : true,
        notificationPreferences?.threshold_alerts !== undefined ? notificationPreferences.threshold_alerts : true,
        notificationPreferences?.daily_summary !== undefined ? notificationPreferences.daily_summary : true,
        notificationPreferences?.weekly_report !== undefined ? notificationPreferences.weekly_report : false,
        notificationPreferences?.device_offline !== undefined ? notificationPreferences.device_offline : true,
      ]
    );

    const [devices]: any = await pool.query('SELECT * FROM devices WHERE id = ?', [deviceId]);

    res.status(201).json({
      success: true,
      data: devices[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    const updates = req.body;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(updates.type);
    }
    if (updates.location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(updates.location);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.batteryLevel !== undefined) {
      updateFields.push('battery_level = ?');
      updateValues.push(updates.batteryLevel);
    }
    if (updates.protonestDeviceId !== undefined) {
      updateFields.push('protonest_device_id = ?');
      updateValues.push(updates.protonestDeviceId);
    }
    if (updates.wifiSettings) {
      if (updates.wifiSettings.ssid !== undefined) {
        updateFields.push('wifi_ssid = ?');
        updateValues.push(updates.wifiSettings.ssid);
      }
      if (updates.wifiSettings.autoConnect !== undefined) {
        updateFields.push('wifi_auto_connect = ?');
        updateValues.push(updates.wifiSettings.autoConnect);
      }
    }
    if (updates.notificationPreferences) {
      if (updates.notificationPreferences.threshold_alerts !== undefined) {
        updateFields.push('notification_threshold_alerts = ?');
        updateValues.push(updates.notificationPreferences.threshold_alerts);
      }
      if (updates.notificationPreferences.daily_summary !== undefined) {
        updateFields.push('notification_daily_summary = ?');
        updateValues.push(updates.notificationPreferences.daily_summary);
      }
      if (updates.notificationPreferences.weekly_report !== undefined) {
        updateFields.push('notification_weekly_report = ?');
        updateValues.push(updates.notificationPreferences.weekly_report);
      }
      if (updates.notificationPreferences.device_offline !== undefined) {
        updateFields.push('notification_device_offline = ?');
        updateValues.push(updates.notificationPreferences.device_offline);
      }
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateValues.push(deviceId);

    await pool.query(
      `UPDATE devices SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    const [updatedDevices]: any = await pool.query('SELECT * FROM devices WHERE id = ?', [deviceId]);

    res.json({
      success: true,
      data: updatedDevices[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    await pool.query('DELETE FROM devices WHERE id = ?', [deviceId]);

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeviceReadings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    const hours = parseInt(req.query.hours as string) || 24;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    const { start, end } = parseTimeRange(hours);

    const [readings]: any = await pool.query(
      `SELECT * FROM sensor_readings 
       WHERE device_id = ? AND timestamp BETWEEN ? AND ?
       ORDER BY timestamp DESC`,
      [deviceId, start, end]
    );

    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    next(error);
  }
}

export async function createDeviceReading(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    const { airQuality, lightLevel, noiseLevel, temperature, humidity } = req.body;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    const readingId = generateId();

    await pool.query(
      `INSERT INTO sensor_readings
       (id, device_id, air_quality, light_level, noise_level, temperature, humidity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [readingId, deviceId, airQuality, lightLevel, noiseLevel, temperature, humidity]
    );

    // Update device status to online
    await pool.query(
      `UPDATE devices SET status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [deviceId]
    );

    // Generate threshold-based insights in background
    generateAutoInsights(deviceId, airQuality ?? null, lightLevel ?? null, noiseLevel ?? null)
      .catch((err: any) => console.error('Auto-insight generation error:', err));

    const [readings]: any = await pool.query(
      'SELECT * FROM sensor_readings WHERE id = ?',
      [readingId]
    );

    res.status(201).json({
      success: true,
      data: readings[0]
    });
  } catch (error) {
    next(error);
  }
}
