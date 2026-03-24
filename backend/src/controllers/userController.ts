import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { generateId } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [users]: any = await pool.query(
      'SELECT id, email, full_name, phone_number, timezone, avatar FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { full_name, phone_number, timezone, avatar } = req.body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      updateValues.push(phone_number);
    }
    if (timezone !== undefined) {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateValues.push(avatar);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateValues.push(userId);

    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    const [users]: any = await pool.query(
      'SELECT id, email, full_name, phone_number, timezone, avatar FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [settings]: any = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      throw new AppError('Settings not found', 404);
    }

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { theme, units, notifications_enabled, data_privacy_analytics } = req.body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (theme !== undefined) {
      updateFields.push('theme = ?');
      updateValues.push(theme);
    }
    if (units !== undefined) {
      updateFields.push('units = ?');
      updateValues.push(units);
    }
    if (notifications_enabled !== undefined) {
      updateFields.push('notifications_enabled = ?');
      updateValues.push(notifications_enabled);
    }
    if (data_privacy_analytics !== undefined) {
      updateFields.push('data_privacy_analytics = ?');
      updateValues.push(data_privacy_analytics);
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateValues.push(userId);

    await pool.query(
      `UPDATE user_settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      updateValues
    );

    const [settings]: any = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    next(error);
  }
}

// ─── Push Token Management ──────────────────────────────

export async function registerPushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { expoPushToken, deviceName } = req.body;

    if (!expoPushToken) {
      throw new AppError('expoPushToken is required', 400);
    }

    await pool.query(
      `INSERT INTO push_tokens (id, user_id, expo_push_token, device_name)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, expo_push_token) DO NOTHING`,
      [generateId(), userId, expoPushToken, deviceName || null]
    );

    res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    next(error);
  }
}

export async function removePushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      throw new AppError('expoPushToken is required', 400);
    }

    await pool.query(
      `DELETE FROM push_tokens WHERE user_id = ? AND expo_push_token = ?`,
      [userId, expoPushToken]
    );

    res.json({ success: true, message: 'Push token removed' });
  } catch (error) {
    next(error);
  }
}
