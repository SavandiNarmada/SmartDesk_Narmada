import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { generateId } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
import * as protonestClient from '../services/protonestClient';
import { encryptSecret, decryptSecret, runSyncForUser } from '../services/protonestSync';

export async function saveCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { protonestEmail, password } = req.body;

    if (!protonestEmail || !password) {
      throw new AppError('protonestEmail and password are required', 400);
    }

    // Use override credentials if configured (shared MQTT Connect account for demo)
    const effectiveEmail = process.env.MQTT_CONNECT_OVERRIDE_EMAIL || protonestEmail;
    const effectivePassword = process.env.MQTT_CONNECT_OVERRIDE_PASSWORD || password;

    // Verify credentials work by getting a token
    let tokenResult;
    try {
      tokenResult = await protonestClient.getToken(effectiveEmail, effectivePassword);
    } catch (e: any) {
      throw new AppError(`Failed to authenticate with Protonest: ${e.message}`, 400);
    }

    const encryptedKey = encryptSecret(password);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Upsert credentials — store user's typed email for display, override is applied at auth time
    const [existing]: any = await pool.query(
      'SELECT id FROM protonest_credentials WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE protonest_credentials
         SET protonest_email = ?, protonest_secret_key = ?, jwt_token = ?, refresh_token = ?, jwt_expires_at = ?
         WHERE user_id = ?`,
        [protonestEmail, encryptedKey, tokenResult.jwtToken, tokenResult.refreshToken, expiresAt, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO protonest_credentials (id, user_id, protonest_email, protonest_secret_key, jwt_token, refresh_token, jwt_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), userId, protonestEmail, encryptedKey, tokenResult.jwtToken, tokenResult.refreshToken, expiresAt]
      );
    }

    res.json({
      success: true,
      message: 'Protonest credentials saved and verified',
      data: {
        connected: true,
        email: protonestEmail,
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [creds]: any = await pool.query(
      'SELECT protonest_email, jwt_token, jwt_expires_at FROM protonest_credentials WHERE user_id = ?',
      [userId]
    );

    if (creds.length === 0) {
      return res.json({
        success: true,
        data: { connected: false }
      });
    }

    const cred = creds[0];
    const tokenValid = cred.jwt_expires_at && new Date(cred.jwt_expires_at) > new Date();

    res.json({
      success: true,
      data: {
        connected: true,
        email: cred.protonest_email,
        tokenValid,
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await pool.query('DELETE FROM protonest_credentials WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Protonest credentials removed' });
  } catch (error) {
    next(error);
  }
}

export async function testConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [creds]: any = await pool.query(
      'SELECT protonest_email, protonest_secret_key FROM protonest_credentials WHERE user_id = ?',
      [userId]
    );

    if (creds.length === 0) {
      throw new AppError('No Protonest credentials found', 404);
    }

    const secretKey = decryptSecret(creds[0].protonest_secret_key);
    await protonestClient.getToken(creds[0].protonest_email, secretKey);

    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    next(error);
  }
}

export async function syncNow(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await runSyncForUser(userId);
    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    next(error);
  }
}
