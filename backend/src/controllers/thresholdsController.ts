import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { generateId } from '../utils/helpers';
import { DEFAULT_THRESHOLDS } from '../types';

export async function getThresholds(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [rows]: any = await pool.query(
      'SELECT * FROM sensor_thresholds WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: { user_id: userId, ...DEFAULT_THRESHOLDS }
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function updateThresholds(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const updates = req.body;

    // Allowed fields
    const allowedFields = Object.keys(DEFAULT_THRESHOLDS);
    const validUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        validUpdates[key] = updates[key];
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    // Check if row exists
    const [existing]: any = await pool.query(
      'SELECT id FROM sensor_thresholds WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Insert with defaults + overrides
      const merged = { ...DEFAULT_THRESHOLDS, ...validUpdates };
      const columns = Object.keys(merged);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(k => (merged as any)[k]);

      await pool.query(
        `INSERT INTO sensor_thresholds (id, user_id, ${columns.join(', ')}) VALUES (?, ?, ${placeholders})`,
        [generateId(), userId, ...values]
      );
    } else {
      // Update existing
      const setClauses = Object.keys(validUpdates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(validUpdates);

      await pool.query(
        `UPDATE sensor_thresholds SET ${setClauses} WHERE user_id = ?`,
        [...values, userId]
      );
    }

    // Return updated thresholds
    const [rows]: any = await pool.query(
      'SELECT * FROM sensor_thresholds WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
}

export async function resetThresholds(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await pool.query('DELETE FROM sensor_thresholds WHERE user_id = ?', [userId]);
    res.json({
      success: true,
      data: { user_id: userId, ...DEFAULT_THRESHOLDS },
      message: 'Thresholds reset to defaults'
    });
  } catch (error) {
    next(error);
  }
}
