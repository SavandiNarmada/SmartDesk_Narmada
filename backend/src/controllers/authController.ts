import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { generateId } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
import { User, RegisterData, LoginData, JWTPayload } from '../types';
import { broadcastNotification } from '../services/pushNotificationService';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { full_name, email, password }: RegisterData = req.body;

    // Check if user already exists
    const [existingUsers]: any = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const userId = generateId();
    await pool.query(
      'INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [userId, email, password_hash, full_name]
    );

    // Create default user settings
    await pool.query(
      'INSERT INTO user_settings (id, user_id) VALUES (?, ?)',
      [generateId(), userId]
    );

    // Generate tokens
    const token = generateToken({ userId, email });
    const refreshToken = generateRefreshToken({ userId, email });

    // Get user data (without password hash)
    const [users]: any = await pool.query(
      'SELECT id, email, full_name, phone_number, timezone, avatar FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      data: {
        user: users[0],
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password }: LoginData = req.body;

    // Find user
    const [users]: any = await pool.query(
      'SELECT id, email, password_hash, full_name, phone_number, timezone, avatar FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    // Broadcast login notification to all connected devices (fire-and-forget)
    const loginTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    broadcastNotification(
      'New Login Detected',
      `${user.full_name || user.email} logged in at ${loginTime}.`,
      { type: 'login' }
    ).catch((err) => console.error('Login notification failed:', err));

    // Remove password hash from response
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // In a production app, you would invalidate the refresh token here
    // For now, we just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token required', 400);
    }

    // Verify refresh token
    const decoded = verifyToken(token) as JWTPayload;
    
    // Check if user still exists
    const [users]: any = await pool.query(
      'SELECT id, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const newToken = generateToken({ userId: decoded.userId, email: decoded.email });
    const newRefreshToken = generateRefreshToken({ userId: decoded.userId, email: decoded.email });

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    // Check if user exists
    const [users]: any = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
      return;
    }

    // In a production app, you would:
    // 1. Generate a password reset token
    // 2. Store it in the database with expiration
    // 3. Send an email with the reset link

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
}
